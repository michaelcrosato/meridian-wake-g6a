import assert from "node:assert/strict";
import test from "node:test";
import { MISSION_DATA, PLANET_DATA, SYSTEM_DATA } from "../src/source-data.js";
import {
	evaluateConditions,
	evaluateExpression,
	SourceMissionEngine,
} from "../src/source-missions.js";

const n = (tokens, children = []) => ({ tokens, children });
const mission = (name, nodes) => ({
	name,
	displayName: name,
	description: "Travel to <destination>.",
	nodes,
	sourceFile: "test.txt",
	sourceLine: 1,
});
const planets = [
	{ name: "Home", spaceport: "Port", attributes: ["human"] },
	{ name: "Destination", spaceport: "Port", attributes: ["human"] },
	{ name: "Stop", spaceport: "Port", attributes: ["human"] },
];
const systems = [
	{ name: "A", objects: ["Home"], links: ["B"], government: "Republic" },
	{ name: "B", objects: ["Stop"], links: ["A", "C"], government: "Republic" },
	{ name: "C", objects: ["Destination"], links: ["B"], government: "Republic" },
];
const context = {
	planetName: "Home",
	systemName: "A",
	day: 1,
	credits: 100,
	cargoFree: 10,
	bunksFree: 4,
	outfits: {},
};
const make = (missions, events = []) =>
	new SourceMissionEngine({
		missions,
		systems,
		planets,
		events,
		conversations: [],
	});

test("conditions retain arithmetic precedence, comparison, nested AND/OR, and non-JS variable names", () => {
	const get = (k) => ({ "visited: Earth": 1, credits: 50, karma: -1 })[k] || 0;
	assert.equal(evaluateExpression(["2", "+", "3", "*", "4"], get), 14);
	assert.equal(
		evaluateExpression(["(", "2", "+", "3", ")", "*", "4"], get),
		20,
	);
	assert(
		evaluateConditions(
			[
				n(["has", "visited: Earth"]),
				n(["or"], [n(["credits", ">=", "100"]), n(["karma", "<", "0"])]),
			],
			get,
		),
	);
	assert(!evaluateConditions([n(["never"])], get));
	assert.throws(() => evaluateExpression(["1", ";", "process.exit()"], get));
});

test("source offers respect planet/filter/conditions and reserve real payload with transactional rejection", () => {
	const m = mission("Delivery", [
		n(
			["source"],
			[n(["attributes", "human"]), n(["not", "planet", "Destination"])],
		),
		n(["destination", "Destination"]),
		n(["cargo", "Supplies", "5"]),
		n(["passengers", "2"]),
		n(["to", "offer"], [n(["has", "permit"])]),
	]);
	const e = make([m]),
		state = {};
	assert.equal(e.available(state, context).length, 0);
	state.sourceQuests.conditions.permit = 1;
	assert.equal(e.available(state, context).length, 1);
	const rejected = e.accept(state, { ...context, cargoFree: 4 }, m.name);
	assert.equal(rejected.ok, false);
	assert.equal(state.sourceQuests.active.length, 0);
	assert.equal(state.sourceQuests.conditions["Delivery: offered"], undefined);
	const accepted = e.accept(state, context, m.name);
	assert.equal(accepted.ok, true);
	assert.equal(accepted.mission.cargo, 5);
	assert.equal(accepted.mission.passengers, 2);
	assert.equal(e.available(state, context).length, 0);
});

test("native conversation choices preserve branch labels, flags and defer/reoffer behavior", () => {
	const dialog = n(
		["conversation"],
		[
			n(["A captain asks for help."]),
			n(
				["choice"],
				[
					n(["Later."], [n(["defer"])]),
					n(["Help them."], [n(["goto", "help"])]),
				],
			),
			n(["label", "help"]),
			n(["action"], [n(["set", "merciful"])]),
			n(["Thank you."], [n(["accept"])]),
		],
	);
	const m = mission("Conversation", [
		n(["destination", "Destination"]),
		n(["on", "offer"], [dialog]),
	]);
	const e = make([m]),
		state = {};
	assert.equal(e.offer(state, context, m.name).dialogue.options.length, 2);
	e.choose(state, context, 0);
	assert.equal(e.choose(state, context, 0).ok, true);
	assert.equal(e.available(state, context).length, 1);
	e.offer(state, context, m.name);
	const branch = e.choose(state, context, 1);
	assert.equal(branch.dialogue.text, "Thank you.");
	e.choose(state, context, 0);
	assert.equal(state.sourceQuests.conditions.merciful, 1);
	assert.equal(state.sourceQuests.active.length, 1);
});

test("waypoints and stopovers must actually be visited before reward; source payload payment formula", () => {
	const m = mission("Survey", [
		n(["destination", "Destination"]),
		n(["waypoint", "B"]),
		n(["stopover", "Stop"]),
		n(["cargo", "Supplies", "2"]),
		n(
			["on", "complete"],
			[n(["payment", "100", "20"]), n(["set", "next chapter"])],
		),
	]);
	const e = make([m]),
		state = {};
	e.accept(state, context, m.name);
	assert.equal(
		e.complete(
			state,
			{ ...context, planetName: "Destination", systemName: "C" },
			m.name,
		).ok,
		false,
	);
	e.notify(
		state,
		{ ...context, planetName: null, systemName: "B" },
		{ type: "enter" },
	);
	e.notify(
		state,
		{ ...context, planetName: "Stop", systemName: "B" },
		{ type: "land" },
	);
	const result = e.complete(
		state,
		{ ...context, planetName: "Destination", systemName: "C" },
		m.name,
	);
	assert.equal(result.ok, true);
	assert.equal(result.effects.find((x) => x.type === "payment").amount, 220);
	assert.equal(state.sourceQuests.conditions["next chapter"], 1);
	assert.equal(state.sourceQuests.conditions["Survey: done"], 1);
	assert.equal(
		e.complete(
			state,
			{ ...context, planetName: "Destination", systemName: "C" },
			m.name,
		).ok,
		false,
	);
});

test("NPC objectives require correctly scoped actor events and saved escorts can be lost", () => {
	const m = mission("Battle", [
		n(["destination", "Destination"]),
		n(
			["npc", "kill"],
			[n(["system", "C"]), n(["ship", "Raider", "Red Sparrow"])],
		),
		n(
			["npc", "accompany", "save"],
			[n(["system", "C"]), n(["ship", "Freighter", "Hope"])],
		),
	]);
	const e = make([m]),
		state = {};
	e.accept(state, context, m.name);
	const there = { ...context, planetName: "Destination", systemName: "C" };
	e.notify(state, there, { type: "kill" });
	assert.equal(e.active(state, there)[0].ready, false);
	e.notify(state, there, { type: "kill", missionId: m.name, npcId: "npc-0" });
	assert.equal(e.active(state, there)[0].ready, false);
	e.notify(state, there, {
		type: "accompany",
		missionId: m.name,
		npcId: "npc-1",
	});
	assert.equal(e.active(state, there)[0].ready, true);
	e.notify(state, there, {
		type: "destroy",
		missionId: m.name,
		npcId: "npc-1",
	});
	assert.equal(state.sourceQuests.active.length, 0);
	assert.equal(state.sourceQuests.conditions["Battle: failed"], 1);
});

test("source timed events and fixed deadlines match native parser semantics", () => {
	const m = mission("Timed", [
		n(["destination", "Destination"]),
		n(["deadline", "7"]),
		n(["on", "accept"], [n(["event", "Peace", "2"])]),
	]);
	const e = make(
			[m],
			[
				{
					name: "Peace",
					nodes: [
						n(["reputation: Republic", "=", "5"]),
						n(["set", "peace signed"]),
					],
				},
			],
		),
		state = {};
	e.accept(state, context, m.name);
	assert.equal(state.sourceQuests.active[0].deadline, 8);
	e.notify(state, { ...context, day: 2 }, { type: "daily" });
	assert.equal(state.sourceQuests.conditions["peace signed"], undefined);
	const due = e.notify(state, { ...context, day: 3 }, { type: "daily" });
	assert.equal(state.sourceQuests.conditions["event: Peace"], 1);
	assert.equal(due.effects.find((x) => x.type === "reputation").value, 5);
	e.notify(state, { ...context, day: 9 }, { type: "daily" });
	assert.equal(state.sourceQuests.conditions["Timed: failed"], 1);
});

test("unsupported runtime features cannot be silently accepted as playable", () => {
	const m = mission("Stealth", [
		n(["destination", "Destination"]),
		n(["stealth"]),
	]);
	const e = make([m]),
		state = {};
	const r = e.accept(state, context, m.name);
	assert.equal(r.ok, false);
	assert.match(r.message, /not yet connected/);
	assert.equal(state.sourceQuests.active.length, 0);
});

test("original Pact Recon requires all four source waypoints and preserves dialogue and reward", () => {
	const e = new SourceMissionEngine();
	const original = MISSION_DATA.find((m) => m.name === "Pact Recon 0");
	const state = {};
	const p = PLANET_DATA.find(
		(p) =>
			p.name !== "Glaze" &&
			p.attributes.some((a) => ["rim", "south"].includes(a)) &&
			SYSTEM_DATA.some(
				(s) =>
					s.objects.includes(p.name) &&
					s.government !== "Pirate" &&
					!["Alniyat", "Atria", "Lesath", "Han"].includes(s.name),
			),
	);
	const s = SYSTEM_DATA.find((s) => s.objects.includes(p.name));
	const origin = {
		...context,
		planetName: p.name,
		systemName: s.name,
		conditions: { random: 0 },
	};
	assert.equal(e.offer(state, origin, original.name).ok, true);
	for (let i = 0; i < 20 && state.sourceQuests.dialogue; i++) {
		const result = e.choose(state, origin, 0);
		assert.equal(result.ok, true, result.message);
	}
	assert.equal(state.sourceQuests.active.length, 1);
	assert.deepEqual(state.sourceQuests.active[0].waypoints, [
		"Alniyat",
		"Atria",
		"Han",
		"Lesath",
	]);
	const destSystem = SYSTEM_DATA.find((s) => s.objects.includes("Glaze")).name;
	const end = { ...origin, planetName: "Glaze", systemName: destSystem };
	assert.equal(e.complete(state, end, original.name).ok, false);
	for (const systemName of ["Alniyat", "Atria", "Han", "Lesath"])
		e.notify(
			state,
			{ ...origin, systemName, planetName: null },
			{ type: "enter" },
		);
	assert.equal(e.complete(state, end, original.name).ok, true);
});

test("original Free Worlds prisoner alternative changes karma and fails its competing branch", () => {
	const e = new SourceMissionEngine();
	const state = {};
	const origin = {
		...context,
		planetName: "Dancer",
		systemName: SYSTEM_DATA.find((s) => s.objects.includes("Dancer")).name,
	};
	e.bind(state, origin);
	state.sourceQuests.conditions["FW Southern Battle 3: done"] = 1;
	const keep = e.accept(state, origin, "FW Southern Prisoners - Keep");
	assert.equal(keep.ok, true, keep.message);
	const destination = {
		...origin,
		planetName: "Clink",
		systemName: SYSTEM_DATA.find((s) => s.objects.includes("Clink")).name,
	};
	const result = e.complete(state, destination, "FW Southern Prisoners - Keep");
	assert.equal(result.ok, true, result.message);
	assert.equal(state.sourceQuests.conditions.karma, -1);
	assert.equal(state.sourceQuests.conditions["event: fw prison on Clink"], 1);
	assert.equal(
		e
			.available(state, origin)
			.some((m) => m.id === "FW Southern Prisoners - Release"),
		false,
	);
});

test("quest state and in-progress conversations survive serialization", () => {
	const dialog = n(
		["conversation"],
		[
			n(["Hello."]),
			n(["choice"], [n(["Yes"], [n(["accept"])]), n(["No"], [n(["decline"])])]),
		],
	);
	const m = mission("Saved", [
		n(["destination", "Destination"]),
		n(["on", "offer"], [dialog]),
	]);
	let state = {};
	const e = make([m]);
	e.offer(state, context, m.name);
	state = JSON.parse(JSON.stringify(state));
	const e2 = make([m]);
	e2.choose(state, context, 0);
	e2.choose(state, context, 0);
	assert.equal(state.sourceQuests.active[0].id, m.name);
});

test("on-accept conversations are returned and completion dialogue follows original branches", () => {
	const dialog = n(
		["conversation"],
		[n(["A second conversation."], [n(["accept"])])],
	);
	const m = mission("After acceptance", [
		n(["destination", "Destination"]),
		n(["on", "accept"], [dialog]),
	]);
	const e = make([m]),
		state = {};
	const result = e.accept(state, context, m.name);
	assert.equal(result.dialogue.text, "A second conversation.");
	e.choose(state, context, 0);
	assert.equal(state.sourceQuests.active.length, 1);
	assert.equal(state.sourceQuests.dialogue, null);
});

test("negative resource actions are transactional and never mutate host resources directly", () => {
	const m = mission("Expensive", [
		n(["destination", "Destination"]),
		n(["on", "accept"], [n(["payment", "-60"]), n(["payment", "-60"])]),
	]);
	const e = make([m]),
		state = { credits: 100 };
	const result = e.accept(state, context, m.name);
	assert.equal(result.ok, false);
	assert.equal(state.credits, 100);
	assert.equal(state.sourceQuests.active.length, 0);
	assert.deepEqual(result.effects, []);
});

test("native map events alter source filters and routes while emitting exact host patches", () => {
	const m = mission("Map change", [
		n(["destination", "Home"]),
		n(["on", "complete"], [n(["event", "War"])]),
	]);
	const next = mission("Occupation", [
		n(["source"], [n(["government", "Free Worlds"])]),
		n(["destination", "Home"]),
	]);
	const event = {
		name: "War",
		nodes: [
			n(["system", "A"], [n(["government", "Free Worlds"])]),
			n(["unlink", "A", "B"]),
		],
	};
	const e = make([m, next], [event]),
		state = {};
	e.accept(state, context, m.name);
	assert.equal(
		e.available(state, context).some((m) => m.id === "Occupation"),
		false,
	);
	const result = e.complete(state, context, m.name);
	assert.equal(result.effects.filter((e) => e.type === "world").length, 2);
	assert.equal(
		e.available(state, context).some((m) => m.id === "Occupation"),
		true,
	);
	assert.equal(e.distance("A", "C"), Infinity);
});

const payments = (result) =>
	result.effects
		.filter((effect) => effect.type === "payment")
		.reduce((sum, effect) => sum + effect.amount, 0);

test("reopening a pending offer resumes it without repeating its on offer actions", () => {
	const m = mission("Paid meeting", [
		n(["destination", "Destination"]),
		n(
			["on", "offer"],
			[
				n(["payment", "700"]),
				n(["conversation"], [n(["Welcome aboard."], [n(["accept"])])]),
			],
		),
	]);
	const other = mission("Other offer", [
		n(["destination", "Destination"]),
		n(["on", "offer"], [n(["conversation"], [n(["Hello."])])]),
	]);
	const e = make([m, other]),
		state = {};
	assert.equal(payments(e.offer(state, context, m.name)), 700);
	const again = e.offer(state, context, m.name);
	assert.equal(again.ok, true);
	assert.equal(payments(again), 0);
	assert.equal(again.dialogue.text, "Welcome aboard.");
	// Another offer may replace the conversation; returning still pays nothing twice.
	assert.equal(e.offer(state, context, other.name).dialogue.text, "Hello.");
	assert.equal(payments(e.offer(state, context, m.name)), 0);
	e.choose(state, context, 0);
	assert.equal(state.sourceQuests.active.length, 1);
});

test("an offer whose acceptance fails closes as deferred instead of trapping its conversation", () => {
	const m = mission("Licensed job", [
		n(["destination", "Destination"]),
		n(["to", "accept"], [n(["has", "license"])]),
		n(
			["on", "offer"],
			[
				n(["payment", "50"]),
				n(["conversation"], [n(["Sign here."], [n(["accept"])])]),
			],
		),
	]);
	const e = make([m]),
		state = {};
	e.offer(state, context, m.name);
	const refused = e.choose(state, context, 0);
	assert.equal(refused.ok, true);
	assert.match(refused.message, /acceptance conditions.*remains available/);
	assert.equal(refused.dialogue, null);
	assert.equal(state.sourceQuests.active.length, 0);
	assert.equal(state.sourceQuests.conditions["Licensed job: deferred"], 1);
	state.sourceQuests.conditions.license = 1;
	assert.equal(payments(e.offer(state, context, m.name)), 0);
	e.choose(state, context, 0);
	assert.equal(state.sourceQuests.active.length, 1);
});

test("launch accepts and depart defers an offer, as in Endless Sky", () => {
	const offer = (name, endpoint) =>
		mission(name, [
			n(["destination", "Destination"]),
			n(
				["on", "offer"],
				[n(["conversation"], [n(["Ready?"], [n([endpoint])])])],
			),
		]);
	const launch = offer("Launch", "launch"),
		depart = offer("Depart", "depart");
	const e = make([launch, depart]),
		state = {};
	assert.equal(e.offer(state, context, launch.name).dialogue.accepts, true);
	e.choose(state, context, 0);
	assert.deepEqual(
		state.sourceQuests.active.map((active) => active.id),
		["Launch"],
	);
	assert.equal(e.offer(state, context, depart.name).dialogue.accepts, false);
	e.choose(state, context, 0);
	assert.equal(state.sourceQuests.conditions["Depart: deferred"], 1);
	assert.equal(state.sourceQuests.conditions["Depart: declined"], undefined);
	assert.ok(e.available(state, context).some((m) => m.id === "Depart"));
});

test("abort runs on abort (or on fail when absent) once and records aborted and failed", () => {
	const withAbort = mission("Secure job", [
		n(["destination", "Destination"]),
		n(["on", "abort"], [n(["set", "abandoned"])]),
		n(["on", "fail"], [n(["payment", "-50"])]),
	]);
	const failOnly = mission("Legacy job", [
		n(["destination", "Destination"]),
		n(["on", "fail"], [n(["set", "legacy failure"])]),
	]);
	const e = make([withAbort, failOnly]),
		state = {};
	e.accept(state, context, withAbort.name);
	e.accept(state, context, failOnly.name);
	const aborted = e.abort(state, context, withAbort.name);
	assert.equal(payments(aborted), 0);
	const c = state.sourceQuests.conditions;
	assert.equal(c.abandoned, 1);
	assert.equal(c["Secure job: aborted"], 1);
	assert.equal(c["Secure job: failed"], 1);
	e.abort(state, context, failOnly.name);
	assert.equal(c["legacy failure"], 1);
	assert.equal(c["Legacy job: aborted"], 1);
});

test("on enter, waypoint and stopover actions run once, and generic entry honors its system filter", () => {
	const m = mission("Tour", [
		n(["destination", "Destination"]),
		n(["waypoint", "B"]),
		n(["waypoint", "C"]),
		n(["on", "enter", "B"], [n(["payment", "10"])]),
		n(
			["on", "enter"],
			[n(["system"], [n(["government", "Pirate"])]), n(["payment", "1000"])],
		),
		n(["on", "waypoint"], [n(["payment", "100"])]),
	]);
	const e = make([m]),
		state = {};
	e.accept(state, context, m.name);
	let paid = 0;
	for (const systemName of ["B", "A", "B", "A", "B", "C", "B", "C"])
		paid += payments(
			e.notify(state, { ...context, systemName }, { type: "enter" }),
		);
	assert.equal(paid, 110);
});

test("max/min assignments, passenger space and endpoint branches are interpreted", () => {
	const m = mission("Operators", [
		n(["destination", "Destination"]),
		n(["to", "offer"], [n(["passenger space", ">=", "4"])]),
		n(
			["on", "accept"],
			[
				n(["high", "=", "3"]),
				n(["high", ">?=", "5"]),
				n(["low", "=", "3"]),
				n(["low", "<?=", "2"]),
				n(
					["conversation"],
					[n(["branch", "accept", "decline"], [n(["has", "high"])])],
				),
			],
		),
	]);
	const e = make([m]),
		state = {};
	assert.equal(e.available(state, { ...context, bunksFree: 3 }).length, 0);
	const result = e.accept(state, context, m.name);
	assert.equal(result.ok, true);
	assert.equal(state.sourceQuests.conditions.high, 5);
	assert.equal(state.sourceQuests.conditions.low, 2);
	assert.equal(result.dialogue.terminal, "accept");
});

test("deadlines and payment count the whole greedy tour through stopovers", () => {
	// From A, a stop at C before landing at Stop in B is 3 jumps; the direct route is 1.
	const m = mission("Detour", [
		n(["destination", "Stop"]),
		n(["stopover", "Destination"]),
		n(["cargo", "Supplies", "2"]),
		n(["deadline"]),
		n(["on", "complete"], [n(["payment"])]),
	]);
	const e = make([m]),
		state = {};
	e.accept(state, context, m.name);
	const [active] = state.sourceQuests.active;
	assert.equal(active.jumps, 3);
	assert.equal(active.deadline, context.day + 6);
	for (const [systemName, planetName] of [
		["B", null],
		["C", "Destination"],
		["B", "Stop"],
	]) {
		e.notify(state, { ...context, systemName, planetName }, { type: "enter" });
		if (planetName)
			e.notify(state, { ...context, systemName, planetName }, { type: "land" });
	}
	const result = e.complete(
		state,
		{ ...context, planetName: "Stop", systemName: "B", day: 5 },
		m.name,
	);
	assert.equal(result.ok, true);
	assert.equal(payments(result), 150 * 4 * 2);
});

test("NPC group actions run once every ship has the event, and a capture blocks on destroy", () => {
	const m = mission("Two raiders", [
		n(["destination", "Destination"]),
		n(
			["npc", "kill"],
			[
				n(["ship", "Sparrow", "First"]),
				n(["ship", "Sparrow", "Second"]),
				n(["on", "kill"], [n(["payment", "500"])]),
				n(["on", "destroy"], [n(["set", "both destroyed"])]),
			],
		),
	]);
	const e = make([m]),
		state = {};
	e.accept(state, context, m.name);
	const event = (type, actorId) =>
		e.notify(state, context, {
			type,
			missionId: m.name,
			npcId: "npc-0",
			actorId,
		});
	event("destroy", "first");
	assert.equal(payments(event("kill", "first")), 0);
	assert.equal(payments(event("kill", "first")), 0);
	event("capture", "second");
	assert.equal(payments(event("kill", "second")), 500);
	assert.equal(state.sourceQuests.conditions["both destroyed"], undefined);
});

test("mission text fills payment, a single fare, the marked vessel and random cargo", () => {
	const m = mission("Wording", [
		n(["destination", "Destination"]),
		n(["cargo", "random", "3"]),
		n(["passengers", "1"]),
		n(["on", "complete"], [n(["payment", "1000", "10"])]),
	]);
	const e = make([m]),
		state = {};
	e.accept(state, context, m.name);
	const [active] = state.sourceQuests.active;
	assert.equal(
		e.text("Carry <fare> and <cargo> for <payment>; avoid the <npc>.", active),
		`Carry a passenger and 3 tons of general cargo for 1,390 credits; avoid the marked vessel.`,
	);
});

test("stopovers drawn from one filter visit different planets when several match", () => {
	const filter = () => n(["stopover"], [n(["attributes", "human"])]);
	const m = mission("Circuit", [
		n(["destination", "Destination"]),
		filter(),
		filter(),
	]);
	const e = make([m]),
		state = {};
	e.accept(state, context, m.name);
	const [active] = state.sourceQuests.active;
	assert.equal(active.stopovers.length, 2);
	assert.equal(new Set(active.stopovers).size, 2);
});

test("filtered destinations vary between days but stay fixed for a listed offer", () => {
	const m = mission("Errand", [
		n(
			["destination"],
			[n(["attributes", "human"]), n(["not", "planet", "Home"])],
		),
	]);
	const e = make([m]);
	const chosen = new Set();
	for (let day = 1; day <= 12; day++) {
		const state = {},
			today = { ...context, day };
		const [listed] = e.available(state, today);
		chosen.add(listed.destination);
		e.accept(state, today, m.name);
		assert.equal(state.sourceQuests.active[0].destination, listed.destination);
	}
	assert.deepEqual([...chosen].sort(), ["Destination", "Stop"]);
});

test("evaded ships block completion only while they share the player's system", () => {
	const escape = mission("Escape", [
		n(["destination", "Destination"]),
		n(["npc", "evade"], [n(["ship", "Sparrow", "Raider"])]),
	]);
	const ambush = mission("Ambush", [
		n(["destination", "Destination"]),
		n(
			["npc", "evade"],
			[n(["system", "destination"]), n(["ship", "Sparrow", "Raider"])],
		),
	]);
	const e = make([escape, ambush]),
		state = {};
	const arrived = { ...context, planetName: "Destination", systemName: "C" };
	e.accept(state, context, escape.name);
	e.accept(state, context, ambush.name);
	assert.equal(e.complete(state, arrived, escape.name).ok, true);
	assert.equal(e.complete(state, arrived, ambush.name).ok, false);
	e.notify(state, arrived, {
		type: "disable",
		missionId: ambush.name,
		npcId: "npc-0",
		actorId: "raider",
	});
	assert.equal(e.complete(state, arrived, ambush.name).ok, true);
});
