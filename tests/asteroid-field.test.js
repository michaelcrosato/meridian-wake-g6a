import assert from "node:assert/strict";
import test from "node:test";
import { Matrix4, Scene, Vector3 } from "three/webgpu";
import { createAsteroidField } from "../src/asteroid-field.js";
import { createPhysics } from "../src/physics.js";
import { disposeObject } from "../src/ship-model.js";

test("asteroid batching retains individual transforms and removes mined targets without holes", () => {
	const world = new Scene();
	const field = createAsteroidField(world, 3);
	const first = field.add(2);
	const second = field.add(1, true);
	const third = field.add(0.5);
	assert.equal(field.add(1), null);
	first.position.set(12, -0.2, 8);
	second.position.set(-5, -0.2, 4);
	third.position.set(30, -0.2, -8);
	field.sync();
	assert.equal(
		world.children.length,
		2,
		"all asteroid visuals use two draw batches",
	);
	assert.deepEqual(
		world.children.map((mesh) => mesh.count),
		[2, 1],
	);
	const matrix = new Matrix4();
	world.children[0].getMatrixAt(0, matrix);
	assert.ok(
		new Vector3().setFromMatrixPosition(matrix).distanceTo(first.position) <
			1e-6,
	);
	assert.ok(Math.abs(new Vector3().setFromMatrixScale(matrix).x - 2.3) < 1e-6);
	field.remove(first);
	field.sync();
	assert.deepEqual(
		world.children.map((mesh) => mesh.count),
		[1, 1],
	);
	world.children[0].getMatrixAt(0, matrix);
	assert.ok(
		new Vector3().setFromMatrixPosition(matrix).distanceTo(third.position) <
			1e-6,
	);
	assert.ok(field.add(1), "mining returns a visual slot to the bounded field");
	disposeObject(world);
});

test("batched rocks keep independent Rapier collisions and mining removal", async () => {
	const physics = await createPhysics({ maxBodies: 3 });
	const world = new Scene();
	const field = createAsteroidField(world, 2);
	try {
		const ship = physics.add({ radius: 1, mass: 8, damping: 0 });
		const struck = physics.add({ x: 5, radius: 1, mass: 7, damping: 0 });
		const untouched = physics.add({ x: -20, radius: 1, mass: 7, damping: 0 });
		const first = field.add(1);
		const second = field.add(1, true);
		ship.body.setLinvel({ x: 10, y: 0, z: 0 }, true);
		for (let i = 0; i < 45; i++) physics.advance(1 / 60);
		assert.ok(struck.current.x > 6, "the struck asteroid receives momentum");
		assert.equal(
			untouched.current.x,
			-20,
			"the other instance has its own collider",
		);
		assert.ok(
			ship.body.linvel().x < 10,
			"the flagship responds to the collision",
		);
		first.position.set(struck.current.x, 0, struck.current.z);
		second.position.set(untouched.current.x, 0, untouched.current.z);
		field.sync();
		const matrix = new Matrix4();
		world.children[0].getMatrixAt(0, matrix);
		assert.ok(Math.abs(matrix.elements[12] - struck.current.x) < 1e-5);
		physics.remove(struck);
		field.remove(first);
		field.sync();
		assert.equal(physics.count, 2);
		assert.deepEqual(
			world.children.map((mesh) => mesh.count),
			[0, 1],
		);
		world.children[1].getMatrixAt(0, matrix);
		assert.equal(matrix.elements[12], untouched.current.x);
	} finally {
		physics.dispose();
		disposeObject(world);
	}
});
