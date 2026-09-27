import assert from "node:assert/strict";
import test from "node:test";
import { createPhysics, flightSpeed } from "../src/physics.js";

test("engine upgrades beyond 40 preserve normalized flight speed", () => {
	// Actual Sparrow + Remass Injector + Chipmunk Plasma Thruster stats.
	// A legacy source-rating conversion reduced this upgrade to 11.79 units/s.
	const base = flightSpeed(31);
	const upgraded = flightSpeed(44.66368952654441);
	assert.equal(base, 31);
	assert.equal(upgraded, 44.66368952654441);
	assert.ok(upgraded > base);
	assert.equal(flightSpeed(40.01), 40.01, "there is no unit change at 40");
	assert.equal(flightSpeed(undefined), 12);
	assert.equal(flightSpeed(Number.NaN), 12);
});

test("Rapier caps bodies and interpolates a fixed simulation step", async () => {
	const physics = await createPhysics({ maxBodies: 2 });
	try {
		const moving = physics.add({ radius: 0.3, damping: 0 });
		const other = physics.add({ x: 20 });
		assert.ok(moving && other);
		assert.equal(physics.add(), null);
		moving.body.setLinvel({ x: 6, y: 0, z: 0 }, true);
		physics.advance(1 / 120);
		assert.equal(
			moving.current.x,
			0,
			"a half-step does not advance simulation",
		);
		physics.advance(1 / 120);
		assert.ok(Math.abs(moving.current.x - 0.1) < 0.0001);
		assert.equal(physics.position(moving, 0).x, 0);
		assert.ok(Math.abs(physics.position(moving, 0.5).x - 0.05) < 0.0001);
		physics.remove(other);
		assert.equal(physics.count, 1);
		assert.ok(physics.add({ x: 20 }));
	} finally {
		physics.dispose();
	}
	assert.equal(physics.count, 0);
});

test("Rapier bounds catch-up work, resets teleport interpolation and disposes safely", async () => {
	const physics = await createPhysics();
	const moving = physics.add();
	moving.body.setLinvel({ x: 6, y: 0, z: 0 }, true);
	physics.advance(9);
	assert.ok(physics.droppedTime > 8);
	assert.ok(
		moving.current.x <= 0.61,
		"at most six fixed steps after a long tab suspension",
	);
	physics.teleport(moving, 4, 5);
	assert.deepEqual(physics.position(moving, 0), { x: 4, z: 5 });
	assert.deepEqual(physics.position(moving, 1), { x: 4, z: 5 });
	physics.dispose();
	physics.dispose();
	assert.equal(physics.count, 0);
});

test("repeated pause setters preserve fixed-step motion on a 120 Hz render loop", async () => {
	const physics = await createPhysics();
	try {
		const moving = physics.add({ damping: 0 });
		moving.body.setLinvel({ x: 6, y: 0, z: 0 }, true);
		for (let frame = 0; frame < 120; frame++) {
			physics.setPaused(false);
			physics.advance(1 / 120);
		}
		assert.ok(
			Math.abs(moving.current.x - 6) < 0.001,
			"120 half-step frames must still simulate one full second",
		);
		const stopped = moving.current.x;
		for (let frame = 0; frame < 120; frame++) {
			physics.setPaused(true);
			physics.advance(1 / 120);
		}
		assert.equal(moving.current.x, stopped);
		for (let frame = 0; frame < 2; frame++) {
			physics.setPaused(false);
			physics.advance(1 / 120);
		}
		assert.ok(
			Math.abs(moving.current.x - stopped - 0.1) < 0.001,
			"resuming also retains the fractional timestep",
		);
	} finally {
		physics.dispose();
	}
});
