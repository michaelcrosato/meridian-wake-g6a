import * as THREE from "three/webgpu";
import { color, normalLocal, mix, float } from "three/tsl";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function hullMaterial(hex, roughness = 0.48, metalness = 0.16) {
	const material = new THREE.MeshStandardNodeMaterial({
		color: hex,
		roughness,
		metalness,
	});
	// A restrained undercut tint gives every brick readable contact shading on both backends.
	material.colorNode = color(hex).mul(
		mix(float(0.69), float(1), normalLocal.y.mul(0.5).add(0.5)),
	);
	return material;
}

// Origin survives capture/ownership changes for distinctive source technologies.
function lineage(id) {
	const name = String(id).toLowerCase().replaceAll(" ", "-");
	if (/^model-(8|16|32|64|128|256|512)$/.test(name)) return "Kor Mereti";
	if (/met-par|tek-far|kar-ik-vot|kar-vot/.test(name)) return "Kor Sestor";
	if (/ra-at-ik|ra-gru-ik|korath/.test(name)) return "Korath";
	if (/stolsaqra|vujlet|seiitej|veusade|aaulqra/.test(name))
		return "High Houses";
	if (/grasshopper|lightning-bug|shield-beetle|sea-scorpion/.test(name))
		return "Hai";
	if (/aberrant/.test(name)) return "Aberrant";
	if (/quarg/.test(name)) return "Quarg";
	if (/^pug-/.test(name)) return "Pug";
	return "";
}

/** Visual families are original reinterpretations, not replicas of source sprites. */
export function shipArchetype(id = "sparrow", style = {}) {
	const description = `${id} ${style.category || ""} ${lineage(id)}`;
	const faction = `${style.faction || ""}`;
	if (/^house\s/i.test(faction)) return "alien";
	if (
		/kor mereti|kor sestor|mereti|sestor|automata/i.test(
			`${description} ${faction}`,
		)
	)
		return "machine";
	if (
		/korath|quarg|pug|hai|coalition|wanderer|remnant|unfettered|aberrant|solitude|high houses|lunarium/i.test(
			`${description} ${faction}`,
		)
	)
		return "alien";
	if (/^sparrow$/i.test(id)) return "sparrow";
	if (
		/shuttle|transport|liner|star.?queen|bounder|blackbird/i.test(description)
	)
		return "shuttle";
	if (
		/star.?barge|freighter|hauler|mule|behemoth|bulk|clipper|hauler/i.test(
			description,
		)
	)
		return "cargo";
	if (
		/leviathan|bactrian|falcon|carrier|cruiser|warship|dreadnought|destroyer/i.test(
			description,
		)
	)
		return "heavy";
	if (
		/hawk|interceptor|fighter|wasp|\barrow\b|finch|dart|raven/i.test(
			description,
		)
	)
		return "interceptor";
	return "sparrow";
}

/** Original, batched toy-brick geometry; no downloaded ship art. Nose faces local -Z. */
export function createShipModel(id = "sparrow", hostile = false, style = {}) {
	const group = new THREE.Group();
	const archetype = shipArchetype(id, style);
	const heavy = archetype === "heavy";
	const nimble = archetype === "interceptor";
	const faction = String(
		lineage(id) || style.faction || (hostile ? "Pirate" : "Independent"),
	);
	let hull = hostile ? 0x935348 : 0xeee7d4;
	let top = hostile ? 0xc37659 : 0xfff8e8;
	let accent = hostile
		? 0x292f37
		: archetype === "cargo"
			? 0xb07c40
			: archetype === "shuttle"
				? 0x527597
				: 0x2f727a;
	let light = hostile ? 0xffad76 : 0x97faf0;
	if (/republic|navy/i.test(faction)) {
		hull = 0x8c9cab;
		top = 0xe0e8e3;
		accent = 0x2d455e;
		light = 0x85c7ff;
	}
	if (/syndicate/i.test(faction)) {
		hull = 0x6f7172;
		top = 0xabad9d;
		accent = 0x9d5b42;
		light = 0xffd397;
	}
	if (/hai|unfettered/i.test(faction)) {
		hull = 0x748d65;
		top = 0xc3bf83;
		accent = 0x384949;
		light = 0xd4ff9d;
	}
	if (/korath/i.test(faction)) {
		hull = 0x9a6240;
		top = 0xc49557;
		accent = 0x305e62;
		light = 0x80f5e5;
	}
	if (/pug|remnant/i.test(faction)) {
		hull = 0x9b9dbb;
		top = 0xe4e0db;
		accent = 0x625774;
		light = 0xdbb2ff;
	}
	if (/quarg|coalition/i.test(faction)) {
		hull = 0xc2b987;
		top = 0xf2e8c3;
		accent = 0x787953;
		light = 0xfff3a0;
	}
	if (/wanderer/i.test(faction)) {
		hull = 0x6e9e98;
		top = 0xc6d9bc;
		accent = 0xb38655;
		light = 0xb6ffdb;
	}
	if (/mereti/i.test(faction)) {
		hull = 0x65798b;
		top = 0xb1cbd3;
		accent = 0x394159;
		light = 0x9fc4ff;
	}
	if (/sestor/i.test(faction)) {
		hull = 0x94674c;
		top = 0xd8a477;
		accent = 0x4a393b;
		light = 0xff8e71;
	}
	if (/aberrant/i.test(faction)) {
		hull = 0x756d84;
		top = 0xbaabb6;
		accent = 0x524a6e;
		light = 0xc7ff9e;
	}
	if (/alpha/i.test(faction)) {
		hull = 0x747b83;
		top = 0xc4c8c2;
		accent = 0x7c3034;
		light = 0xff786e;
	}
	if (/solitude/i.test(faction)) {
		hull = 0x516e86;
		top = 0xb8d5dc;
		accent = 0x32414c;
		light = 0x81f1ff;
	}
	if (/high houses|^house\s/i.test(faction)) {
		hull = 0x9e866a;
		top = 0xe9deba;
		accent = 0x54465e;
		light = 0xf7d587;
	}
	if (/bounty hunter/i.test(faction)) {
		hull = 0x5f7772;
		top = 0xc7d2bd;
		accent = 0xc18b47;
		light = 0x87dec4;
	}
	if (/lunarium/i.test(faction)) {
		hull = 0x637c7e;
		top = 0xcbd1cb;
		accent = 0x526457;
		light = 0xbcfce4;
	}

	const materials = {
		ivory: hullMaterial(hull),
		white: hullMaterial(top),
		teal: hullMaterial(accent, 0.34, 0.35),
		dark: hullMaterial(0x202d35, 0.58, 0.4),
		copper: hullMaterial(0xc99451, 0.35, 0.45),
		glass: new THREE.MeshStandardNodeMaterial({
			color: hostile ? 0x412e28 : 0x153c47,
			metalness: 0.64,
			roughness: 0.2,
			emissive: light,
			emissiveIntensity: 0.17,
		}),
		glow: new THREE.MeshBasicNodeMaterial({ color: light }),
	};
	let engineX = 1.23,
		engineZ = 2.05;
	const batches = new Map();
	const matrix = new THREE.Matrix4();
	const transform = new THREE.Object3D();
	function add(geometry, key, x, y, z, rx = 0, ry = 0, rz = 0) {
		transform.position.set(x, y, z);
		transform.rotation.set(rx, ry, rz);
		transform.scale.set(1, 1, 1);
		transform.updateMatrix();
		matrix.copy(transform.matrix);
		const part = geometry.index ? geometry.toNonIndexed() : geometry;
		if (part !== geometry) geometry.dispose();
		part.applyMatrix4(matrix);
		if (!batches.has(key)) batches.set(key, []);
		batches.get(key).push(part);
	}
	function brick(key, x, y, z, w, h, d, studs = false) {
		add(
			new RoundedBoxGeometry(w, h, d, 1, Math.min(0.055, h * 0.15)),
			key,
			x,
			y,
			z,
		);
		if (studs) {
			for (
				let sx = -Math.floor(w / 0.57) / 2 + 0.5;
				sx < Math.floor(w / 0.57) / 2;
				sx++
			) {
				for (
					let sz = -Math.floor(d / 0.58) / 2 + 0.5;
					sz < Math.floor(d / 0.58) / 2;
					sz++
				) {
					add(
						new THREE.CylinderGeometry(0.14, 0.155, 0.1, 10),
						key,
						x + sx * 0.54,
						y + h / 2 + 0.035,
						z + sz * 0.54,
					);
				}
			}
		}
	}
	if (archetype === "shuttle") {
		engineX = 0.84;
		engineZ = 1.92;
		brick("dark", 0, -0.2, 0, 1.8, 0.4, 3.3);
		brick("ivory", 0, 0.22, 0, 1.9, 0.72, 3.4, true);
		brick("white", 0, 0.78, 0.35, 1.55, 0.75, 2.45, true);
		brick("teal", 0, 1.17, 0.35, 0.55, 0.1, 2.4, true);
		brick("dark", 0, 0.48, -1.25, 1.6, 0.44, 0.74);
		brick("glass", 0, 0.71, -1.27, 1.44, 0.36, 0.64);
		brick("white", 0, 0.26, -1.81, 1.4, 0.38, 0.42);
		for (const side of [-1, 1]) {
			brick("teal", side * 1.26, -0.02, 0.7, 0.92, 0.26, 1.7, true);
			brick("ivory", side * 1.64, 0.2, 1.13, 0.25, 0.62, 0.86, true);
			brick("dark", side * engineX, 0.04, 1.68, 0.64, 0.56, 0.54);
			brick("copper", side * engineX, 0.02, 1.96, 0.49, 0.38, 0.12);
			for (let z = -0.3; z <= 0.9; z += 0.58)
				brick("glass", side * 0.794, 0.83, z, 0.055, 0.25, 0.35);
			brick("glow", side * 1.66, 0.53, 1.25, 0.15, 0.06, 0.2);
		}
	} else if (archetype === "cargo") {
		engineX = 1.49;
		engineZ = 2.56;
		brick("dark", 0, -0.2, 0.45, 3.8, 0.45, 4.05);
		brick("ivory", 0, 0.13, 0.32, 3.65, 0.5, 3.8, true);
		brick("teal", 0, 0.14, -1.68, 1.82, 0.65, 1.25, true);
		brick("dark", 0, 0.62, -1.6, 1.6, 0.4, 1.0);
		brick("glass", 0, 0.83, -1.69, 1.47, 0.36, 0.78);
		brick("white", 0, 1.06, -1.25, 1.68, 0.14, 0.24);
		for (const side of [-1, 1]) {
			for (let row = 0; row < 3; row++) {
				brick(
					row % 2 ? "white" : "teal",
					side * 0.88,
					0.8,
					-0.35 + row * 0.88,
					1.35,
					0.91,
					0.78,
					true,
				);
				brick("copper", side * 0.88, 1.3, -0.35 + row * 0.88, 0.12, 0.07, 0.73);
			}
			brick("ivory", side * 2.08, 0.04, 0.5, 0.5, 0.61, 3.57, true);
			brick("dark", side * engineX, 0.07, 2.24, 0.85, 0.67, 0.68);
			brick("copper", side * engineX, 0.07, 2.57, 0.64, 0.5, 0.12);
			brick("glow", side * 2.09, 0.39, -0.98, 0.26, 0.07, 0.2);
		}
	} else if (archetype === "machine") {
		engineX = 0.82;
		engineZ = 2.12;
		add(new THREE.CylinderGeometry(1.1, 1.3, 0.6, 8), "dark", 0, 0.04, 0);
		brick("ivory", 0, 0.38, 0, 1.85, 0.56, 1.85, true);
		brick("teal", 0, 0.76, 0, 1.08, 0.31, 1.08, true);
		brick("glow", 0, 0.94, 0, 0.45, 0.09, 0.45);
		for (let i = 0; i < 6; i++) {
			const angle = (i / 6) * Math.PI * 2;
			const x = Math.sin(angle),
				z = Math.cos(angle);
			add(
				new RoundedBoxGeometry(0.35, 0.24, 1.55, 1, 0.04),
				"copper",
				x * 1.65,
				0.05,
				z * 1.65,
				0,
				angle,
				0,
			);
			add(
				new RoundedBoxGeometry(0.88, 0.57, 1.3, 1, 0.055),
				i % 2 ? "teal" : "ivory",
				x * 2.48,
				0.13,
				z * 2.48,
				0,
				angle,
				0,
			);
			brick("glow", x * 2.48, 0.46, z * 2.48, 0.25, 0.08, 0.35);
		}
		for (const side of [-1, 1]) {
			brick("dark", side * engineX, 0.05, 1.83, 0.61, 0.5, 0.56);
			brick("white", side * 0.62, 0.3, -1.34, 0.38, 0.39, 0.64, true);
		}
	} else if (archetype === "alien") {
		engineX = 1.12;
		engineZ = 2.2;
		brick("dark", 0, -0.14, 0.22, 1.8, 0.52, 3.0);
		brick("ivory", 0, 0.2, 0.1, 2.05, 0.77, 2.6, true);
		brick("teal", 0, 0.72, 0.55, 1.27, 0.37, 1.85, true);
		brick("glass", 0, 0.7, -0.88, 0.67, 0.43, 1.13);
		brick("white", 0, 0.29, -1.49, 1.21, 0.61, 0.77, true);
		brick("copper", 0, 0.6, -1.68, 0.52, 0.14, 0.28);
		for (const side of [-1, 1]) {
			for (let k = 0; k < 3; k++) {
				const x = side * (1.45 + k * 0.55),
					z = 0.72 - k * 0.64;
				add(
					new RoundedBoxGeometry(0.9, 0.49, 1.5, 1, 0.07),
					k === 1 ? "teal" : "ivory",
					x,
					0.1 + k * 0.08,
					z,
					0,
					side * 0.48,
					0,
				);
				brick("glow", x, 0.42 + k * 0.08, z - 0.28, 0.27, 0.1, 0.34);
			}
			brick("dark", side * engineX, 0.04, 1.9, 0.7, 0.57, 0.57);
			brick("white", side * 0.5, 0.25, -2.02, 0.29, 0.43, 0.86);
		}
	} else {
		brick("dark", 0, -0.16, 0.1, 1.55, 0.48, 3.15);
		brick("ivory", 0, 0.2, 0.15, heavy ? 2.05 : 1.6, 0.65, 3.15, true);
		brick("white", 0, 0.22, -1.48, 1.1, 0.52, 0.8, true);
		brick("teal", 0, 0.52, 0.46, 0.67, 0.32, 2.15, true);
		brick("dark", 0, 0.58, -0.9, 1.22, 0.22, 1.18);
		brick("glass", 0, 0.82, -0.88, 1.05, 0.37, 1.05);
		brick("white", 0, 1.02, -0.48, 1.13, 0.14, 0.24);
		brick("copper", 0, 0.73, 1.0, 0.7, 0.17, 0.23);
		for (const side of [-1, 1]) {
			brick("dark", side * 1.14, -0.1, 0.28, 1.05, 0.25, 1.7);
			brick("ivory", side * 1.24, 0.17, 0.5, 1.1, 0.42, 2.18, true);
			brick("white", side * 1.49, 0.16, -0.72, 0.52, 0.35, 0.73, true);
			brick("teal", side * 1.8, 0.33, 0.77, 0.36, 0.54, 1.42, true);
			brick("copper", side * 1.24, 0.43, -0.13, 1.01, 0.06, 0.17);
			brick("dark", side * 1.23, 0.1, 1.65, 0.77, 0.6, 0.56);
			add(
				new THREE.CylinderGeometry(0.23, 0.29, 0.3, 12),
				"copper",
				side * 1.23,
				0.1,
				1.96,
				Math.PI / 2,
			);
			brick("dark", side * 1.75, -0.05, -1.36, 0.2, 0.25, 1.36);
			brick("glow", side * 1.75, -0.04, -2.05, 0.13, 0.13, 0.14);
			brick("glow", side * 1.8, 0.58, 1.17, 0.17, 0.08, 0.2);
			if (heavy) {
				brick("teal", side * 0.87, 0.86, 0.5, 0.7, 0.74, 1.8, true);
				brick("ivory", side * 2.05, 0.05, 0.63, 0.73, 0.66, 2.16, true);
			}
		}
		// Rear stabilizer and a raised sensor mast make silhouette changes visible when turning.
		brick("white", 0, 0.48, 1.45, 2.0, 0.13, 0.55, true);
		brick("teal", 0, 0.82, 1.4, 0.22, 0.73, 0.53);
		brick("copper", 0.5, 0.78, 0.33, 0.09, 0.69, 0.1);

		if (nimble) {
			// Narrow swept wings and a long spear nose distinguish fast interceptors.
			for (const side of [-1, 1]) {
				add(
					new RoundedBoxGeometry(0.5, 0.2, 2.2, 1, 0.04),
					"teal",
					side * 2.0,
					0.08,
					0.18,
					0,
					side * 0.48,
					0,
				);
			}
			brick("white", 0, 0.2, -2.03, 0.61, 0.41, 1.17, true);
		}
	}
	for (const [key, parts] of batches) {
		const geometry = mergeGeometries(parts);
		parts.forEach((part) => part.dispose());
		const mesh = new THREE.Mesh(geometry, materials[key]);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		group.add(mesh);
	}
	const exhaust = new THREE.Group();
	exhaust.position.z = engineZ;
	const plumeMaterial = new THREE.MeshBasicNodeMaterial({
		color: hostile ? 0xff8e59 : 0xffc475,
		transparent: true,
		opacity: 0.88,
		depthWrite: false,
	});
	const coreMaterial = new THREE.MeshBasicNodeMaterial({ color: 0xfff2d0 });
	for (const side of [-1, 1]) {
		const plume = new THREE.Mesh(
			new THREE.ConeGeometry(0.24, 1.7, 8),
			plumeMaterial,
		);
		plume.rotation.x = Math.PI / 2;
		plume.position.set(side * engineX, 0.1, 0.7);
		exhaust.add(plume);
		const core = new THREE.Mesh(
			new THREE.CylinderGeometry(0.17, 0.19, 0.35, 10),
			coreMaterial,
		);
		core.rotation.x = Math.PI / 2;
		core.position.set(side * engineX, 0.1, engineZ + 0.05);
		group.add(core);
	}
	group.add(exhaust);
	group.userData.exhaust = exhaust;
	group.userData.baseScale = nimble
		? 0.88
		: heavy
			? 1.15
			: archetype === "cargo"
				? 1.06
				: 1;
	group.userData.archetype = archetype;
	group.userData.faction = faction;
	group.scale.setScalar(group.userData.baseScale);
	return group;
}

export function disposeObject(object) {
	const geometries = new Set();
	const materials = new Set();
	object.traverse((node) => {
		if (node.geometry) geometries.add(node.geometry);
		if (node.material)
			for (const material of Array.isArray(node.material)
				? node.material
				: [node.material])
				materials.add(material);
	});
	geometries.forEach((geometry) => geometry.dispose());
	materials.forEach((material) => material.dispose());
	object.removeFromParent();
}
