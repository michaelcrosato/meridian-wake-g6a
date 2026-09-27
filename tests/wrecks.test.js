import assert from "node:assert/strict";
import test from "node:test";
import { Scene } from "three/webgpu";
import { createPhysics } from "../src/physics.js";
import { createShipModel } from "../src/ship-model.js";
import { createWrecks } from "../src/wrecks.js";

async function fixture({ maxBodies = 12, activeLimit = 8 } = {}) {
	const physics = await createPhysics({ maxBodies });
	const world = new Scene();
	const player = physics.add();
	let enemies = 0;
	const wrecks = createWrecks({
		physics,
		world,
		player,
		reserveSlot: () => physics.count < physics.maxBodies,
		activeLimit: () => activeLimit,
		hostiles: () => enemies,
	});
	wrecks.setContext({ view: "flight", mode: "flight" });
	return {
		physics,
		world,
		player,
		wrecks,
		setEnemies(count) {
			enemies = count;
		},
		dispose() {
			wrecks.clear();
			physics.dispose();
		},
	};
}

test("defeated enemies retain a physical hulk; boarding requires range, braking and clear space", async () => {
	const f = await fixture();
	try {
		const mesh = createShipModel("hawk", true);
		f.world.add(mesh);
		const body = f.physics.add({ x: 15, z: 0 });
		const record = f.wrecks.adopt(
			{ mesh, physics: body, yaw: 0.7 },
			{ id: "wreck-1", shipId: "hawk" },
		);
		assert.equal(
			f.physics.count,
			2,
			"enemy body is reused rather than disappearing",
		);
		assert.equal(mesh.userData.exhaust.visible, false);
		assert.equal(record.shipId, "hawk");
		assert.equal(
			f.wrecks.inspect(record.id).ok,
			false,
			"remote boarding fails",
		);
		f.physics.teleport(f.player, 12, 0);
		f.player.body.setLinvel({ x: 8, y: 0, z: 0 }, true);
		assert.equal(f.wrecks.inspect(record.id).ok, false, "fast boarding fails");
		f.player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		f.setEnemies(1);
		assert.equal(f.wrecks.inspect(record.id).ok, false);
		f.setEnemies(0);
		assert.equal(f.wrecks.inspect(record.id).ok, true);
		assert.equal(
			f.wrecks.telemetry().length,
			1,
			"querying does not consume a model-rejected capture",
		);
		assert.equal(f.wrecks.consume(record.id), true);
		assert.equal(f.physics.count, 1);
		assert.equal(f.world.children.length, 0);
	} finally {
		f.dispose();
	}
});

test("saved hulks queue active physics and reactivate selected targets without losing records", async () => {
	const f = await fixture({ maxBodies: 3, activeLimit: 2 });
	try {
		const records = [5, 9, 12, 18].map((x, index) => ({
			id: `wreck-${index}`,
			shipId: "sparrow",
			x,
			z: 0,
		}));
		f.wrecks.sync(records);
		f.wrecks.tick(1);
		assert.equal(f.wrecks.telemetry().length, 4);
		assert.equal(f.physics.count, 3);
		assert.equal(
			f.wrecks.telemetry().filter((wreck) => wreck.activeBody).length,
			2,
		);
		f.wrecks.select("wreck-3");
		f.wrecks.tick(1);
		assert.equal(
			f.wrecks.telemetry().find((wreck) => wreck.id === "wreck-3").activeBody,
			true,
		);
		assert.equal(
			f.wrecks.releaseFarthest(),
			true,
			"queued combat can reclaim a distant hulk body",
		);
		const incoming = f.physics.add({ x: -20, z: 0 });
		assert.ok(incoming);
		assert.equal(f.physics.count, 3);
		assert.equal(
			f.wrecks.telemetry().length,
			4,
			"physics retirement preserves boardable saved identities",
		);
		f.physics.remove(incoming);
		f.physics.teleport(f.player, 17, 0);
		f.wrecks.tick(1);
		assert.equal(f.wrecks.inspect("wreck-3").ok, true);
		f.wrecks.consume("wreck-3");
		f.wrecks.sync(records.filter((record) => record.id !== "wreck-3"));
		assert.equal(f.wrecks.telemetry().length, 3);
		f.wrecks.clear();
		assert.equal(f.physics.count, 1);
	} finally {
		f.dispose();
	}
});
