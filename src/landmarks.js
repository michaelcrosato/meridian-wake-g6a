import * as THREE from "three/webgpu";
import { hullMaterial } from "./ship-model.js";

/** Classification follows the selected source destination, not its faction or nearby lore. */
export function describeLandmark(system = {}) {
	const planets = Array.isArray(system.planets) ? system.planets : null;
	if (planets && planets.length === 0)
		return { kind: "star", name: system.name || "", palette: "amber" };
	const planet =
		planets?.find(
			(planet) => planet.name === system.planet || planet.id === system.planet,
		) ||
		planets?.[0] ||
		{};
	const name = planet.name || system.planet || "";
	const description = planet.description || system.description || "";
	const attributes = (
		Array.isArray(planet.attributes) ? planet.attributes : []
	).map((attribute) => String(attribute).toLowerCase());
	const station = attributes.some((attribute) =>
		/(?:^|\s)station$/.test(attribute),
	);
	const gas = attributes.some(
		(attribute) =>
			/requires:\s*gaslining/.test(attribute) ||
			attribute === "gas giant" ||
			attribute === "gas",
	);
	const stellar = attributes.some((attribute) =>
		/requires:\s*starlining/.test(attribute),
	);
	let kind = "planet";
	if (stellar)
		kind = station || /garden/i.test(name) ? "stellar-garden" : "stellar";
	else if (gas) kind = "gas-giant";
	else if (
		attributes.includes("ringworld") ||
		/^(?:this|the)\s+(?:\w+\s+){0,4}ringworld\b/i.test(description)
	)
		kind = "ringworld";
	else if (station)
		kind = /\bringworld\b|\bring station\b/i.test(description)
			? "ring-station"
			: "station";
	const palette = /magenta|purple|violet|indigo/i.test(`${name} ${description}`)
		? "violet"
		: /blue|ice giant/i.test(description)
			? "blue"
			: "amber";
	return { kind, name, description, attributes, palette };
}

function basic(hex, intensity = 1) {
	const material = new THREE.MeshBasicNodeMaterial({ color: hex });
	material.color.multiplyScalar(intensity);
	return material;
}
function instances(group, geometry, material, transforms) {
	const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
	const object = new THREE.Object3D();
	transforms.forEach((transform, index) => {
		object.position.set(...(transform.position || [0, 0, 0]));
		object.rotation.set(...(transform.rotation || [0, 0, 0]));
		object.scale.set(...(transform.scale || [1, 1, 1]));
		object.updateMatrix();
		mesh.setMatrixAt(index, object.matrix);
	});
	mesh.castShadow = mesh.receiveShadow = true;
	group.add(mesh);
	return mesh;
}

function gasGiant() {
	const group = new THREE.Group();
	const geometry = new THREE.SphereGeometry(8.6, 32, 24).toNonIndexed();
	const colors = new Float32Array(geometry.attributes.position.count * 3);
	geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	const surface = new THREE.Mesh(
		geometry,
		new THREE.MeshStandardNodeMaterial({
			vertexColors: true,
			flatShading: true,
			roughness: 0.88,
			metalness: 0.02,
		}),
	);
	surface.receiveShadow = true;
	group.add(surface);
	const atmosphere = new THREE.Mesh(
		new THREE.IcosahedronGeometry(8.82, 3),
		new THREE.MeshBasicNodeMaterial({
			color: 0xc1aa8c,
			transparent: true,
			opacity: 0.13,
			side: THREE.BackSide,
			depthWrite: false,
		}),
	);
	group.add(atmosphere);
	group.position.set(0, -9.2, -3);
	group.rotation.set(-0.65, 0, 0.24);
	const palettes = {
		amber: [0xe6d8bd, 0xbe946a, 0x91745e, 0xd1b58e, 0xaaa394, 0xe0c79e],
		blue: [0xa9ced0, 0x538796, 0x416875, 0x90b9c3, 0xd3e0d6, 0x6e929f],
		violet: [0xc3b2cf, 0x806285, 0x66718f, 0xbca0b5, 0xe0c6c8, 0x987997],
	};
	function setPalette(name) {
		const palette = palettes[name] || palettes.amber;
		const position = geometry.attributes.position;
		const center = new THREE.Vector3();
		const shade = new THREE.Color();
		for (let i = 0; i < position.count; i += 3) {
			center.set(0, 0, 0);
			for (let vertex = 0; vertex < 3; vertex++)
				center.add(
					new THREE.Vector3().fromBufferAttribute(position, i + vertex),
				);
			center.normalize();
			const latitude = Math.acos(Math.max(-1, Math.min(1, center.y))) / Math.PI;
			const band = Math.floor(latitude * 12);
			shade.setHex(
				palette[((band % palette.length) + palette.length) % palette.length],
			);
			shade.multiplyScalar(0.94 + Math.sin(i * 4.7) * 0.06);
			for (let vertex = 0; vertex < 3; vertex++)
				shade.toArray(colors, (i + vertex) * 3);
		}
		geometry.attributes.color.needsUpdate = true;
		atmosphere.material.color.setHex(
			name === "blue" ? 0x83b5c3 : name === "violet" ? 0xb58ab7 : 0xd3b889,
		);
	}
	setPalette("amber");
	group.userData.setPalette = setPalette;
	return group;
}

function habitatRing() {
	const group = new THREE.Group();
	const segments = [],
		gardens = [],
		windows = [],
		buttresses = [];
	for (let index = 0; index < 56; index++) {
		const angle = (index / 56) * Math.PI * 2;
		const x = Math.cos(angle),
			z = Math.sin(angle);
		const rotation = [0, -angle, 0];
		segments.push({ position: [x * 10.4, 0, z * 10.4], rotation });
		gardens.push({ position: [x * 10.15, 0.36, z * 10.15], rotation });
		windows.push({ position: [x * 10.83, 0.38, z * 10.83], rotation });
		if (index % 7 === 0)
			buttresses.push({ position: [x * 10.4, 0.57, z * 10.4], rotation });
	}
	instances(
		group,
		new THREE.BoxGeometry(1.28, 0.64, 1.2),
		hullMaterial(0xd7d6ba, 0.4, 0.38),
		segments,
	);
	instances(
		group,
		new THREE.BoxGeometry(0.64, 0.07, 1.1),
		hullMaterial(0x568781, 0.8, 0.08),
		gardens,
	);
	instances(
		group,
		new THREE.BoxGeometry(0.1, 0.07, 0.83),
		basic(0xade6d0, 1.2),
		windows,
	);
	instances(
		group,
		new THREE.BoxGeometry(1.8, 0.4, 1.1),
		hullMaterial(0xb99761, 0.42, 0.38),
		buttresses,
	);
	group.position.set(0, -6.3, -3);
	group.rotation.z = 0.06;
	return group;
}

function orbitalHub() {
	const group = new THREE.Group();
	const blocks = [],
		supports = [],
		lights = [];
	for (let index = 0; index < 8; index++) {
		const angle = (index / 8) * Math.PI * 2;
		const x = Math.cos(angle),
			z = Math.sin(angle);
		blocks.push({
			position: [x * 4.3, 0.25, z * 4.3],
			rotation: [0, -angle, 0],
		});
		supports.push({
			position: [x * 2.6, 0, z * 2.6],
			rotation: [0, -angle + Math.PI / 2, 0],
		});
		lights.push({
			position: [x * 4.3, 0.86, z * 4.3],
			rotation: [0, -angle, 0],
		});
	}
	instances(
		group,
		new THREE.BoxGeometry(1.75, 1.1, 1.25),
		hullMaterial(0xd2d8cc, 0.42, 0.27),
		blocks,
	);
	instances(
		group,
		new THREE.BoxGeometry(0.35, 0.4, 4.0),
		hullMaterial(0x4c6670, 0.55, 0.38),
		supports,
	);
	instances(
		group,
		new THREE.BoxGeometry(1.25, 0.09, 0.23),
		basic(0x86dbd7, 1.4),
		lights,
	);
	const core = new THREE.Mesh(
		new THREE.CylinderGeometry(1.7, 2.1, 1.4, 8),
		hullMaterial(0xc0a16f, 0.38, 0.5),
	);
	core.castShadow = core.receiveShadow = true;
	group.add(core);
	const cap = new THREE.Mesh(
		new THREE.CylinderGeometry(1.05, 1.45, 0.3, 8),
		hullMaterial(0x445d69, 0.35, 0.4),
	);
	cap.position.y = 0.84;
	group.add(cap);
	const hoop = new THREE.Mesh(
		new THREE.TorusGeometry(4.3, 0.17, 4, 48),
		hullMaterial(0xa78d66, 0.38, 0.5),
	);
	hoop.rotation.x = Math.PI / 2;
	group.add(hoop);
	return group;
}

function stellarGarden() {
	const group = new THREE.Group();
	const ribbonMaterial = hullMaterial(0xb29c84, 0.34, 0.68);
	for (let index = 0; index < 6; index++) {
		const ribbonGeometry = new THREE.TorusGeometry(
			8.3 + index * 0.5,
			0.24,
			4,
			56,
			Math.PI * (1.25 + index * 0.07),
		);
		ribbonGeometry.scale(1, 1, 0.22);
		const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
		ribbon.rotation.set(
			Math.PI / 2 + Math.sin(index * 2) * 0.26,
			index * 0.52,
			index * 0.12,
		);
		ribbon.scale.set(1, 0.85 + index * 0.035, 1);
		ribbon.castShadow = ribbon.receiveShadow = true;
		group.add(ribbon);
	}
	const hub = orbitalHub();
	hub.scale.setScalar(0.55);
	hub.position.set(10, 8.2, 5);
	group.add(hub);
	group.position.set(0, -11.5, -3);
	return group;
}

/** Static/instanced procedural geometry shares the renderer's existing node PBR pipeline. */
export function createSpecialLandmarks() {
	const group = new THREE.Group();
	const gas = gasGiant(),
		ring = habitatRing(),
		station = orbitalHub(),
		garden = stellarGarden();
	group.add(gas, ring, station, garden);
	let key = "";
	function set(profile) {
		const next = `${profile.kind}:${profile.name}:${profile.palette}`;
		if (next === key) return;
		key = next;
		gas.visible = profile.kind === "gas-giant";
		ring.visible = ["ringworld", "ring-station"].includes(profile.kind);
		station.visible = ["station", "ring-station"].includes(profile.kind);
		garden.visible = profile.kind === "stellar-garden";
		if (gas.visible) gas.userData.setPalette(profile.palette);
		if (profile.kind === "ring-station") {
			ring.position.set(-9, -13, -13);
			ring.scale.setScalar(1.28);
			station.position.set(3, -4.7, 3);
			station.scale.setScalar(0.9);
		} else {
			ring.position.set(0, -6.3, -3);
			ring.scale.setScalar(1);
			station.position.set(0, -5.8, -3);
			station.scale.setScalar(1.3);
		}
	}
	set({ kind: "planet", name: "", palette: "amber" });
	return {
		group,
		set,
		tick(dt) {
			gas.rotation.y += dt * 0.012;
			ring.rotation.y += dt * 0.004;
			station.rotation.y += dt * 0.01;
		},
	};
}
