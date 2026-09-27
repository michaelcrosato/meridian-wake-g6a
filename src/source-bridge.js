/** Connect the native data interpreter to the browser simulation without importing its data at startup. */
import { ARCS, OUTFITS, SALES, SHIPS, SYSTEMS } from "./content.js";
import { isAmmunition } from "./equipment.js";

const shipByName = (name) => {
	if (!name) return undefined;
	const exact = SHIPS.find((ship) => ship.name === name);
	if (exact) return exact;
	const base = name.replace(/\s*\([^)]*\)/g, "").trim();
	return (
		SHIPS.find((ship) => ship.name === base) ||
		SHIPS.find((ship) => ship.name === base.replace(/^Marauder /, ""))
	);
};
const outfitByName = (name) => OUTFITS.find((outfit) => outfit.name === name);
const systemByName = (name) =>
	SYSTEMS.find((system) => system.name === name || system.id === name);

export function sourceContext(game) {
	const stats = game.stats();
	const outfits = {
		// By hull id: captured and awarded flagships keep their own display names.
		...(SHIPS.find((ship) => ship.id === game.state.shipId)?.stockOutfits ||
			{}),
		...game.state.sourceInventory,
	};
	for (const id of game.state.outfits) {
		const outfit = OUTFITS.find((item) => item.id === id);
		if (outfit) outfits[outfit.name] = (outfits[outfit.name] || 0) + 1;
	}
	for (const [id, count] of Object.entries(game.state.ammo || {})) {
		const ammo = OUTFITS.find((outfit) => outfit.id === id);
		if (ammo) outfits[ammo.name] = count;
	}
	return {
		systemName: game.currentSystem().name,
		planetName: game.currentPlanet()?.name || "",
		day: game.state.day,
		credits: game.state.credits,
		cargoFree: stats.freeCargo,
		bunksFree: stats.freeBunks,
		outfits,
		shipAttributes: {
			...stats.sourceAttributes,
			"cargo space": stats.cargoCapacity,
			bunks: stats.passengerCapacity + stats.crew,
		},
		conditions: {
			...game.state.flags,
			...Object.fromEntries(
				Object.entries({
					"license: Remnant": "remnant-license",
					"license: Coalition": "coalition-license",
					"license: Wanderer": "wanderer-license",
					"license: Successor": "successor-contact",
					"license: Militia": "free-worlds-license",
				})
					.filter(([, flag]) => game.state.flags[flag])
					.map(([license]) => [license, 1]),
			),
			"main plot completed": Number(game.state.endingSeen),
			"free worlds checkmate": Number(
				game.state.endingSeen && game.state.flags.checkmate,
			),
			"free worlds reconciliation": Number(
				game.state.endingSeen && game.state.flags.reconciliation,
			),
			"total ships": 1 + game.state.escorts.length + game.state.fleet.length,
			"flagship crew": stats.crew,
			"net worth":
				game.state.credits +
				stats.price +
				game.state.outfits.reduce(
					(sum, id) =>
						sum + (OUTFITS.find((outfit) => outfit.id === id)?.price || 0),
					0,
				),
			...Object.fromEntries(
				[...new Set(SHIPS.map((ship) => ship.category))].map((category) => [
					`ships: ${category}`,
					Number(stats.category === category) +
						[...game.state.escorts, ...game.state.fleet].filter(
							(item) =>
								SHIPS.find((ship) => ship.id === item.shipId)?.category ===
								category,
						).length,
				]),
			),
		},
		reputation: game.state.reputation,
		shipName: stats.name,
		combatRating: Math.max(0, game.state.kills * 10),
	};
}

function applySystemNode(game, name, children) {
	const source = systemByName(name);
	if (!source) return;
	game.state.worldSystems[source.id] ||= {};
	const overlay = game.state.worldSystems[source.id];
	overlay.links ||= [...source.links];
	for (const child of children) {
		let [key, value, extra] = child.tokens;
		let remove = false;
		if (key === "remove" || key === "add") {
			remove = key === "remove";
			key = value;
			value = extra;
		}
		if (key === "government") overlay.faction = value;
		if (key === "object" && !remove && value)
			game.revealPlanet(source.id, value);
		if (key === "link" || key === "unlink") {
			const target = systemByName(value);
			if (!target) continue;
			if (remove || key === "unlink") {
				overlay.links = overlay.links.filter((id) => id !== target.id);
			} else if (!overlay.links.includes(target.id))
				overlay.links.push(target.id);
		}
		if (key === "pos") {
			overlay.x = Number(value);
			overlay.y = Number(extra);
		}
		if (key === "trade") {
			overlay.trade ||= { ...source.trade };
			overlay.trade[value] = Number(extra);
		}
		if (key === "attributes") overlay.attributes = child.tokens.slice(1);
	}
}
function applyPlanetNode(game, name, children) {
	const base = SYSTEMS.flatMap((system) => system.planets).find(
		(planet) => planet.name === name,
	);
	game.state.worldPlanets[name] ||= {};
	const overlay = game.state.worldPlanets[name];
	for (const child of children) {
		let [key, value, extra] = child.tokens;
		const remove = key === "remove";
		if (remove || key === "add") {
			key = value;
			value = extra;
		}
		if (["description", "spaceport", "government"].includes(key)) {
			overlay[key] = remove
				? ""
				: value ||
					child.children.map((node) => node.tokens.join(" ")).join("\n");
			if (key === "spaceport") overlay.inhabited = !remove && !!overlay[key];
		}
		if (key === "attributes") {
			const values = child.tokens.slice(
				remove || child.tokens[0] === "add" ? 2 : 1,
			);
			const current = overlay.attributes || base?.attributes || [];
			overlay.attributes = remove
				? current.filter((value) => !values.includes(value))
				: child.tokens[0] === "add"
					? [...new Set([...current, ...values])]
					: values;
			overlay.inhabited =
				!overlay.attributes.includes("uninhabited") &&
				!!(overlay.spaceport ?? base?.spaceport);
		}
		if (key === "required reputation")
			overlay.requiredReputation = Number(value);
		if (key === "shipyard" || key === "outfitter") {
			overlay[key] ||= [...(base?.[key] || [])];
			const current = overlay[key];
			if (remove)
				overlay[key] = value ? current.filter((group) => group !== value) : [];
			else if (value && !current.includes(value)) current.push(value);
		}
	}
}
function applyWorld(game, node) {
	game.state.worldRevision = (game.state.worldRevision || 0) + 1;
	const [type, name, value] = node.tokens;
	if (type === "system") applySystemNode(game, name, node.children);
	if (type === "planet") applyPlanetNode(game, name, node.children);
	if (type === "link" || type === "unlink") {
		applySystemNode(game, name, [{ tokens: [type, value], children: [] }]);
		applySystemNode(game, value, [{ tokens: [type, name], children: [] }]);
	}
	if (type === "shipyard" || type === "outfitter") {
		const key = `${type}:${name}`;
		game.state.worldSales[key] ||= [
			...(SALES.find((sale) => sale.name === name && sale.type === type)
				?.items || []),
		];
		let items = game.state.worldSales[key];
		for (const child of node.children) {
			if (child.tokens[0] === "remove")
				items = items.filter((item) => item !== child.tokens[1]);
			else {
				const item =
					child.tokens[0] === "add" ? child.tokens[1] : child.tokens[0];
				if (!items.includes(item)) items.push(item);
			}
		}
		game.state.worldSales[key] = items;
	}
}
export function applySourceEffects(game, result) {
	if (!result?.ok)
		return result || { ok: false, message: "Source action unavailable." };
	for (const effect of result.effects || []) {
		if (effect.type === "payment")
			effect.amount >= 0
				? game.earn(effect.amount)
				: game.spend(-effect.amount);
		if (effect.type === "fine") game.spend(Math.max(0, effect.amount));
		if (effect.type === "debt")
			game.state.debt = Math.max(0, game.state.debt + effect.amount);
		if (effect.type === "reputation")
			game.state.reputation[effect.faction] = effect.value;
		if (effect.type === "outfit") {
			const outfit = outfitByName(effect.name);
			if (Number(outfit?.sourceAttributes.map) > 0 && effect.count > 0) {
				game.chartSystems(outfit.sourceAttributes.map);
			} else if (outfit?.category === "Minerals") {
				game.state.sourceInventory[effect.name] = Math.max(
					0,
					(game.state.sourceInventory[effect.name] || 0) + effect.count,
				);
			} else if (isAmmunition(outfit)) {
				game.state.ammo[outfit.id] = Math.max(
					0,
					(game.state.ammo[outfit.id] || 0) + effect.count,
				);
			} else if (outfit) {
				for (let i = 0; i < Math.abs(effect.count); i++) {
					if (effect.count > 0) game.state.outfits.push(outfit.id);
					else {
						const index = game.state.outfits.indexOf(outfit.id);
						if (index >= 0) game.state.outfits.splice(index, 1);
						else
							game.state.sourceInventory[effect.name] = Math.max(
								0,
								(game.state.sourceInventory[effect.name] || 0) - 1,
							);
					}
				}
			} else
				game.state.sourceInventory[effect.name] = Math.max(
					0,
					(game.state.sourceInventory[effect.name] || 0) + effect.count,
				);
		}
		if (effect.type === "ship") {
			const ship = shipByName(effect.name);
			if (ship)
				for (let i = 0; i < effect.count; i++) {
					if (effect.operation === "give") {
						const item = {
							id: game.nextShipId(),
							name: ship.name,
							shipId: ship.id,
							hull: ship.maxHull,
							maxHull: ship.maxHull,
							command: "protect",
						};
						(game.state.escorts.length < 6
							? game.state.escorts
							: game.state.fleet
						).push(item);
					} else {
						const parkedIndex = game.state.fleet.findIndex(
							(item) => item.shipId === ship.id,
						);
						const escortIndex = game.state.escorts.findIndex(
							(item) => item.shipId === ship.id,
						);
						if (parkedIndex >= 0) game.state.fleet.splice(parkedIndex, 1);
						else if (escortIndex >= 0)
							game.state.escorts.splice(escortIndex, 1);
					}
				}
		}
		if (effect.type === "world") applyWorld(game, effect.node);
		if (["log", "dialog", "message"].includes(effect.type) && effect.text)
			game.log("Source chronicle", effect.text);
		if (effect.type === "failed")
			game.log("Source contract ended", `${effect.id}: ${effect.reason}`);
		if (effect.type === "death") {
			game.state.mode = "destroyed";
			game.state.hull = 0;
		}
		if (effect.type.startsWith("unsupported")) {
			game.state.sourceDiagnostics ||= [];
			game.state.sourceDiagnostics.push({
				day: game.state.day,
				type: effect.type,
				detail: effect.name || effect.tokens?.join(" ") || effect.type,
			});
			game.state.sourceDiagnostics = game.state.sourceDiagnostics.slice(-100);
		}
	}
	game.state.hull = Math.min(game.state.hull, game.stats().maxHull);
	game.state.shield = Math.min(game.state.shield, game.stats().maxShield);
	game.state.fuel = Math.min(game.state.fuel, game.stats().maxFuel);
	if (result.effects?.some((effect) => effect.type === "world"))
		game.syncCanonicalWorld?.();
	return result;
}

export function sourceMethods(Game) {
	Object.assign(Game.prototype, {
		async enableSourceMissions() {
			if (!this.sourceEngine) {
				const { SourceMissionEngine } = await import("./source-missions.js");
				this.sourceEngine = new SourceMissionEngine();
				this.sourceEngine.bind(this.state, sourceContext(this));
				this.syncCanonicalWorld();
				this.syncNarrative();
			}
			return this;
		},
		sourceContext() {
			return sourceContext(this);
		},
		syncCanonicalWorld() {
			if (!this.sourceEngine) return;
			if (!this.state.sourceQuests)
				this.sourceEngine.bind(this.state, sourceContext(this));
			const store = this.state.sourceQuests;
			// The authored campaign owns these historical milestones. Loading optional Contacts must not restart a finished war.
			store.events = store.events.filter(
				(event) =>
					event.name !== "war begins" &&
					!event.name.startsWith("initial deployment "),
			);
			for (const [flag, value] of Object.entries(this.state.flags))
				if (flag.startsWith("world:") && value)
					store.conditions[`event: ${flag.slice(6)}`] = 1;
			if (
				this._canonicalStore === store &&
				this._canonicalRevision === (this.state.worldRevision || 0)
			)
				return;
			this.sourceEngine.bind(this.state, sourceContext(this));
			for (const key of Object.keys(store.world))
				if (key.startsWith("canonical:")) delete store.world[key];
			this.sourceEngine.resetWorldCaches();
			const rawNode = (tokens) => ({ tokens, children: [] });
			for (const id of Object.keys(this.state.worldSystems)) {
				const system = this.systemById(id),
					original = this.sourceEngine.worldValue("system", system.name);
				if (!original) continue;
				const wanted = system.links
					.map((id) => this.systemById(id)?.name)
					.filter(Boolean);
				const children = [
					rawNode(["government", system.faction]),
					...(original.links || [])
						.filter((name) => !wanted.includes(name))
						.map((name) => rawNode(["remove", "link", name])),
					...wanted
						.filter((name) => !original.links?.includes(name))
						.map((name) => rawNode(["link", name])),
				];
				store.world[`canonical:system:${id}`] = {
					tokens: ["system", system.name],
					children,
				};
				const base = this.sourceEngine.systems.get(system.name);
				this.sourceEngine.systems.set(system.name, {
					...base,
					objects: system.planets.map((planet) => planet.name),
				});
				for (const planet of system.planets)
					this.sourceEngine.planetSystems.set(planet.name, system.name);
			}
			for (const [name, override] of Object.entries(this.state.worldPlanets)) {
				const children = [];
				if (override.attributes)
					children.push(rawNode(["attributes", ...override.attributes]));
				if (override.government)
					children.push(rawNode(["government", override.government]));
				store.world[`canonical:planet:${name}`] = {
					tokens: ["planet", name],
					children,
				};
			}
			this.sourceEngine.resetWorldCaches();
			this._canonicalStore = store;
			this._canonicalRevision = this.state.worldRevision || 0;
		},

		nativeOfferAllowed(mission) {
			const raw = this.sourceEngine?.missions.get(mission.id);
			const repeatable = raw?.nodes.some(
				(node) => node.tokens[0] === "repeat" || node.tokens[0] === "job",
			);
			if (repeatable) return true;
			if (mission.id === "Intro [0]")
				return this.state.storyIndex === 0 && !this.state.activeStory;
			if (mission.sourceFile?.startsWith("data/human/free worlds "))
				return false;
			const stages = ARCS.flatMap((arc) => arc.missions);
			if (stages.some((stage) => stage.sourceMissions?.includes(mission.id)))
				return false;
			const dedicatedFamilies = new Set(
				stages
					.map((stage) => stage.sourceFile?.split("/").slice(0, 2).join("/"))
					.filter(
						(prefix) =>
							prefix && prefix !== "data/human" && prefix !== "data/hai",
					),
			);
			return !dedicatedFamilies.has(
				mission.sourceFile?.split("/").slice(0, 2).join("/"),
			);
		},
		syncNativeLicenses() {
			const conditions = this.state.sourceQuests?.conditions || {};
			for (const [flag, key] of Object.entries({
				"remnant-license": "license: Remnant",
				"coalition-license": "license: Coalition",
				"wanderer-license": "license: Wanderer",
				"successor-contact": "license: Successor",
				"free-worlds-license": "license: Militia",
				"kestrel-license": "Kestrel Testing: done",
			}))
				if (conditions[key] > 0) this.state.flags[flag] = true;
		},

		syncNarrative() {
			this.syncNativeLicenses();
			if (
				this.state.sourceQuests?.conditions?.["Intro [0]: done"] &&
				this.state.storyIndex === 0
			) {
				this.state.activeStory = null;
				this.state.storyIndex = 1;
				this.log(
					"One captain, one voyage",
					"James’s original passage is complete. The Southern Mutual Defense Pact is your next authored chapter.",
				);
			}
		},

		sourceDialogue() {
			// Polled every frame; skip building the full context when nothing is open.
			if (!this.sourceEngine || !this.state.sourceQuests?.dialogue) return null;
			this.sourceEngine.bind(this.state, sourceContext(this));
			return this.sourceEngine.dialogueView();
		},
		availableSourceMissions(location = "all") {
			if (!this.sourceEngine || this.state.mode !== "port") return [];
			const locations =
				location === "all"
					? [
							"landing",
							"spaceport",
							"job",
							...(this.currentPlanet()?.shipyard?.length ? ["shipyard"] : []),
							...(this.currentPlanet()?.outfitter?.length ? ["outfitter"] : []),
						]
					: [location];
			return locations.flatMap((where) =>
				this.sourceEngine
					.available(this.state, sourceContext(this), where)
					.filter(
						(mission) =>
							!mission.invisible &&
							!mission.unsupported?.length &&
							this.nativeOfferAllowed(mission),
					)
					.map((mission) => ({ ...mission, location: where })),
			);
		},
		activeSourceMissions() {
			return this.sourceEngine
				? this.sourceEngine.active(this.state, sourceContext(this))
				: [];
		},
		sourceAction(action, payload) {
			if (action === "sourceActorEvent") return this.sourceActorEvent(payload);
			if (!this.sourceEngine)
				return this.fail(
					"The original mission archive is loading. Open Source missions to load it.",
				);
			if (action !== "sourceChoose" && this.state.mode !== "port")
				return this.fail("Land before managing a source mission.");
			const methods = {
				sourceOffer: "offer",
				sourceAccept: "accept",
				sourceComplete: "complete",
				sourceAbort: "abort",
				sourceChoose: "choose",
			};
			const method = methods[action];
			if (["sourceOffer", "sourceAccept"].includes(action)) {
				const raw = this.sourceEngine.missions.get(payload.missionId);
				if (
					raw &&
					!this.nativeOfferAllowed({ id: raw.name, sourceFile: raw.sourceFile })
				)
					return this.fail(
						"This story is already represented by your captain’s active chronicle. Follow its current assignment in the mission journal.",
					);
			}
			if (!method) return this.fail("Unknown source mission command.");
			const protectedId =
				method === "choose"
					? this.state.sourceQuests?.dialogue?.missionId
					: payload.missionId;
			const protectedRaw = this.sourceEngine.missions.get(protectedId);
			const protectedGroup = protectedRaw?.nodes.some(
				(node) =>
					node.tokens[0] === "npc" &&
					node.tokens.some((token) => ["save", "accompany"].includes(token)),
			);
			const accepting =
				["offer", "accept"].includes(method) ||
				(method === "choose" && this.sourceDialogue()?.accepts === true);
			if (
				accepting &&
				protectedGroup &&
				(this.activeCampaignConvoys().length ||
					(this.state.sourceQuests?.active || []).some(
						(active) =>
							active.id !== protectedId &&
							active.objectives.some((objective) =>
								["save", "accompany"].includes(objective.type),
							),
					))
			)
				return this.fail(
					"Complete the current protected convoy before accepting another escort assignment.",
				);
			const result = this.sourceEngine[method](
				this.state,
				sourceContext(this),
				method === "choose" ? Number(payload.index) : payload.missionId,
			);
			const applied = applySourceEffects(this, result);
			this.syncSourceActors();
			this.syncNarrative();
			return applied;
		},
		notifySource(event) {
			if (!this.sourceEngine) return null;
			this.syncCanonicalWorld();
			const result = applySourceEffects(
				this,
				this.sourceEngine.notify(this.state, sourceContext(this), event),
			);
			this.syncSourceActors();
			return result;
		},
		syncSourceActors() {
			this.state.sourceActors ||= {};
			const visible = [];
			for (const active of this.state.sourceQuests?.active || []) {
				const groups = new Map();
				for (const objective of active.objectives) {
					if (!objective.enabled) continue;
					const group = groups.get(objective.npcId) || {
						...objective,
						types: [],
						count: 0,
					};
					group.types.push(objective.type);
					group.count = Math.max(group.count, objective.count);
					group.mobile ||= objective.mobile;
					groups.set(objective.npcId, group);
				}
				for (const group of groups.values()) {
					if (!group.mobile && group.systemName !== this.currentSystem().name)
						continue;
					const friendly = group.types.some((type) =>
						["save", "accompany"].includes(type),
					);
					const hostile =
						!friendly &&
						group.types.some((type) =>
							["kill", "disable", "capture"].includes(type),
						);
					const disabled =
						!hostile &&
						group.types.some((type) => ["board", "assist"].includes(type));
					for (let i = 0; i < Math.min(60, group.count); i++) {
						const id = `native:${active.id}:${active.acceptedDay}:${group.npcId}:${i}`;
						const ship =
							shipByName(
								group.shipModels?.[i] ||
									group.shipModels?.[0] ||
									group.shipNames?.[0],
							) || shipByName(hostile ? "Sparrow" : "Shuttle");
						this.state.sourceActors[id] ||= {
							id,
							missionId: active.id,
							npcId: group.npcId,
							shipId: ship.id,
							name: group.shipNames?.[i] || ship.name,
							faction: group.government || (hostile ? "Pirate" : "Independent"),
							role: friendly ? "escort" : hostile ? "hostile" : "neutral",
							hull: disabled ? Math.round(ship.maxHull * 0.12) : ship.maxHull,
							maxHull: ship.maxHull,
							status: disabled ? "disabled" : "active",
							objectives: group.types,
							mobile: !!group.mobile,
							systemName: group.systemName,
							completedEvents: [],
						};
						const actor = this.state.sourceActors[id];
						if (actor.flightVisit !== this.state.flightSerial) {
							if (actor.status === "departed") actor.status = "active";
							actor.completedEvents = actor.completedEvents.filter(
								(type) => type !== "accompany",
							);
							actor.flightVisit = this.state.flightSerial;
						}
						actor.objectives = group.types;
						visible.push(actor);
					}
				}
			}
			// Records of finished missions would otherwise stay in every save; a mission
			// re-accepted on the same day must not inherit their destroyed ships either.
			const live = (this.state.sourceQuests?.active || []).map(
				(active) => `native:${active.id}:${active.acceptedDay}:`,
			);
			for (const id of Object.keys(this.state.sourceActors))
				if (!live.some((prefix) => id.startsWith(prefix)))
					delete this.state.sourceActors[id];
			this.state.missionActors = [
				...visible,
				...(this.state.missionActors || []).filter(
					(actor) => actor.scope === "campaign",
				),
			];
			return visible;
		},
		missionActors() {
			return this.state.missionActors || [];
		},
		setupSourceEncounter() {
			this.syncSourceActors();
		},
		sourceActorEvent(event) {
			if (this.state.campaignActors?.[event.actorId])
				return this.campaignActorEvent(event);
			if (!this.sourceEngine || this.state.mode !== "flight")
				return this.fail("There is no active ship encounter.");
			const actor = this.missionActors().find(
				(item) => item.id === event.actorId,
			);
			if (!actor || actor.status === "destroyed")
				return this.fail("This mission vessel is no longer present.");
			const action = event.action;
			const notify = (type) => {
				if (actor.completedEvents.includes(type)) return;
				actor.completedEvents.push(type);
				this.notifySource({
					type,
					missionId: actor.missionId,
					npcId: actor.npcId,
					actorId: actor.id,
				});
			};
			if (action === "damage") {
				if (!Number.isFinite(event.damage) || event.damage <= 0)
					return this.fail("Invalid vessel damage.");
				actor.hull = Math.max(0, actor.hull - event.damage);
				if (actor.objectives.includes("provoke")) notify("provoke");
			} else if (action === "disable") {
				actor.hull = Math.max(1, Math.min(actor.hull, actor.maxHull * 0.15));
				actor.status = "disabled";
				notify("disable");
			} else if (action === "destroy") {
				actor.hull = 0;
				actor.status = "destroyed";
				notify("destroy");
				notify("kill");
				this.log(
					"Mission vessel lost",
					`${actor.name} was destroyed in ${this.currentSystem().name}.`,
				);
			} else if (action === "scan cargo" || action === "scan outfits") {
				const property =
					action === "scan cargo" ? "cargo scan power" : "outfit scan power";
				if (
					!this.installedEquipment().some(
						(outfit) => Number(outfit.sourceAttributes[property]) > 0,
					)
				)
					return this.fail(
						`Install a ${action === "scan cargo" ? "Cargo Scanner" : "Outfit Scanner"} before scanning this vessel.`,
					);
				notify(action);
			} else if (action === "hail")
				return this.success(`${actor.name} acknowledges your hail.`);
			else if (action === "scan") {
				const cargo = this.installedEquipment().some(
					(outfit) => Number(outfit.sourceAttributes["cargo scan power"]) > 0,
				);
				const outfits = this.installedEquipment().some(
					(outfit) => Number(outfit.sourceAttributes["outfit scan power"]) > 0,
				);
				if (!cargo && !outfits)
					return this.fail(
						"Install a Cargo Scanner or Outfit Scanner before scanning a mission vessel.",
					);
				if (cargo) notify("scan cargo");
				if (outfits) notify("scan outfits");
			} else if (action === "board" || action === "capture") {
				if (actor.status !== "disabled")
					return this.fail("Disable this vessel before boarding.");
				if (
					action === "capture" &&
					this.capturePower() < this.captureRequirement(actor.shipId)
				)
					return this.fail(
						`Your boarding strength is ${Math.floor(this.capturePower())}; this vessel requires ${Math.ceil(this.captureRequirement(actor.shipId))}. Hire crew or fit boarding weapons.`,
					);
				if (action === "capture" && this.state.credits < 3000)
					return this.fail(
						"You need 3,000 credits to commission a prize crew.",
					);
				notify("board");
				if (action === "capture") {
					this.state.credits -= 3000;
					notify("capture");
					// As in Endless Sky, a captured ship also counts as killed.
					notify("kill");
					actor.status = "captured";
					const captured = {
						id: this.nextShipId(),
						name: actor.name,
						shipId: actor.shipId,
						hull: Math.max(1, actor.hull),
						maxHull: actor.maxHull,
						command: "protect",
					};
					(this.state.escorts.length < 6
						? this.state.escorts
						: this.state.fleet
					).push(captured);
				}
			} else if (action === "assist") {
				if (actor.status !== "disabled")
					return this.fail("This vessel does not need assistance.");
				actor.hull = Math.max(actor.hull, actor.maxHull * 0.5);
				actor.status = "active";
				notify("assist");
			} else if (action === "safe") {
				if (actor.status !== "active" || actor.hull <= 0)
					return this.fail("This vessel cannot accompany you.");
				if (actor.mobile || actor.systemName === this.currentSystem().name) {
					notify("accompany");
					if (actor.role === "escort" && actor.objectives.includes("accompany"))
						actor.status = "departed";
				}
			} else if (action === "evade") notify("evade");
			else return this.fail("Unknown mission vessel interaction.");
			return this.success(`${actor.name}: ${action}.`);
		},
	});
}
