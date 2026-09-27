import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import test from "node:test";
import { SALES } from "../src/content.js";
import { ARCS, CAMPAIGN, Game, OUTFITS, SHIPS, SYSTEMS } from "../src/game.js";

function ok(game, action, payload) {
	const result = game.act(action, payload);
	assert.equal(
		result.ok,
		true,
		`${action} (${game.state.shipId} at ${game.currentPlanet()?.name}, ${game.state.activeStory?.id || game.state.activeArcs.map((active) => active.id).join(",")}): ${result.message}`,
	);
	return result;
}
function clearBattle(game) {
	if (
		game
			.activeMissions()
			.some(
				({ active, definition }) =>
					definition.destinationId === game.state.systemId &&
					definition.stealthSeconds &&
					(active.stealthElapsed || 0) < definition.stealthSeconds,
			)
	)
		return;
	while (game.state.enemies) ok(game, "kill");
}
function land(game) {
	for (const actor of game.missionActors())
		if (actor.scope === "campaign" && actor.status === "active")
			ok(game, "sourceActorEvent", { actorId: actor.id, action: "safe" });
	ok(game, "landReady", { ready: true });
	return ok(game, "land");
}
function travel(game, systemId, planetName) {
	const route = game.routeTo(systemId);
	assert.notEqual(
		route,
		null,
		`No route from ${game.state.systemId} to ${systemId}`,
	);
	if (game.state.mode === "port") ok(game, "launch");
	for (const target of route) {
		const needsCloak = game
			.activeMissions()
			.some(
				({ definition }) =>
					definition.destinationId === target &&
					(definition.cloak || definition.stealthSeconds),
			);
		const reserve = needsCloak ? 2.2 : 2;
		if (game.state.fuel < reserve && game.currentSystem().inhabited) {
			land(game);
			ok(game, "launch");
		}
		while (game.state.fuel < reserve) {
			clearBattle(game);
			ok(game, "scoop");
		}
		if (
			game
				.activeMissions()
				.some(
					({ definition }) =>
						definition.destinationId === target && definition.cloak === "enter",
				) &&
			!game.state.cloaked
		)
			ok(game, "cloak");
		ok(game, "jump", { systemId: target });
		clearBattle(game);
		if (game.currentSystem().inhabited && target !== systemId) {
			land(game);
			ok(game, "launch");
		}
	}
	if (
		planetName &&
		game.currentSystem().planets.some((p) => p.name === planetName)
	)
		ok(game, "selectPlanet", { planetName });
	clearBattle(game);
}
function completeMission(game, mission, arcId = null, choice = "complete") {
	for (const planetName of mission.visitPlanets || []) {
		const system = SYSTEMS.find((system) =>
			game
				.systemById(system.id)
				.planets.some((planet) => planet.name === planetName),
		);
		travel(game, system.id, planetName);
		land(game);
	}
	if (mission.cloak === "enter") {
		if (game.state.mode === "port") ok(game, "launch");
		if (!game.state.cloaked) ok(game, "cloak");
	}
	for (const systemId of mission.scanSystems || []) {
		travel(game, systemId);
		ok(game, "scan");
	}
	travel(game, mission.destinationId, mission.destinationName);
	if (
		mission.cloak === "enter" &&
		game.state.systemId === mission.destinationId &&
		!game.state.activeStory?.cloakedEntered &&
		!game.state.activeArcs.find((active) => active.id === mission.id)
			?.cloakedEntered
	) {
		const neighbor = game.neighbors()[0];
		if (neighbor) {
			ok(game, "jump", { systemId: neighbor });
			ok(game, "jump", { systemId: mission.destinationId });
		}
	}
	if (mission.stealthSeconds && process.env.MERIDIAN_STEALTH_FIXTURE)
		writeFileSync(process.env.MERIDIAN_STEALTH_FIXTURE, `${game.save()}\n`);
	if (mission.cloak === "land" || mission.stealthSeconds) {
		while (game.state.energy < game.stats().cloakEnergyCost)
			ok(game, "regenerate", { seconds: 1 });
		if (game.state.fuel < game.stats().cloakFuelCost && !game.state.enemies)
			ok(game, "scoop");
		if (!game.state.cloaked) ok(game, "cloak");
	}
	if (mission.stealthSeconds)
		for (let i = 0; i < mission.stealthSeconds; i++)
			ok(game, "regenerate", { seconds: 1 });
	if (mission.scan) ok(game, "scan");
	if (mission.board) ok(game, "board", { choice: "salvage" });
	if (mission.mine)
		for (let i = 0; i < mission.mine; i++) {
			ok(game, "regenerate", { seconds: 1 });
			ok(game, "regenerate", { seconds: 1 });
			ok(game, "mine");
		}
	land(game);
	if (mission.id === "new-horizon" && process.env.MERIDIAN_ENDING_FIXTURE)
		writeFileSync(process.env.MERIDIAN_ENDING_FIXTURE, `${game.save()}\n`);
	ok(game, arcId ? "completeArc" : "story", {
		arcId,
		choice:
			mission.choices?.find((c) => c.id === choice)?.id ||
			mission.choices?.[0]?.id ||
			"complete",
	});
}
function completeCampaign(
	shipId = "sparrow",
	route = "release",
	onComplete = null,
) {
	const game = new Game().newGame(shipId),
		completed = [];
	for (let safety = 0; game.availableStory() && safety < 70; safety++) {
		const mission = game.availableStory();
		ok(game, "story", { choice: "accept" });
		if (mission.id === "supply-escort" && process.env.MERIDIAN_CONVOY_FIXTURE)
			writeFileSync(process.env.MERIDIAN_CONVOY_FIXTURE, `${game.save()}\n`);
		completeMission(
			game,
			mission,
			null,
			mission.id === "prisoners" ? route : "complete",
		);
		completed.push(mission.id);
		if (onComplete) onComplete(game, mission);
	}
	assert.equal(game.state.mode, "ending");
	assert.equal(game.state.storyIndex, CAMPAIGN.length);
	assert.ok(game.state.credits > 0);
	assert.ok(game.state.hull > 0);
	return { game, completed };
}

test("source universe has unique valid systems, ships, outfits and local inventories", () => {
	assert.equal(SYSTEMS.length, 694);
	assert.equal(SHIPS.length, 351);
	assert.ok(OUTFITS.length >= 700);
	for (const items of [SYSTEMS, SHIPS, OUTFITS, CAMPAIGN])
		assert.equal(new Set(items.map((x) => x.id)).size, items.length);
	const ids = new Set(SYSTEMS.map((s) => s.id));
	for (const system of SYSTEMS)
		for (const link of system.links)
			assert.ok(ids.has(link), `${system.id} -> ${link}`);
	for (const mission of [...CAMPAIGN, ...ARCS.flatMap((a) => a.missions)])
		assert.ok(ids.has(mission.destinationId));
	const game = new Game();
	assert.deepEqual(
		game.availableShips().map((s) => s.id),
		["sparrow", "shuttle", "star-barge"],
	);
	assert.ok(game.availableOutfits().length > 0);
	assert.equal(game.act("buyShip", { shipId: "dreadnought" }).ok, false);
});

for (const ship of ["sparrow", "shuttle", "star-barge"])
	test(`complete Free Worlds reconciliation from starter ${ship} through actual travel and requirements`, () => {
		const { game, completed } = completeCampaign(ship);
		assert.ok(completed.includes("release-prisoners"));
		assert.ok(completed.includes("mutiny-evidence"));
		assert.ok(!completed.includes("checkmate-menkent"));
		assert.ok(!completed.includes("keep-prisoners"));
		assert.equal(game.state.flags.reconciliation, true);
		assert.ok(game.hasOutfit("jump-drive"));
		ok(game, "continue");
		assert.equal(game.state.mode, "port");
		ok(game, "launch");
		assert.equal(game.state.mode, "flight");
	});

test("Checkmate choice creates a distinct main campaign route and converges at the Pug ending", () => {
	const { completed, game } = completeCampaign("sparrow", "detain");
	assert.ok(completed.includes("keep-prisoners"));
	assert.ok(completed.includes("checkmate-menkent"));
	assert.ok(!completed.includes("release-prisoners"));
	assert.ok(!completed.includes("mutiny-evidence"));
	assert.ok(completed.includes("pugglemug"));
	assert.equal(game.state.flags["checkmate-complete"], true);
});

function buyEarnedUpgrade(game, shipId = "mule") {
	const wanted = SHIPS.find((ship) => ship.id === shipId);
	const shops = SYSTEMS.flatMap((system) =>
		system.planets
			.filter((planet) => planet.shipyard?.length)
			.map((planet) => ({ system, planet })),
	);
	const candidates = shops
		.map((entry) => ({ ...entry, route: game.routeTo(entry.system.id) }))
		.filter((entry) => entry.route !== null)
		.sort((a, b) => a.route.length - b.route.length);
	for (const { system, planet } of candidates) {
		const groups = planet.shipyard;
		// Use the same source inventory rules without changing the live captain's location.
		if (
			!SALES.some(
				(sale) =>
					sale.type === "shipyard" &&
					groups.includes(sale.name) &&
					sale.items.includes(wanted.name),
			)
		)
			continue;
		travel(game, system.id, planet.name);
		land(game);
		const before = game.state.credits;
		ok(game, "buyShip", { shipId });
		if (shipId === "mule") assert.ok(game.state.credits < before);
		assert.equal(game.state.shipId, shipId);
		return {
			shipId,
			systemId: system.id,
			planet: planet.name,
			paid: before - game.state.credits,
		};
	}
	assert.fail(`No real stocked shipyard could sell ${shipId}.`);
}

test("a real starter earns a larger ship mid-campaign, then completes every available authored arc without injected credits or flags", () => {
	let upgraded = false,
		upgradeRecord = null;
	const { game, completed } = completeCampaign(
		"sparrow",
		"release",
		(captain, mission) => {
			if (mission.id === "jump-drive") {
				upgradeRecord = buyEarnedUpgrade(captain);
				upgraded = true;
				assert.ok(captain.hasOutfit("jump-drive"));
			}
		},
	);
	assert.equal(upgraded, true);
	ok(game, "continue");
	const done = [];
	for (
		let safety = 0;
		game.state.completedArcs.length < ARCS.length && safety < 1000;
		safety++
	) {
		const mission = game.availableArcs().find((mission) => !mission.locked);
		assert.ok(
			mission,
			`No unlocked remaining story: ${game
				.availableArcs()
				.map((mission) => mission.lockedReason)
				.join(" | ")}`,
		);
		if (game.state.cargo.metal && game.currentSystem().inhabited)
			ok(game, "sell", {
				commodityId: "metal",
				quantity: game.state.cargo.metal,
			});
		const targetPlanet = game
			.systemById(mission.destinationId)
			.planets.find((planet) => planet.name === mission.destinationName);
		const needsGaslining =
			targetPlanet?.attributes.includes("requires: gaslining") ||
			(mission.visitPlanets || []).some((name) =>
				SYSTEMS.some((system) =>
					system.planets.some(
						(planet) =>
							planet.name === name &&
							planet.attributes.includes("requires: gaslining"),
					),
				),
			);
		if (needsGaslining && !game.stats().gaslining) {
			const owned = game
				.parkedShips()
				.find(
					(ship) =>
						ship.stats.gaslining &&
						ship.stats.cargoCapacity >=
							Math.max(game.cargoUsed(), mission.cargo || 0) &&
						ship.stats.passengerCapacity >=
							Math.max(game.passengersUsed(), mission.passengers || 0),
				);
			if (owned) ok(game, "switchShip", { fleetId: owned.id });
			else buyEarnedUpgrade(game, "nimbo-cirrus");
		}
		if (
			targetPlanet?.attributes.includes("requires: starlining") &&
			!game.stats().starlining
		) {
			const prototype = game.state.fleet.find((ship) =>
				ship.outfits?.includes("radiant-shield-shunt"),
			);
			assert.ok(prototype, "A source-earned stellar prototype is required.");
			ok(game, "switchShip", { fleetId: prototype.id });
		}
		if (mission.cloak && !game.stats().cloakAvailable) {
			const cloaker = game
				.parkedShips()
				.find(
					(ship) =>
						ship.stats.cloakAvailable &&
						ship.stats.cargoCapacity >=
							Math.max(game.cargoUsed(), mission.cargo || 0) &&
						ship.stats.passengerCapacity >=
							Math.max(game.passengersUsed(), mission.passengers || 0),
				);
			assert.ok(cloaker, "An earned cloaking ship is required.");
			ok(game, "switchShip", { fleetId: cloaker.id });
		}
		if (
			game.stats().freeCargo < (mission.cargo || 0) ||
			game.stats().freeBunks < (mission.passengers || 0)
		) {
			const ship = game.state.fleet.find(
				(ship) =>
					(!needsGaslining || game.fleetShipStats(ship).gaslining) &&
					(!mission.cloak || game.fleetShipStats(ship).cloakAvailable) &&
					game.fleetShipStats(ship).cargoCapacity >=
						Math.max(game.cargoUsed(), mission.cargo || 0) &&
					game.fleetShipStats(ship).passengerCapacity >=
						Math.max(game.passengersUsed(), mission.passengers || 0),
			);
			if (ship) ok(game, "switchShip", { fleetId: ship.id });
			else if (needsGaslining) buyEarnedUpgrade(game, "nimbo-cirrus");
		}
		ok(game, "acceptArc", { arcId: mission.arcId });
		completeMission(game, mission, mission.arcId);
		done.push(mission.id);
		assert.ok(game.state.credits >= 0);
		assert.ok(game.stats().freeCargo >= 0);
		assert.ok(game.stats().freeBunks >= 0);
	}
	assert.equal(game.state.completedArcs.length, ARCS.length);
	assert.ok(done.length >= ARCS.length);
	const restored = Game.load(game.save());
	assert.equal(restored.state.completedArcs.length, ARCS.length);
	assert.ok(restored.hasOutfit("jump-drive"));
	if (process.env.MERIDIAN_VOYAGE_EVIDENCE)
		writeFileSync(
			process.env.MERIDIAN_VOYAGE_EVIDENCE,
			`${JSON.stringify(
				{
					generatedAt: new Date().toISOString(),
					scope:
						"Rules-level economic and narrative reachability; combat and protected-arrival events are simulated, while cloaking time and resource consumption use the real model. Browser and physics verification is separate.",
					startingShip: "sparrow",
					startingCredits: 24000,
					cheatCredits: 0,
					injectedProgressionFlags: 0,
					upgrade: upgradeRecord,
					mainMissionIds: completed,
					sideMissionIds: done,
					completedArcs: game.state.completedArcs,
					endingSeen: game.state.endingSeen,
					finalShip: game.state.shipId,
					credits: game.state.credits,
					debt: game.state.debt,
					days: game.state.day,
					jumps: game.state.totalJumps,
					visitedSystems: game.state.visited.length,
					kills: game.state.kills,
					ownedHangar: game.state.fleet.map((ship) => ship.shipId),
					savedAndRestored: true,
				},
				null,
				2,
			)}\n`,
		);
});

test("cargo and bunks are reserved across jobs and missions; invalid transactions are atomic", () => {
	const game = new Game();
	const original = game.save();
	for (const quantity of [-3, 0, NaN, Infinity, "bad"])
		assert.equal(game.act("buy", { commodityId: "food", quantity }).ok, false);
	assert.equal(game.save(), original);
	ok(game, "buy", { commodityId: "food", quantity: 15 });
	assert.equal(game.act("buy", { commodityId: "food", quantity: 1 }).ok, false);
	assert.equal(
		game.act("acceptJob", {
			jobId: game.availableJobs().find((j) => j.cargo)?.id,
		}).ok,
		false,
	);
	ok(game, "sell", { commodityId: "food", quantity: 15 });
	assert.equal(
		game.act("sell", { commodityId: "food", quantity: 1 }).ok,
		false,
	);
	ok(game, "story");
	assert.equal(game.stats().passengersUsed, 1);
	const jobs = game
		.availableJobs()
		.filter((j) => j.passengers && j.passengers <= game.stats().freeBunks);
	ok(game, "acceptJob", { jobId: jobs[0].id });
	assert.ok(game.stats().passengersUsed <= game.stats().passengerCapacity);
});

test("job delivery pays once and expires with reserved space released", () => {
	const game = new Game(),
		job = game.availableJobs().find((j) => j.kind === "delivery");
	ok(game, "acceptJob", { jobId: job.id });
	travel(game, job.destinationId);
	land(game);
	assert.equal(game.state.jobs.length, 0);
	assert.ok(game.state.completedJobs.includes(job.id));
	const paid = game.state.credits;
	ok(game, "launch");
	land(game);
	assert.equal(game.state.credits, paid);
	const expiring = game.availableJobs().find((j) => j.kind === "delivery");
	ok(game, "acceptJob", { jobId: expiring.id });
	game.advanceDay(20);
	assert.equal(game.state.jobs.length, 0);
	assert.equal(game.cargoUsed(), 0);
});

test("jump adjacency, fuel, landing approach, repair costs, and rescue prevent travel exploits and deadlock", () => {
	const game = new Game();
	assert.equal(game.act("jump", { systemId: "sol" }).ok, false);
	ok(game, "launch");
	assert.equal(game.act("jump", { systemId: "sol" }).ok, false);
	assert.equal(game.act("land").ok, false);
	game.state.fuel = 0;
	assert.equal(game.act("jump", { systemId: "arcturus" }).ok, false);
	game.state.credits = 0;
	const debt = game.state.debt;
	ok(game, "damage", { amount: 99999 });
	assert.equal(game.state.mode, "destroyed");
	ok(game, "rescue");
	assert.equal(game.state.mode, "port");
	assert.ok(game.state.debt > debt);
	assert.equal(game.state.credits, 0);
	assert.equal(game.state.hull, game.stats().maxHull);
	assert.equal(game.state.fuel, game.stats().maxFuel);
});

test("planet selection changes source-backed local inventories and requires flight", () => {
	const game = new Game();
	assert.equal(game.act("selectPlanet", { planetName: "Earth" }).ok, false);
	travel(game, "sol", "Earth");
	land(game);
	assert.equal(game.currentPlanet().name, "Earth");
	assert.equal(game.act("selectPlanet", { planetName: "Luna" }).ok, false);
	ok(game, "launch");
	ok(game, "selectPlanet", { planetName: "Luna" });
	land(game);
	assert.equal(game.currentPlanet().name, "Luna");
});

test("combat counts only active contacts, boarding failure is atomic, encounters do not respawn on relaunch", () => {
	const game = new Game();
	game.state.storyIndex = CAMPAIGN.findIndex((m) => m.id === "electron-theft");
	ok(game, "story");
	const mission = game.availableStory();
	travel(game, mission.destinationId, mission.destinationName);
	const beforeKills = game.state.kills;
	assert.equal(game.act("kill").ok, false);
	assert.equal(game.state.kills, beforeKills);
	game.state.credits = 0;
	const before = game.save();
	assert.equal(game.act("board", { choice: "capture" }).ok, false);
	assert.equal(game.save(), before);
	ok(game, "board", { choice: "salvage" });
	assert.equal(game.state.activeStory.boarded, true);
	land(game);
	ok(game, "launch");
	assert.equal(game.state.enemies, 0);
});

test("fleet hiring, commands, losses and upkeep are persistent", () => {
	const game = new Game();
	ok(game, "hireEscort");
	const escort = game.state.escorts[0];
	ok(game, "fleetCommand", { escortId: escort.id, command: "attack" });
	assert.equal(escort.command, "attack");
	const credits = game.state.credits;
	game.advanceDay();
	assert.equal(
		game.state.credits,
		credits - 90 - game.state.bank.statement.payment,
	);
	ok(game, "launch");
	ok(game, "escortDamage", { escortId: escort.id, amount: 1000 });
	assert.equal(game.state.escorts.length, 0);
});

test("mining requires time and finite reserves; outfit effects and saves round-trip", () => {
	const game = new Game();
	ok(game, "launch");
	ok(game, "mine");
	assert.equal(game.act("mine").ok, false);
	ok(game, "regenerate", { seconds: 1 });
	ok(game, "regenerate", { seconds: 1 });
	ok(game, "mine");
	assert.equal(game.state.cargo.metal, 2);
	assert.ok(game.state.resourceReserves.rutilicus.remaining < 40);
	const restored = Game.load(game.save());
	assert.deepEqual(restored.state, game.state);
	assert.throws(() => Game.load('{"systemId":"wrong"}'));
	assert.throws(() => Game.load("{"));
});

test("weapon energy and heat constrain firing and recover with simulated time", () => {
	const game = new Game();
	ok(game, "launch");
	let count = 0;
	while (game.act("fire").ok && count++ < 200) {}
	assert.ok(count > 1 && count < 200);
	assert.ok(
		game.state.overheated || game.state.energy < game.stats().energyCost,
	);
	for (let i = 0; i < 20; i++) ok(game, "regenerate", { seconds: 1 });
	assert.equal(game.state.overheated, false);
	ok(game, "fire");
});

test("native Intro loads lazily, reserves passenger space, follows dialogue and completes at the actual planet", async () => {
	const game = new Game();
	assert.equal(game.sourceEngine, undefined);
	await game.enableSourceMissions();
	const intro = game
		.availableSourceMissions()
		.find((mission) => mission.id === "Intro [0]");
	assert.ok(intro);
	ok(game, "sourceOffer", { missionId: intro.id });
	for (let i = 0; game.sourceDialogue() && i < 40; i++) {
		const dialogue = game.sourceDialogue();
		assert.ok(dialogue.options.length);
		const yes =
			dialogue.options.find(
				(option) =>
					!/decline|no,|not interested|leave|refuse/i.test(option.text),
			) || dialogue.options[0];
		ok(game, "sourceChoose", { index: yes.index });
	}
	const mission = game
		.activeSourceMissions()
		.find((mission) => mission.id === intro.id);
	assert.ok(
		mission,
		"James must be aboard after accepting the original conversation.",
	);
	assert.ok(game.stats().passengersUsed >= mission.passengers);
	const target = SYSTEMS.find(
		(system) => system.name === mission.destinationSystem,
	);
	travel(game, target.id, mission.destination);
	land(game);
	ok(game, "sourceComplete", { missionId: intro.id });
	assert.equal(game.state.sourceQuests.conditions["Intro [0]: done"], 1);
	assert.equal(
		game.state.sourceQuests.active.some((mission) => mission.id === intro.id),
		false,
	);
	const loaded = Game.load(game.save());
	await loaded.enableSourceMissions();
	assert.equal(loaded.state.sourceQuests.conditions["Intro [0]: done"], 1);
});

test("native source actors enforce identity, disable vs destroy, scans and protected convoy failure", async () => {
	const { SourceMissionEngine } = await import("../src/source-missions.js");
	const n = (tokens, children = []) => ({ tokens, children });
	const definitions = [
		{
			name: "Bridge actor test",
			sourceFile: "test",
			nodes: [
				n(["source", "New Boston"]),
				n(["destination", "New Boston"]),
				n(
					["npc", "disable", "board"],
					[n(["ship", "Sparrow", "Named quarry"])],
				),
			],
		},
		{
			name: "Protected ship test",
			sourceFile: "test",
			nodes: [
				n(["source", "New Boston"]),
				n(["destination", "New Boston"]),
				n(
					["npc", "save", "accompany"],
					[n(["ship", "Shuttle", "Precious cargo"])],
				),
			],
		},
	];
	const game = new Game();
	await game.enableSourceMissions();
	game.sourceEngine = new SourceMissionEngine({ missions: definitions });
	ok(game, "sourceAccept", { missionId: definitions[0].name });
	ok(game, "launch");
	let actor = game.missionActors()[0];
	assert.ok(actor);
	assert.equal(actor.role, "hostile");
	assert.equal(
		game.act("sourceActorEvent", { action: "board", actorId: actor.id }).ok,
		false,
	);
	ok(game, "sourceActorEvent", { action: "disable", actorId: actor.id });
	assert.equal(
		game
			.activeSourceMissions()[0]
			.objectives.find((objective) => objective.type === "disable").progress,
		1,
	);
	assert.equal(
		game
			.activeSourceMissions()[0]
			.objectives.find((objective) => objective.type === "board").progress,
		0,
	);
	ok(game, "sourceActorEvent", { action: "board", actorId: actor.id });
	ok(game, "sourceActorEvent", { action: "board", actorId: actor.id });
	assert.equal(
		game
			.activeSourceMissions()[0]
			.objectives.find((objective) => objective.type === "board").progress,
		1,
	);
	land(game);
	ok(game, "sourceComplete", { missionId: definitions[0].name });
	ok(game, "sourceAccept", { missionId: definitions[1].name });
	ok(game, "launch");
	actor = game.missionActors()[0];
	assert.equal(actor.role, "escort");
	ok(game, "sourceActorEvent", { action: "destroy", actorId: actor.id });
	assert.equal(
		game.state.sourceQuests.conditions["Protected ship test: failed"],
		1,
	);
});

test("native world effects change navigation and local government without mutating the source inventory", async () => {
	const { applySourceEffects } = await import("../src/source-bridge.js");
	const game = new Game(),
		original = SYSTEMS.find(
			(system) => system.id === "rutilicus",
		).links.slice();
	applySourceEffects(game, {
		ok: true,
		effects: [
			{
				type: "world",
				node: { tokens: ["unlink", "Rutilicus", "Arcturus"], children: [] },
			},
			{
				type: "world",
				node: {
					tokens: ["system", "Rutilicus"],
					children: [{ tokens: ["government", "Free Worlds"], children: [] }],
				},
			},
		],
	});
	assert.equal(game.neighbors().includes("arcturus"), false);
	assert.equal(game.currentSystem().faction, "Free Worlds");
	assert.deepEqual(
		SYSTEMS.find((system) => system.id === "rutilicus").links,
		original,
	);
	assert.equal(Game.load(game.save()).currentSystem().faction, "Free Worlds");
});

test("secondary launchers reserve magazine capacity, consume actual ammunition and respect cooldown", () => {
	const game = new Game();
	assert.equal(
		game.act("buyAmmo", { ammoId: "meteor-missile", quantity: 1 }).ok,
		false,
	);
	game.state.outfits.push("meteor-missile-pod");
	const baseDamage = game.stats().damage;
	assert.equal(game.secondaryWeapon().capacity, 7);
	assert.equal(
		game.act("buyAmmo", { ammoId: "meteor-missile", quantity: 8 }).ok,
		false,
	);
	ok(game, "buyAmmo", { ammoId: "meteor-missile", quantity: 2 });
	assert.equal(
		game.stats().damage,
		baseDamage,
		"Missiles must not increase the unlimited primary gun damage.",
	);
	ok(game, "launch");
	assert.equal(game.stats().canSecondary, true);
	const energy = game.state.energy;
	ok(game, "secondary");
	assert.equal(game.state.ammo["meteor-missile"], 1);
	assert.ok(game.state.energy < energy);
	assert.equal(game.act("secondary").ok, false);
	for (let i = 0; i < 4; i++) ok(game, "regenerate", { seconds: 1 });
	ok(game, "secondary");
	assert.equal(game.state.ammo["meteor-missile"], 0);
	for (let i = 0; i < 4; i++) ok(game, "regenerate", { seconds: 1 });
	assert.equal(game.act("secondary").ok, false);
	const loaded = Game.load(game.save());
	assert.equal(loaded.secondaryWeapon().ammoCount, 0);
});

test("boarding crew occupy bunks, cost wages and improve capture strength; point defense uses energy", () => {
	const game = new Game(),
		strength = game.capturePower();
	ok(game, "hireCrew", { count: 2 });
	assert.equal(game.stats().freeBunks, 1);
	assert.ok(game.capturePower() > strength);
	const credits = game.state.credits;
	game.advanceDay();
	assert.equal(
		game.state.credits,
		credits - 30 - game.state.bank.statement.payment,
	);
	assert.equal(game.act("hireCrew", { count: 2 }).ok, false);
	ok(game, "dismissCrew", { count: 2 });
	assert.equal(game.stats().freeBunks, 3);
	game.state.outfits.push("anti-missile-turret");
	ok(game, "launch");
	assert.ok(game.stats().pointDefense > 0);
	const energy = game.state.energy;
	ok(game, "intercept");
	assert.equal(game.state.energy, energy - 2);
});

test("source mineral fields yield real mineral cargo used by native quests and sell for credits", () => {
	const game = new Game();
	assert.ok(
		game.availableMinerals().some((mineral) => mineral.id === "copper"),
	);
	ok(game, "selectMineral", { mineralId: "copper" });
	ok(game, "launch");
	assert.equal(
		game.act("mine").ok,
		false,
		"Intact minerals require mining equipment.",
	);
	game.state.outfits.push("mining-laser");
	ok(game, "mine");
	const copper = game.mineralCargo().find((mineral) => mineral.id === "copper");
	assert.equal(copper.quantity, 1);
	assert.ok(game.cargoUsed() > 0);
	assert.equal(game.sourceContext().outfits.Copper, 1);
	land(game);
	const credits = game.state.credits;
	ok(game, "sellMineral", { mineralId: "copper", quantity: 1 });
	assert.ok(game.state.credits > credits);
	assert.equal(game.mineralCargo().length, 0);
});

test("moving a source system changes jump-drive adjacency at both ends, and hidden planets can be revealed", () => {
	const game = new Game();
	game.state.outfits.push("jump-drive");
	const nearHome = game.neighbors("patir");
	game.state.worldSystems.patir = { x: 10059.5, y: 10.5 };
	const nearBeyond = game.neighbors("patir");
	assert.notDeepEqual(nearBeyond, nearHome);
	assert.ok(nearBeyond.length > 0);
	assert.ok(game.neighbors(nearBeyond[0]).includes("patir"));
	assert.equal(game.revealPlanet("lathia", "Magic Asteroid Planet"), true);
	assert.ok(
		game
			.systemById("lathia")
			.planets.some((planet) => planet.name === "Magic Asteroid Planet"),
	);
});

test("source submunition weapons resolve their payload damage into a functional upgrade", () => {
	const proton = OUTFITS.find((outfit) => outfit.id === "proton-gun");
	assert.ok(proton.weapon["shield damage"] > 0);
	assert.ok(proton.effects.damage > 0);
	const game = new Game(),
		before = game.stats().damage;
	game.state.outfits.push(proton.id);
	assert.ok(game.stats().damage > before);
});

test("keeping a ship, switching flagships, deploying, parking and selling conserve each equipment inventory", () => {
	const game = new Game();
	game.state.credits = 1000000;
	game.state.outfits.push("meteor-missile-pod");
	game.state.ammo["meteor-missile"] = 3;
	ok(game, "buyShip", { shipId: "shuttle", keepCurrent: true });
	assert.equal(game.state.fleet.length, 1);
	const sparrow = game.state.fleet[0];
	assert.ok(sparrow.outfits.includes("meteor-missile-pod"));
	assert.equal(sparrow.ammo["meteor-missile"], 3);
	assert.equal(game.state.outfits.includes("meteor-missile-pod"), false);
	ok(game, "switchShip", { fleetId: sparrow.id });
	assert.equal(game.state.shipId, "sparrow");
	assert.equal(game.state.ammo["meteor-missile"], 3);
	const shuttle = game.state.fleet[0];
	ok(game, "deployShip", { fleetId: shuttle.id });
	assert.equal(game.state.fleet.length, 0);
	ok(game, "parkEscort", { escortId: shuttle.id });
	assert.equal(game.state.escorts.length, 0);
	const credits = game.state.credits,
		value = game.parkedShips()[0].saleValue;
	ok(game, "sellParked", { fleetId: shuttle.id });
	assert.equal(game.state.credits, credits + value);
	assert.equal(game.act("sellParked", { fleetId: shuttle.id }).ok, false);
	const loaded = Game.load(game.save());
	assert.equal(loaded.state.ammo["meteor-missile"], 3);
});

test("flagship swaps reject undersized cargo holds atomically and trades retain critical alien navigation equipment", () => {
	const game = new Game().newGame("star-barge");
	game.state.credits = 1000000;
	ok(game, "buyShip", { shipId: "sparrow", keepCurrent: true });
	const barge = game.state.fleet[0];
	ok(game, "switchShip", { fleetId: barge.id });
	ok(game, "buy", { commodityId: "food", quantity: 20 });
	const before = game.save();
	assert.equal(game.act("switchShip", { shipId: "sparrow" }).ok, false);
	assert.equal(game.save(), before);
	ok(game, "sell", { commodityId: "food", quantity: 20 });
	game.state.outfits.push("jump-drive", "quantum-keystone");
	ok(game, "buyShip", { shipId: "shuttle" });
	assert.ok(game.hasOutfit("jump-drive"));
	assert.ok(game.hasOutfit("keystone"));
});

test("Kestrel bay configuration grants two real fighter slots while combat configurations change stats", () => {
	const game = new Game().newGame("kestrel");
	const base = game.stats();
	game.state.flags["kestrel-weapons"] = true;
	assert.equal(game.stats().damage, base.damage + 20);
	delete game.state.flags["kestrel-weapons"];
	game.state.flags["kestrel-bays"] = true;
	game.state.escorts = Array.from({ length: 6 }, (_, i) => ({
		id: `escort-${i}`,
		name: "Sparrow",
		shipId: "sparrow",
		hull: 100,
		maxHull: 100,
		command: "protect",
	}));
	game.state.fleet = [
		{ id: "fighter-a", name: "Barb", shipId: "barb", hull: 100, maxHull: 100 },
		{ id: "fighter-b", name: "Barb", shipId: "barb", hull: 100, maxHull: 100 },
		{ id: "fighter-c", name: "Barb", shipId: "barb", hull: 100, maxHull: 100 },
	];
	ok(game, "deployShip", { fleetId: "fighter-a" });
	ok(game, "deployShip", { fleetId: "fighter-b" });
	assert.equal(game.state.escorts.length, 8);
	assert.equal(game.act("deployShip", { fleetId: "fighter-c" }).ok, false);
});

test("authored and original James introductions cannot be accepted twice", async () => {
	const authored = new Game();
	ok(authored, "story");
	await authored.enableSourceMissions();
	assert.equal(
		authored
			.availableSourceMissions()
			.some((mission) => mission.id === "Intro [0]"),
		false,
	);
	assert.equal(
		authored.act("sourceOffer", { missionId: "Intro [0]" }).ok,
		false,
	);
	const original = new Game();
	await original.enableSourceMissions();
	ok(original, "sourceAccept", { missionId: "Intro [0]" });
	assert.equal(original.availableStory().locked, true);
	assert.equal(original.act("story").ok, false);
	for (let i = 0; original.sourceDialogue() && i < 20; i++)
		ok(original, "sourceChoose", { index: 0 });
	assert.ok(
		original.state.sourceQuests.active.some(
			(mission) => mission.id === "Intro [0]",
		),
	);
	travel(original, "arcturus", "New Greenland");
	land(original);
	ok(original, "sourceComplete", { missionId: "Intro [0]" });
	assert.equal(original.state.storyIndex, 1);
	assert.equal(original.availableStory().id, "pact-recon");
	assert.equal(
		original.state.sourceQuests.conditions["Pact Recon 0: done"],
		undefined,
		"No unplayed original quest is falsely marked complete.",
	);
});

test("authored battles retain their source enemy identity", () => {
	for (const [missionId, faction] of [
		["pugglemug", "Pug"],
		["liberate-kornephoros", "Republic"],
		["alpha-raid", "Alpha"],
	]) {
		const game = new Game();
		game.state.storyIndex = CAMPAIGN.findIndex(
			(mission) => mission.id === missionId,
		);
		ok(game, "story");
		const mission = game.availableStory();
		game.state.systemId = mission.destinationId;
		game.state.planetName = mission.destinationName;
		ok(game, "launch");
		assert.equal(game.state.encounter.faction, faction);
	}
});

test("hired escort contracts cannot be resold at owned-ship prices or commandeered for free", () => {
	const game = new Game(),
		credits = game.state.credits;
	ok(game, "hireEscort");
	const escort = game.state.escorts[0];
	assert.equal(escort.contract, true);
	ok(game, "parkEscort", { escortId: escort.id });
	assert.equal(game.parkedShips()[0].saleValue, 5000);
	assert.equal(game.act("switchShip", { fleetId: escort.id }).ok, false);
	ok(game, "sellParked", { fleetId: escort.id });
	assert.ok(game.state.credits < credits);
	game.state.fleet.push({
		id: "owned-prize",
		name: "Sparrow",
		shipId: "sparrow",
		hull: 111,
		maxHull: 111,
	});
	assert.ok(game.parkedShips()[0].saleValue > 5000);
});

test("legacy rental saves retain contract restrictions while explicit buyouts remain owned", () => {
	const old = new Game();
	old.state.escorts = [
		{
			id: "escort-legacy-1",
			name: "Sparrow",
			shipId: "sparrow",
			hull: 100,
			maxHull: 100,
		},
	];
	const loaded = Game.load(old.save());
	assert.equal(loaded.state.escorts[0].contract, true);
	loaded.state.credits = 100000;
	ok(loaded, "buyoutEscort", { escortId: "escort-legacy-1" });
	assert.equal(Game.load(loaded.save()).state.escorts[0].contract, false);
});

test("no factory ship can be purchased and sold for a profit through inflated stock ammunition", () => {
	const game = new Game();
	for (const ship of SHIPS) {
		const ammo = {};
		for (const [name, count] of Object.entries(ship.stockOutfits)) {
			const outfit = OUTFITS.find(
				(outfit) => outfit.name === name && outfit.category === "Ammunition",
			);
			if (outfit) ammo[outfit.id] = count;
		}
		assert.ok(
			game.parkedShipValue({ shipId: ship.id, hull: ship.maxHull, ammo }) <=
				ship.price,
			ship.name,
		);
	}
});

test("disabled wreck identity persists across saves and is consumed once by boarding", () => {
	const game = new Game();
	ok(game, "launch");
	game.state.enemies = 1;
	ok(game, "kill", {
		wreck: { id: "physical-wreck-1", shipId: "sparrow", x: 8, z: -4 },
	});
	const restored = Game.load(game.save());
	assert.equal(restored.state.wrecks[0].x, 8);
	const before = restored.save();
	assert.equal(
		restored.act("board", { wreckId: "missing", choice: "capture" }).ok,
		false,
	);
	assert.equal(restored.save(), before);
	ok(restored, "board", { wreckId: "physical-wreck-1", choice: "capture" });
	assert.equal(restored.state.wrecks.length, 0);
	assert.equal(restored.state.disabled, 0);
	assert.equal(restored.state.escorts[0].shipId, "sparrow");
	assert.equal(
		restored.act("board", { wreckId: "physical-wreck-1" }).ok,
		false,
	);
});

test("active cloaking consumes resources, suspends weapons and shields, persists and breaks on damage", () => {
	const game = new Game();
	game.state.outfits.push("cloaking-device");
	ok(game, "launch");
	game.state.shield = 20;
	ok(game, "cloak");
	assert.equal(game.stats().canFire, false);
	assert.equal(game.act("fire").ok, false);
	const fuel = game.state.fuel,
		energy = game.state.energy;
	ok(game, "regenerate", { seconds: 1 });
	assert.ok(game.state.energy < energy);
	assert.ok(game.state.fuel < fuel);
	assert.equal(game.state.shield, 20);
	const restored = Game.load(game.save());
	assert.equal(restored.state.cloaked, true);
	ok(restored, "damage", { amount: 1 });
	assert.equal(restored.state.cloaked, false);
	assert.equal(restored.state.cloakCooldown, 4);
	assert.equal(restored.act("cloak").ok, false);
	for (let i = 0; i < 4; i++) ok(restored, "regenerate", { seconds: 1 });
	ok(restored, "cloak");
	assert.equal(
		new Game().newGame("penguin").stats().cloakAvailable,
		true,
		"Source intrinsic cloak attributes are functional.",
	);
});

test("the Algenib evasion requires actual cloaked simulation time and clears a corridor without kill credit", () => {
	const game = new Game();
	game.state.outfits.push("cloaking-device");
	game.state.storyIndex = CAMPAIGN.findIndex(
		(mission) => mission.stealthSeconds,
	);
	const mission = game.availableStory();
	game.state.systemId = mission.destinationId;
	game.state.planetName = mission.destinationName;
	ok(game, "story");
	ok(game, "launch");
	assert.equal(game.state.enemies, 4);
	const visit = game.state.flightSerial;
	for (let i = 0; i < 4; i++) ok(game, "kill");
	assert.equal(game.state.enemies, 4);
	assert.equal(game.state.flightSerial, visit);
	const kills = game.state.kills;
	ok(game, "cloak");
	for (let i = 0; i < 7; i++) ok(game, "regenerate", { seconds: 1 });
	assert.equal(game.availableStory().ready, false);
	ok(game, "regenerate", { seconds: 1 });
	assert.equal(game.state.enemies, 0);
	assert.equal(game.state.kills, kills);
	land(game);
	assert.equal(game.availableStory().ready, true);
});

test("wormhole keystones and gaslining are source-backed access gates", () => {
	const game = new Game();
	const origin = SYSTEMS.find((system) => system.id === "cardea");
	const portal = origin.wormholes.find(
		(wormhole) => wormhole.name === "Ember Threshold",
	);
	game.state.systemId = origin.id;
	ok(game, "launch");
	assert.equal(game.act("jump", { systemId: portal.to }).ok, false);
	game.state.outfits.push("quantum-keystone");
	ok(game, "jump", { systemId: portal.to });
	const gasSystem = SYSTEMS.find((system) =>
		system.planets.some((planet) => planet.name === "Nasqueron"),
	);
	game.state.systemId = gasSystem.id;
	game.state.planetName = "Nasqueron";
	ok(game, "landReady", { ready: true });
	assert.equal(game.act("land").ok, false);
	game.state.shipId = "puffin";
	ok(game, "land");
});

test("stellar protection is a revocable loan on an owned prototype, not a permanent captain flag", () => {
	const game = new Game();
	const record = game.awardShip({
		shipId: "vujlet",
		name: "Nnesa ti-a-Oj",
		loanId: "stellar-test",
		outfits: ["radiant-shield-shunt", "multimodal-armor-keystone"],
	});
	ok(game, "switchShip", { fleetId: record.id });
	assert.equal(game.stats().starlining, true);
	assert.equal(game.act("buyShip", { shipId: "shuttle" }).ok, false);
	const owned = game.state.fleet.find((ship) => ship.shipId === "sparrow");
	ok(game, "switchShip", { fleetId: owned.id });
	assert.equal(game.act("sellParked", { fleetId: record.id }).ok, false);
	game.revokeShipLoan({
		loanId: "stellar-test",
		outfits: ["radiant-shield-shunt", "multimodal-armor-keystone"],
	});
	ok(game, "switchShip", { fleetId: record.id });
	assert.equal(game.stats().starlining, false);
	assert.equal(game.state.flagshipLoanId, null);
});

test("authored convoys require living arrivals, permit disabled-ship repair and offer a cargo-safe retry after loss", () => {
	const game = new Game();
	game.state.storyIndex = CAMPAIGN.findIndex(
		(mission) => mission.id === "supply-escort",
	);
	const mission = game.availableStory();
	game.state.systemId = mission.destinationId;
	game.state.planetName = mission.destinationName;
	ok(game, "story");
	const cargo = game.cargoUsed();
	game.state.flags["hai-license"] = true;
	assert.equal(
		game.act("acceptArc", { arcId: "turner-business" }).ok,
		false,
		"A second protected contract must not be accepted.",
	);
	ok(game, "launch");
	clearBattle(game);
	ok(game, "landReady", { ready: true });
	assert.equal(game.act("land").ok, false);
	const actor = game
		.missionActors()
		.find((actor) => actor.scope === "campaign");
	assert.ok(actor);
	ok(game, "sourceActorEvent", { actorId: actor.id, action: "disable" });
	assert.equal(game.availableStory().escortFailed, false);
	assert.equal(game.act("jump", { systemId: game.neighbors()[0] }).ok, false);
	ok(game, "sourceActorEvent", { actorId: actor.id, action: "assist" });
	assert.equal(game.campaignDepartureReady(), true);
	ok(game, "sourceActorEvent", { actorId: actor.id, action: "destroy" });
	assert.equal(game.availableStory().escortFailed, true);
	ok(game, "land");
	const credits = game.state.credits;
	ok(game, "retryEscort", { missionId: mission.id });
	assert.equal(game.cargoUsed(), cargo);
	assert.ok(game.state.credits < credits || game.state.debt > 75000);
	ok(game, "launch");
	clearBattle(game);
	land(game);
	assert.equal(game.availableStory().ready, true);
	ok(game, "story");
	assert.equal(
		game.missionActors().some((actor) => actor.scope === "campaign"),
		false,
	);
});

test("the Pug cut real source hyperlanes, retain a recoverable survey route and restore the postwar network", async () => {
	const { applyStoryWorld } = await import("../src/story-world.js");
	for (const checkmate of [false, true]) {
		const game = new Game();
		game.state.flags.checkmate = checkmate;
		game.state.storyIndex = CAMPAIGN.findIndex(
			(mission) => mission.id === "pug-arrival",
		);
		ok(game, "story");
		assert.equal(
			game.systemById("rasalhague").links.includes("cebalrai"),
			false,
		);
		assert.equal(
			game.systemById("zeta-aquilae").links.includes("ascella"),
			false,
		);
		assert.ok(game.routeTo("cebalrai"));
		assert.ok(game.routeTo("ascella"));
		assert.ok(game.routeTo("alioth"));
		applyStoryWorld(
			game,
			CAMPAIGN.find((mission) => mission.id === "pugglemug"),
			"complete",
		);
		assert.equal(
			game.systemById("rasalhague").links.includes("cebalrai"),
			true,
		);
		assert.equal(
			game.systemById("zeta-aquilae").links.includes("ascella"),
			true,
		);
		assert.ok(
			game
				.systemById("deneb")
				.planets.some((planet) => planet.name === "Pug Wormhole"),
		);
	}
});

test("a story-created wormhole is unavailable before its entrance object appears", () => {
	const game = new Game();
	assert.equal(game.neighbors("sabriset").includes("sko-karak"), false);
	game.revealPlanet("sabriset", "The Eye");
	game.revealPlanet("sko-karak", "The Eye");
	assert.equal(game.neighbors("sabriset").includes("sko-karak"), true);
});

test("Local Maps reveal actual chart coverage, are consumed, and cannot be charged twice for the same information", () => {
	const game = new Game();
	assert.equal(game.isCharted("rutilicus"), true);
	assert.equal(game.isCharted("deneb"), false);
	const credits = game.state.credits;
	const result = ok(game, "buyOutfit", { outfitId: "local-map" });
	assert.ok(result.charted.length > 0);
	assert.ok(game.state.credits < credits);
	assert.equal(game.state.outfits.includes("local-map"), false);
	const paid = game.state.credits;
	assert.equal(game.act("buyOutfit", { outfitId: "local-map" }).ok, false);
	assert.equal(game.state.credits, paid);
	const loaded = Game.load(game.save());
	assert.deepEqual(loaded.state.chartedSystems, game.state.chartedSystems);
});

test("independence changes actual governments without requiring Contacts, and Contacts cannot restart the war", async () => {
	const { applyStoryWorld } = await import("../src/story-world.js");
	const game = new Game();
	assert.equal(game.systemById("sargas").faction, "Republic");
	applyStoryWorld(
		game,
		CAMPAIGN.find((mission) => mission.id === "liberate-kornephoros"),
		"accept",
	);
	assert.equal(game.systemById("sargas").faction, "Free Worlds");
	game.state.day = 2000;
	await game.enableSourceMissions();
	assert.equal(
		game.state.sourceQuests.events.some(
			(event) =>
				event.name === "war begins" ||
				event.name.startsWith("initial deployment "),
		),
		false,
	);
	assert.equal(
		game.sourceEngine.worldValue("system", "Sargas").government,
		"Free Worlds",
	);
	assert.equal(game.state.sourceQuests.conditions["event: war begins"], 1);
	assert.equal(
		game.state.sourceQuests.conditions["Liberate Kornephoros: done"],
		undefined,
	);
});

test("the Puffin survey records both actual gas-giant landings and cannot complete from a scan at home", () => {
	const game = new Game().newGame("puffin");
	game.state.arcs.remnant = 4;
	const mission = game
		.availableArcs()
		.find((mission) => mission.arcId === "remnant");
	assert.deepEqual(mission.visitPlanets, ["Nasqueron", "Slylandro"]);
	ok(game, "acceptArc", { arcId: "remnant" });
	travel(game, mission.destinationId, mission.destinationName);
	ok(game, "scan");
	land(game);
	assert.equal(game.act("completeArc", { arcId: "remnant" }).ok, false);
	completeMission(game, mission, "remnant");
	assert.equal(game.state.arcs.remnant, 5);
});

test("the Heliarch expedition exposes and enforces the actual Deneb gate prerequisite", () => {
	const game = new Game();
	game.state.flags["coalition-license"] = true;
	game.state.flags["expanded-heliarch"] = true;
	game.state.arcs["coalition-allegiances"] = 7;
	const offer = game
		.availableArcs()
		.find((mission) => mission.arcId === "coalition-allegiances");
	assert.equal(offer.locked, true);
	assert.match(offer.lockedReason, /Deneb/);
	assert.equal(
		game.act("acceptArc", { arcId: "coalition-allegiances" }).ok,
		false,
	);
});

test("hired escorts keep unique ids and names after a release, including in older saves", () => {
	const game = new Game();
	game.state.credits = 200000;
	ok(game, "hireEscort");
	ok(game, "hireEscort");
	ok(game, "dismissEscort", { escortId: game.state.escorts[0].id });
	ok(game, "hireEscort");
	const [kept, hired] = game.state.escorts;
	assert.notEqual(kept.id, hired.id);
	assert.notEqual(kept.name, hired.name);
	ok(game, "launch");
	ok(game, "escortDamage", { escortId: kept.id, amount: 1000 });
	assert.deepEqual(
		game.state.escorts.map((escort) => escort.id),
		[hired.id],
	);
	const saved = JSON.parse(game.save());
	saved.escorts = [
		{ ...saved.escorts[0], id: "escort-1-1-0" },
		{ ...saved.escorts[0], id: "escort-1-1-0" },
	];
	const loaded = Game.load(JSON.stringify(saved));
	assert.equal(new Set(loaded.state.escorts.map((e) => e.id)).size, 2);
});

test("rescue docks at an inhabited spaceport, even from an uninhabited world in a settled system", () => {
	const game = new Game();
	const mixed = SYSTEMS.find(
		(system) =>
			system.planets.some((planet) => planet.inhabited) &&
			system.planets.some((planet) => !planet.inhabited),
	);
	game.state.systemId = mixed.id;
	game.state.planetName = mixed.planets.find((planet) => planet.inhabited).name;
	ok(game, "launch");
	ok(game, "selectPlanet", {
		planetName: mixed.planets.find((planet) => !planet.inhabited).name,
	});
	ok(game, "damage", { amount: 99999 });
	ok(game, "rescue");
	assert.equal(game.state.systemId, mixed.id);
	assert.equal(game.currentPlanet().inhabited, true);

	const remote = new Game();
	const empty = SYSTEMS.find(
		(system) =>
			system.planets.length &&
			system.planets.every((planet) => !planet.inhabited) &&
			remote.routeTo(system.id) !== null,
	);
	remote.state.systemId = empty.id;
	remote.state.planetName = empty.planets[0].name;
	ok(remote, "launch");
	ok(remote, "damage", { amount: 99999 });
	ok(remote, "rescue");
	assert.notEqual(remote.state.systemId, empty.id);
	assert.equal(remote.currentPlanet().inhabited, true);
	assert.ok(remote.state.visited.includes(remote.state.systemId));
});

test("ammunition racks install as outfits, add magazine space, and shared pools cannot be overfilled", () => {
	const game = new Game();
	game.state.credits = 1e6;
	const seller = SYSTEMS.flatMap((system) =>
		system.planets.map((planet) => [system.id, planet.name]),
	).find(([systemId, planetName]) => {
		game.state.systemId = systemId;
		game.state.planetName = planetName;
		return game
			.availableOutfits()
			.some((outfit) => outfit.id === "sidewinder-missile-rack");
	});
	assert.ok(seller);
	game.state.outfits.push("sidewinder-missile-pod");
	const capacity = game.ammoCapacity("sidewinder-missile");
	ok(game, "buyOutfit", { outfitId: "sidewinder-missile-rack" });
	assert.ok(game.state.outfits.includes("sidewinder-missile-rack"));
	assert.equal(game.ammoCapacity("sidewinder-missile"), capacity + 23);

	for (const ship of SHIPS.filter((ship) => ship.id === "mule")) {
		game.state.shipId = ship.id;
		game.state.outfits = [];
		game.resetAmmunition();
		assert.equal(game.state.ammo["sidewinder-missile-rack"], undefined);
		assert.equal(game.ammoSpace("sidewinder-missile"), 0);
		assert.ok(game.state.ammo["sidewinder-missile"] > 0);
	}

	game.state.shipId = "sparrow";
	game.state.outfits = ["korath-minelayer"];
	game.state.ammo = { "korath-mine": game.ammoCapacity("korath-mine") };
	assert.equal(game.ammoSpace("cluster-mine"), 0);
});

test("capturing a native kill target completes the kill objective", async () => {
	const { SourceMissionEngine } = await import("../src/source-missions.js");
	const n = (tokens, children = []) => ({ tokens, children });
	const bounty = {
		name: "Capture bounty test",
		sourceFile: "test",
		nodes: [
			n(["source", "New Boston"]),
			n(["destination", "New Boston"]),
			n(
				["npc", "kill"],
				[
					n(["ship", "Sparrow", "Wanted raider"]),
					n(["on", "kill"], [n(["set", "bounty claimed"])]),
				],
			),
		],
	};
	const game = new Game();
	await game.enableSourceMissions();
	game.sourceEngine = new SourceMissionEngine({ missions: [bounty] });
	game.state.credits = 100000;
	game.state.extraCrew = 20;
	ok(game, "sourceAccept", { missionId: bounty.name });
	ok(game, "launch");
	const actor = game.missionActors()[0];
	ok(game, "sourceActorEvent", { action: "disable", actorId: actor.id });
	ok(game, "sourceActorEvent", { action: "capture", actorId: actor.id });
	const [active] = game.activeSourceMissions();
	assert.equal(
		active.objectives.find((objective) => objective.type === "kill").progress,
		1,
	);
	assert.equal(game.state.sourceQuests.conditions["bounty claimed"], 1);
	assert.ok(Object.keys(game.state.sourceActors).length > 0);
	land(game);
	ok(game, "sourceAbort", { missionId: bounty.name });
	game.syncSourceActors();
	assert.deepEqual(game.state.sourceActors, {});
});

test("native shipyard edits apply every removal and addition in order", async () => {
	const { applySourceEffects } = await import("../src/source-bridge.js");
	const n = (tokens, children = []) => ({ tokens, children });
	const game = new Game();
	applySourceEffects(game, {
		ok: true,
		effects: [
			{
				type: "world",
				node: n(
					["shipyard", "Avgi Solar Heavy"],
					[
						n(["remove", "Melodikos"]),
						n(["add", "Kestrel"]),
						n(["remove", "Harmonikos"]),
					],
				),
			},
		],
	});
	assert.deepEqual(game.state.worldSales["shipyard:Avgi Solar Heavy"], [
		"Entasi",
		"Kestrel",
	]);
});

test("native conditions see a renamed flagship's stock outfits and flagship aliases", async () => {
	const { sourceContext } = await import("../src/source-bridge.js");
	const { SourceMissionEngine } = await import("../src/source-missions.js");
	const game = new Game();
	game.state.shipId = "mule";
	game.state.flagshipName = "Wanted raider";
	const [stock] = Object.keys(
		SHIPS.find((ship) => ship.id === "mule").stockOutfits,
	);
	const context = sourceContext(game);
	assert.ok(context.outfits[stock] > 0);
	const engine = new SourceMissionEngine({ missions: [] });
	engine.bind({ day: 1 }, context);
	assert.equal(
		engine.value(`outfit (flagship installed): ${stock}`),
		context.outfits[stock],
	);
	assert.equal(
		engine.value("flagship attribute: cargo space"),
		context.shipAttributes["cargo space"],
	);
	assert.equal(engine.value("days until year end"), 46);
});
