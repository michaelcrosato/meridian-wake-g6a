import assert from "node:assert/strict";
import test from "node:test";
import { Box3, Vector3 } from "three/webgpu";
import { createShipModel, disposeObject } from "../src/ship-model.js";

test("starter craft have visibly different geometry and valid batched meshes", () => {
	const models = ["sparrow", "shuttle", "star barge"].map((id) =>
		createShipModel(id),
	);
	try {
		const sizes = models.map((model) =>
			new Box3().setFromObject(model).getSize(new Vector3()),
		);
		assert.ok(
			sizes[2].x > sizes[1].x * 1.2,
			"cargo ship is wider than passenger shuttle",
		);
		assert.ok(
			sizes[2].z > sizes[1].z * 1.15,
			"cargo silhouette is longer than shuttle",
		);
		const counts = models.map((model) => {
			let vertexCount = 0,
				meshCount = 0;
			model.traverse((node) => {
				if (!node.isMesh) return;
				meshCount++;
				vertexCount += node.geometry.attributes.position.count;
				assert.ok(
					Array.from(node.geometry.attributes.position.array).every(
						Number.isFinite,
					),
				);
			});
			assert.ok(meshCount <= 12, "ship bricks are batched for fleet rendering");
			return vertexCount;
		});
		assert.equal(
			new Set(counts).size,
			3,
			"each starter uses distinct hull geometry",
		);
	} finally {
		models.forEach(disposeObject);
	}
});

test("alien and machine faction hulls override generic enemy model names", () => {
	const models = [
		createShipModel("sparrow", true, { faction: "Kor Mereti" }),
		createShipModel("sparrow", true, { faction: "Kor Sestor" }),
		createShipModel("sparrow", true, { faction: "Aberrant" }),
		createShipModel("sparrow", true, { faction: "Pirate" }),
		createShipModel("Vujlet", false, { faction: "House Aqrabe" }),
	];
	try {
		assert.equal(models[0].userData.archetype, "machine");
		assert.equal(models[1].userData.archetype, "machine");
		assert.equal(models[2].userData.archetype, "alien");
		assert.equal(models[3].userData.archetype, "sparrow");
		assert.equal(models[4].userData.archetype, "alien");
		const palette = (model) =>
			model.children
				.filter((child) => child.isMesh)
				.map((child) => child.material.color.getHex())
				.join(",");
		assert.notEqual(
			palette(models[0]),
			palette(models[1]),
			"the two machine factions have distinct palettes",
		);
		for (const model of models)
			model.traverse((node) => {
				if (node.isMesh)
					assert.ok(
						Array.from(node.geometry.attributes.position.array).every(
							Number.isFinite,
						),
					);
			});
	} finally {
		models.forEach(disposeObject);
	}
});

test("captured alien technologies retain their source silhouettes under player ownership", () => {
	const models = [
		createShipModel("model-64", false, { faction: "Free Worlds" }),
		createShipModel("kar-ik-vot-349", false, { faction: "Free Worlds" }),
		createShipModel("shield-beetle", false, { faction: "Free Worlds" }),
	];
	try {
		assert.deepEqual(
			models.map((m) => m.userData.archetype),
			["machine", "machine", "alien"],
		);
		assert.equal(models[0].userData.faction, "Kor Mereti");
		assert.equal(models[1].userData.faction, "Kor Sestor");
	} finally {
		models.forEach(disposeObject);
	}
});

test("ships of one archetype share hull geometry that disposing a single ship keeps alive", () => {
	const first = createShipModel("hawk", true, { faction: "Pirate" });
	const second = createShipModel("hawk", false, { faction: "Republic" });
	const meshes = (model) => model.children.filter((child) => child.isMesh);
	try {
		assert.equal(meshes(first)[0].geometry, meshes(second)[0].geometry);
		assert.notEqual(meshes(first)[0].material, meshes(second)[0].material);
		let disposed = 0;
		for (const mesh of meshes(second))
			mesh.geometry.addEventListener("dispose", () => disposed++);
		disposeObject(first);
		assert.equal(disposed, 0);
	} finally {
		disposeObject(second);
	}
});
