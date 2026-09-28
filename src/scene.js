import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import {
	cameraPosition,
	color,
	float,
	mix,
	normalLocal,
	normalWorld,
	pass,
	positionLocal,
	positionWorld,
	screenUV,
	vec3,
	vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { createAsteroidField } from "./asteroid-field.js";
import { createSpecialLandmarks, describeLandmark } from "./landmarks.js";
import { createMissionActors } from "./mission-actors.js";
import { createPhysics, flightSpeed, preparePhysics } from "./physics.js";
import { guideProjectile, tryPointDefense } from "./projectiles.js";
import { createQualitySampler } from "./quality.js";
import { watchRenderHealth } from "./render-health.js";
import { createShipModel, disposeObject, hullMaterial } from "./ship-model.js";
import { createWrecks } from "./wrecks.js";

const PRESETS = {
	High: {
		dpr: 1.75,
		shadow: 2048,
		bodies: 76,
		rocks: 28,
		particles: 100,
		bloom: true,
		ao: true,
	},
	Balanced: {
		dpr: 1,
		// About 1920×1080: large low-density displays also shed pixels in Balanced.
		pixels: 2_100_000,
		shadow: 1024,
		bodies: 42,
		rocks: 16,
		particles: 45,
		bloom: false,
		ao: false,
	},
};
const DOCK = { x: 12, z: 1 };
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function randomGenerator(seed = 98271) {
	return () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}
function ring(radius, material, segments = 128) {
	const points = [];
	for (let i = 0; i <= segments; i++)
		points.push(
			new THREE.Vector3(
				Math.cos((i / segments) * TAU) * radius,
				0,
				Math.sin((i / segments) * TAU) * radius,
			),
		);
	return new THREE.Line(
		new THREE.BufferGeometry().setFromPoints(points),
		material,
	);
}
function emissive(hex, opacity = 1) {
	return new THREE.MeshBasicNodeMaterial({
		color: hex,
		transparent: opacity < 1,
		opacity,
		depthWrite: opacity === 1,
	});
}

function createEnvironment(renderer) {
	// A floating-point, scene-authored HDR studio sky: soft warm key + cool rim. Values exceed 1.
	const width = 128,
		height = 64;
	const data = new Uint16Array(width * height * 4);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const u = x / width,
				v = y / height;
			const key =
				Math.exp(-((u - 0.28) ** 2 / 0.012 + (v - 0.26) ** 2 / 0.025)) * 5;
			const rim =
				Math.exp(-((u - 0.78) ** 2 / 0.025 + (v - 0.41) ** 2 / 0.02)) * 3;
			const sky = Math.max(0, 1 - v) * 0.4;
			const i = (y * width + x) * 4;
			data[i] = THREE.DataUtils.toHalfFloat(0.08 + sky + key + rim * 0.28);
			data[i + 1] = THREE.DataUtils.toHalfFloat(
				0.12 + sky + key * 0.88 + rim * 0.65,
			);
			data[i + 2] = THREE.DataUtils.toHalfFloat(0.17 + sky + key * 0.7 + rim);
			data[i + 3] = THREE.DataUtils.toHalfFloat(1);
		}
	const texture = new THREE.DataTexture(
		data,
		width,
		height,
		THREE.RGBAFormat,
		THREE.HalfFloatType,
	);
	texture.mapping = THREE.EquirectangularReflectionMapping;
	texture.needsUpdate = true;
	const generator = new THREE.PMREMGenerator(renderer);
	const target = generator.fromEquirectangular(texture);
	texture.dispose();
	generator.dispose();
	return target;
}

function createPlanet() {
	const group = new THREE.Group();
	const geometry = new THREE.IcosahedronGeometry(8.6, 3);
	const position = geometry.attributes.position;
	const colors = new Float32Array(position.count * 3);
	const point = new THREE.Vector3();
	const ocean = new THREE.Color(0x326f79),
		shallow = new THREE.Color(0x63a69d),
		land = new THREE.Color(0xc2c3a2),
		ice = new THREE.Color(0xe2e8d9);
	const faceColor = new THREE.Color();
	for (let i = 0; i < position.count; i += 3) {
		point.set(0, 0, 0);
		for (let n = 0; n < 3; n++)
			point.add(new THREE.Vector3().fromBufferAttribute(position, i + n));
		point.normalize();
		const field =
			Math.sin(point.x * 8 + Math.sin(point.z * 6)) +
			Math.cos(point.z * 9 - point.y * 5) * 0.6 +
			Math.sin(point.y * 12 + point.x * 5) * 0.4;
		faceColor.copy(
			Math.abs(point.y) > 0.89
				? ice
				: field > 0.47
					? land
					: field > 0.13
						? shallow
						: ocean,
		);
		faceColor.multiplyScalar(0.9 + (Math.sin(i * 7.1) * 0.5 + 0.5) * 0.17);
		for (let n = 0; n < 3; n++) faceColor.toArray(colors, (i + n) * 3);
	}
	geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	const surface = new THREE.Mesh(
		geometry,
		new THREE.MeshStandardNodeMaterial({
			vertexColors: true,
			roughness: 0.95,
			metalness: 0.04,
			flatShading: true,
		}),
	);
	surface.receiveShadow = true;
	group.add(surface);
	const atmosphere = new THREE.MeshBasicNodeMaterial({
		color: 0x6cb5c3,
		transparent: true,
		depthWrite: false,
		side: THREE.BackSide,
	});
	atmosphere.opacityNode = float(0.25).mul(
		float(1)
			.sub(normalWorld.dot(cameraPosition.sub(positionWorld).normalize()).abs())
			.pow(2),
	);
	const shell = new THREE.Mesh(
		new THREE.IcosahedronGeometry(8.93, 4),
		atmosphere,
	);
	group.add(shell);
	// Separate floating polygonal cloud plates, with no texture or downloaded surface art.
	const clouds = new THREE.Group();
	const cloudMaterial = new THREE.MeshStandardNodeMaterial({
		color: 0xe5e8d8,
		roughness: 1,
		transparent: true,
		opacity: 0.52,
	});
	const rng = randomGenerator(38);
	for (let i = 0; i < 17; i++) {
		const phi = rng() * TAU,
			theta = 0.3 + rng() * 2.35;
		const cloud = new THREE.Mesh(
			new THREE.IcosahedronGeometry(0.7 + rng() * 0.75, 0),
			cloudMaterial,
		);
		cloud.position
			.set(
				Math.sin(theta) * Math.cos(phi),
				Math.cos(theta),
				Math.sin(theta) * Math.sin(phi),
			)
			.multiplyScalar(8.65);
		cloud.lookAt(0, 0, 0);
		cloud.scale.set(1.5, 0.45, 0.07);
		clouds.add(cloud);
	}
	group.add(clouds);
	group.position.set(0, -9.2, -3);
	group.rotation.z = 0.24;
	group.userData.surface = surface;
	group.userData.clouds = clouds;
	return group;
}

function createStation() {
	const group = new THREE.Group();
	const cream = hullMaterial(0xd8d7c5),
		slate = hullMaterial(0x304953, 0.6),
		copper = hullMaterial(0xbb965f);
	const glow = emissive(0x8ae4da);
	const torus = new THREE.Mesh(
		new THREE.TorusGeometry(2.8, 0.32, 5, 16),
		cream,
	);
	torus.rotation.x = Math.PI / 2;
	torus.castShadow = torus.receiveShadow = true;
	group.add(torus);
	const core = new THREE.Mesh(
		new THREE.CylinderGeometry(0.85, 1.1, 1.1, 8),
		slate,
	);
	core.castShadow = core.receiveShadow = true;
	group.add(core);
	for (let i = 0; i < 4; i++) {
		const arm = new THREE.Group();
		arm.rotation.y = (i / 4) * TAU;
		const bar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.23, 2.7), copper);
		bar.position.z = 1.55;
		arm.add(bar);
		const module = new THREE.Mesh(
			new THREE.BoxGeometry(1.35, 0.65, 1.55),
			cream,
		);
		module.position.set(0, 0.18, 2.8);
		module.castShadow = module.receiveShadow = true;
		arm.add(module);
		for (let k = -1; k <= 1; k++) {
			const window = new THREE.Mesh(
				new THREE.BoxGeometry(0.21, 0.07, 0.6),
				glow,
			);
			window.position.set(k * 0.32, 0.54, 2.8);
			arm.add(window);
		}
		group.add(arm);
	}
	const antenna = new THREE.Mesh(
		new THREE.CylinderGeometry(0.04, 0.1, 1.8, 6),
		copper,
	);
	antenna.position.y = 1;
	group.add(antenna);
	group.position.set(DOCK.x, 0.5, DOCK.z - 3.1);
	return group;
}

/** WebGPU-first, automatically WebGL2-compatible TSL renderer and space-flight simulation. */
export async function createScene(container, options = {}) {
	// Physics WASM downloads and compiles while the graphics device initializes.
	preparePhysics();
	const renderer = new THREE.WebGPURenderer({
		antialias: true,
		samples: 4,
		alpha: false,
		powerPreference: "high-performance",
		forceWebGL: options.forceWebGL === true,
	});
	renderer.setClearColor(0x061019, 1);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.22;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	const renderHealth = watchRenderHealth(renderer, options.onDeviceLost);
	try {
		await renderer.init();
	} catch (error) {
		renderHealth.dispose();
		// Three's dispose() starts an animation-loop init on an uninitialized
		// renderer. Let this unattached, failed instance be collected instead.
		throw error;
	}
	renderer.info.autoReset = false;
	container.appendChild(renderer.domElement);
	renderer.domElement.setAttribute(
		"aria-label",
		"Three-dimensional star system and spacecraft",
	);
	renderer.domElement.style.cssText =
		"display:block;width:100%;height:100%;touch-action:none";
	const world = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-30, 30, 22, -22, 0.1, 700);
	const physics = await createPhysics({ maxBodies: PRESETS.High.bodies });
	const environment = createEnvironment(renderer);
	world.environment = environment.texture;
	world.environmentIntensity = 0.68;
	const key = new THREE.DirectionalLight(0xffe4b7, 3.3);
	key.position.set(-15, 32, 18);
	key.castShadow = true;
	key.shadow.mapSize.set(2048, 2048);
	key.shadow.camera.left = key.shadow.camera.bottom = -13;
	key.shadow.camera.right = key.shadow.camera.top = 13;
	key.shadow.camera.near = 1;
	key.shadow.camera.far = 90;
	key.shadow.normalBias = 0.06;
	key.shadow.bias = -0.0002;
	key.shadow.radius = 2.5;
	world.add(key, key.target);
	world.add(new THREE.HemisphereLight(0xa7e0e4, 0x172030, 1.1));
	const fill = new THREE.DirectionalLight(0x56bbc6, 1.8);
	fill.position.set(20, 8, -22);
	world.add(fill);

	const skyMaterial = new THREE.MeshBasicNodeMaterial({
		side: THREE.BackSide,
		depthWrite: false,
	});
	const skyDirection = positionLocal.normalize();
	skyMaterial.colorNode = color(0x051019)
		.add(
			color(0x12343c).mul(
				skyDirection
					.dot(vec3(0.5, -0.5, -0.6))
					.max(0)
					.pow(6),
			),
		)
		.add(
			color(0x211e29).mul(
				skyDirection
					.dot(vec3(-0.7, 0.1, -0.6))
					.max(0)
					.pow(9),
			),
		);
	const sky = new THREE.Mesh(
		new THREE.SphereGeometry(290, 20, 12),
		skyMaterial,
	);
	world.add(sky);
	const starGeometry = new THREE.BufferGeometry();
	const starPositions = [],
		starColors = [];
	const rng = randomGenerator(1091);
	for (let i = 0; i < 5200; i++) {
		const theta = rng() * TAU,
			azimuth = Math.acos(2 * rng() - 1),
			radius = 200 + rng() * 60;
		starPositions.push(
			Math.sin(azimuth) * Math.cos(theta) * radius,
			Math.cos(azimuth) * radius,
			Math.sin(azimuth) * Math.sin(theta) * radius,
		);
		const tint = new THREE.Color(
			i % 11 === 0 ? 0xfac68b : i % 4 === 0 ? 0x76acb8 : 0xbbc8c6,
		).multiplyScalar(0.3 + rng() * 0.75);
		starColors.push(tint.r, tint.g, tint.b);
	}
	starGeometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(starPositions, 3),
	);
	starGeometry.setAttribute(
		"color",
		new THREE.Float32BufferAttribute(starColors, 3),
	);
	const stars = new THREE.Points(
		starGeometry,
		new THREE.PointsNodeMaterial({
			vertexColors: true,
			size: 1.5,
			sizeAttenuation: false,
		}),
	);
	world.add(stars);
	const planet = createPlanet();
	world.add(planet);
	const stellarMaterial = new THREE.MeshBasicNodeMaterial();
	stellarMaterial.colorNode = color(0xffd38a).mul(
		normalLocal
			.dot(vec3(-0.4, 0.8, 0.3))
			.mul(0.55)
			.add(0.85),
	);
	const starLandmark = new THREE.Group();
	const stellarGeometry = new THREE.IcosahedronGeometry(6.8, 2);
	stellarGeometry.computeVertexNormals();
	starLandmark.add(new THREE.Mesh(stellarGeometry, stellarMaterial));
	const corona = new THREE.Mesh(
		new THREE.IcosahedronGeometry(7.15, 3),
		new THREE.MeshBasicNodeMaterial({
			color: 0xffb867,
			transparent: true,
			opacity: 0.45,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			side: THREE.BackSide,
		}),
	);
	starLandmark.add(corona);
	starLandmark.position.copy(planet.position);
	starLandmark.visible = false;
	world.add(starLandmark);
	const specialLandmarks = createSpecialLandmarks();
	world.add(specialLandmarks.group);
	const station = createStation();
	world.add(station);
	// Small ships on a lower, distant orbital layer are ambient traffic, not targetable contacts.
	const traffic = ["shuttle", "star barge", "hawk"].map((id, index) => {
		const mesh = createShipModel(id, false, {
			faction: index === 2 ? "Republic" : "Independent",
		});
		mesh.name = "Distant orbital traffic";
		mesh.userData.decorative = true;
		mesh.scale.setScalar(mesh.userData.baseScale * 0.43);
		world.add(mesh);
		return mesh;
	});
	const orbitMaterial = new THREE.LineBasicNodeMaterial({
		color: 0x36535a,
		transparent: true,
		opacity: 0.3,
	});
	const orbits = new THREE.Group();
	for (const radius of [14.5, 26, 42]) {
		const orbit = ring(radius, orbitMaterial);
		orbit.position.y = -2.4;
		orbits.add(orbit);
	}
	world.add(orbits);
	const dockRing = new THREE.Mesh(
		new THREE.TorusGeometry(2.05, 0.025, 4, 64),
		emissive(0x79c9ba, 0.65),
	);
	dockRing.rotation.x = Math.PI / 2;
	dockRing.position.set(DOCK.x, -0.8, DOCK.z);
	world.add(dockRing);
	const dockTicks = new THREE.Group();
	for (let i = 0; i < 8; i++) {
		const tick = new THREE.Mesh(
			new THREE.BoxGeometry(0.05, 0.035, 0.43),
			emissive(0x83baae, 0.4),
		);
		tick.position.set(
			DOCK.x + Math.cos((i / 8) * TAU) * 2.45,
			-0.8,
			DOCK.z + Math.sin((i / 8) * TAU) * 2.45,
		);
		tick.rotation.y = (-i / 8) * TAU;
		dockTicks.add(tick);
	}
	world.add(dockTicks);

	let ship = createShipModel(
		options.ship?.id || "sparrow",
		false,
		options.ship || {},
	);
	world.add(ship);
	const player = physics.add({
		x: 12,
		z: 14,
		radius: 1.5,
		mass: 8,
		damping: 0.12,
	});
	let yaw = -0.28;
	let view = "title";
	let paused = false;
	let quality = "Auto",
		effective = "High";
	let time = 0,
		fireTimer = 0,
		impactTimer = 0,
		shipId = options.ship?.id || "sparrow";
	let frameMs = 16.7;
	const qualitySampler = createQualitySampler();
	const suspendMeasurement = () => qualitySampler.suspend();
	document.addEventListener("visibilitychange", suspendMeasurement);
	let landReady = false,
		disposed = false,
		jumpFlash = 0;
	let currentSystem = options.system || {
		id: "sol",
		color: "#65a5b2",
		danger: 0,
	};
	let currentStats = { speed: 12, damage: 12 };
	let requestedEnemies = 0;
	let wreckSerial = 0;
	let queuedEnemies = 0,
		spawnedEnemies = 0,
		combatBoss = false;
	let encounterFaction = "Pirate";
	let encounterShipIds = [];
	let visualThrust = 0;
	let visualCloak = null;
	let secondaryTimer = 0,
		interceptTimer = 0,
		secondaryCount = 0,
		interceptCount = 0;
	let qualityConfigured = false;
	let presetConfigured = false;
	const cameraTarget = new THREE.Vector3(-10, 0, 0);
	const projectiles = [],
		enemies = [],
		escorts = [],
		rocks = [],
		effects = [],
		pickups = [];
	const asteroidField = createAsteroidField(world, PRESETS.High.rocks);
	const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
	const raycaster = new THREE.Raycaster();
	const aimPosition = new THREE.Vector3();
	const shotGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.45);
	const playerShotMaterial = emissive(0xa7fff1);
	const enemyShotMaterial = emissive(0xff866a);
	const secondaryGeometry = new THREE.BoxGeometry(0.23, 0.2, 1.05);
	const secondaryMaterial = emissive(0xffca79);
	secondaryMaterial.color.multiplyScalar(1.8);
	const missileTrailGeometry = new THREE.ConeGeometry(0.13, 2.1, 6);
	const missileTrailMaterial = emissive(0xffdc9b, 0.6);
	const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
	const particleMaterials = [
		emissive(0xffc87b),
		emissive(0xc1fff1),
		emissive(0xfe8861),
	];
	const pickupGeometry = new THREE.OctahedronGeometry(0.33);
	const pickupMaterial = emissive(0xf6c77d);

	const wrecks = createWrecks({
		physics,
		world,
		player,
		reserveSlot: reservePhysicsSlot,
		activeLimit: () => (effective === "High" ? 12 : 8),
		hostiles: () =>
			enemies.length + queuedEnemies + missionActors.hostileCount(),
	});

	const missionActors = createMissionActors({
		physics,
		world,
		player,
		reserveSlot: reservePhysicsSlot,
		shoot,
		burst: spawnBurst,
		actorLimit: () => (effective === "High" ? 18 : 12),
		genericHostiles: () => enemies.length + queuedEnemies,
		combatTargets: () => [...enemies, ...missionActors.hostiles()],
	});
	function reservePhysicsSlot(allowWreckRetirement = true) {
		while (physics.count >= physics.maxBodies && rocks.length) {
			const farthest = [...rocks].sort(
				(a, b) =>
					distance(b.physics.current, player.current) -
					distance(a.physics.current, player.current),
			)[0];
			removeRock(farthest);
		}
		if (allowWreckRetirement)
			while (physics.count >= physics.maxBodies && wrecks.releaseFarthest()) {}
		return physics.count < physics.maxBodies;
	}

	const scenePass = pass(world, camera, { samples: 4 });
	const sceneColor = scenePass.getTextureNode("output");
	const bloomNode = bloom(sceneColor, 0.22, 0.55, 1.3);
	bloomNode.setResolutionScale(0.4);
	// WebGPU cannot textureGather a multisampled depth attachment. AO gets a small,
	// unmultisampled depth prepass; the visible scene retains stable four-sample MSAA.
	const aoDepthPass = pass(world, camera, { samples: 0 });
	aoDepthPass.setResolutionScale(0.5);
	aoDepthPass.transparent = false;
	const depthMaterial = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
	aoDepthPass.overrideMaterial = depthMaterial;
	const aoNode = ao(aoDepthPass.getTextureNode("depth"), null, camera);
	aoNode.resolutionScale = 0.5;
	aoNode.radius.value = 0.7;
	aoNode.scale.value = 0.7;
	aoNode.samples.value = 8;
	const vignette = float(1).sub(
		screenUV.sub(0.5).length().smoothstep(0.25, 0.75).mul(0.23),
	);
	const pipeline = new THREE.RenderPipeline(renderer);
	function configurePipeline() {
		const settings = PRESETS[effective];
		let output = sceneColor.rgb;
		if (settings.ao) output = output.mul(mix(float(0.79), float(1), aoNode));
		if (settings.bloom) output = output.add(bloomNode.rgb);
		pipeline.outputNode = vec4(output.mul(vignette), 1);
		pipeline.needsUpdate = true;
	}
	function resize() {
		const width = Math.max(1, container.clientWidth || innerWidth);
		const height = Math.max(1, container.clientHeight || innerHeight);
		const preset = PRESETS[effective];
		const budget = Math.sqrt((preset.pixels ?? Infinity) / (width * height));
		renderer.setPixelRatio(
			Math.min(devicePixelRatio || 1, preset.dpr, Math.max(0.5, budget)),
		);
		renderer.setSize(width, height, false);
		const half = view === "title" ? 20 : view === "port" ? 23 : 22;
		camera.left = (-half * width) / height;
		camera.right = (half * width) / height;
		camera.top = half;
		camera.bottom = -half;
		camera.updateProjectionMatrix();
	}
	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(container);
	// Moving to another display can change the pixel ratio without resizing the canvas.
	let pixelRatioQuery = null;
	function watchPixelRatio() {
		pixelRatioQuery?.removeEventListener("change", onPixelRatioChange);
		pixelRatioQuery =
			globalThis.matchMedia?.(`(resolution: ${devicePixelRatio || 1}dppx)`) ||
			null;
		pixelRatioQuery?.addEventListener("change", onPixelRatioChange);
	}
	function onPixelRatioChange() {
		resize();
		watchPixelRatio();
	}
	watchPixelRatio();

	function removeRock(rock) {
		physics.remove(rock.physics);
		asteroidField.remove(rock.mesh);
		rocks.splice(rocks.indexOf(rock), 1);
	}
	function populateRocks() {
		const desired = PRESETS[effective].rocks;
		while (rocks.length > desired) removeRock(rocks.at(-1));
		const rockRng = randomGenerator(412 + rocks.length * 313);
		while (rocks.length < desired) {
			const angle = (rocks.length / desired) * TAU + rockRng() * 0.18;
			const radius = 22 + rockRng() * 19;
			const size = 0.55 + rockRng() * 1.1;
			const position = {
				x: Math.cos(angle) * radius,
				z: Math.sin(angle) * radius,
			};
			const entry = physics.add({
				...position,
				radius: size * 0.83,
				mass: size * 7,
				damping: 0.01,
			});
			if (!entry) break;
			const mesh = asteroidField.add(size, rockRng() > 0.75);
			mesh.rotation.set(rockRng() * 6, rockRng() * 6, rockRng() * 6);
			mesh.position.set(position.x, -0.2, position.z);
			entry.body.setLinvel(
				{ x: -Math.sin(angle) * 0.25, y: 0, z: Math.cos(angle) * 0.25 },
				true,
			);
			rocks.push({ mesh, physics: entry, hp: 22 + size * 12, size });
		}
	}
	function applyPreset(name) {
		if (presetConfigured && effective === name) return;
		presetConfigured = true;
		effective = name;
		const settings = PRESETS[name];
		physics.setLimit(settings.bodies);
		key.shadow.mapSize.set(settings.shadow, settings.shadow);
		if (key.shadow.map) {
			key.shadow.map.dispose();
			key.shadow.map = null;
		}
		key.shadow.needsUpdate = true;
		populateRocks();
		while (physics.count > settings.bodies && rocks.length)
			removeRock(rocks.at(-1));
		while (physics.count > settings.bodies && wrecks.releaseFarthest()) {}
		configurePipeline();
		resize();
	}
	function setQuality(name) {
		const next = ["Auto", "High", "Balanced"].includes(name) ? name : "Auto";
		if (qualityConfigured && quality === next) return;
		qualityConfigured = true;
		quality = next;
		qualitySampler.reset();
		applyPreset(quality === "Auto" ? "High" : quality);
	}

	// Shots, particles and pickups draw as one instanced batch per material, a handful of
	// draw calls however heavy the combat. Gameplay moves recycled Object3D stand-ins
	// whose matrices are copied into the batch each frame.
	const batches = new Map(
		[
			[shotGeometry, playerShotMaterial, 64],
			[shotGeometry, enemyShotMaterial, 64],
			[secondaryGeometry, secondaryMaterial, 64],
			[missileTrailGeometry, missileTrailMaterial, 64],
			...particleMaterials.map((material) => [particleGeometry, material, 100]),
			[pickupGeometry, pickupMaterial, 64],
		].map(([geometry, material, capacity]) => {
			const mesh = new THREE.InstancedMesh(geometry, material, capacity);
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			mesh.frustumCulled = false;
			mesh.count = 0;
			mesh.visible = false;
			world.add(mesh);
			return [material, { mesh, capacity, active: new Set(), spare: [] }];
		}),
	);
	function acquireMesh(_geometry, material) {
		const batch = batches.get(material);
		const proxy = batch.spare.pop() || new THREE.Object3D();
		proxy.position.set(0, 0, 0);
		proxy.rotation.set(0, 0, 0);
		proxy.scale.setScalar(1);
		proxy.userData.batch = batch;
		batch.active.add(proxy);
		return proxy;
	}
	function releaseMesh(proxy) {
		proxy.removeFromParent();
		for (const child of [...proxy.children]) releaseMesh(child);
		const { batch } = proxy.userData;
		if (batch.active.delete(proxy)) batch.spare.push(proxy);
	}
	function syncBatches() {
		for (const batch of batches.values()) {
			let count = 0;
			for (const proxy of batch.active) {
				if (count === batch.capacity) break;
				proxy.updateWorldMatrix(true, false);
				batch.mesh.setMatrixAt(count++, proxy.matrixWorld);
			}
			batch.mesh.count = count;
			batch.mesh.visible = count > 0;
			if (count) batch.mesh.instanceMatrix.needsUpdate = true;
		}
	}

	function spawnBurst(x, z, count = 16, kind = 0) {
		const cap = PRESETS[effective].particles;
		for (let i = 0; i < count && effects.length < cap; i++) {
			const mesh = acquireMesh(particleGeometry, particleMaterials[kind]);
			mesh.position.set(x, 0.1 + Math.random() * 0.4, z);
			mesh.scale.setScalar(0.55 + Math.random() * 1.6);
			const angle = Math.random() * TAU,
				speed = 1 + Math.random() * 7;
			effects.push({
				mesh,
				vx: Math.cos(angle) * speed,
				vz: Math.sin(angle) * speed,
				life: 0.35 + Math.random() * 0.65,
				total: 1,
			});
		}
	}
	function spawnPickup(x, z, credits = 75) {
		const mesh = acquireMesh(pickupGeometry, pickupMaterial);
		mesh.position.set(x, 0.4, z);
		pickups.push({ mesh, x, z, credits, age: 0 });
	}
	function removeEnemy(enemy) {
		physics.remove(enemy.physics);
		disposeObject(enemy.mesh);
		enemies.splice(enemies.indexOf(enemy), 1);
	}

	function enemyModel(boss, index) {
		const shipId = encounterShipIds.length
			? encounterShipIds[
					(boss ? encounterShipIds.length - 1 : index) % encounterShipIds.length
				]
			: boss
				? "falcon"
				: index % 3 === 0
					? "sparrow"
					: "hawk";
		const model = createShipModel(shipId, true, { faction: encounterFaction });
		model.scale.multiplyScalar(boss ? 1.1 : 0.8);
		model.userData.shipId = shipId;
		return model;
	}
	function syncEncounter(encounter) {
		if (!encounter) return;
		const faction = encounter.faction || encounterFaction;
		const ids = Array.isArray(encounter.shipIds)
			? encounter.shipIds.filter((id) => typeof id === "string" && id.length)
			: [];
		if (
			faction === encounterFaction &&
			ids.join("|") === encounterShipIds.join("|")
		)
			return;
		encounterFaction = faction;
		encounterShipIds = [...ids];
		enemies.forEach((enemy) => {
			disposeObject(enemy.mesh);
			enemy.mesh = enemyModel(enemy.boss, enemy.pilot);
			world.add(enemy.mesh);
		});
	}

	function removeEscort(escort) {
		physics.remove(escort.physics);
		disposeObject(escort.mesh);
		escorts.splice(escorts.indexOf(escort), 1);
	}
	function setFleet(roster = [], command) {
		const alive = roster
			.filter((member) => Number(member.hull ?? 100) > 0)
			.slice(0, 8);
		for (const escort of [...escorts])
			if (!alive.some((member) => member.id === escort.id))
				removeEscort(escort);
		for (let index = 0; index < alive.length; index++) {
			const member = alive[index];
			const nextCommand = String(
				member.command || command || "protect",
			).toLowerCase();
			let escort = escorts.find((entry) => entry.id === member.id);
			if (escort && escort.shipId !== member.shipId) {
				removeEscort(escort);
				escort = null;
			}
			if (!escort) {
				const x =
					player.current.x +
					(index % 2 === 0 ? -1 : 1) * (4 + Math.floor(index / 2) * 2.8);
				const z = player.current.z + 4 + Math.floor(index / 2) * 3;
				if (!reservePhysicsSlot()) continue;
				const body = physics.add({ x, z, radius: 1.1, mass: 5, damping: 0.25 });
				if (!body) continue;
				const mesh = createShipModel(member.shipId || "hawk", false, {
					category: member.category,
					faction: "Free Worlds",
				});
				mesh.scale.multiplyScalar(0.73);
				mesh.position.set(x, 0.1, z);
				const marker = new THREE.Mesh(
					new THREE.TorusGeometry(1.45, 0.018, 4, 36),
					emissive(0x8ad6c2, 0.45),
				);
				marker.rotation.x = Math.PI / 2;
				marker.position.y = -0.75;
				mesh.add(marker);
				world.add(mesh);
				escort = {
					id: member.id,
					shipId: member.shipId,
					mesh,
					physics: body,
					yaw,
					shot: 0.4 + index * 0.2,
					hp: member.hull ?? 100,
					authoritativeHull: member.hull ?? 100,
					command: nextCommand,
					anchor: { x, z },
					index,
				};
				escorts.push(escort);
			}
			if (escort.command !== nextCommand) {
				escort.anchor = { ...escort.physics.current };
				escort.command = nextCommand;
			}
			const hull = member.hull ?? 100;
			if (hull !== escort.authoritativeHull) {
				escort.hp = hull;
				escort.authoritativeHull = hull;
				escort.mesh.visible = hull > 0;
			}
			escort.damage = Number.isFinite(member.damage)
				? Math.max(0, member.damage)
				: 9;
			escort.speed =
				Number.isFinite(member.speed) && member.speed > 0 ? member.speed : null;
			escort.index = index;
		}
	}
	function closestEnemy(position) {
		let selected = null,
			best = Infinity;
		for (const enemy of [...enemies, ...missionActors.hostiles()]) {
			const separation = distance(position, enemy.physics.current);
			if (separation < best) {
				best = separation;
				selected = enemy;
			}
		}
		return selected;
	}
	function fillCombatWave() {
		while (queuedEnemies > 0 && enemies.length < 12) {
			const index = spawnedEnemies;
			const angle =
				((index % 12) / Math.min(12, Math.max(1, requestedEnemies))) * TAU +
				0.7;
			const radius = 20 + (index % 3) * 5;
			const x = player.current.x + Math.cos(angle) * radius,
				z = player.current.z + Math.sin(angle) * radius;
			const isBoss = combatBoss && index === 0;
			if (!reservePhysicsSlot()) break;
			const body = physics.add({
				x,
				z,
				radius: isBoss ? 2 : 1.2,
				mass: isBoss ? 14 : 6,
				damping: 0.4,
			});
			if (!body) break;
			const model = enemyModel(isBoss, index);
			model.position.set(x, 0, z);
			world.add(model);
			enemies.push({
				mesh: model,
				physics: body,
				hp: isBoss ? 150 : 48,
				yaw: angle,
				shot: 1 + (index % 6) * 0.37,
				boss: isBoss,
				pilot: index,
			});
			queuedEnemies--;
			spawnedEnemies++;
		}
	}
	function setCombat(count, boss = false) {
		enemies.slice().forEach(removeEnemy);
		requestedEnemies = Number.isFinite(count)
			? Math.max(0, Math.floor(count))
			: 0;
		queuedEnemies = requestedEnemies;
		spawnedEnemies = 0;
		combatBoss = boss;
		fillCombatWave();
	}

	function clearTransient() {
		for (const shot of projectiles) releaseMesh(shot.mesh);
		projectiles.length = 0;
		for (const effect of effects) releaseMesh(effect.mesh);
		effects.length = 0;
		for (const pickup of pickups) releaseMesh(pickup.mesh);
		pickups.length = 0;
	}
	function setSystem(system) {
		currentSystem = system;
		missionActors.clear();
		wrecks.clear();
		escorts.slice().forEach(removeEscort);
		setCombat(0);
		clearTransient();
		rocks.slice().forEach(removeRock);
		physics.teleport(player, 12, 14);
		yaw = -0.28;
		planet.rotation.y =
			(String(system.id)
				.split("")
				.reduce((sum, char) => sum + char.charCodeAt(0), 0) %
				30) *
			0.15;
		const tint = new THREE.Color(system.color || 0x63a2aa);
		planet.userData.surface.material.color
			.copy(tint)
			.lerp(new THREE.Color(0xffffff), 0.68);
		fill.color.copy(tint);
		planet.scale.setScalar(
			/barren|dust|desert|rock/i.test(String(system.planet)) ? 0.88 : 1,
		);
		populateRocks();
		jumpFlash = 1;
		landReady = false;
	}
	function setShip(stats) {
		currentStats = { ...currentStats, ...stats };
		if (shipId === stats.id) return;
		shipId = stats.id;
		disposeObject(ship);
		ship = createShipModel(shipId, false, stats);
		visualCloak = null;
		world.add(ship);
	}
	function authorizeWeapon(action) {
		if (typeof options.authorizeAction !== "function") return true;
		const result = options.authorizeAction(action);
		return result === true || result?.ok === true;
	}
	function setCloakAppearance(cloaked) {
		if (visualCloak === cloaked) return;
		visualCloak = cloaked;
		ship.traverse((node) => {
			if (!node.isMesh) return;
			node.userData.originalCastShadow ??= node.castShadow;
			node.castShadow = cloaked ? false : node.userData.originalCastShadow;
			for (const material of Array.isArray(node.material)
				? node.material
				: [node.material]) {
				material.userData.originalOpacity ??= material.opacity;
				material.userData.originalTransparent ??= material.transparent;
				material.opacity =
					material.userData.originalOpacity * (cloaked ? 0.23 : 1);
				material.transparent = cloaked || material.userData.originalTransparent;
				material.needsUpdate = true;
			}
		});
	}

	function shoot(
		x,
		z,
		angle,
		hostile = false,
		damage = 12,
		owner = "player",
		weapon = {},
	) {
		if (projectiles.length >= 64) return false;
		const mesh = acquireMesh(
			weapon.secondary ? secondaryGeometry : shotGeometry,
			weapon.secondary
				? secondaryMaterial
				: hostile
					? enemyShotMaterial
					: playerShotMaterial,
		);
		mesh.position.set(x + Math.sin(angle) * 2, 0, z - Math.cos(angle) * 2);
		mesh.rotation.y = -angle;
		if (weapon.secondary && weapon.homing) {
			const trail = acquireMesh(missileTrailGeometry, missileTrailMaterial);
			trail.rotation.x = Math.PI / 2;
			trail.position.z = 1.2;
			mesh.add(trail);
		}
		const speed = weapon.speed || (hostile ? 28 : 56);
		projectiles.push({
			mesh,
			vx: Math.sin(angle) * speed,
			vz: -Math.cos(angle) * speed,
			life: weapon.secondary ? (weapon.homing ? 4 : 2.5) : hostile ? 2.1 : 1.2,
			secondary: !!weapon.secondary,
			homing: !!weapon.homing,
			hostile,
			damage,
			owner,
		});
		return true;
	}
	function accelerate(entry, dx, dz, acceleration, dt, maxSpeed) {
		const velocity = entry.body.linvel();
		let x = velocity.x + dx * acceleration * dt,
			z = velocity.z + dz * acceleration * dt;
		const speed = Math.hypot(x, z);
		if (speed > maxSpeed) {
			x *= maxSpeed / speed;
			z *= maxSpeed / speed;
		}
		entry.body.setLinvel({ x, y: 0, z }, true);
	}
	function update(dt, state = {}, input = {}) {
		if (disposed || !renderHealth.ready) return [];
		if (document.hidden) {
			physics.resetClock();
			qualitySampler.suspend();
			return [];
		}
		// Throttled redraws behind a menu are not performance samples.
		if (state.menu) qualitySampler.suspend();
		const measurement = state.menu
			? { frameMs: null, preset: null }
			: qualitySampler.observe(performance.now(), quality, effective);
		if (measurement.frameMs !== null)
			frameMs += (measurement.frameMs - frameMs) * 0.045;
		if (measurement.preset) applyPreset(measurement.preset);
		if (Array.isArray(state.escorts))
			setFleet(state.escorts, state.fleetCommand);
		if (Array.isArray(state.missionActors))
			missionActors.sync(state.missionActors);
		if (Array.isArray(state.wrecks)) wrecks.sync(state.wrecks);
		wrecks.setContext({ view, mode: state.mode });
		if (state.system?.id === currentSystem.id) currentSystem = state.system;
		const hasLanding =
			!Array.isArray(currentSystem.planets) || currentSystem.planets.length > 0;
		const landmark = describeLandmark(currentSystem);
		specialLandmarks.set(landmark);
		planet.visible = landmark.kind === "planet";
		starLandmark.visible = [
			"star",
			"stellar",
			"stellar-garden",
			"ringworld",
			"ring-station",
		].includes(landmark.kind);
		if (landmark.kind === "ring-station") {
			starLandmark.position.set(-9, -13, -13);
			starLandmark.scale.setScalar(0.34);
		} else {
			if (landmark.kind === "ringworld") starLandmark.position.set(0, -6.3, -3);
			else starLandmark.position.copy(planet.position);
			starLandmark.scale.setScalar(
				landmark.kind === "ringworld"
					? 0.43
					: landmark.kind === "stellar-garden"
						? 0.9
						: 1,
			);
		}
		station.visible = hasLanding && currentSystem.inhabited !== false;
		dockRing.visible = hasLanding;
		dockTicks.visible = hasLanding;
		syncEncounter(state.encounter);
		const events = [];
		const elapsed = Math.min(dt || 1 / 60, 0.1);
		time += elapsed;
		if (state.ship) currentStats = { ...currentStats, ...state.ship };
		const cloaked =
			!!(state.cloaked ?? currentStats.cloaked) && view === "flight";
		setCloakAppearance(cloaked);
		const active =
			!paused &&
			!state.paused &&
			view === "flight" &&
			state.mode !== "destroyed";
		let thrust = input.thrust || 0;
		const baseSpeed = flightSpeed(currentStats.speed);
		const approachActor = input.approachActorId
			? missionActors.get(input.approachActorId)
			: null;
		const approachWreck = input.approachWreckId
			? wrecks.get(input.approachWreckId)
			: null;
		if (approachWreck) wrecks.select(approachWreck.id);
		const useAutopilot =
			!!input.autopilot || !!approachActor || !!approachWreck;
		let navigationTarget = DOCK;
		if (approachActor || approachWreck) {
			const at = approachActor?.physics.current || approachWreck.position;
			const dx = player.current.x - at.x,
				dz = player.current.z - at.z,
				length = Math.hypot(dx, dz) || 1;
			navigationTarget = {
				x: at.x + (dx / length) * 4.2,
				z: at.z + (dz / length) * 4.2,
			};
		}
		missionActors.setContext({
			active,
			view,
			time,
			yaw,
			speed: baseSpeed,
			mode: state.mode,
			hasLanding,
			cloaked,
			escorts,
		});

		let targetAngle = null;
		if (
			input.aim &&
			Number.isFinite(input.aim.x) &&
			Number.isFinite(input.aim.y)
		) {
			raycaster.setFromCamera(input.aim, camera);
			if (raycaster.ray.intersectPlane(aimPlane, aimPosition))
				targetAngle = Math.atan2(
					aimPosition.x - player.current.x,
					-(aimPosition.z - player.current.z),
				);
		}
		if (useAutopilot) {
			const dx = navigationTarget.x - player.current.x,
				dz = navigationTarget.z - player.current.z;
			targetAngle = Math.atan2(dx, -dz);
			thrust = Math.hypot(dx, dz) > 1 ? 1 : 0;
		}
		let alpha = 1;
		if (active) {
			alpha = physics.advance(elapsed, (fixed) => {
				const velocity = player.body.linvel();
				let turn = input.turn || 0;
				if (targetAngle !== null)
					turn = clamp(wrap(targetAngle - yaw) * 2.5, -1, 1);
				yaw = wrap(
					yaw + turn * fixed * (2.6 + Math.max(0, currentStats.turn || 0)),
				);
				if (useAutopilot) {
					const dx = navigationTarget.x - player.current.x,
						dz = navigationTarget.z - player.current.z;
					const separation = Math.hypot(dx, dz);
					const desired = Math.min(baseSpeed * 0.72, separation * 1.5);
					const blend = Math.min(1, fixed * 2.2);
					player.body.setLinvel(
						{
							x:
								velocity.x +
								((dx / Math.max(0.01, separation)) * desired - velocity.x) *
									blend,
							y: 0,
							z:
								velocity.z +
								((dz / Math.max(0.01, separation)) * desired - velocity.z) *
									blend,
						},
						true,
					);
				} else {
					accelerate(
						player,
						Math.sin(yaw),
						-Math.cos(yaw),
						thrust * (input.boost ? 18 : 10),
						fixed,
						baseSpeed * (input.boost ? 1.7 : 1),
					);
					if (input.brake) {
						const speed = player.body.linvel();
						const factor = Math.exp(
							-fixed * 3.2 * (1 + clamp(currentStats.braking || 0, 0, 3)),
						);
						player.body.setLinvel(
							{ x: speed.x * factor, y: 0, z: speed.z * factor },
							true,
						);
					}
				}
				// Navigation remains in the local star-system neighborhood; this spring is gentle and visible in the HUD.
				const radius = Math.hypot(player.current.x, player.current.z);
				if (radius > 100)
					accelerate(
						player,
						-player.current.x / radius,
						-player.current.z / radius,
						(radius - 100) * 0.45,
						fixed,
						baseSpeed * 1.7,
					);
				missionActors.setContext({ yaw });
				missionActors.fixedStep(fixed);

				for (const escort of escorts) {
					if (escort.hp <= 0) continue;
					const at = escort.physics.current;
					const target = closestEnemy(at);
					let destination;
					if (escort.command === "hold") destination = escort.anchor;
					else if (escort.command === "attack" && target) {
						const dx = at.x - target.physics.current.x,
							dz = at.z - target.physics.current.z;
						const length = Math.hypot(dx, dz) || 1;
						destination = {
							x: target.physics.current.x + (dx / length) * 7,
							z: target.physics.current.z + (dz / length) * 7,
						};
					} else {
						const side =
							(escort.index % 2 === 0 ? -1 : 1) *
							(4 + Math.floor(escort.index / 2) * 2.8);
						const behind = 4 + Math.floor(escort.index / 2) * 3;
						destination = {
							x:
								player.current.x +
								Math.cos(yaw) * side -
								Math.sin(yaw) * behind,
							z:
								player.current.z +
								Math.sin(yaw) * side +
								Math.cos(yaw) * behind,
						};
					}
					if (distance(at, player.current) > 85 && escort.command !== "hold")
						physics.teleport(escort.physics, destination.x, destination.z);
					const dx = destination.x - at.x,
						dz = destination.z - at.z;
					const maximumSpeed = escort.speed || baseSpeed * 1.2;
					const desiredSpeed = Math.min(maximumSpeed, Math.hypot(dx, dz) * 1.8);
					const length = Math.hypot(dx, dz) || 1;
					const v = escort.physics.body.linvel();
					const follow =
						escort.command === "protect"
							? player.body.linvel()
							: { x: 0, z: 0 };

					const blend = Math.min(1, fixed * 2.4);
					const targetX = (dx / length) * desiredSpeed + follow.x * 0.72;
					const targetZ = (dz / length) * desiredSpeed + follow.z * 0.72;
					const velocityScale = Math.min(
						1,
						maximumSpeed / Math.max(0.001, Math.hypot(targetX, targetZ)),
					);
					escort.physics.body.setLinvel(
						{
							x: v.x + (targetX * velocityScale - v.x) * blend,
							y: 0,
							z: v.z + (targetZ * velocityScale - v.z) * blend,
						},
						true,
					);
					const shooting =
						target &&
						distance(at, target.physics.current) <
							(escort.command === "hold" ? 20 : 28);
					const desiredYaw = shooting
						? Math.atan2(
								target.physics.current.x - at.x,
								-(target.physics.current.z - at.z),
							)
						: length > 0.3
							? Math.atan2(dx, -dz)
							: yaw;
					escort.yaw +=
						wrap(desiredYaw - escort.yaw) * Math.min(1, fixed * 3.4);
				}

				for (const enemy of enemies) {
					if (!cloaked) enemy.lastKnown = { ...player.current };
					const visibleAlly = cloaked
						? [...missionActors.protectedActors(), ...escorts]
								.filter((ally) => ally.hp > 0)
								.sort(
									(a, b) =>
										distance(a.physics.current, enemy.physics.current) -
										distance(b.physics.current, enemy.physics.current),
								)[0]
						: null;
					const destination = cloaked
						? visibleAlly?.physics.current ||
							enemy.lastKnown ||
							enemy.physics.current
						: player.current;
					const deltaX = destination.x - enemy.physics.current.x,
						deltaZ = destination.z - enemy.physics.current.z;
					const separation = Math.hypot(deltaX, deltaZ);
					const chaseAngle = Math.atan2(deltaX, -deltaZ);
					enemy.yaw += wrap(chaseAngle - enemy.yaw) * Math.min(1, fixed * 2);
					const orbit = separation < 11 ? 0.85 : 0;
					const desiredAngle = enemy.yaw + orbit;
					accelerate(
						enemy.physics,
						Math.sin(desiredAngle),
						-Math.cos(desiredAngle),
						separation < 5 ? -2 : 5,
						fixed,
						enemy.boss ? 6 : 7.2,
					);
				}
			});
			fireTimer -= elapsed;
			impactTimer -= elapsed;
			secondaryTimer -= elapsed;
			interceptTimer -= elapsed;
			const weaponReady =
				currentStats.canFire !== false &&
				!cloaked &&
				!state.overheated &&
				(state.energy === undefined ||
					state.energy >= (currentStats.energyCost || 0));
			if (
				input.fire &&
				fireTimer <= 0 &&
				weaponReady &&
				projectiles.length < 64 &&
				authorizeWeapon("fire")
			) {
				shoot(
					player.current.x,
					player.current.z,
					yaw,
					false,
					currentStats.damage || 12,
				);
				fireTimer = 0.19;
				events.push({ type: "shot" });
				events.push({
					type: "fired",
					authorized: typeof options.authorizeAction === "function",
				});
			}
			if (
				input.secondary &&
				!cloaked &&
				currentStats.canSecondary &&
				secondaryTimer <= 0 &&
				(state.secondaryCooldown || 0) <= 0 &&
				projectiles.length < 64 &&
				authorizeWeapon("secondary")
			) {
				if (
					shoot(
						player.current.x,
						player.current.z,
						yaw,
						false,
						currentStats.secondaryDamage || 40,
						"player",
						{
							secondary: true,
							homing: !!currentStats.secondaryHoming,
							speed: currentStats.secondarySpeed || 33,
						},
					)
				) {
					secondaryTimer = Math.max(
						0.15,
						currentStats.secondaryCooldown || 1.2,
					);
					secondaryCount++;
					events.push({
						type: "secondaryFired",
						authorized: typeof options.authorizeAction === "function",
					});
				}
			}

			for (const escort of escorts) {
				if (escort.hp <= 0 || escort.damage <= 0) continue;
				escort.shot -= elapsed;
				const target = closestEnemy(escort.physics.current);
				if (!target) continue;
				const at = escort.physics.current,
					enemyAt = target.physics.current;
				const aim = Math.atan2(enemyAt.x - at.x, -(enemyAt.z - at.z));
				const range =
					escort.command === "hold"
						? 20
						: escort.command === "protect"
							? 23
							: 30;
				if (
					escort.shot <= 0 &&
					distance(at, enemyAt) < range &&
					Math.abs(wrap(aim - escort.yaw)) < 0.25
				) {
					if (shoot(at.x, at.z, aim, false, escort.damage, escort.id))
						escort.shotsFired = (escort.shotsFired || 0) + 1;
					escort.shot = 0.7;
				}
			}

			for (const enemy of enemies) {
				enemy.shot -= elapsed;
				if (enemy.shot > 0) continue;
				const protectedActors = missionActors.protectedActors();
				const allies = [...protectedActors, ...escorts]
					.filter((escort) => escort.hp > 0)
					.sort(
						(a, b) =>
							distance(a.physics.current, enemy.physics.current) -
							distance(b.physics.current, enemy.physics.current),
					);
				const targetAlly =
					cloaked ||
					(protectedActors.length
						? enemy.pilot % 2 === 0
						: enemy.pilot % 3 === 1)
						? allies[0]
						: null;
				const target =
					targetAlly?.physics.current || (cloaked ? null : player.current);
				if (!target || distance(enemy.physics.current, target) >= 34) continue;
				const dx = target.x - enemy.physics.current.x,
					dz = target.z - enemy.physics.current.z;
				shoot(
					enemy.physics.current.x,
					enemy.physics.current.z,
					Math.atan2(dx, -dz) + Math.sin(time * 2 + enemy.hp) * 0.075,
					true,
					enemy.boss ? 11 : 6,
				);
				enemy.shot = enemy.boss ? 0.8 : 1.4;
			}

			const guidanceTargets = [...enemies, ...missionActors.hostiles()];
			for (let i = projectiles.length - 1; i >= 0; i--) {
				const shot = projectiles[i];
				if (
					tryPointDefense(
						shot,
						player.current,
						currentStats.pointDefense || 0,
						currentStats.canIntercept && !cloaked && interceptTimer <= 0,
					) &&
					authorizeWeapon("intercept")
				) {
					spawnBurst(shot.mesh.position.x, shot.mesh.position.z, 5, 1);
					releaseMesh(shot.mesh);
					projectiles.splice(i, 1);
					interceptTimer = 0.1;
					interceptCount++;
					events.push({
						type: "intercept",
						authorized: typeof options.authorizeAction === "function",
					});
					continue;
				}
				guideProjectile(shot, elapsed, guidanceTargets);

				const oldX = shot.mesh.position.x,
					oldZ = shot.mesh.position.z;
				shot.mesh.position.x += shot.vx * elapsed;
				shot.mesh.position.z += shot.vz * elapsed;
				shot.life -= elapsed;
				const segmentDistance = (target) => {
					const sx = shot.mesh.position.x - oldX,
						sz = shot.mesh.position.z - oldZ;
					const t = clamp(
						((target.x - oldX) * sx + (target.z - oldZ) * sz) /
							Math.max(0.001, sx * sx + sz * sz),
						0,
						1,
					);
					return Math.hypot(target.x - oldX - sx * t, target.z - oldZ - sz * t);
				};
				if (missionActors.hit(shot, segmentDistance)) {
					shot.life = -1;
				} else if (shot.hostile) {
					const intercepted = escorts.find(
						(escort) =>
							escort.hp > 0 && segmentDistance(escort.physics.current) < 1.25,
					);
					if (intercepted) {
						intercepted.hp -= shot.damage;
						events.push({
							type: "escortHit",
							escortId: intercepted.id,
							damage: shot.damage,
						});
						spawnBurst(
							intercepted.physics.current.x,
							intercepted.physics.current.z,
							intercepted.hp <= 0 ? 24 : 6,
							1,
						);
						if (intercepted.hp <= 0) intercepted.mesh.visible = false;
						shot.life = -1;
					} else if (segmentDistance(player.current) < 1.6) {
						events.push({ type: "hit", damage: shot.damage });
						spawnBurst(player.current.x, player.current.z, 7, 1);
						shot.life = -1;
						impactTimer = 0.25;
					}
				} else {
					for (const enemy of [...enemies])
						if (
							segmentDistance(enemy.physics.current) < (enemy.boss ? 2.1 : 1.3)
						) {
							enemy.hp -= shot.damage;
							shot.life = -1;
							spawnBurst(
								enemy.physics.current.x,
								enemy.physics.current.z,
								enemy.hp <= 0 ? 28 : 5,
								enemy.hp <= 0 ? 0 : 2,
							);
							if (enemy.hp <= 0) {
								spawnPickup(
									enemy.physics.current.x,
									enemy.physics.current.z,
									enemy.boss ? 450 : 85,
								);

								const wreck = wrecks.adopt(enemy, {
									id: `wreck:${currentSystem.id}:${Date.now().toString(36)}:${++wreckSerial}`,
									shipId: enemy.mesh.userData.shipId || "sparrow",
									faction: encounterFaction,
								});
								enemies.splice(enemies.indexOf(enemy), 1);
								events.push({
									type: "kill",
									wreck,
									escortId: shot.owner === "player" ? undefined : shot.owner,
								});
							}
							break;
						}
					if (shot.life > 0)
						for (const rock of [...rocks])
							if (segmentDistance(rock.physics.current) < rock.size) {
								rock.hp -= shot.damage;
								shot.life = -1;
								spawnBurst(rock.physics.current.x, rock.physics.current.z, 5);
								if (rock.hp <= 0) {
									spawnPickup(
										rock.physics.current.x,
										rock.physics.current.z,
										35 + Math.floor(rock.size * 40),
									);
									removeRock(rock);
									events.push({ type: "mined" });
								}
								break;
							}
				}
				if (shot.life <= 0) {
					if (shot.secondary)
						spawnBurst(shot.mesh.position.x, shot.mesh.position.z, 16, 0);
					releaseMesh(shot.mesh);
					projectiles.splice(i, 1);
				}
			}
			for (const rock of rocks)
				if (
					distance(player.current, rock.physics.current) < rock.size + 1.45 &&
					impactTimer <= 0 &&
					Math.hypot(player.body.linvel().x, player.body.linvel().z) > 5
				) {
					events.push({ type: "hit", damage: 3 });
					spawnBurst(player.current.x, player.current.z, 7);
					impactTimer = 1;
				}
			for (let i = pickups.length - 1; i >= 0; i--) {
				const pickup = pickups[i];
				const delta = distance(pickup, player.current);
				pickup.age += elapsed;
				const tractor = Math.max(0, currentStats.tractor || 0);
				if (delta < Math.min(35, 9 + tractor * 5)) {
					pickup.x +=
						(player.current.x - pickup.x) * elapsed * (2 + tractor * 0.7);
					pickup.z +=
						(player.current.z - pickup.z) * elapsed * (2 + tractor * 0.7);
				}
				const collected = delta < Math.min(4, 1.9 + tractor * 0.5);
				if (collected || pickup.age > 45) {
					if (collected) {
						events.push({ type: "pickup", credits: pickup.credits });
						spawnBurst(pickup.x, pickup.z, 8, 1);
					}
					releaseMesh(pickup.mesh);
					pickups.splice(i, 1);
				}
			}
		} else physics.resetClock();
		if (active && queuedEnemies > 0) fillCombatWave();

		const position = physics.position(player, alpha);
		const velocity = player.body.linvel();
		const speed = Math.hypot(velocity.x, velocity.z);
		const ready =
			hasLanding &&
			distance(player.current, DOCK) < 5 &&
			speed < 4 &&
			enemies.length === 0 &&
			queuedEnemies === 0 &&
			missionActors.hostileCount() === 0;
		if (ready !== landReady) {
			landReady = ready;
			events.push({ type: "landReady", ready });
		}
		visualThrust +=
			((active ? thrust : view === "title" ? 0.35 : 0.12) - visualThrust) *
			Math.min(1, elapsed * 8);
		ship.userData.exhaust.scale.z =
			0.22 +
			visualThrust * (input.boost ? 1.8 : 0.9) +
			Math.sin(time * 35) * 0.025;
		ship.userData.exhaust.visible =
			!cloaked && (visualThrust > 0.02 || view !== "flight");
		if (view === "title") {
			const narrow =
				container.clientWidth / Math.max(1, container.clientHeight) < 1;
			ship.position.set(
				narrow ? 3.0 : 9.0,
				4.5 + Math.sin(time * 0.7) * 0.28,
				12.5,
			);
			ship.rotation.set(0.06, -0.7 + Math.sin(time * 0.15) * 0.08, -0.09);
			ship.scale.setScalar(ship.userData.baseScale * 2.3);
		} else {
			ship.position.set(
				position.x,
				0.3 + Math.sin(time * 2) * 0.04,
				position.z,
			);
			ship.rotation.set(0, -yaw, -(input.turn || 0) * 0.1);
			ship.scale.setScalar(ship.userData.baseScale);
		}
		for (const escort of escorts) {
			const p = physics.position(escort.physics, alpha);
			escort.mesh.position.set(p.x, 0.2, p.z);
			escort.mesh.rotation.y = -escort.yaw;
			const v = escort.physics.body.linvel();
			escort.mesh.userData.exhaust.scale.z =
				0.15 + Math.min(0.85, Math.hypot(v.x, v.z) * 0.06);
			escort.mesh.visible = escort.hp > 0 && view !== "title";
		}

		missionActors.tick(elapsed, alpha);
		wrecks.tick(alpha);
		events.push(...missionActors.drainEvents());

		for (const enemy of enemies) {
			const p = physics.position(enemy.physics, alpha);
			enemy.mesh.position.set(p.x, 0.2, p.z);
			enemy.mesh.rotation.y = -enemy.yaw;
			enemy.mesh.userData.exhaust.scale.z = 0.5 + Math.sin(time * 20) * 0.08;
		}
		for (const rock of rocks) {
			const p = physics.position(rock.physics, alpha);
			rock.mesh.position.set(p.x, -0.2, p.z);
			rock.mesh.rotation.y += elapsed * 0.03;
		}
		asteroidField.sync();
		for (let i = effects.length - 1; i >= 0; i--) {
			const effect = effects[i];
			effect.life -= elapsed;
			effect.mesh.position.x += effect.vx * elapsed;
			effect.mesh.position.z += effect.vz * elapsed;
			effect.mesh.scale.multiplyScalar(Math.exp(-elapsed * 1.7));
			effect.mesh.rotation.x += elapsed * 3;
			if (effect.life <= 0) {
				releaseMesh(effect.mesh);
				effects.splice(i, 1);
			}
		}
		for (const pickup of pickups) {
			pickup.mesh.position.set(
				pickup.x,
				0.7 + Math.sin(time * 3) * 0.2,
				pickup.z,
			);
			pickup.mesh.rotation.y += elapsed * 1.4;
		}
		traffic.forEach((mesh, index) => {
			const x = ((time * (0.9 + index * 0.32) + index * 34 + 14) % 110) - 55;
			mesh.position.set(
				index % 2 === 0 ? x : -x,
				-4.5 - index * 0.4,
				-19 + index * 16,
			);
			mesh.rotation.y = index % 2 === 0 ? -Math.PI / 2 : Math.PI / 2;
			mesh.userData.exhaust.scale.z = 0.32;
			mesh.visible =
				hasLanding &&
				currentSystem.inhabited !== false &&
				index < (effective === "High" ? 3 : 2);
		});

		specialLandmarks.tick(elapsed);
		planet.rotation.y += elapsed * 0.016;
		starLandmark.rotation.y += elapsed * 0.008;
		planet.userData.clouds.rotation.y += elapsed * 0.006;
		station.rotation.y = time * 0.065;
		dockRing.material.opacity =
			(landReady ? 0.85 : 0.45) + Math.sin(time * 2) * 0.08;
		dockTicks.rotation.y = Math.sin(time * 0.1) * 0.006;
		if (view === "title")
			cameraTarget.lerp(
				new THREE.Vector3(
					container.clientWidth / Math.max(1, container.clientHeight) < 1
						? 0
						: -9,
					0,
					-0.5,
				),
				Math.min(1, elapsed * 3),
			);
		else if (view === "port")
			cameraTarget.lerp(new THREE.Vector3(-4, 0, 0), Math.min(1, elapsed * 2));
		else
			cameraTarget.lerp(
				new THREE.Vector3(
					position.x + velocity.x * 0.3,
					0,
					position.z + velocity.z * 0.3 - 3,
				),
				Math.min(1, elapsed * 3.5),
			);
		camera.position.copy(cameraTarget).add(new THREE.Vector3(0, 36, 29));
		camera.lookAt(cameraTarget);
		sky.position.copy(camera.position);
		stars.position.copy(camera.position).multiplyScalar(0.98);
		key.position.set(ship.position.x - 15, 32, ship.position.z + 18);
		key.target.position.copy(ship.position);
		jumpFlash = Math.max(0, jumpFlash - elapsed * 1.2);
		renderer.toneMappingExposure = 1.22 + jumpFlash * 0.35;
		renderer.info.reset();
		syncBatches();
		pipeline.render();
		return events;
	}
	function setView(next) {
		if (view === next) return;
		view = next;
		qualitySampler.suspend();
		physics.resetClock();
		resize();
	}

	function getTelemetry() {
		const velocity = player.body.linvel();
		return {
			backend: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
			preset: quality === "Auto" ? `Auto · ${effective}` : effective,
			quality,
			effectivePreset: effective,
			frameMs,
			bodies: physics.count,
			maxBodies: physics.maxBodies,
			speed: Math.hypot(velocity.x, velocity.z),
			position: { ...player.current },
			heading: yaw,
			cloaked: !!visualCloak,
			enemies: enemies.length + queuedEnemies + missionActors.hostileCount(),
			wrecks: wrecks.telemetry().map((wreck) => {
				const point = new THREE.Vector3(wreck.x, 1.2, wreck.z).project(camera);
				return {
					...wreck,
					screen: {
						x: (point.x + 1) / 2,
						y: (1 - point.y) / 2,
						visible:
							Math.abs(point.x) <= 1 &&
							Math.abs(point.y) <= 1 &&
							point.z >= -1 &&
							point.z <= 1,
					},
				};
			}),
			missionActors: missionActors.telemetry().map((actor) => {
				const point = new THREE.Vector3(actor.x, 1.2, actor.z).project(camera);
				return {
					...actor,
					screen: {
						x: (point.x + 1) / 2,
						y: (1 - point.y) / 2,
						visible:
							Math.abs(point.x) <= 1 &&
							Math.abs(point.y) <= 1 &&
							point.z >= -1 &&
							point.z <= 1,
					},
				};
			}),
			activeEnemies: enemies.length,
			queuedEnemies,
			secondaryProjectiles: projectiles.filter((shot) => shot.secondary).length,
			incomingProjectiles: projectiles.filter((shot) => shot.hostile).length,
			secondaryFired: secondaryCount,
			intercepted: interceptCount,
			escorts: escorts.map((escort) => ({
				id: escort.id,
				...escort.physics.current,
				command: escort.command,
				hull: escort.hp,
				shotsFired: escort.shotsFired || 0,
				speed: Math.hypot(
					escort.physics.body.linvel().x,
					escort.physics.body.linvel().z,
				),
			})),
			landReady,
			dockDistance: distance(player.current, DOCK),
			targets: enemies.map((enemy) => ({
				...enemy.physics.current,
				boss: enemy.boss,
				hp: enemy.hp,
				shipId: enemy.mesh.userData.shipId,
			})),
			pickups: pickups.length,
			backendReady: renderHealth.ready,
			deviceLost: renderHealth.loss,
			rendering: {
				requestedSamples: renderer.samples,
				sceneSamples: scenePass.renderTarget.samples,
				drawCalls: renderer.info.render.drawCalls,
				triangles: renderer.info.render.triangles,
				geometries: renderer.info.memory.geometries,
				textures: renderer.info.memory.textures,
				trackedGpuBytes: renderer.info.memory.total,
			},
			system: currentSystem.id,
			landmark: describeLandmark(currentSystem).kind,
			destination: describeLandmark(currentSystem).name,
			stationVisible: station.visible,
		};
	}
	function dispose() {
		if (disposed) return;
		disposed = true;
		renderHealth.dispose();
		document.removeEventListener("visibilitychange", suspendMeasurement);
		resizeObserver.disconnect();
		pixelRatioQuery?.removeEventListener("change", onPixelRatioChange);
		missionActors.clear();
		wrecks.clear();
		physics.dispose();
		pipeline.dispose();
		bloomNode.dispose();
		aoNode.dispose();
		aoDepthPass.dispose();
		depthMaterial.dispose();
		scenePass.dispose();
		environment.dispose();
		for (const batch of batches.values()) batch.mesh.dispose();
		disposeObject(world);
		for (const geometry of [
			shotGeometry,
			particleGeometry,
			pickupGeometry,
			secondaryGeometry,
			missileTrailGeometry,
		])
			geometry.dispose();
		for (const material of [
			playerShotMaterial,
			enemyShotMaterial,
			secondaryMaterial,
			missileTrailMaterial,
			pickupMaterial,
			...particleMaterials,
		])
			material.dispose();
		renderer.dispose();
		renderer.domElement.remove();
	}
	setQuality(options.quality || "Auto");
	resize();
	camera.position.copy(cameraTarget).add(new THREE.Vector3(0, 36, 29));
	camera.lookAt(cameraTarget);
	return {
		update,
		setSystem,
		setShip,
		setQuality,
		setPaused(value) {
			const next = Boolean(value);
			if (next !== paused) qualitySampler.suspend();
			paused = next;
			physics.setPaused(paused);
		},
		setCombat,
		setFleet,
		interactActor: missionActors.interact,
		selectActor: missionActors.select,
		inspectWreck: wrecks.inspect,
		consumeWreck: wrecks.consume,
		selectWreck: wrecks.select,
		getTelemetry,
		setView,
		dispose,
	};
}
