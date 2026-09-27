import assert from "node:assert/strict";
import test from "node:test";
import { guideProjectile, tryPointDefense } from "../src/projectiles.js";

const shot = (homing = true) => ({
	homing,
	hostile: false,
	vx: 0,
	vz: -32,
	mesh: { position: { x: 0, z: 0 }, rotation: { y: 0 } },
});
const target = (x, z) => ({ hp: 100, physics: { current: { x, z } } });

test("guided missiles turn toward targets at a bounded rate while ballistic rounds keep their aim", () => {
	const enemy = target(15, -20);
	const missile = shot();
	guideProjectile(missile, 1 / 60, [enemy]);
	assert.ok(missile.vx > 0);
	assert.ok(Math.atan2(missile.vx, -missile.vz) <= 3.4 / 60 + 1e-9);
	assert.ok(Math.abs(Math.hypot(missile.vx, missile.vz) - 32) < 1e-9);
	const ballistic = shot(false);
	guideProjectile(ballistic, 1, [enemy]);
	assert.deepEqual([ballistic.vx, ballistic.vz], [0, -32]);
	const behind = shot();
	guideProjectile(behind, 1, [target(0, 20)]);
	assert.equal(
		behind.target,
		null,
		"missiles require targets in their forward acquisition cone",
	);
});

test("guidance reacquires after a destroyed target without retaining stale body references", () => {
	const dead = target(0, -10);
	const live = target(-5, -20);
	const missile = shot();
	missile.target = dead;
	dead.hp = 0;
	guideProjectile(missile, 0.1, [live]);
	assert.equal(missile.target, live);
	assert.ok(missile.vx < 0);
});

test("point defense is range and power gated, and rolls once per projectile independent of FPS", () => {
	const incoming = shot(false);
	incoming.hostile = true;
	incoming.mesh.position.z = -12;
	assert.equal(
		tryPointDefense(incoming, { x: 0, z: 0 }, 0.5, true, () => 0),
		false,
	);
	assert.equal(incoming.interceptionTried, undefined);
	incoming.mesh.position.z = -6;
	assert.equal(
		tryPointDefense(incoming, { x: 0, z: 0 }, 0.5, false, () => 0),
		false,
	);
	assert.equal(
		tryPointDefense(incoming, { x: 0, z: 0 }, 0.5, true, () => 0.9),
		false,
	);
	assert.equal(
		tryPointDefense(incoming, { x: 0, z: 0 }, 0.5, true, () => 0),
		false,
		"a second frame must not give another chance",
	);
	const intercepted = shot(false);
	intercepted.hostile = true;
	assert.equal(
		tryPointDefense(intercepted, { x: 0, z: 0 }, 0.9, true, () => 0.2),
		true,
	);
});
