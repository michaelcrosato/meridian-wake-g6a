import assert from "node:assert/strict";
import test from "node:test";
import { fieldGuideEntries } from "../src/field-guide.js";
import { ARCS, Game, SYSTEMS } from "../src/game.js";
import {
	HISTORY,
	portVoices,
	REGIONS,
	regionFor,
	stardate,
} from "../src/wiki-content.js";

const ok = (game, action, payload) => {
	const result = game.act(action, payload);
	assert.equal(result.ok, true, `${action}: ${result.message}`);
	return result;
};
function dock(game, planetName) {
	if (game.state.mode === "port") ok(game, "launch");
	if (planetName) ok(game, "selectPlanet", { planetName });
	ok(game, "landReady", { ready: true });
	return ok(game, "land");
}
function fly(game, destination, planetName) {
	const route = game.routeTo(destination);
	assert.ok(route, `Route to ${destination}`);
	if (game.state.mode === "port") ok(game, "launch");
	for (const systemId of route) {
		if (game.state.fuel < 2) {
			while (game.state.enemies) ok(game, "kill");
			if (game.currentSystem().inhabited) {
				dock(game);
				ok(game, "launch");
			} else ok(game, "scoop");
		}
		ok(game, "jump", { systemId });
	}
	if (planetName) ok(game, "selectPlanet", { planetName });
}
function accept(game, kind) {
	const job = game.availableJobs().find((j) => j.kind === kind);
	assert.ok(job, `No ${kind} offer`);
	ok(game, "acceptJob", { jobId: job.id });
	return structuredClone(job);
}

test("regional guides use planet attributes; public history and calendar are searchable", () => {
	const game = new Game();
	assert.equal(
		regionFor(game.currentSystem(), game.currentPlanet()).id,
		"dirt belt",
	);
	for (const region of REGIONS) {
		assert.ok(
			SYSTEMS.some((s) =>
				s.planets.some((p) => regionFor(s, p)?.id === region.id),
			),
			region.id,
		);
	}
	assert.equal(
		fieldGuideEntries(game, "Humanitarian")[0].name,
		"The Republic Navy",
	);
	assert.equal(
		fieldGuideEntries(game, "2210", "History")[0].name,
		"The Plot device",
	);
	assert.equal(fieldGuideEntries(game, "not-a-real-entry").length, 0);
	assert.equal(fieldGuideEntries(game, "", "History").length, HISTORY.length);
	assert.equal(stardate(1), "16 November 3013");
	assert.equal(stardate(47), "1 January 3014");
	assert.equal(fieldGuideEntries(game, "", "Contacts").length, 0);
	game.state.visited.push("fah-soom");
	assert.ok(fieldGuideEntries(game, "Hai", "Contacts").length);
});

test("concourse voices reflect location and completed choices, without changing on every render", () => {
	const game = new Game();
	const before = portVoices(game);
	assert.ok(before.some((v) => v.speaker === "A textile worker"));
	assert.deepEqual(before, portVoices(Game.load(game.save())));
	game.state.day++;
	assert.notEqual(before[0].id, portVoices(game)[0].id);
	game.state.flags["wiki-cooperative"] = true;
	assert.equal(portVoices(game)[0].id, "cooperative");
	ok(game, "launch");
	assert.deepEqual(portVoices(game), []);
});

test("local contracts are stable, name valid exact destinations and offer seven distinct kinds", () => {
	const game = new Game();
	assert.deepEqual(
		game.availableJobs(),
		Game.load(game.save()).availableJobs(),
	);
	assert.equal(new Set(game.availableJobs().map((j) => j.kind)).size, 7);
	for (const job of game.availableJobs()) {
		assert.ok(
			game
				.systemById(job.destinationId)
				.planets.some((p) => p.name === job.destinationPlanet && p.inhabited),
		);
		assert.ok(job.issuer);
	}
	const freight = accept(game, "delivery");
	assert.ok(!game.availableJobs().some((j) => j.id === freight.id));
	assert.equal(game.stats().cargoUsed, freight.cargo);
	game.state.cargo.metal = game.stats().freeCargo;
	const second = game.availableJobs().find((j) => j.kind === "courier");
	assert.equal(game.act("acceptJob", { jobId: second.id }).ok, false);
});

test("freight cannot pay on the wrong planet in the correct system", () => {
	const game = new Game();
	// A saved captain at a Sol neighbor is a location fixture, not an earned voyage.
	const neighbor = SYSTEMS.find((s) => s.links.includes("sol") && s.inhabited);
	game.state.systemId = neighbor.id;
	game.state.planetName = neighbor.planets.find((p) => p.inhabited).name;
	const job = game
		.availableJobs()
		.find((j) => j.kind === "delivery" && j.destinationId === "sol");
	ok(game, "acceptJob", { jobId: job.id });
	const wrong = game
		.systemById("sol")
		.planets.find((p) => p.inhabited && p.name !== job.destinationPlanet);
	fly(game, "sol", wrong.name);
	dock(game);
	assert.ok(game.state.jobs.some((j) => j.id === job.id));
	dock(game, job.destinationPlanet);
	assert.ok(game.state.completedJobs.includes(job.id));
	const earnings = game.state.earnings;
	dock(game);
	assert.equal(game.state.earnings, earnings);
});

test("surveys need a fresh post-acceptance scan and a return, surviving save/load", () => {
	let game = new Game();
	const offer = game.availableJobs().find((j) => j.kind === "survey");
	game.state.flags[`scanned:${offer.scanSystems[0]}`] = true;
	const job = accept(game, "survey");
	dock(game);
	assert.ok(game.state.jobs.length);
	fly(game, job.scanSystems[0]);
	dock(game);
	assert.ok(game.state.jobs.length);
	ok(game, "launch");
	ok(game, "scan");
	game = Game.load(game.save());
	assert.match(game.jobObjective(game.state.jobs[0]), /Land on New Boston/);
	assert.ok(!game.jobObjective(game.state.jobs[0]).includes("Scan"));
	fly(game, job.destinationId, job.destinationPlanet);
	dock(game);
	assert.equal(game.state.jobs.length, 0);
	assert.equal(game.state.earnings, job.reward);
});

test("prospecting consumes real cargo once and will not award two jobs for one sample", () => {
	const game = new Game();
	const first = accept(game, "prospecting");
	game.advanceDay();
	const second = accept(game, "prospecting");
	ok(game, "buy", { commodityId: "metal", quantity: 4 });
	for (const id of new Set([...first.scanSystems, ...second.scanSystems])) {
		fly(game, id);
		ok(game, "scan");
	}
	fly(game, first.destinationId, first.destinationPlanet);
	dock(game);
	assert.equal(game.state.cargo.metal || 0, 0);
	assert.equal(game.state.jobs.length, 1);
	assert.equal(game.state.completedJobs.length, 1);
	assert.equal(game.state.earnings, first.reward);
	ok(game, "buy", { commodityId: "metal", quantity: 4 });
	dock(game);
	assert.equal(game.state.jobs.length, 0);
	assert.equal(game.state.earnings, first.reward + second.reward);
});

test("tours reserve a berth through every stop and only pay after returning home", () => {
	let game = new Game();
	const job = accept(game, "tour");
	assert.equal(game.stats().passengersUsed, 1);
	dock(game);
	assert.equal(game.state.jobs.length, 1);
	for (const stop of [...job.stops].reverse()) {
		fly(game, stop.systemId, stop.planetName);
		dock(game);
		game = Game.load(game.save());
		assert.equal(game.stats().passengersUsed, 1);
		assert.equal(game.state.earnings, 0);
	}
	fly(game, job.destinationId, job.destinationPlanet);
	dock(game);
	assert.equal(game.stats().passengersUsed, 0);
	assert.equal(game.state.earnings, job.reward);
});

test("deadlines and abandonment release commitments, and old system-level jobs still load", () => {
	const game = new Game();
	const job = accept(game, "tour");
	game.state.reputation[job.faction] = 4;
	game.state.systemId = "fah-soom";
	game.state.planetName = "Greenwater";
	game.advanceDay(21);
	assert.equal(game.state.jobs.length, 0);
	assert.equal(game.stats().passengersUsed, 0);
	assert.equal(game.state.reputation[job.faction], 3);
	assert.equal(game.state.reputation.Hai, undefined);
	const legacy = new Game();
	legacy.state.jobs.push({
		id: "legacy",
		name: "Old delivery",
		destinationId: "rutilicus",
		kind: "delivery",
		cargo: 1,
		passengers: 0,
		reward: 100,
		deadline: 50,
	});
	const restored = Game.load(legacy.save());
	dock(restored);
	assert.equal(restored.state.earnings, 100);
	const contract = accept(restored, "delivery");
	ok(restored, "abandonJob", { jobId: contract.id });
	assert.equal(restored.stats().cargoUsed, 0);
});

for (const branch of [0, 1]) {
	for (const arc of ARCS.filter(
		(a) => a.adaptation === "original-wiki-story",
	)) {
		test(`${arc.name}: complete branch ${branch + 1} from a starter using travel, objectives and reloads`, () => {
			let game = new Game();
			for (const mission of arc.missions) {
				ok(game, "acceptArc", { arcId: arc.id });
				assert.equal(game.act("completeArc", { arcId: arc.id }).ok, false);
				for (const name of mission.visitPlanets || []) {
					const system = SYSTEMS.find((s) =>
						s.planets.some((p) => p.name === name),
					);
					fly(game, system.id, name);
					dock(game);
				}
				for (const id of mission.scanSystems || []) {
					fly(game, id);
					ok(game, "scan");
				}
				fly(game, mission.destinationId, mission.destinationName);
				if (mission.scan) ok(game, "scan");
				dock(game);
				game = Game.load(game.save());
				ok(game, "completeArc", {
					arcId: arc.id,
					choice: mission.choices?.[branch].id || "complete",
				});
			}
			assert.ok(game.state.completedArcs.includes(arc.id));
			assert.ok(game.state.flags[arc.missions.at(-1).choices[branch].flag]);
			assert.equal(game.act("acceptArc", { arcId: arc.id }).ok, false);
			assert.equal(game.stats().passengersUsed, 0);
			assert.equal(game.stats().cargoUsed, 0);
			assert.ok(game.state.credits > 0);
		});
	}
}
