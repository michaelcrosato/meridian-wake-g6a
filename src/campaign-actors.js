/** Protected authored-story convoys, compiled from native protected escort groups. */
import { CAMPAIGN_CONVOYS } from "./campaign-convoys.js";

const object = (value) =>
	value && typeof value === "object" && !Array.isArray(value);
const living = (member) =>
	member.hull > 0 && ["active", "disabled"].includes(member.status);
const operational = (member) => living(member) && member.status === "active";

export function campaignMethods(Game, { convoys = CAMPAIGN_CONVOYS } = {}) {
	Object.assign(Game.prototype, {
		campaignConvoyAcceptance(mission) {
			const id = typeof mission === "string" ? mission : mission?.id;
			if (!convoys[id])
				return { ok: true, message: "No protected convoy required." };
			if (this.activeCampaignConvoys().length)
				return this.fail(
					"Finish or recover your current protected convoy before accepting another. Ordinary cargo and passenger contracts remain available.",
				);
			if (
				(this.state.sourceQuests?.active || []).some((active) =>
					active.objectives?.some(
						(objective) =>
							objective.enabled &&
							["save", "accompany"].includes(objective.type),
					),
				)
			)
				return this.fail(
					"Complete or abandon the current local-contact escort before taking command of another protected convoy.",
				);
			return { ok: true, message: "Protected convoy slot available." };
		},
		activeCampaignConvoys() {
			return [this.state.activeStory, ...(this.state.activeArcs || [])].filter(
				(active) => active && convoys[active.id],
			);
		},
		ensureCampaignConvoy(active) {
			const definition = active && convoys[active.id];
			if (!definition) return null;
			if (!object(active.convoy) || active.convoy.missionId !== active.id) {
				this.state.campaignSerial =
					Math.max(0, Number(this.state.campaignSerial) || 0) + 1;
				active.convoy = {
					version: 1,
					missionId: active.id,
					instance: this.state.campaignSerial,
					generation: 1,
					visit: null,
					failed: null,
					members: Object.fromEntries(
						definition.members.map((member) => [
							member.key,
							{
								hull: member.maxHull,
								maxHull: member.maxHull,
								status: "active",
								arrival: null,
							},
						]),
					),
				};
			}
			const keys = new Set(definition.members.map((member) => member.key));
			active.convoy.members ||= {};
			for (const key of Object.keys(active.convoy.members))
				if (!keys.has(key)) delete active.convoy.members[key];
			for (const member of definition.members)
				active.convoy.members[member.key] ||= {
					hull: member.maxHull,
					maxHull: member.maxHull,
					status: "active",
					arrival: null,
				};
			return active.convoy;
		},
		campaignVisit() {
			return `${this.state.systemId}:${this.state.flightSerial ?? this.state.combatSerial ?? 0}`;
		},
		syncCampaignActors() {
			const retained = (this.state.missionActors || []).filter(
				(actor) => actor.scope !== "campaign",
			);
			const records = {};
			const visible = [];
			const visit = this.campaignVisit();
			for (const active of this.activeCampaignConvoys()) {
				const convoy = this.ensureCampaignConvoy(active),
					definition = convoys[active.id];
				if (this.state.mode === "flight" && convoy.visit !== visit) {
					convoy.visit = visit;
					for (const member of Object.values(convoy.members))
						member.arrival = null;
				}
				if (this.state.mode !== "flight") continue;
				for (const template of definition.members) {
					const member = convoy.members[template.key];
					const id = `campaign:${active.id}:${convoy.instance}:${convoy.generation}:${visit}:${template.key}`;
					const actor = {
						id,
						scope: "campaign",
						missionId: active.id,
						npcId: template.key,
						shipId: template.shipId,
						name: template.name,
						faction: template.faction,
						category: template.category,
						role: "escort",
						hull: member.hull,
						maxHull: member.maxHull,
						status: member.arrival === visit ? "departed" : member.status,
						objectives: ["save", "accompany", "assist"],
						mobile: true,
						systemName: this.currentSystem().name,
						damage: Math.max(0, Math.min(24, template.damage || 0)),
						canFight: !!template.canFight,
						speed: template.speed,
						convoyGeneration: convoy.generation,
						convoyVisit: visit,
					};
					records[id] = actor;
					visible.push(actor);
				}
			}
			this.state.campaignActors = records;
			this.state.missionActors = [...retained, ...visible];
			return visible;
		},
		escortStatus(active) {
			const definition = active && convoys[active.id];
			if (!definition)
				return {
					required: false,
					ready: true,
					total: 0,
					arrived: 0,
					lost: 0,
					failed: false,
				};
			const convoy = this.ensureCampaignConvoy(active),
				visit = this.campaignVisit();
			const members = Object.values(convoy.members),
				arrived = members.filter(
					(member) => operational(member) && member.arrival === visit,
				).length,
				lost = members.filter((member) => !living(member)).length;
			return {
				required: true,
				ready:
					!convoy.failed &&
					!lost &&
					convoy.visit === visit &&
					arrived === members.length,
				total: members.length,
				arrived,
				lost,
				disabled: members.filter(
					(member) => member.status === "disabled" && member.hull > 0,
				).length,
				failed: !!convoy.failed || lost > 0,
				failure:
					convoy.failed ||
					(lost ? "A required ship is no longer operational" : null),
				visit,
			};
		},
		escortObjectiveReady(active) {
			return this.escortStatus(active).ready;
		},
		escortObjective(active) {
			const status = this.escortStatus(active);
			if (!status.required) return "";
			if (status.failed)
				return `Convoy lost: ${status.failure}. Land and request replacement escorts before retrying this assignment.`;
			if (status.disabled)
				return `Protected convoy: ${status.disabled} disabled ship${status.disabled === 1 ? " needs" : "s need"} assistance. Approach and repair before continuing.`;
			return `Protected convoy: ${status.arrived}/${status.total} ships safely arrived in this system. Keep them alive and wait near the dock.`;
		},
		campaignLandingReady() {
			if (this.state.mode !== "flight") return true;
			return this.activeCampaignConvoys().every((active) => {
				const mission = this.missionDefinition(active);
				if (!mission || mission.destinationId !== this.state.systemId)
					return true;
				// A failed convoy must still be allowed to land to request a replacement.
				const status = this.escortStatus(active);
				return status.failed || status.ready;
			});
		},
		campaignDepartureReady() {
			return this.activeCampaignConvoys().every((active) => {
				const status = this.escortStatus(active);
				return status.failed || !status.disabled;
			});
		},
		campaignActorEvent(payload = {}) {
			const actor = this.state.campaignActors?.[payload.actorId];
			if (actor?.scope !== "campaign")
				return this.fail("That protected convoy vessel is no longer present.");
			if (this.state.mode !== "flight")
				return this.fail("Convoy interactions require flight.");
			const active = this.activeCampaignConvoys().find(
				(active) => active.id === actor.missionId,
			);
			if (!active)
				return this.fail("This convoy assignment is no longer active.");
			const convoy = this.ensureCampaignConvoy(active),
				member = convoy.members[actor.npcId];
			if (
				!member ||
				actor.convoyGeneration !== convoy.generation ||
				actor.convoyVisit !== this.campaignVisit()
			)
				return this.fail("That convoy event belongs to an earlier visit.");
			const action = payload.action || payload.type;
			let failed = false;
			const lose = (reason) => {
				member.hull = 0;
				member.status = "destroyed";
				member.arrival = null;
				if (!convoy.failed) {
					convoy.failed = `${actor.name} ${reason}`;
					this.log?.(
						"Protected convoy lost",
						`${convoy.failed}. The assignment can be retried from a port.`,
					);
				}
				failed = true;
			};
			if (action === "damage") {
				const amount = Number(payload.damage ?? payload.amount);
				if (!Number.isFinite(amount) || amount <= 0)
					return this.fail("No valid convoy damage was supplied.");
				if (living(member) && member.arrival !== this.campaignVisit()) {
					member.hull = Math.max(0, member.hull - amount);
					if (member.hull === 0) lose("was destroyed");
				}
			} else if (action === "destroy") lose("was destroyed");
			else if (action === "disable") {
				if (!living(member))
					return this.fail("This vessel has already been lost.");
				member.status = "disabled";
				member.hull = Math.max(1, Math.min(member.hull, member.maxHull * 0.18));
				member.arrival = null;
			} else if (action === "assist") {
				if (member.status !== "disabled" || member.hull <= 0)
					return this.fail("This convoy vessel does not need assistance.");
				member.hull = Math.max(member.hull, member.maxHull * 0.5);
				member.status = "active";
				member.arrival = null;
			} else if (action === "capture") {
				if (member.status !== "disabled")
					return this.fail("This protected vessel has not been disabled.");
				lose("was captured");
				member.status = "captured";
			} else if (action === "safe") {
				if (convoy.failed || !living(member))
					return this.fail(
						"A lost convoy cannot complete this assignment. Request replacement escorts in port.",
					);
				if (!operational(member))
					return this.fail(
						"Assist the disabled convoy vessel before it can arrive safely.",
					);
				if (
					this.state.enemies > 0 ||
					(this.state.missionActors || []).some(
						(other) =>
							other.scope !== "campaign" &&
							other.role === "hostile" &&
							other.status === "active" &&
							other.hull > 0,
					)
				)
					return this.fail(
						"Clear hostile contacts before receiving the convoy at the dock.",
					);
				member.arrival = this.campaignVisit();
			} else if (action === "hail")
				return this.success(
					`${actor.name}: We are following your lead. Keep the route clear, captain.`,
				);
			else if (action === "board")
				return this.fail(
					"This is a protected mission vessel, not a salvage prize.",
				);
			else return this.fail("Unknown protected convoy event.");
			this.syncCampaignActors();
			return this.success(
				failed
					? convoy.failed
					: action === "safe"
						? `${actor.name} arrived safely.`
						: action === "assist"
							? `${actor.name} repaired and ready to follow.`
							: action === "disable"
								? `${actor.name} is disabled; approach and assist it.`
								: `${actor.name} is taking fire.`,
				{
					campaign: true,
					missionId: active.id,
					failed,
					escortFailed: failed,
					arrived: action === "safe",
					escortReady: this.escortObjectiveReady(active),
				},
			);
		},
		retryEscort({ missionId, arcId } = {}) {
			if (this.state.mode !== "port")
				return this.fail("Land before requesting replacement escorts.");
			const active = this.activeCampaignConvoys().find((active) =>
				missionId
					? active.id === missionId
					: arcId
						? active.arcId === arcId
						: !active.arcId,
			);
			if (!active)
				return this.fail("There is no active convoy assignment to retry.");
			const convoy = this.ensureCampaignConvoy(active);
			if (!convoy.failed) return this.fail("This convoy is still intact.");
			const fee = Math.min(
				25000,
				Math.max(1000, Object.keys(convoy.members).length * 750),
			);
			if (this.spend) this.spend(fee);
			else {
				const paid = Math.min(this.state.credits, fee);
				this.state.credits -= paid;
				this.state.debt = (this.state.debt || 0) + fee - paid;
			}
			convoy.generation++;
			convoy.failed = null;
			convoy.visit = null;
			for (const member of Object.values(convoy.members)) {
				member.hull = member.maxHull;
				member.status = "active";
				member.arrival = null;
			}
			active.kills = 0;
			active.scanned = false;
			active.scannedSystems = [];
			active.boarded = false;
			active.mined = 0;
			active.startDay = this.state.day;
			this.syncCampaignActors();
			this.log?.(
				"Replacement convoy arranged",
				`${Object.keys(convoy.members).length} replacement escorts assigned. ${fee.toLocaleString()} credits charged; any shortfall was added to the ship loan.`,
			);
			return this.success(
				`Replacement convoy ready. ${fee.toLocaleString()} credits charged. Complete the assignment's flight objectives again.`,
				{ retried: true, missionId: active.id, fee },
			);
		},
	});
}
