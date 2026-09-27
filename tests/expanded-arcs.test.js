import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const gameURL = process.env.MERIDIAN_TEST_ROOT
	? pathToFileURL(resolve(process.env.MERIDIAN_TEST_ROOT, "src/game.js"))
	: new URL("../src/game.js", import.meta.url);
const [
	{ createExpandedArcs, EXPANDED_ARC_SUMMARY, EXPANDED_COMBAT_IDENTITIES },
	{ ARCS, CAMPAIGN, Game, SYSTEMS },
	{ MISSION_DATA },
	{ CAMPAIGN_CONVOYS },
] = await Promise.all([
	import(new URL("./expanded-arcs.js", gameURL)),
	import(gameURL),
	import(new URL("./source-data.js", gameURL)),
	import(new URL("./campaign-convoys.js", gameURL)),
]);

const additions = createExpandedArcs({
	mission: (id, name, target, description, requirements = {}) => {
		const system = SYSTEMS.find(
			(s) => s.name === target || s.planets.some((p) => p.name === target),
		);
		assert(system, `Unknown target: ${target}`);
		return {
			id,
			name,
			title: name,
			destinationId: system.id,
			destinationName: target,
			description,
			reward: 32000,
			...requirements,
		};
	},
});
for (const arc of additions)
	if (!ARCS.some((existing) => existing.id === arc.id)) ARCS.push(arc);
const records = [];

test("all expanded stages have genuine source references and resolvable destinations", () => {
	assert.equal(additions.length, 29);
	assert.equal(additions.flatMap((arc) => arc.missions).length, 283);
	for (const arc of additions)
		for (const mission of arc.missions) {
			assert.equal(typeof mission.description, "string");
			assert(mission.description.length > 30);
			for (const id of mission.sourceMissions) {
				const source = MISSION_DATA.find((m) => m.name === id);
				assert(source, `Missing source: ${id}`);
				assert.equal(
					source.sourceFile,
					mission.sourceFile,
					`${id} source path`,
				);
			}
			for (const systemId of mission.scanSystems || [])
				assert(SYSTEMS.some((s) => s.id === systemId));
		}
});

test("combat identities match original hostile governments or explicit adaptation additions", () => {
	for (const arc of additions)
		for (const stage of arc.missions)
			if (stage.kills) {
				const identity = EXPANDED_COMBAT_IDENTITIES[stage.id];
				assert(identity, stage.id);
				assert.equal(stage.enemyFaction, identity.faction);
				if (identity.evidence === "source NPC government") {
					const source = MISSION_DATA.find((m) => m.name === identity.sourceId);
					assert(
						source.nodes.some(
							(n) =>
								n.tokens[0] === "npc" &&
								n.children.some(
									(c) =>
										c.tokens[0] === "government" &&
										c.tokens[1] === identity.faction,
								),
						),
						`${stage.id} source faction`,
					);
				}
				assert(
					![
						"Wanderer",
						"Remnant",
						"Coalition",
						"House Kaatrij",
						"Navy (Oathkeeper)",
						"Deep Security",
						"Merchant",
					].includes(identity.faction),
					`${stage.id} targets a friendly escort`,
				);
			}
});

function execute(game, action, payload = {}) {
	const result = game.act(action, payload);
	assert.equal(result.ok, true, `${action}: ${result.message}`);
	return result;
}
const eventEvidence = { arrivals: 0 };
function activeFor(game, id) {
	return [game.state.activeStory, ...game.state.activeArcs].find(
		(active) => active?.id === id,
	);
}
function stealthPending(game) {
	return game
		.activeMissions()
		.find(
			({ active, definition }) =>
				definition.destinationId === game.state.systemId &&
				definition.stealthSeconds &&
				(active.stealthElapsed || 0) < definition.stealthSeconds,
		);
}
function clearThreats(game) {
	if (stealthPending(game)) return;
	while (game.state.enemies > 0) execute(game, "kill");
}
function arriveProtectedShips(game) {
	// Explicit model receipts for the renderer's safe-docking events. This verifies
	// rules/identity/arrival bookkeeping, not physical distance in a browser scene.
	const pending = (game.missionActors() || []).filter(
		(actor) => actor.scope === "campaign" && actor.status === "active",
	);
	for (const actor of pending) {
		const active = activeFor(game, actor.missionId);
		if (game.escortStatus(active).failed) continue;
		execute(game, "sourceActorEvent", { actorId: actor.id, action: "safe" });
		eventEvidence.arrivals++;
	}
}
function landAt(game, mission = {}) {
	const planet = game
		.currentSystem()
		.planets.find((p) => p.name === mission.destinationName);
	if (planet) execute(game, "selectPlanet", { planetName: planet.name });
	if (mission.cloak === "land" && !game.state.cloaked) execute(game, "cloak");
	const blocking = game
		.activeMissions()
		.some(
			({ active, definition }) =>
				definition.destinationId === game.state.systemId &&
				game.escortStatus(active).required &&
				!game.escortStatus(active).failed &&
				!game.escortObjectiveReady(active),
		);
	if (blocking) {
		assert.equal(
			game.act("land", { approach: true }).ok,
			false,
			"landing cannot pause unarrived protected vessels",
		);
		assert.equal(game.state.mode, "flight");
	}
	arriveProtectedShips(game);
	execute(game, "landReady", { ready: true });
	execute(game, "land");
}
function reach(game, destination, mission = null) {
	if (game.state.mode === "port") execute(game, "launch");
	const route = game.routeTo(destination);
	assert(route, `No route from ${game.currentSystem().name} to ${destination}`);
	for (const systemId of route) {
		clearThreats(game);
		const reserve =
			mission?.stealthSeconds && systemId === destination ? 2.2 : 2;
		if (game.state.fuel < reserve && game.currentSystem().inhabited) {
			landAt(game);
			execute(game, "launch");
		}
		while (game.state.fuel < reserve) execute(game, "scoop");
		if (
			mission?.cloak === "enter" &&
			systemId === mission.destinationId &&
			!game.state.cloaked
		)
			execute(game, "cloak");
		execute(game, "jump", { systemId });
		clearThreats(game);
		if (systemId !== destination && game.currentSystem().inhabited) {
			landAt(game);
			execute(game, "launch");
		}
	}
	clearThreats(game);
}
function finishObjectives(game, mission) {
	for (const name of mission.visitPlanets || []) {
		const system = SYSTEMS.find((s) =>
			game.systemById(s.id).planets.some((p) => p.name === name),
		);
		assert(system, `Unknown required planet ${name}`);
		reach(game, system.id);
		landAt(game, { destinationName: name });
	}
	for (const systemId of mission.scanSystems || []) {
		reach(game, systemId);
		execute(game, "scan");
	}
	reach(game, mission.destinationId, mission);
	const active = activeFor(game, mission.id);
	if (mission.cloak === "enter" && !active.cloakedEntered) {
		// Some source stages begin on a different planet in the same system.
		const neighbor = game.neighbors()[0];
		assert(neighbor, "cloaked entry needs a real neighboring route");
		reach(game, neighbor);
		reach(game, mission.destinationId, mission);
	}
	if (mission.stealthSeconds) {
		if (!game.state.cloaked) execute(game, "cloak");
		for (let i = 0; i < mission.stealthSeconds; i++)
			execute(game, "regenerate", { seconds: 1 });
		assert(
			active.stealthElapsed >= mission.stealthSeconds,
			"actual elapsed cloaked evasion is required",
		);
	}
	clearThreats(game);
	if (mission.kills && mission.enemyFaction)
		assert.equal(
			game.state.encounter?.faction,
			mission.enemyFaction,
			`${mission.id} combat identity`,
		);
	if (mission.scan) execute(game, "scan");
	if (mission.board) execute(game, "board", { choice: "salvage" });
	if (mission.mine)
		while (active.mined < mission.mine) {
			execute(game, "regenerate", { seconds: 1 });
			execute(game, "regenerate", { seconds: 1 });
			execute(game, "mine");
		}
	landAt(game, mission);
	for (const name of mission.visitPlanets || [])
		assert(
			active.visitedPlanets?.includes(name),
			`actual landing on ${name} must be recorded`,
		);
}
function equipForMission(game, mission) {
	// Mining yields ordinary saleable cargo. Clear it through the market before
	// taking a smaller source prototype; never erase cargo to bypass capacity.
	if (game.state.mode === "port" && game.currentSystem().inhabited)
		for (const [commodityId, quantity] of Object.entries(game.state.cargo))
			if (quantity > 0) execute(game, "sell", { commodityId, quantity });
	const planet = game
		.systemById(mission.destinationId)
		.planets.find((p) => p.name === mission.destinationName);
	if (
		planet?.attributes?.includes("requires: starlining") &&
		!game.stats().starlining
	) {
		const prototype = game
			.parkedShips()
			.find((ship) => ship.loanId === "aqrabe-stellar");
		assert(prototype, "the source stellar prototype must have been awarded");
		execute(game, "switchShip", { fleetId: prototype.id });
		assert(
			game.stats().starlining,
			"the loaned outfit, not a fabricated global flag, enables starlining",
		);
	}
}
function playArc(game, id, branch = "first", record = false) {
	const arc = ARCS.find((a) => a.id === id);
	assert(arc, id);
	if (arc.requiredFlag && !game.state.flags[arc.requiredFlag]) {
		const prerequisite = ARCS.find((a) =>
			a.missions.some((m) => m.flag === arc.requiredFlag),
		);
		assert(prerequisite, `No actual producer for ${arc.requiredFlag}`);
		game = playArc(game, prerequisite.id);
	}
	const start = {
		jumps: game.state.totalJumps,
		kills: game.state.kills,
		boardings: game.state.boarded,
		mined: game.state.mined,
		arrivals: eventEvidence.arrivals,
	};
	let stages = 0;
	const chosen = [];
	while (!game.state.completedArcs.includes(id)) {
		const mission = game.availableArcs().find((a) => a.arcId === id);
		assert(mission, `${id} available stage`);
		assert(!mission.locked, `${id}: ${mission.lockedReason}`);
		assert(stages++ < arc.missions.length + 1, `${id} progression loop`);
		equipForMission(game, mission);
		execute(game, "acceptArc", { arcId: id });
		const active = activeFor(game, mission.id);
		if (CAMPAIGN_CONVOYS[mission.id]) {
			assert(
				active.convoy,
				"protected source roster must be integrated into actual Game state",
			);
			assert.equal(
				game.escortStatus(active).total,
				CAMPAIGN_CONVOYS[mission.id].members.length,
			);
		}
		if (
			mission.destinationId !== game.state.systemId ||
			mission.scan ||
			mission.kills ||
			mission.board ||
			mission.mine ||
			mission.scanSystems?.length ||
			mission.visitPlanets?.length ||
			CAMPAIGN_CONVOYS[mission.id]
		)
			assert.equal(game.act("completeArc", { arcId: id }).ok, false);
		finishObjectives(game, mission);
		const selected =
			mission.choices?.[
				branch === "third"
					? Math.min(2, mission.choices.length - 1)
					: branch === "second"
						? Math.min(1, mission.choices.length - 1)
						: 0
			]?.id || "complete";
		if (mission.choices?.length) chosen.push(selected);
		execute(game, "completeArc", { arcId: id, choice: selected });
		const saved = Game.load(game.save());
		assert.equal(saved.state.arcs[id], game.state.arcs[id]);
		game = saved;
	}
	assert(game.state.flags[`arc:${id}`]);
	assert(game.state.credits > 0);
	if (record)
		records.push({
			id,
			branch,
			stages,
			chosen,
			jumps: game.state.totalJumps - start.jumps,
			kills: game.state.kills - start.kills,
			boardings: game.state.boarded - start.boardings,
			mined: game.state.mined - start.mined,
			convoyArrivals: eventEvidence.arrivals - start.arrivals,
		});
	return game;
}
let checkpoint;
function playMain(branch = "reconciliation") {
	let game = new Game();
	const main = [];
	while (game.availableStory()) {
		const mission = game.availableStory();
		assert(main.length < CAMPAIGN.length, "main progression must terminate");
		execute(game, "story");
		finishObjectives(game, mission);
		execute(game, "story", {
			choice:
				mission.id === "prisoners" && branch === "checkmate"
					? "detain"
					: mission.choices?.[0]?.id || "complete",
		});
		main.push(mission.id);
		game = Game.load(game.save());
	}
	assert.equal(game.state.mode, "ending");
	assert(
		game.state.flags["world:pug flee"],
		"the Pug portal must be opened by the actual main quest",
	);
	assert(game.state.flags["human-war-resolved"]);
	const reconOnly = [
		"syndicate-answers",
		"cloak-at-hephaestus",
		"algenib-extremists",
		"parliament-resolution",
	];
	for (const id of reconOnly)
		assert.equal(main.includes(id), branch === "reconciliation", id);
	assert.equal(main.includes("checkmate-parliament"), branch === "checkmate");
	return { game, main };
}
function endgameCaptain() {
	if (!checkpoint) {
		let { game, main } = playMain();
		execute(game, "continue");
		// Standard late-game test gear is supplied only after earning the main story
		// and all of its world transitions. Economic acquisition is tested separately.
		const supplied = game.awardShip("nimbo-cirrus");
		const hull = game.parkedShips().find((s) => s.shipId === "nimbo-cirrus");
		assert(hull, supplied?.message);
		execute(game, "switchShip", { fleetId: hull.id });
		for (const id of [
			"jump-drive",
			"ramscoop",
			"cloaking-device",
			"quantum-keystone",
		])
			if (!game.state.outfits.includes(id)) game.state.outfits.push(id);
		const expanded = new Set(EXPANDED_ARC_SUMMARY.map((a) => a.id));
		for (const baseArc of ARCS.filter((a) => !expanded.has(a.id)))
			game = playArc(game, baseArc.id);
		records.push({
			id: "__earned_main_and_base_checkpoint",
			stages: main.length,
			main,
			baseArcs: game.state.completedArcs.slice(),
			credits: game.state.credits,
			debt: game.state.debt,
			jumps: game.state.totalJumps,
			convoyArrivals: eventEvidence.arrivals,
		});
		checkpoint = game.save();
	}
	return Game.load(checkpoint);
}
function runArc(id, branch = "first") {
	return playArc(endgameCaptain(), id, branch, true);
}

test("Checkmate earns its own Parliament settlement without the Reconciliation-only nuclear climax", () => {
	const { game, main } = playMain("checkmate");
	assert(game.state.flags["world:fwc kaus borealis ceded back"]);
	assert(!game.state.flags["extremists-contained"]);
	assert(!game.state.outfits.includes("cloaking-device"));
	records.push({
		id: "__earned_checkmate",
		stages: main.length,
		main,
		credits: game.state.credits,
		debt: game.state.debt,
		jumps: game.state.totalJumps,
	});
});

for (const { id } of EXPANDED_ARC_SUMMARY)
	test(`${id}: full modeled journey, objective gates and save/load`, () =>
		runArc(id));
for (const id of [
	"coalition-allegiances",
	"wanderer-machines",
	"patir-mystery",
	"timothy",
	"lost-racer",
	"paradise-fortune",
	"strider-diplomacy",
	"scars-legion",
])
	test(`${id}: alternate branch reaches its own resolution`, () =>
		runArc(id, "second"));
test("opposed coalition branches produce distinct final allegiance flags", () => {
	const heli = runArc("coalition-allegiances"),
		lunar = runArc("coalition-allegiances", "second");
	assert(heli.state.flags["heliarch-agent"]);
	assert(!heli.state.flags["lunarium-member"]);
	assert(lunar.state.flags["lunarium-member"]);
	assert(!lunar.state.flags["heliarch-agent"]);
});
test("Timothy has distinct prepared, hospice and grave outcomes", () => {
	const prepared = runArc("timothy"),
		medical = runArc("timothy", "second"),
		minimal = runArc("timothy", "third");
	assert(prepared.state.flags["tim-monk"]);
	assert(!prepared.state.flags["tim-grave"]);
	assert(medical.state.flags["tim-hospice"]);
	assert(!medical.state.flags["tim-monk"]);
	assert(minimal.state.flags["tim-grave"]);
	assert(!minimal.state.flags["tim-hospice"]);
});
test("the Emerald Sword is a real owned ship and is not duplicated by save/load", () => {
	const game = runArc("sheragi-emerald");
	assert.equal(
		game.state.fleet.filter((ship) => ship.shipId === "emerald-sword").length,
		1,
	);
	const restored = Game.load(game.save());
	assert.equal(
		restored.state.fleet.filter((ship) => ship.shipId === "emerald-sword")
			.length,
		1,
	);
});
test("Turner construction changes Greenwater actual shop inventories", () => {
	const game = runArc("turner-business");
	assert(game.currentPlanet().shipyard.includes("Megaparsec Advanced"));
	assert(game.currentPlanet().outfitter.includes("Lovelace Basics"));
	assert(game.inventory("shipyard").length > 0);
	assert(game.inventory("outfitter").length > 0);
});
test("the source stellar prototype enables the garden then returns its loaned systems", () => {
	const game = runArc("aqrabe-gardens");
	assert.equal(game.state.shipId, "vujlet");
	assert.equal(game.capability("starlining"), 0);
	assert.equal(game.state.flagshipLoanId, null);
	assert(!game.state.outfits.includes("radiant-shield-shunt"));
	assert(!game.state.outfits.includes("multimodal-armor-keystone"));
});
test("Cognizance awards the actual Merganser and Scar investigations reveal the actual hideout", () => {
	const remnant = runArc("remnant-cognizance");
	assert(remnant.state.fleet.some((ship) => ship.shipId === "merganser"));
	const scars = runArc("scars-legion");
	assert(
		scars
			.systemById("danoa")
			.planets.some((planet) => planet.name === "Scar's Hideout"),
	);
});
test("the Wanderer evacuation reveals both source Eye wormhole landmarks", () => {
	const game = runArc("wanderer-exodus");
	for (const id of ["sko-karak", "sabriset"])
		assert(
			game.systemById(id).planets.some((planet) => planet.name === "The Eye"),
		);
});
test("integrated protected convoy requires every arrival and recovers a disabled survivor", () => {
	let game = endgameCaptain();
	execute(game, "acceptArc", { arcId: "nanachi" });
	execute(game, "launch");
	clearThreats(game);
	const actor = game
		.missionActors()
		.find((a) => a.scope === "campaign" && a.status === "active");
	assert(actor);
	execute(game, "sourceActorEvent", { actorId: actor.id, action: "disable" });
	const active = game.state.activeArcs.find((a) => a.arcId === "nanachi");
	assert.equal(game.escortStatus(active).failed, false);
	assert.equal(game.escortStatus(active).disabled, 1);
	const before = game.save();
	assert.equal(game.act("jump", { systemId: game.neighbors()[0] }).ok, false);
	assert.equal(game.save(), before);
	game = Game.load(game.save());
	game.syncCampaignActors();
	assert.equal(game.state.campaignActors[actor.id].status, "disabled");
	execute(game, "sourceActorEvent", { actorId: actor.id, action: "assist" });
	assert.equal(game.state.campaignActors[actor.id].status, "active");
	const mission = game.availableArcs().find((a) => a.arcId === "nanachi");
	finishObjectives(game, mission);
	execute(game, "completeArc", { arcId: "nanachi" });
	assert.equal(game.state.arcs.nanachi, 1);
});
test("integrated convoy loss blocks completion, allows port recovery and preserves cargo on retry", () => {
	const game = endgameCaptain();
	execute(game, "acceptArc", { arcId: "turner-business" });
	assert.equal(
		game.act("acceptArc", { arcId: "nanachi" }).ok,
		false,
		"one protected convoy at a time",
	);
	const cargo = game.cargoUsed();
	execute(game, "launch");
	clearThreats(game);
	const actor = game
		.missionActors()
		.find((a) => a.scope === "campaign" && a.status === "active");
	assert(actor);
	execute(game, "sourceActorEvent", { actorId: actor.id, action: "destroy" });
	const active = game.state.activeArcs.find(
		(a) => a.arcId === "turner-business",
	);
	assert(game.escortStatus(active).failed);
	assert.equal(game.act("completeArc", { arcId: "turner-business" }).ok, false);
	landAt(game);
	const credits = game.state.credits;
	execute(game, "retryEscort", { arcId: "turner-business" });
	assert(game.state.credits < credits);
	assert.equal(game.cargoUsed(), cargo);
	assert.equal(game.state.arcs["turner-business"] || 0, 0);
	const mission = game
		.availableArcs()
		.find((a) => a.arcId === "turner-business");
	finishObjectives(game, mission);
	execute(game, "completeArc", { arcId: "turner-business" });
	assert.equal(game.state.arcs["turner-business"], 1);
});
test("integrated fourteen-ship convoy cannot dock while queued members have no arrival receipt", () => {
	let game = endgameCaptain();
	const arc = ARCS.find((a) => a.id === "coalition-allegiances");
	while (
		game.availableArcs().find((a) => a.arcId === arc.id).id !==
		"coalition-allegiances-13"
	) {
		const mission = game.availableArcs().find((a) => a.arcId === arc.id);
		execute(game, "acceptArc", { arcId: arc.id });
		finishObjectives(game, mission);
		execute(game, "completeArc", {
			arcId: arc.id,
			choice: mission.choices?.[0]?.id || "complete",
		});
	}
	const mission = game.availableArcs().find((a) => a.arcId === arc.id);
	execute(game, "acceptArc", { arcId: arc.id });
	reach(game, mission.destinationId);
	execute(game, "scan");
	const roster = game
		.missionActors()
		.filter((a) => a.scope === "campaign" && a.status === "active");
	assert.equal(roster.length, 14);
	for (const actor of roster.slice(0, 12))
		execute(game, "sourceActorEvent", { actorId: actor.id, action: "safe" });
	assert.equal(game.act("land", { approach: true }).ok, false);
	assert.equal(game.state.mode, "flight");
	assert.equal(
		game.escortStatus(game.state.activeArcs.find((a) => a.arcId === arc.id))
			.arrived,
		12,
	);
	game = Game.load(game.save());
	game.syncCampaignActors();
	landAt(game, mission);
	execute(game, "completeArc", { arcId: arc.id });
});
test.after(() => {
	console.log("Expanded arc traversal evidence:", JSON.stringify(records));
});
