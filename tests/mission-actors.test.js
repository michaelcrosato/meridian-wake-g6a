import assert from "node:assert/strict";
import test from "node:test";
import { Scene } from "three/webgpu";
import { createPhysics } from "../src/physics.js";
import { createMissionActors } from "../src/mission-actors.js";

async function fixture(limit = 12) {
	const physics = await createPhysics({ maxBodies: 24 });
	const player = physics.add({ x: 0, z: 0, radius: 1.5 });
	const world = new Scene();
	const shots = [];
	let foes = [];
	const actors = createMissionActors({
		physics,
		world,
		player,
		reserveSlot: () => physics.count < physics.maxBodies,
		shoot(...shot) {
			shots.push(shot);
		},
		burst() {},
		actorLimit: () => limit,
		genericHostiles: () => foes.length,
		combatTargets: () => foes,
	});
	actors.setContext({
		active: true,
		view: "flight",
		mode: "flight",
		speed: 30,
		yaw: 0,
		time: 1,
	});
	return {
		physics,
		shots,
		setFoes(value) {
			foes = value;
		},
		player,
		actors,
		dispose() {
			actors.clear();
			physics.dispose();
		},
	};
}
const vessel = (id, extra = {}) => ({
	id,
	missionId: "Native test mission",
	npcId: `npc-${id}`,
	shipId: "shuttle",
	name: `Vessel ${id}`,
	hull: 100,
	maxHull: 100,
	role: "neutral",
	status: "active",
	objectives: [],
	x: 3,
	z: 0,
	...extra,
});

test("mission interactions validate physical range, speed and disabled state and preserve exact identity", async () => {
	const f = await fixture();
	try {
		f.actors.sync([
			vessel("survey", { objectives: ["scan cargo"] }),
			vessel("board", {
				x: 30,
				status: "disabled",
				hull: 15,
				objectives: ["board"],
			}),
		]);
		const scan = f.actors.interact("scan cargo", "survey");
		assert.equal(scan.ok, true);
		assert.deepEqual(
			scan.events.map((event) => [event.action, event.actorId, event.npcId]),
			[["scan cargo", "survey", "npc-survey"]],
		);
		assert.deepEqual(
			f.actors.drainEvents(),
			[],
			"interaction events are returned once, not duplicated by update",
		);
		assert.equal(
			f.actors.interact("board", "survey").ok,
			false,
			"active vessels cannot be boarded",
		);
		assert.equal(
			f.actors.interact("board", "board").ok,
			false,
			"a distant disabled vessel cannot be boarded",
		);
		f.physics.teleport(f.player, 27, 0);
		f.player.body.setLinvel({ x: 8, y: 0, z: 0 }, true);
		assert.equal(
			f.actors.interact("board", "board").ok,
			false,
			"approach must brake",
		);
		f.player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		assert.equal(
			f.actors.interact("board", "board").events[0].actorId,
			"board",
		);
	} finally {
		f.dispose();
	}
});

test("native disable and destruction are distinct, identity-scoped physical events", async () => {
	const f = await fixture();
	try {
		const target = vessel("target", {
			role: "hostile",
			objectives: ["disable", "board"],
			x: 5,
		});
		const protectedShip = vessel("protected", {
			role: "escort",
			objectives: ["save"],
			x: 8,
		});
		f.actors.sync([target, protectedShip]);
		f.actors.hit({ owner: "player", hostile: false, damage: 500 }, (point) =>
			point.x === 5 ? 0 : Infinity,
		);
		const disabled = f.actors.drainEvents();
		assert.deepEqual(
			disabled.map((event) => event.action),
			["damage", "disable"],
		);
		assert.ok(disabled.every((event) => event.actorId === "target"));
		assert.equal(
			f.physics.count,
			3,
			"disabled ship remains physical for boarding",
		);
		assert.equal(
			f.actors.telemetry().find((actor) => actor.id === "target").status,
			"disabled",
		);
		f.actors.tick(2, 1);
		f.actors.drainEvents();
		f.actors.hit({ owner: "player", hostile: false, damage: 100 }, (point) =>
			point.x === 5 ? 0 : Infinity,
		);
		assert.deepEqual(
			f.actors.drainEvents().map((event) => event.action),
			["damage", "destroy"],
		);
		assert.equal(f.physics.count, 2);
		f.actors.hit({ owner: "pirate", hostile: true, damage: 200 }, (point) =>
			point.x === 8 ? 0 : Infinity,
		);
		const lost = f.actors.drainEvents();
		assert.ok(
			lost.some(
				(event) => event.action === "destroy" && event.actorId === "protected",
			),
		);
		assert.ok(
			lost.every((event) => event.type === "missionActor"),
			"native deaths never masquerade as generic pirate kills",
		);
		assert.equal(f.physics.count, 1);
	} finally {
		f.dispose();
	}
});

test("actor cap queues stable identities and escort arrival requires a living physical ship", async () => {
	const f = await fixture(2);
	try {
		const records = [
			vessel("save", {
				role: "escort",
				objectives: ["accompany", "save"],
				x: 12,
				z: 1,
			}),
			vessel("a", { role: "hostile", x: 20 }),
			vessel("b", { role: "hostile", x: 24 }),
		];
		f.actors.sync(records);
		assert.equal(f.physics.count, 3);
		assert.equal(
			f.actors.hostileCount(),
			2,
			"pending actors still count as threats",
		);
		f.actors.tick(0.1, 1);
		assert.equal(
			f.actors.drainEvents().length,
			0,
			"escort cannot be safe while hostile identities remain",
		);
		f.actors.hit({ owner: "player", hostile: false, damage: 200 }, (point) =>
			point.x === 20 ? 0 : Infinity,
		);
		f.actors.drainEvents();
		f.actors.sync(records);
		assert.ok(
			f.actors.telemetry().some((actor) => actor.id === "b"),
			"next pending actor enters physical space",
		);
		f.actors.hit({ owner: "player", hostile: false, damage: 200 }, (point) =>
			point.x === 24 ? 0 : Infinity,
		);
		f.actors.drainEvents();
		f.actors.tick(0.1, 1);
		assert.deepEqual(
			f.actors.drainEvents().map((event) => [event.action, event.actorId]),
			[["safe", "save"]],
		);
	} finally {
		f.dispose();
	}
});

test("capture and assistance keep the actor unchanged until the rules model accepts", async () => {
	const f = await fixture();
	try {
		const record = vessel("prize", {
			status: "disabled",
			hull: 15,
			objectives: ["capture"],
			x: 3,
		});
		f.actors.sync([record]);
		const capture = f.actors.interact("capture", "prize");
		assert.equal(capture.ok, true);
		assert.equal(capture.events[0].action, "capture");
		assert.equal(
			f.actors.telemetry().length,
			1,
			"a rejected model capture must not remove the ship",
		);
		f.actors.sync([record]);
		assert.equal(f.actors.telemetry()[0].status, "disabled");
		f.actors.interact("assist", "prize");
		assert.equal(
			f.actors.telemetry()[0].status,
			"disabled",
			"repair awaits model acknowledgment",
		);
		f.actors.sync([{ ...record, status: "captured" }]);
		assert.equal(f.actors.telemetry().length, 0);
		assert.equal(f.physics.count, 1);
	} finally {
		f.dispose();
	}
});

test("cloaking hides the flagship from hostile acquisition while visible convoys remain vulnerable", async () => {
	const f = await fixture();
	try {
		const hostile = vessel("hunter", { role: "hostile", x: 0, z: -12 });
		f.actors.sync([hostile]);
		f.actors.setContext({ cloaked: true });
		f.actors.fixedStep(1 / 60);
		f.actors.tick(4, 1);
		assert.equal(
			f.shots.length,
			0,
			"hostile NPC does not fire at a cloaked flagship",
		);
		f.actors.setContext({ cloaked: false });
		f.actors.fixedStep(1 / 60);
		f.actors.tick(0.1, 1);
		assert.equal(f.shots.length, 1, "visible flagship can be acquired again");
		f.actors.sync([hostile, vessel("convoy", { role: "escort", x: 2, z: 0 })]);
		f.actors.setContext({ cloaked: true });
		f.actors.fixedStep(1 / 60);
		f.actors.tick(2, 1);
		assert.equal(
			f.shots.length,
			2,
			"cloaking the flagship does not conceal its convoy",
		);
	} finally {
		f.dispose();
	}
});

test("armed protected warships defend their convoy while unarmed escorts preserve zero damage", async () => {
	const f = await fixture();
	try {
		f.actors.sync([
			vessel("warship", {
				role: "escort",
				canFight: true,
				damage: 24,
				x: 0,
				z: 0,
			}),
			vessel("transport", {
				role: "escort",
				canFight: false,
				damage: 0,
				x: 2,
				z: 0,
			}),
		]);
		f.setFoes([{ hp: 100, physics: { current: { x: 0, z: -10 } } }]);
		f.actors.fixedStep(1 / 60);
		f.actors.tick(2, 1);
		assert.equal(f.shots.length, 1);
		assert.equal(
			f.shots[0][3],
			false,
			"protected ship fires an allied projectile",
		);
		assert.equal(f.shots[0][4], 24);
		assert.equal(f.shots[0][5], "warship");
		assert.equal(f.actors.get("transport").damage, 0);
	} finally {
		f.dispose();
	}
});
