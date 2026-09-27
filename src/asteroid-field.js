import * as THREE from "three/webgpu";
import { hullMaterial } from "./ship-model.js";

/** Individual collision/mining targets share two instanced visual batches. */
export function createAsteroidField(world, capacity = 28) {
	const geometry = new THREE.IcosahedronGeometry(1, 0);
	const batches = [0x5c6969, 0x8d8172].map((color) => {
		const mesh = new THREE.InstancedMesh(
			geometry,
			hullMaterial(color, 0.96, 0.12),
			capacity,
		);
		mesh.name = "Asteroid visual batch";
		mesh.count = 0;
		mesh.castShadow = mesh.receiveShadow = true;
		// The inexpensive 20-face instances can drift outside a previous aggregate
		// bounding sphere; keeping two batches visible avoids stale culling bounds.
		mesh.frustumCulled = false;
		mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		world.add(mesh);
		return mesh;
	});
	const rocks = new Map();
	return {
		add(size, warm = false) {
			if (rocks.size >= capacity) return null;
			const transform = new THREE.Object3D();
			transform.scale.set(size * 1.15, size * 0.8, size * 0.93);
			rocks.set(transform, warm ? 1 : 0);
			return transform;
		},
		remove(transform) {
			rocks.delete(transform);
		},
		sync() {
			for (const batch of batches) batch.count = 0;
			for (const [transform, palette] of rocks) {
				transform.updateMatrix();
				const batch = batches[palette];
				batch.setMatrixAt(batch.count++, transform.matrix);
			}
			for (const batch of batches) {
				batch.visible = batch.count > 0;
				batch.instanceMatrix.needsUpdate = true;
			}
		},
	};
}
