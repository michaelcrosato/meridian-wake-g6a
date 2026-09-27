import assert from "node:assert/strict";
import test from "node:test";
import { campaignMethods } from "../src/campaign-actors.js";
import { CAMPAIGN_CONVOYS } from "../src/campaign-convoys.js";
import { MISSION_DATA } from "../src/source-data.js";

class Captain {
	constructor(id = "supply-escort") {
		this.state = {
			mode: "port",
			systemId: "origin",
			combatSerial: 0,
			day: 1,
			credits: 1000,
			debt: 0,
			enemies: 0,
			activeStory: {
				id,
				startDay: 1,
				kills: 2,
				scanned: true,
				scannedSystems: ["x"],
				boarded: true,
				mined: 4,
			},
			activeArcs: [],
			missionActors: [],
			cargo: { food: 3 },
		};
	}
	currentSystem() {
		return { name: this.state.systemId };
	}
	missionDefinition(active) {
		return { id: active.id, destinationId: "destination", cargo: 3 };
	}
	success(message, extra = {}) {
		return { ok: true, message, ...extra };
	}
	fail(message) {
		return { ok: false, message };
	}
	log() {}
	spend(amount) {
		const paid = Math.min(this.state.credits, amount);
		this.state.credits -= paid;
		this.state.debt += amount - paid;
	}
	fly(system = "origin") {
		this.state.mode = "flight";
		this.state.systemId = system;
		this.state.combatSerial++;
		this.syncCampaignActors();
	}
}
campaignMethods(Captain);
const first = (c) =>
	c.state.missionActors.find(
		(a) => a.scope === "campaign" && a.status === "active",
	);
function safeAll(c) {
	for (const actor of [...c.state.missionActors].filter(
		(a) => a.scope === "campaign" && a.status === "active",
	))
		assert.equal(
			c.campaignActorEvent({ actorId: actor.id, action: "safe" }).ok,
			true,
		);
}

test("every compiled convoy member maps to an actual native protected mobile NPC group", () => {
	assert(Object.keys(CAMPAIGN_CONVOYS).length >= 52);
	for (const [id, convoy] of Object.entries(CAMPAIGN_CONVOYS)) {
		assert(convoy.members.length > 0, id);
		assert.equal(
			new Set(convoy.members.map((m) => m.key)).size,
			convoy.members.length,
		);
		for (const member of convoy.members) {
			const source = MISSION_DATA.find((m) => m.name === member.sourceMission);
			assert(source, member.sourceMission);
			const group = source.nodes.find(
				(n) => n.line === member.sourceLine && n.tokens[0] === "npc",
			);
			const personality =
				group?.children.find((node) => node.tokens[0] === "personality")
					?.tokens || [];
			assert(
				group?.tokens.includes("save") &&
					(group.tokens.includes("accompany") ||
						(personality.includes("escort") &&
							!personality.includes("derelict"))),
				`${id}:${member.name}`,
			);
			if (!member.generatedName)
				assert(
					group.children.some(
						(n) =>
							n.tokens[0] === "ship" &&
							n.tokens[1] === member.sourceModel &&
							n.tokens[2] === member.name,
					),
				);
		}
	}
	assert.deepEqual(
		CAMPAIGN_CONVOYS["supply-escort"].members.map((m) => m.name),
		[
			"F.S. Raleigh",
			"F.S. Scott",
			"F.S. Hudson",
			"F.S. Drake",
			"F.S. Magellan",
			"F.S. Franklin",
		],
	);
	assert.equal(
		CAMPAIGN_CONVOYS["coalition-allegiances-13"].members.length,
		14,
		"source Judicator/carried fighter roster is not truncated",
	);
	assert.equal(
		CAMPAIGN_CONVOYS["syndicate-answers"].members[0].name,
		"N.S. Peacemaker",
	);
});

test("cleared enemies and carried cargo alone never complete an escort objective", () => {
	const c = new Captain();
	c.fly("destination");
	assert.equal(c.escortObjectiveReady(c.state.activeStory), false);
	assert.equal(c.campaignLandingReady(), false);
	const actor = first(c);
	assert.equal(
		c.campaignActorEvent({ actorId: actor.id, action: "safe" }).ok,
		true,
	);
	assert.equal(c.escortStatus(c.state.activeStory).arrived, 1);
	assert.equal(c.escortObjectiveReady(c.state.activeStory), false);
	safeAll(c);
	assert.equal(c.escortObjectiveReady(c.state.activeStory), true);
	assert.equal(c.campaignLandingReady(), true);
	c.state.mode = "port";
	c.syncCampaignActors();
	assert.equal(
		c.escortObjectiveReady(c.state.activeStory),
		true,
		"safe docking survives opening the port",
	);
});

test("arrival evidence is specific to a system visit, hull damage survives travel and save/load", () => {
	const c = new Captain();
	c.fly();
	const actor = first(c);
	c.campaignActorEvent({ actorId: actor.id, action: "damage", damage: 17 });
	const hull = c.state.campaignActors[actor.id].hull;
	safeAll(c);
	assert(c.escortObjectiveReady(c.state.activeStory));
	c.fly("destination");
	assert(!c.escortObjectiveReady(c.state.activeStory));
	assert.equal(first(c).hull, hull);
	assert.equal(
		c.campaignActorEvent({ actorId: actor.id, action: "safe" }).ok,
		false,
		"old-visit event is rejected",
	);
	const restored = new Captain();
	restored.state = JSON.parse(JSON.stringify(c.state));
	restored.syncCampaignActors();
	assert.equal(first(restored).hull, hull);
	assert(!restored.escortObjectiveReady(restored.state.activeStory));
	safeAll(restored);
	assert(restored.escortObjectiveReady(restored.state.activeStory));
});

test("protected ship destruction latches failure and blocks rewards but permits landing for recovery", () => {
	const c = new Captain();
	c.fly("destination");
	const actor = first(c);
	const result = c.campaignActorEvent({
		actorId: actor.id,
		action: "damage",
		damage: actor.hull + 1,
	});
	assert(result.failed);
	assert(c.escortStatus(c.state.activeStory).failed);
	assert(!c.escortObjectiveReady(c.state.activeStory));
	assert(c.campaignLandingReady());
	const survivor = first(c);
	assert.equal(
		c.campaignActorEvent({ actorId: survivor.id, action: "safe" }).ok,
		false,
	);
	assert.equal(
		c.retryEscort({ missionId: "supply-escort" }).ok,
		false,
		"cannot retry while flying",
	);
});

test("retry has real cost, preserves reserved cargo and progression, resets objectives and actor identities", () => {
	const c = new Captain();
	c.fly("destination");
	const old = first(c);
	c.campaignActorEvent({ actorId: old.id, action: "destroy" });
	c.state.mode = "port";
	const cargo = structuredClone(c.state.cargo);
	const active = c.state.activeStory;
	const generation = active.convoy.generation;
	const retried = c.retryEscort({ missionId: active.id });
	assert(retried.ok);
	assert.equal(c.state.credits, 0);
	assert(
		c.state.debt > 0,
		"insufficient cash becomes debt instead of a permanent main-quest softlock",
	);
	assert.equal(c.state.activeStory, active);
	assert.deepEqual(c.state.cargo, cargo);
	assert.equal(active.convoy.generation, generation + 1);
	assert.equal(active.kills, 0);
	assert.equal(active.scanned, false);
	assert.deepEqual(active.scannedSystems, []);
	assert.equal(active.boarded, false);
	assert.equal(active.mined, 0);
	c.fly("destination");
	assert.notEqual(first(c).id, old.id);
	assert.equal(first(c).hull, first(c).maxHull);
	safeAll(c);
	assert(c.escortObjectiveReady(active));
});

test("departed arrivals free presentation slots for fleets larger than a quality cap", () => {
	const c = new Captain("coalition-allegiances-13");
	c.fly("destination");
	assert.equal(c.state.missionActors.length, 14);
	// The renderer can show only the first twelve; completed dockings remove those actors.
	for (const actor of c.state.missionActors.slice(0, 12))
		c.campaignActorEvent({ actorId: actor.id, action: "safe" });
	assert.equal(
		c.state.missionActors.filter((a) => a.status === "active").length,
		2,
	);
	assert.equal(c.escortStatus(c.state.activeStory).arrived, 12);
	assert(!c.escortObjectiveReady(c.state.activeStory));
	safeAll(c);
	assert(c.escortObjectiveReady(c.state.activeStory));
});

test("native actors remain intact; completed authored missions remove their own records", () => {
	const c = new Captain();
	const native = {
		id: "native:other",
		scope: "native",
		role: "neutral",
		hull: 100,
		status: "active",
	};
	c.state.missionActors = [native];
	c.fly();
	assert.equal(c.state.missionActors[0], native);
	c.state.activeStory = null;
	c.syncCampaignActors();
	assert.deepEqual(c.state.missionActors, [native]);
	assert.deepEqual(c.state.campaignActors, {});
});

test("hostile contacts prevent safe arrival; friendly convoy cannot be captured", () => {
	const c = new Captain();
	c.fly("destination");
	const actor = first(c);
	c.state.enemies = 1;
	assert.equal(
		c.campaignActorEvent({ actorId: actor.id, action: "safe" }).ok,
		false,
	);
	c.state.enemies = 0;
	c.state.missionActors.push({
		id: "native:hostile",
		role: "hostile",
		status: "active",
		hull: 20,
	});
	assert.equal(
		c.campaignActorEvent({ actorId: actor.id, action: "safe" }).ok,
		false,
	);
	assert.equal(
		c.campaignActorEvent({ actorId: actor.id, action: "capture" }).ok,
		false,
	);
});

test("protected-convoy concurrency is bounded without blocking ordinary contracts", () => {
	const c = new Captain();
	assert.equal(c.campaignConvoyAcceptance({ id: "medical-convoy" }).ok, false);
	assert.equal(c.campaignConvoyAcceptance({ id: "ordinary-cargo" }).ok, true);
	c.state.activeStory = null;
	assert.equal(c.campaignConvoyAcceptance({ id: "medical-convoy" }).ok, true);
	c.state.sourceQuests = {
		active: [
			{
				id: "Native escort",
				objectives: [{ type: "accompany", enabled: true }],
			},
		],
	};
	assert.equal(c.campaignConvoyAcceptance({ id: "medical-convoy" }).ok, false);
	c.state.sourceQuests.active = [];
	assert.equal(c.campaignConvoyAcceptance({ id: "medical-convoy" }).ok, true);
});

test("reinforcement waves do not reset arrival proofs within one flight visit", () => {
	const c = new Captain();
	c.state.flightSerial = 1;
	c.fly("destination");
	const actor = first(c);
	c.campaignActorEvent({ actorId: actor.id, action: "safe" });
	c.state.combatSerial++;
	c.syncCampaignActors();
	assert.equal(c.escortStatus(c.state.activeStory).arrived, 1);
	c.state.flightSerial++;
	c.syncCampaignActors();
	assert.equal(c.escortStatus(c.state.activeStory).arrived, 0);
});

test("unarmed source variants stay unarmed while military convoy ships retain weapons", () => {
	const unarmed = CAMPAIGN_CONVOYS["wanderer-exodus-5"].members[0];
	assert.equal(unarmed.sourceModel, "Deep River (Jump, Unarmed)");
	assert.equal(unarmed.canFight, false);
	assert.equal(unarmed.damage, 0);
	const rescued = CAMPAIGN_CONVOYS["deep-research-10"].members[0];
	assert.equal(rescued.canFight, false);
	assert(
		CAMPAIGN_CONVOYS["southern-fleet"].members.some(
			(member) => member.canFight && member.damage > 0,
		),
	);
});

test("a disabled protected ship survives, can be assisted, and must repair before arrival or travel", () => {
	const c = new Captain();
	c.fly("destination");
	const actor = first(c);
	const disabled = c.campaignActorEvent({
		actorId: actor.id,
		action: "disable",
	});
	assert.equal(disabled.failed, false);
	assert.equal(c.escortStatus(c.state.activeStory).failed, false);
	assert.equal(c.escortStatus(c.state.activeStory).disabled, 1);
	assert.equal(c.campaignDepartureReady(), false);
	assert.equal(c.campaignLandingReady(), false);
	assert.equal(
		c.campaignActorEvent({ actorId: actor.id, action: "safe" }).ok,
		false,
	);
	assert.equal(c.state.campaignActors[actor.id].status, "disabled");
	const assist = c.campaignActorEvent({ actorId: actor.id, action: "assist" });
	assert(assist.ok);
	assert.equal(c.state.campaignActors[actor.id].status, "active");
	assert.equal(c.campaignDepartureReady(), true);
	safeAll(c);
	assert(c.escortObjectiveReady(c.state.activeStory));
});

test("disabled protected hulls remain vulnerable to further fire and confirmed capture fails protection", () => {
	const c = new Captain();
	c.fly("destination");
	const actor = first(c);
	c.campaignActorEvent({ actorId: actor.id, action: "disable" });
	const result = c.campaignActorEvent({
		actorId: actor.id,
		action: "damage",
		damage: 10000,
	});
	assert(result.failed);
	assert.equal(c.state.campaignActors[actor.id].status, "destroyed");
	assert(c.campaignLandingReady());
	const other = new Captain();
	other.fly("destination");
	const target = first(other);
	other.campaignActorEvent({ actorId: target.id, action: "disable" });
	const captured = other.campaignActorEvent({
		actorId: target.id,
		action: "capture",
	});
	assert(captured.failed);
	assert.equal(other.state.campaignActors[target.id].status, "captured");
});
