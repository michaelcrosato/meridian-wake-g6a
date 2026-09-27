import { bankMethods, newBankAccount } from "./bank.js";
import { campaignMethods } from "./campaign-actors.js";
import {
	ARCS,
	CAMPAIGN,
	COMMODITIES,
	FACTIONS,
	OUTFITS,
	PLANETS,
	SALES,
	SHIPS,
	SYSTEMS,
} from "./content.js";
import { equipmentMethods, isAmmunition } from "./equipment.js";
import { fleetMethods } from "./fleet.js";
import { freelanceMethods } from "./freelance.js";
import { storageMethods } from "./outfit-storage.js";
import { applySourceEffects, sourceMethods } from "./source-bridge.js";
import { applyStoryWorld } from "./story-world.js";
import { UNIVERSE_FLEET_HULLS } from "./universe.js";

export {
	ARCS,
	CAMPAIGN,
	COMMODITIES,
	FACTIONS,
	isAmmunition,
	OUTFITS,
	SHIPS,
	SYSTEMS,
};

const indexes = new WeakMap();
const byId = (items, id) => {
	let cached = indexes.get(items);
	if (!cached || cached.size !== items.length) {
		cached = {
			size: items.length,
			map: new Map(items.map((item) => [item.id, item])),
		};
		indexes.set(items, cached);
	}
	return cached.map.get(id);
};
// Built on first use, after every arc module has registered its missions.
let missionIndex;
const missionById = (id) => {
	if (!missionIndex) {
		missionIndex = new Map();
		for (const mission of [...CAMPAIGN, ...ARCS.flatMap((arc) => arc.missions)])
			if (!missionIndex.has(mission.id)) missionIndex.set(mission.id, mission);
	}
	return missionIndex.get(id);
};
const MINERALS = new Map(
	OUTFITS.filter((outfit) => outfit.category === "Minerals").map((outfit) => [
		outfit.name,
		outfit,
	]),
);
const driveNeighbors = new Map();
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const int = (value) => Math.floor(Number(value));
const clone = (value) => structuredClone(value);
const hash = (text) =>
	[...text].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);

/** Serializable simulation. All player commands are validated here, independently of the UI. */
export class Game {
	constructor(saved) {
		this.newGame();
		if (saved)
			this.restore(typeof saved === "string" ? JSON.parse(saved) : saved);
	}
	newGame(shipId = "sparrow") {
		const ship = byId(SHIPS, shipId) || byId(SHIPS, "sparrow") || SHIPS[0];
		this.state = {
			version: 2,
			mode: "port",
			systemId: "rutilicus",
			planetName: "New Boston",
			shipId: ship.id,
			flagshipName: ship.name,
			credits: 24000,
			debt: 75000,
			bank: newBankAccount(),
			outfitStorage: {},
			day: 1,
			fuel: ship.maxFuel,
			hull: ship.maxHull,
			shield: ship.maxShield,
			cargo: {},
			outfits: [],
			jobs: [],
			completedJobs: [],
			storyIndex: 0,
			activeStory: null,
			arcs: {},
			activeArcs: [],
			completedArcs: [],
			flags: {},
			log: [],
			visited: ["rutilicus"],
			chartedSystems: [],
			kills: 0,
			escorts: [],
			fleet: [],
			flagshipId: "owned-0",
			fleetSerial: 0,
			reputation: {},
			enemies: 0,
			disabled: 0,
			wrecks: [],
			encounter: null,
			combatSerial: 0,
			flightSerial: 0,
			battles: 0,
			mined: 0,
			boarded: 0,
			rescues: 0,
			earnings: 0,
			landingReady: true,
			distress: false,
			endingSeen: false,
			totalJumps: 0,
			encountersCleared: {},
			resourceReserves: {},
			miningCooldown: 0,
			energy: 100,
			ammo: {},
			secondaryCooldown: 0,
			secondaryOutfitId: null,
			extraCrew: 0,
			heat: 0,
			overheated: false,
			cloaked: false,
			cloakCooldown: 0,
			shipCapabilities: {},
			flagshipLoanId: null,
			worldSystems: {},
			worldRevision: 0,
			worldPlanets: {},
			worldSales: {},
			sourceInventory: {},
		};
		this.resetAmmunition();
		this.chartSystems(1);
		this.log(
			"Your first command",
			"New Boston. A ship, a bank loan, and a sky full of possibilities. Visit the spaceport for work; choose your own course.",
		);
		return this;
	}
	restore(saved) {
		if (
			!saved ||
			typeof saved !== "object" ||
			!byId(SYSTEMS, saved.systemId) ||
			!byId(SHIPS, saved.shipId)
		)
			throw new Error("This save is not a valid Meridian Wake captain.");
		const defaults = this.state;
		this.state = { ...defaults, ...clone(saved) };
		this.state.bank = { ...newBankAccount(), ...this.state.bank };
		const bank = this.state.bank;
		if (
			!Number.isFinite(bank.score) ||
			bank.score < 200 ||
			bank.score > 800 ||
			!Number.isFinite(bank.rate) ||
			bank.rate < 0 ||
			bank.rate > 0.01 ||
			!Number.isSafeInteger(bank.term) ||
			bank.term < 1 ||
			bank.term > 365 ||
			!Array.isArray(bank.income) ||
			bank.income.some(
				(entry) =>
					!entry ||
					!Number.isFinite(entry.day) ||
					!Number.isFinite(entry.amount),
			)
		)
			throw new Error("Invalid bank account in save.");
		if (
			!this.state.outfitStorage ||
			Array.isArray(this.state.outfitStorage) ||
			typeof this.state.outfitStorage !== "object"
		)
			throw new Error("Invalid outfit storage in save.");
		for (const [planet, stock] of Object.entries(this.state.outfitStorage)) {
			if (
				!PLANETS.some((p) => p.name === planet) ||
				!stock ||
				typeof stock !== "object" ||
				Array.isArray(stock) ||
				Object.entries(stock).some(
					([id, count]) =>
						!byId(OUTFITS, id) || !Number.isSafeInteger(count) || count < 1,
				)
			)
				throw new Error("Invalid stored outfit in save.");
		}
		for (const key of [
			"credits",
			"debt",
			"day",
			"fuel",
			"hull",
			"shield",
			"storyIndex",
		]) {
			if (!Number.isFinite(this.state[key]) || this.state[key] < 0)
				throw new Error(`Invalid save field: ${key}`);
		}
		for (const key of [
			"outfits",
			"jobs",
			"log",
			"visited",
			"escorts",
			"fleet",
			"activeArcs",
			"completedArcs",
		])
			if (!Array.isArray(this.state[key]))
				throw new Error(`Invalid save field: ${key}`);
		const shipIds = new Set();
		for (const ship of [...this.state.escorts, ...this.state.fleet]) {
			if (ship.id?.startsWith("escort-") && !ship.ownedContract) {
				ship.contract = true;
				ship.bond = 5000;
				// Earlier releases could reuse a dismissed escort's id on the same day.
				if (shipIds.has(ship.id)) ship.id = `escort-${this.nextShipId()}`;
			}
			shipIds.add(ship.id);
		}
		if (!Array.isArray(saved.wrecks) && this.state.disabled > 0)
			this.state.wrecks = Array.from(
				{ length: Math.min(60, this.state.disabled) },
				(_, i) => ({
					id: `legacy-wreck-${i}`,
					shipId: "sparrow",
					systemId: this.state.systemId,
					x: 5 + i * 2,
					z: 6,
				}),
			);
		this.state.disabled = this.state.wrecks.length;
		if (!Array.isArray(saved.chartedSystems))
			this.state.chartedSystems = [
				...new Set([...this.state.visited, ...this.chartableSystems(1)]),
			];
		this.state.outfits = this.state.outfits.filter((id) => byId(OUTFITS, id));
		this.state.storyIndex = Math.min(this.state.storyIndex, CAMPAIGN.length);
		if (this.state.activeStory) {
			const index = CAMPAIGN.findIndex(
				(mission) => mission.id === this.state.activeStory.id,
			);
			if (index >= 0) this.state.storyIndex = index;
		}
		this.state.fuel = Math.min(this.state.fuel, this.stats().maxFuel);
		this.state.hull = Math.min(this.state.hull, this.stats().maxHull);
		this.state.shield = Math.min(this.state.shield, this.stats().maxShield);
		return this;
	}
	save() {
		return JSON.stringify(this.state);
	}
	static load(json) {
		return new Game(JSON.parse(json));
	}
	systemById(id) {
		const base = byId(SYSTEMS, id);
		return base
			? {
					...base,
					...(this.state.worldSystems[id] || {}),
					planets: [
						...base.planets,
						...(this.state.worldSystems[id]?.extraPlanets || []),
					].map((planet) => ({
						...planet,
						...(this.state.worldPlanets[planet.name] || {}),
					})),
				}
			: null;
	}
	revealPlanet(systemId, planetName) {
		const system = byId(SYSTEMS, systemId),
			planet = PLANETS.find((planet) => planet.name === planetName);
		if (!system || !planet) return false;
		this.state.worldSystems[systemId] ||= {};
		this.state.worldSystems[systemId].extraPlanets ||= [];
		if (
			!this.systemById(systemId).planets.some(
				(planet) => planet.name === planetName,
			)
		)
			this.state.worldSystems[systemId].extraPlanets.push(clone(planet));
		this.state.worldRevision = (this.state.worldRevision || 0) + 1;
		return true;
	}
	currentSystem() {
		const system = this.systemById(this.state.systemId);
		const planet = this.currentPlanet();
		return {
			...system,
			planet: planet?.name || system.planet,
			description: planet?.description || system.description,
			inhabited: planet ? planet.inhabited : system.inhabited,
		};
	}
	currentPlanet() {
		const system = this.systemById(this.state.systemId);
		return (
			system.planets.find((planet) => planet.name === this.state.planetName) ||
			system.planets.find((planet) => planet.inhabited) ||
			system.planets[0] ||
			null
		);
	}
	inventory(type) {
		const groups = this.currentPlanet()?.[type] || [];
		const names = new Set(
			SALES.filter(
				(sale) => sale.type === type && groups.includes(sale.name),
			).flatMap(
				(sale) => this.state.worldSales[`${type}:${sale.name}`] || sale.items,
			),
		);
		return (type === "shipyard" ? SHIPS : OUTFITS).filter((item) =>
			names.has(item.name),
		);
	}
	availableShips() {
		return this.inventory("shipyard");
	}
	availableOutfits() {
		return this.inventory("outfitter");
	}
	currentShip() {
		return {
			...byId(SHIPS, this.state.shipId),
			...this.stats(),
			hull: this.state.hull,
			shield: this.state.shield,
			energy: this.state.energy,
			heat: this.state.heat,
			overheated: this.state.overheated,
			cloaked: this.state.cloaked,
			name: this.state.flagshipName || byId(SHIPS, this.state.shipId).name,
		};
	}
	stats() {
		const base = byId(SHIPS, this.state.shipId);
		const result = {
			...base,
			maxHull: base.maxHull,
			maxShield: base.maxShield,
			speed: base.speed,
			damage: base.damage,
			cargoCapacity: base.cargoCapacity,
			passengerCapacity: base.passengerCapacity - this.state.extraCrew,
			maxFuel: base.maxFuel,
			outfitCapacity: base.outfitCapacity,
			energy: base.energy || 100,
			heat: base.heat || 80,
			crew: (base.crew || 1) + this.state.extraCrew,
			outfitUsed: 0,
		};
		for (const id of this.state.outfits) {
			const outfit = byId(OUTFITS, id);
			if (!outfit) continue;
			result.outfitUsed += outfit.space || 0;
			for (const [key, amount] of Object.entries(outfit.effects || {})) {
				if (key === "evasion" && outfit.tag === "cloak") continue;
				if (
					key === "damage" &&
					(outfit.weapon?.ammo || outfit.category === "Secondary Weapons")
				)
					continue;
				result[key] = (result[key] || 0) + amount;
			}
		}
		if (this.state.shipId.startsWith("kestrel")) {
			if (this.state.flags["kestrel-weapons"]) result.damage += 20;
			if (this.state.flags["kestrel-engines"]) {
				result.speed += 6;
				result.turn = (result.turn || 0) + 0.4;
			}
			if (this.state.flags["kestrel-shields"]) result.maxShield += 120;
			if (this.state.flags["kestrel-bays"]) result.fighterCapacity = 2;
		}
		result.cargoCapacity = Math.max(0, result.cargoCapacity);
		result.passengerCapacity = Math.max(0, result.passengerCapacity);
		result.cargoUsed = this.cargoUsed();
		result.passengersUsed = this.passengersUsed();
		result.freeCargo = result.cargoCapacity - result.cargoUsed;
		result.freeBunks = result.passengerCapacity - result.passengersUsed;
		result.maxEnergy = Math.max(30, result.energy);
		result.maxHeat = Math.max(30, result.heat);
		result.energyRegen =
			8 +
			this.state.outfits.reduce(
				(sum, id) =>
					sum +
					Math.sqrt(
						Math.max(
							0,
							Number(
								byId(OUTFITS, id)?.sourceAttributes?.["energy generation"],
							) || 0,
						),
					) *
						2,
				0,
			);
		result.cooling =
			12 +
			this.state.outfits.reduce(
				(sum, id) =>
					sum +
					Math.sqrt(
						Math.max(
							0,
							Number(byId(OUTFITS, id)?.sourceAttributes?.cooling) || 0,
						),
					) *
						2,
				0,
			);
		result.energyCost = Math.max(1, result.damage * 0.08);
		result.shotHeat = Math.max(1, result.damage * 0.1);
		result.canFire =
			this.state.energy >= result.energyCost &&
			!this.state.overheated &&
			!this.state.cloaked;
		const secondary = this.secondaryWeapon();
		result.canSecondary = !!secondary?.ready;
		result.secondaryDamage = secondary?.damage || 0;
		result.secondaryHoming = secondary?.homing || false;
		result.secondaryCooldown = secondary?.cooldown || 1;
		result.secondaryName = secondary?.name || "No launcher";
		result.secondaryAmmo = secondary?.ammoCount ?? 0;
		result.secondarySpeed = secondary?.speed || 32;
		result.pointDefense = Math.min(
			0.9,
			this.installedEquipment().reduce(
				(sum, outfit) =>
					sum + (Number(outfit.weapon?.["anti-missile"]) || 0) / 40,
				0,
			),
		);
		result.canIntercept =
			result.pointDefense > 0 && this.state.energy >= 2 && !this.state.cloaked;
		result.cloakAvailable = this.capability("cloak") > 0;
		result.cloakEnergyCost = 12 + this.capability("cloaking energy") * 4;
		result.cloakFuelCost = Math.max(
			0.002,
			this.capability("cloaking fuel") * 0.05,
		);
		result.gaslining = this.capability("gaslining") > 0;
		result.starlining = this.capability("starlining") > 0;
		result.sourceAttributes = {
			...base.sourceAttributes,
			...this.state.shipCapabilities,
		};
		result.fuelGeneration ||= this.installedEquipment().some(
			(outfit) => Number(outfit.sourceAttributes["fuel generation"]) > 0,
		)
			? 1
			: 0;
		result.scanRange = 8 + (result.scanner || 0) * 6;
		return result;
	}
	missionDefinition(active) {
		if (!active) return null;
		return missionById(active.id);
	}
	cargoUsed() {
		return (
			Object.values(this.state.cargo).reduce((n, value) => n + value, 0) +
			this.mineralCargo().reduce((n, item) => n + item.totalMass, 0) +
			(this.state.sourceQuests?.active || []).reduce(
				(n, mission) => n + (mission.cargo || 0),
				0,
			) +
			this.state.jobs.reduce((n, job) => n + (job.cargo || 0), 0) +
			[this.state.activeStory, ...this.state.activeArcs].reduce(
				(n, active) => n + (this.missionDefinition(active)?.cargo || 0),
				0,
			)
		);
	}
	passengersUsed() {
		return (
			(this.state.sourceQuests?.active || []).reduce(
				(n, mission) => n + (mission.passengers || 0),
				0,
			) +
			this.state.jobs.reduce((n, job) => n + (job.passengers || 0), 0) +
			[this.state.activeStory, ...this.state.activeArcs].reduce(
				(n, active) => n + (this.missionDefinition(active)?.passengers || 0),
				0,
			)
		);
	}
	log(title, message) {
		this.state.log.unshift({ day: this.state.day, title, message });
		this.state.log = this.state.log.slice(0, 100);
	}
	success(message, extra = {}) {
		return { ok: true, message, ...extra };
	}
	fail(message) {
		return { ok: false, message };
	}
	hasOutfit(tag) {
		const embedded = {
			"jump-drive": "jump drive",
			keystone: "quantum keystone",
			ramscoop: "ramscoop",
			cloak: "cloak",
			gaslining: "gaslining",
			starlining: "starlining",
		};
		return (
			this.installedEquipment().some(
				(outfit) => outfit.tag === tag || outfit.id === tag,
			) ||
			(embedded[tag] && this.capability(embedded[tag]) > 0)
		);
	}

	price(commodityId, systemId = this.state.systemId) {
		const commodity = byId(COMMODITIES, commodityId);
		const system = this.systemById(systemId);
		if (!commodity || !system) return 0;
		const sourcePrice = system.trade?.[commodity.sourceName || commodity.name];
		const factor = 0.72 + (hash(`${system.id}:${commodity.id}`) % 61) / 100;
		return Math.max(
			1,
			Math.round(
				(sourcePrice || commodity.basePrice * factor) *
					(1 + (((this.state.day + hash(systemId)) % 7) - 3) * 0.014),
			),
		);
	}
	sellPrice(commodityId) {
		return Math.max(1, Math.floor(this.price(commodityId) * 0.94));
	}
	routeTo(destinationId, startId = this.state.systemId) {
		if (startId === destinationId) return [];
		const queue = [[startId, []]],
			seen = new Set([startId]);
		while (queue.length) {
			const [id, path] = queue.shift();
			for (const next of this.neighbors(id)) {
				if (next === destinationId) return [...path, next];
				if (!seen.has(next)) {
					seen.add(next);
					queue.push([next, [...path, next]]);
				}
			}
		}
		return null;
	}
	neighbors(systemId = this.state.systemId) {
		const system = this.systemById(systemId);
		if (!system) return [];
		const neighbors = system.links.filter(
			(id) =>
				!(system.wormholes || []).some(
					(wormhole) =>
						wormhole.to === id &&
						(!system.planets.some((planet) => planet.name === wormhole.name) ||
							(wormhole.requiresTag && !this.hasOutfit(wormhole.requiresTag))),
				),
		);
		if (this.hasOutfit("jump-drive")) {
			const moved = Object.entries(this.state.worldSystems).filter(
				([, override]) => override.x !== undefined || override.y !== undefined,
			);
			const signature = moved
				.map(([id, override]) => `${id}:${override.x}:${override.y}`)
				.join("|");
			const cacheKey = `${systemId}:${signature}`;
			if (!driveNeighbors.has(cacheKey))
				driveNeighbors.set(
					cacheKey,
					SYSTEMS.filter((raw) => {
						const override = this.state.worldSystems[raw.id];
						const x = override?.x ?? raw.x,
							y = override?.y ?? raw.y;
						return (
							raw.id !== systemId &&
							Math.hypot(x - system.x, y - system.y) <= 135
						);
					}).map((raw) => raw.id),
				);
			for (const id of driveNeighbors.get(cacheKey))
				if (!neighbors.includes(id)) neighbors.push(id);
		}
		return neighbors;
	}
	chartableSystems(radius = 1) {
		const seen = new Set([this.state.systemId]),
			queue = [[this.state.systemId, 0]];
		for (let index = 0; index < queue.length; index++) {
			const [id, depth] = queue[index];
			if (depth >= Math.min(24, Math.max(0, Math.floor(radius)))) continue;
			for (const next of this.neighbors(id))
				if (!seen.has(next)) {
					seen.add(next);
					queue.push([next, depth + 1]);
				}
		}
		return [...seen];
	}
	chartSystems(radius = 1) {
		const fresh = this.chartableSystems(radius).filter(
			(id) => !this.isCharted(id),
		);
		this.state.chartedSystems = [
			...new Set([
				...(this.state.chartedSystems || []),
				...fresh,
				this.state.systemId,
			]),
		];
		return fresh;
	}
	isCharted(systemId) {
		return (
			(this.state.chartedSystems || []).includes(systemId) ||
			this.state.visited.includes(systemId)
		);
	}

	availableMinerals() {
		return (this.currentSystem().minables || [])
			.map((field) => {
				const outfit = byId(OUTFITS, field.mineralId);
				return outfit
					? {
							...outfit,
							mass: Number(outfit.sourceAttributes.mass) || 1,
							fieldCount: field.count,
						}
					: null;
			})
			.filter(Boolean);
	}
	mineralCargo() {
		return Object.entries(this.state.sourceInventory || {})
			.map(([name, quantity]) => {
				const outfit = MINERALS.get(name);
				return outfit && quantity > 0
					? {
							...outfit,
							quantity,
							totalMass: quantity * (Number(outfit.sourceAttributes.mass) || 1),
							sellPrice: Math.floor(outfit.price * 0.85),
						}
					: null;
			})
			.filter(Boolean);
	}
	describeMission(mission, active = null, arcId = null) {
		if (!mission) return null;
		const target = this.systemById(mission.destinationId);
		const requiredKills = mission.kills || 0;
		const targetPlanet = target?.planets.find(
			(planet) => planet.name === mission.destinationName,
		);
		const location =
			this.state.systemId === mission.destinationId &&
			(!targetPlanet || this.currentPlanet()?.name === targetPlanet.name);
		const ready =
			!!active &&
			location &&
			(!requiredKills || active.kills >= requiredKills) &&
			(!mission.scan || active.scanned) &&
			(!mission.board || active.boarded) &&
			(!mission.mine || active.mined >= mission.mine) &&
			(!mission.stealthSeconds ||
				active.stealthElapsed >= mission.stealthSeconds) &&
			(!mission.cloak ||
				(mission.cloak === "enter"
					? active.cloakedEntered
					: active.cloakedLanded)) &&
			(mission.visitPlanets || []).every((name) =>
				(active.visitedPlanets || []).includes(name),
			) &&
			(mission.scanSystems || []).every((id) =>
				(active.scannedSystems || []).includes(id),
			) &&
			this.escortObjectiveReady(active);
		const pendingScans = (mission.scanSystems || []).filter(
			(id) => !(active?.scannedSystems || []).includes(id),
		);
		const pendingVisits = (mission.visitPlanets || []).filter(
			(name) => !(active?.visitedPlanets || []).includes(name),
		);
		const visitSystems = pendingVisits
			.map(
				(name) =>
					SYSTEMS.find((system) =>
						this.systemById(system.id).planets.some(
							(planet) => planet.name === name,
						),
					)?.id,
			)
			.filter(Boolean);
		const escortStatus = this.escortStatus(active);
		const tasks = [
			...pendingVisits.map(
				(name, index) =>
					`Land on ${name} (${byId(SYSTEMS, visitSystems[index])?.name || "marked system"})`,
			),
			...(active && escortStatus.required
				? [this.escortObjective(active)]
				: []),
			...(mission.stealthSeconds
				? [
						`Remain cloaked near hostile ships: ${Math.floor(active?.stealthElapsed || 0)}/${mission.stealthSeconds}s`,
					]
				: []),
			...(mission.cloak
				? [
						`${mission.cloak === "enter" ? "Enter the system" : "Land"} while cloaked`,
					]
				: []),
			...pendingScans.map((id) => `Scan ${byId(SYSTEMS, id)?.name || id}`),
			`Land at ${mission.destinationName || target?.planet || target?.name || mission.destinationId}`,
		];
		if (mission.kills)
			tasks.push(
				`Defeat ${Math.min(active?.kills || 0, mission.kills)}/${mission.kills} hostile ships in ${target?.name}`,
			);
		if (mission.scan)
			tasks.push(
				active?.scanned ? "Survey complete" : `Scan in ${target?.name}`,
			);
		if (mission.board)
			tasks.push(
				active?.boarded ? "Boarding complete" : "Board a disabled ship",
			);
		if (mission.mine)
			tasks.push(
				`Extract ${Math.min(active?.mined || 0, mission.mine)}/${mission.mine} tons of ore`,
			);
		return {
			...mission,
			name: mission.name || mission.title,
			title: mission.title || mission.name,
			targetId: visitSystems[0] || pendingScans[0] || mission.destinationId,
			visitSystems,
			pendingVisits,
			arcId,
			accepted: !!active,
			ready,
			locked: !!mission.requireFlag && !this.state.flags[mission.requireFlag],
			lockedReason:
				mission.requireFlag && !this.state.flags[mission.requireFlag]
					? mission.lockedReason ||
						"Complete the preceding story milestone before accepting this assignment."
					: "",
			escortFailed: escortStatus.failed,
			escortStatus,
			objective: tasks.join(" · "),
			choices: mission.choices || [
				{
					id: "complete",
					label: "Complete mission",
					description: "Submit your report and collect payment.",
				},
			],
		};
	}
	availableStory() {
		const mission = this.describeMission(
			CAMPAIGN[this.state.storyIndex],
			this.state.activeStory,
		);
		if (
			mission &&
			this.state.storyIndex === 0 &&
			(this.state.sourceQuests?.active.some(
				(active) => active.id === "Intro [0]",
			) ||
				(this.state.sourceQuests?.dialogue?.missionId === "Intro [0]" &&
					this.state.sourceQuests.dialogue.phase === "offer"))
		)
			return {
				...mission,
				locked: true,
				lockedReason:
					"Complete James’s original passage in Contacts to advance this chapter.",
			};
		return mission;
	}
	advanceStory() {
		this.state.storyIndex++;
		while (
			CAMPAIGN[this.state.storyIndex] &&
			((CAMPAIGN[this.state.storyIndex].whenFlag &&
				!this.state.flags[CAMPAIGN[this.state.storyIndex].whenFlag]) ||
				(CAMPAIGN[this.state.storyIndex].unlessFlag &&
					this.state.flags[CAMPAIGN[this.state.storyIndex].unlessFlag]))
		)
			this.state.storyIndex++;
	}
	arcLock(arc) {
		const stage = arc.missions[this.state.arcs[arc.id] || 0];
		if (stage?.requireFlag && !this.state.flags[stage.requireFlag])
			return (
				stage.lockedReason ||
				"Complete the preceding story milestone before accepting this assignment."
			);
		if (arc.requiredFlag && !this.state.flags[arc.requiredFlag])
			return `Complete the preceding story to earn ${arc.requiredFlag.replaceAll("-", " ")}.`;
		const native = this.state.sourceQuests?.active.find((active) => {
			const mission = this.sourceEngine?.missions.get(active.id);
			return arc.missions.some(
				(stage) =>
					stage.sourceMissions?.includes(active.id) ||
					(!stage.sourceMissions?.length &&
						stage.sourceFile &&
						stage.sourceFile === mission?.sourceFile),
			);
		});
		return native
			? `Finish the original assignment “${native.id}” in Contacts before starting this adaptation.`
			: "";
	}

	availableArcs() {
		return ARCS.filter((arc) => !this.state.completedArcs.includes(arc.id)).map(
			(arc) => ({
				...this.describeMission(
					arc.missions[this.state.arcs[arc.id] || 0],
					this.state.activeArcs.find((a) => a.arcId === arc.id),
					arc.id,
				),
				arcName: arc.name,
				faction: arc.faction,
				locked: !!this.arcLock(arc),
				lockedReason: this.arcLock(arc),
				total: arc.missions.length,
				index: this.state.arcs[arc.id] || 0,
			}),
		);
	}
	spend(amount) {
		const payable = Math.min(this.state.credits, amount);
		this.state.credits -= payable;
		this.state.debt += amount - payable;
	}
	advanceDay(days = 1) {
		for (let day = 0; day < days; day++) {
			this.state.day++;
			this.settleBankDay();
		}
		const expired = this.state.jobs.filter(
			(job) => job.deadline < this.state.day,
		);
		for (const job of expired) {
			this.log(
				"Contract expired",
				`${job.name}: reserved cargo and passengers have been removed. Reputation -1.`,
			);
			const faction = job.faction || this.currentSystem().faction;
			this.state.reputation[faction] =
				(this.state.reputation[faction] || 0) - 1;
		}
		this.state.jobs = this.state.jobs.filter(
			(job) => job.deadline >= this.state.day,
		);
		this.notifySource({ type: "daily" });
	}
	earn(amount, operating = true) {
		this.state.credits += amount;
		this.state.earnings += amount;
		if (operating) this.recordIncome(amount);
	}
	activeMissions() {
		return [this.state.activeStory, ...this.state.activeArcs]
			.filter(Boolean)
			.map((active) => ({ active, definition: this.missionDefinition(active) }))
			.filter(({ definition }) => definition);
	}
	encounterFaction(mission) {
		if (mission?.enemyFaction) return mission.enemyFaction;
		const explicit = {
			"liberate-kornephoros": "Republic",
			"new-wales-talks": "Republic",
			"electron-theft": "Republic",
			"southern-fleet": "Republic",
			"secure-north": "Republic",
			"medical-convoy": "Republic",
			"alpha-raid": "Alpha",
			soylent: "Syndicate (Hostile)",
			"checkmate-offensive": "Republic",
			"checkmate-nuclear": "Republic",
			"checkmate-menkent": "Republic",
			"jump-drive": "Pug",
			"hai-4": "Hai (Unfettered)",
			"wanderers-3": "Kor Mereti",
			"wanderers-4": "Kor Sestor",
			"wanderers-5": "Kor Sestor",
			"wanderers-6": "Kor Sestor",
			"avgi-3": "Aberrant",
			"kestrel-1": "Test Dummy",
		};
		if (explicit[mission?.id]) return explicit[mission.id];
		if (mission?.id.startsWith("remnant-")) return "Korath";
		if (mission?.id.startsWith("kahet-")) return "Ka'het";
		return null;
	}
	setupEncounter(force = false) {
		const system = this.currentSystem();
		const required = this.activeMissions()
			.filter(({ definition }) => definition.destinationId === system.id)
			.reduce(
				(n, { active, definition }) =>
					Math.max(
						n,
						(definition.kills || 0) - active.kills,
						definition.board && !active.boarded ? 1 : 0,
						definition.stealthSeconds &&
							active.stealthElapsed < definition.stealthSeconds
							? definition.encounterCount || 4
							: 0,
					),
				0,
			);
		const bounty = this.state.jobs.some(
			(job) =>
				job.kind === "bounty" &&
				job.destinationId === system.id &&
				job.progress < job.kills,
		);
		const cleared = this.state.encountersCleared[system.id] === this.state.day;
		const ambient =
			!cleared &&
			system.danger > 0 &&
			(hash(system.id) + this.state.day) % 4 < system.danger
				? Math.min(3, system.danger)
				: 0;
		const count = Math.max(
			required,
			bounty ? 1 : 0,
			force ? Math.max(1, ambient) : ambient,
		);
		this.state.enemies = count;
		this.state.disabled = 0;
		this.state.wrecks = [];
		this.state.encounter = count
			? {
					faction:
						this.activeMissions()
							.filter(
								({ definition }) => definition.destinationId === system.id,
							)
							.map(({ definition }) => this.encounterFaction(definition))
							.find(Boolean) ||
						(system.faction === "Korath"
							? "Korath"
							: system.faction === "Pug"
								? "Pug"
								: "Pirate"),
					initial: count,
					systemId: system.id,
					boss: required >= 4,
				}
			: null;
		if (this.state.encounter) {
			const faction = this.state.encounter.faction,
				base = faction.replace(/\s*\([^)]*\)/g, "");
			const hulls = UNIVERSE_FLEET_HULLS[faction] ||
				UNIVERSE_FLEET_HULLS[base] ||
				UNIVERSE_FLEET_HULLS.Pirate || ["sparrow", "hawk", "falcon"];
			this.state.encounter.shipIds = [
				hulls[0],
				hulls[Math.floor(hulls.length / 2)],
				hulls[Math.max(0, hulls.length - 2)],
			].filter(Boolean);
		}
		this.state.combatSerial++;
		this.state.flightSerial++;
		return count;
	}
	acceptMission(mission, arcId = null) {
		if (!mission)
			return this.fail("There are no further assignments in this story.");
		if (this.state.mode !== "port")
			return this.fail("Land before accepting a mission.");
		if (mission.requireFlag && !this.state.flags[mission.requireFlag])
			return this.fail(
				mission.lockedReason ||
					"Complete the preceding story milestone before accepting this assignment.",
			);
		if ((mission.cargo || 0) > this.stats().freeCargo)
			return this.fail(
				`This mission needs ${mission.cargo} tons of free cargo space.`,
			);
		if ((mission.passengers || 0) > this.stats().freeBunks)
			return this.fail(
				`This mission needs ${mission.passengers} free passenger bunks.`,
			);
		const convoyCheck = this.campaignConvoyAcceptance(mission);
		if (!convoyCheck.ok) return this.fail(convoyCheck.message);
		if (
			mission.cloak &&
			!this.hasOutfit("cloak") &&
			byId(OUTFITS, mission.offerOutfit)?.tag !== "cloak"
		)
			return this.fail(
				"This operation requires a ship with an active cloaking system.",
			);
		if (
			mission.requireTag &&
			!this.hasOutfit(mission.requireTag) &&
			byId(OUTFITS, mission.offerOutfit)?.tag !== mission.requireTag
		)
			return this.fail(
				`Install a ${mission.requireTag.replaceAll("-", " ")} before accepting this mission.`,
			);
		applyStoryWorld(this, mission, "accept");
		if (mission.offerShip) this.awardShip(mission.offerShip);
		if (mission.worldOnAccept)
			applySourceEffects(this, {
				ok: true,
				effects: mission.worldOnAccept.map((node) => ({ type: "world", node })),
			});
		if (
			mission.offerOutfit &&
			!this.state.outfits.includes(mission.offerOutfit)
		)
			this.state.outfits.push(mission.offerOutfit);
		if (mission.moveSystem) {
			this.state.worldRevision = (this.state.worldRevision || 0) + 1;
			const moving = mission.moveSystem;
			if (byId(SYSTEMS, moving.systemId))
				this.state.worldSystems[moving.systemId] = {
					...(this.state.worldSystems[moving.systemId] || {}),
					x: moving.x,
					y: moving.y,
				};
		}
		if (mission.revealPlanet)
			this.revealPlanet(
				mission.revealPlanet.systemId,
				mission.revealPlanet.planetName,
			);
		const active = {
			id: mission.id,
			arcId,
			kills: 0,
			scanned: false,
			scannedSystems: [],
			visitedPlanets: [],
			stealthElapsed: 0,
			cloakedEntered: false,
			cloakedLanded: false,
			boarded: false,
			mined: 0,
			startDay: this.state.day,
		};
		if (arcId) this.state.activeArcs.push(active);
		else this.state.activeStory = active;
		this.syncCampaignActors();
		this.log(mission.name, mission.description);
		return this.success(
			`${mission.name} accepted. ${this.describeMission(mission, active).objective}`,
		);
	}
	finishMission(mission, active, choice, arcId = null) {
		if (this.state.mode !== "port")
			return this.fail("Land at the destination to complete this mission.");
		const view = this.describeMission(mission, active);
		if (!view.ready) return this.fail(view.objective);
		const selected = (mission.choices || []).find(
			(option) => option.id === choice,
		);
		if (mission.choices?.length && !selected)
			return this.fail("Choose how to resolve this mission.");
		const reward = mission.reward + (selected?.bonus || 0);
		this.earn(reward);
		this.state.reputation[mission.faction || "Free Worlds"] =
			(this.state.reputation[mission.faction || "Free Worlds"] || 0) + 3;
		if (selected?.flag) this.state.flags[selected.flag] = true;
		for (const flag of selected?.flags || []) this.state.flags[flag] = true;
		if (mission.flag) this.state.flags[mission.flag] = true;
		if (
			mission.grantOutfit &&
			!this.state.outfits.includes(mission.grantOutfit)
		)
			this.state.outfits.push(mission.grantOutfit);
		applyStoryWorld(this, mission, "complete");
		if (mission.worldOnComplete)
			applySourceEffects(this, {
				ok: true,
				effects: mission.worldOnComplete.map((node) => ({
					type: "world",
					node,
				})),
			});
		if (mission.removeOutfit) {
			const index = this.state.outfits.indexOf(mission.removeOutfit);
			if (index >= 0) this.state.outfits.splice(index, 1);
		}
		if (mission.updatePlanet) {
			this.state.worldRevision = (this.state.worldRevision || 0) + 1;
			const update = mission.updatePlanet;
			this.state.worldPlanets[update.name] ||= {};
			const current = PLANETS.find((planet) => planet.name === update.name);
			for (const key of ["shipyard", "outfitter"])
				if (update[key])
					this.state.worldPlanets[update.name][key] = [
						...new Set([
							...(this.state.worldPlanets[update.name][key] ||
								current?.[key] ||
								[]),
							...update[key],
						]),
					];
		}
		if (mission.grantShip) this.awardShip(mission.grantShip);
		if (mission.revokeLoan) this.revokeShipLoan(mission.revokeLoan);
		this.log(
			mission.name,
			`${selected?.outcome || mission.outcome || "Assignment complete."} Payment: ${reward.toLocaleString()} credits.`,
		);
		if (arcId) {
			this.state.activeArcs = this.state.activeArcs.filter(
				(a) => a.arcId !== arcId,
			);
			this.state.arcs[arcId] = (this.state.arcs[arcId] || 0) + 1;
			const arc = byId(ARCS, arcId);
			while (
				arc.missions[this.state.arcs[arcId]] &&
				((arc.missions[this.state.arcs[arcId]].whenFlag &&
					!this.state.flags[arc.missions[this.state.arcs[arcId]].whenFlag]) ||
					(arc.missions[this.state.arcs[arcId]].unlessFlag &&
						this.state.flags[arc.missions[this.state.arcs[arcId]].unlessFlag]))
			)
				this.state.arcs[arcId]++;
			if (this.state.arcs[arcId] >= arc.missions.length) {
				this.state.completedArcs.push(arcId);
				this.state.flags[`arc:${arcId}`] = true;
			}
		} else {
			this.state.activeStory = null;
			this.advanceStory();
			if (this.state.storyIndex >= CAMPAIGN.length) {
				this.state.mode = "ending";
				this.state.endingSeen = true;
			}
		}
		return this.success(
			`${selected?.outcome || mission.outcome || "Assignment complete."} +${reward.toLocaleString()} credits.`,
			{ completed: true, ending: this.state.mode === "ending" },
		);
	}
	act(action, payload = {}) {
		try {
			if (action === "retryEscort") return this.retryEscort(payload);
			if (action.startsWith("source"))
				return this.sourceAction(action, payload || {});
			const result = this.perform(action, payload || {});
			if (result.ok && this.sourceEngine) {
				if (action === "jump") this.notifySource({ type: "enter" });
				if (action === "land") this.notifySource({ type: "land" });
				if (["jump", "launch"].includes(action)) this.setupSourceEncounter();
			}
			if (
				result.ok &&
				[
					"jump",
					"launch",
					"land",
					"story",
					"acceptArc",
					"completeArc",
					"rescue",
					"selectPlanet",
				].includes(action)
			)
				this.syncCampaignActors();
			return result;
		} catch (error) {
			return this.fail(`Unable to complete that action: ${error.message}`);
		}
	}
	perform(action, payload) {
		const state = this.state;
		if (action === "continueSandbox") action = "continue";
		const portActions = [
			"buyoutEscort",
			"deployShip",
			"parkEscort",
			"sellParked",
			"sellMineral",
			"buyAmmo",
			"hireCrew",
			"dismissCrew",
			"buy",
			"sell",
			"buyShip",
			"buyOutfit",
			"sellOutfit",
			"payDebt",
			"hireEscort",
			"dismissEscort",
			"repair",
			"refuel",
			"acceptJob",
			"abandonJob",
			"storeShip",
			"switchShip",
		];
		if (state.mode === "destroyed" && !["rescue", "newGame"].includes(action))
			return this.fail(
				"Your ship is disabled. Use the rescue service to return to port.",
			);
		if (portActions.includes(action) && state.mode !== "port")
			return this.fail("Land at a spaceport first.");
		if (action === "borrow") return this.borrow(Number(payload.amount));
		const storageResult = this.storageAction(action, payload.outfitId);
		if (storageResult) return storageResult;
		const fleetResult = this.fleetAction(action, payload);
		if (fleetResult) return fleetResult;
		const equipmentResult = this.equipmentAction(action, payload);
		if (equipmentResult) return equipmentResult;
		if (action === "newGame") {
			this.newGame(payload.shipId);
			return this.success("A new captain takes flight.");
		}
		if (action === "selectPlanet") {
			const planet = this.systemById(state.systemId).planets.find(
				(planet) =>
					planet.name === payload.planetName || planet.id === payload.planetId,
			);
			if (!planet) return this.fail("Choose a planet in the current system.");
			if (state.mode !== "flight")
				return this.fail("Launch before approaching another planet.");
			state.planetName = planet.name;
			state.landingReady = false;
			return this.success(
				`Destination: ${planet.name}. ${planet.inhabited ? "Spaceport available." : "Uninhabited; surface exploration available."}`,
			);
		}
		if (action === "launch") {
			if (state.mode !== "port") return this.fail("You are already in space.");
			if (state.hull <= 0)
				return this.fail("Repair your hull before launching.");
			state.mode = "flight";
			state.landingReady = false;
			const count = this.setupEncounter();
			return this.success(
				`Departing ${this.currentSystem().planet}. ${count ? `${count} hostile contact${count > 1 ? "s" : ""}.` : "The flight corridor is clear."}`,
				{ enemies: count },
			);
		}
		if (action === "landReady") {
			state.landingReady = !!payload.ready;
			return this.success("Approach updated.");
		}
		if (action === "land") {
			if (state.mode !== "flight")
				return this.fail("You must be in flight to land.");
			if (!this.currentPlanet())
				return this.fail(
					"There is no landable planet here. Jump onward or call for rescue.",
				);
			const requirements = this.currentPlanet()
				.attributes.filter((attribute) => attribute.startsWith("requires:"))
				.map((attribute) => attribute.slice(9).trim());
			for (const requirement of requirements) {
				if (requirement === "gaslining" && !this.stats().gaslining)
					return this.fail(
						"This atmosphere requires a gaslining vessel, such as a Puffin or another gas-capable ship.",
					);
				if (requirement === "starlining" && !this.stats().starlining)
					return this.fail(
						"This stellar environment requires starlining protection.",
					);
				if (requirement === "quantum keystone" && !this.hasOutfit("keystone"))
					return this.fail(
						"A Quantum Keystone is required to enter this wormhole.",
					);
				if (
					!["gaslining", "starlining", "quantum keystone"].includes(
						requirement,
					) &&
					this.capability(requirement) <= 0
				)
					return this.fail(
						`This landing site requires ${requirement}. Follow the local contact story to obtain permission or a compatible vessel.`,
					);
			}
			if (!this.campaignLandingReady())
				return this.fail(
					"Wait near the dock until every protected convoy vessel has safely arrived.",
				);
			if (!state.landingReady && !payload.approach)
				return this.fail("Approach the planet or engage landing autopilot.");
			if (state.cloaked)
				for (const { active, definition } of this.activeMissions())
					if (definition.destinationId === state.systemId)
						active.cloakedLanded = true;
			state.cloaked = false;
			for (const { active, definition } of this.activeMissions())
				if (
					definition.visitPlanets?.includes(this.currentPlanet()?.name) &&
					!(active.visitedPlanets || []).includes(this.currentPlanet().name)
				) {
					active.visitedPlanets ||= [];
					active.visitedPlanets.push(this.currentPlanet().name);
				}
			state.mode = "port";
			state.enemies = 0;
			state.disabled = 0;
			state.wrecks = [];
			state.encounter = null;
			const inhabited = this.currentSystem().inhabited;
			const fuelCost = inhabited
				? Math.ceil((this.stats().maxFuel - state.fuel) * 16)
				: 0;
			const repairCost = inhabited
				? Math.ceil((this.stats().maxHull - state.hull) * 20)
				: 0;
			this.spend(fuelCost + repairCost);
			if (inhabited) {
				state.fuel = this.stats().maxFuel;
				state.hull = this.stats().maxHull;
			}
			state.shield = this.stats().maxShield;
			state.energy = this.stats().maxEnergy;
			state.heat = 0;
			state.overheated = false;
			this.trackJobVisit("land");
			const delivered = this.settleJobs();
			return this.success(
				`Landed on ${this.currentSystem().planet}.${inhabited ? ` Fuel ${fuelCost} · repairs ${repairCost} credits.` : " No spaceport services."}${delivered.length ? ` ${delivered.length} contract${delivered.length > 1 ? "s" : ""} paid.` : ""}`,
				{ delivered: delivered.length },
			);
		}
		if (action === "jump") {
			if (this.campaignDepartureReady && !this.campaignDepartureReady())
				return this.fail(
					"A protected convoy ship is disabled. Approach it and use Assist before jumping.",
				);
			if (state.mode !== "flight")
				return this.fail("Launch before entering hyperspace.");
			const target = this.systemById(payload.systemId);
			if (!target) return this.fail("Unknown destination.");
			if (!this.neighbors().includes(target.id)) {
				const gate = this.currentSystem().wormholes?.find(
					(wormhole) => wormhole.to === target.id && wormhole.requiresTag,
				);
				if (gate)
					return this.fail(
						"This wormhole requires a Quantum Keystone, sold by Hai outfitters.",
					);
				return this.fail(
					"This system is outside your drive range. Follow a hyperlane, or install a Jump Drive.",
				);
			}
			const wormhole = (this.currentSystem().wormholes || []).find(
				(wormhole) => wormhole.to === target.id,
			);
			const direct =
				this.currentSystem().links.includes(target.id) &&
				(!wormhole ||
					(this.currentSystem().planets.some(
						(planet) => planet.name === wormhole.name,
					) &&
						(!wormhole.requiresTag || this.hasOutfit(wormhole.requiresTag))));
			const portal =
				direct &&
				wormhole &&
				this.currentSystem().planets.some(
					(planet) => planet.name === wormhole.name,
				);
			const cost = portal ? 0 : direct ? 1 : 2;
			if (state.fuel < cost)
				return this.fail(
					`Insufficient fuel. This jump needs ${cost} units. Land, scoop fuel, or call rescue.`,
				);
			state.fuel -= cost;
			state.systemId = target.id;
			state.totalJumps++;
			state.landingReady = false;
			const storyTarget = this.activeMissions().find(
				({ definition }) => definition.destinationId === target.id,
			)?.definition.destinationName;
			state.planetName =
				target.planets.find((planet) => planet.name === storyTarget)?.name ||
				target.planets.find((planet) => planet.inhabited)?.name ||
				target.planets[0]?.name ||
				null;
			if (!state.visited.includes(target.id)) state.visited.push(target.id);
			this.chartSystems(1);
			this.advanceDay();
			state.shield = Math.min(
				this.stats().maxShield,
				state.shield +
					(state.cloaked ? 0 : Math.floor(this.stats().maxShield * 0.35)),
			);
			const count = this.setupEncounter();
			if (state.cloaked)
				for (const { active, definition } of this.activeMissions())
					if (definition.destinationId === state.systemId)
						active.cloakedEntered = true;
			return this.success(
				`Arrived in ${target.name}. ${target.faction} space.${count ? ` ${count} hostile contacts.` : ""}`,
				{ jumped: true, enemies: count },
			);
		}
		if (action === "acceptJob") {
			const job = this.availableJobs().find(
				(item) => item.id === payload.jobId,
			);
			if (!job) return this.fail("This contract is no longer available.");
			if (state.jobs.length >= 8)
				return this.fail(
					"Your operations desk can track eight contracts at once.",
				);
			if (job.cargo > this.stats().freeCargo)
				return this.fail(`You need ${job.cargo} free cargo tons.`);
			if (job.passengers > this.stats().freeBunks)
				return this.fail(`You need ${job.passengers} free bunks.`);
			state.jobs.push(clone(job));
			return this.success(
				`${job.name} accepted. ${this.jobObjective(job)}. Due day ${job.deadline}.`,
			);
		}
		if (action === "abandonJob") {
			const job = state.jobs.find((job) => job.id === payload.jobId);
			if (!job) return this.fail("That contract is not active.");
			state.jobs = state.jobs.filter((job) => job.id !== payload.jobId);
			this.spend(250);
			return this.success(
				"Contract cancelled. A 250 credit handling fee was charged.",
			);
		}
		if (action === "buy" || action === "sell") {
			if (!this.currentSystem().inhabited)
				return this.fail("There is no commodity market on this planet.");
			const commodity = byId(COMMODITIES, payload.commodityId);
			const quantity = int(payload.quantity);
			if (!commodity || !positive(quantity))
				return this.fail(
					"Choose a commodity and a positive whole number of tons.",
				);
			if (action === "buy") {
				const cost = this.price(commodity.id) * quantity;
				if (quantity > this.stats().freeCargo)
					return this.fail("Your cargo hold does not have enough space.");
				if (state.credits < cost)
					return this.fail("You do not have enough credits.");
				state.credits -= cost;
				this.recordIncome(-cost);
				state.cargo[commodity.id] = (state.cargo[commodity.id] || 0) + quantity;
				return this.success(
					`Purchased ${quantity} tons of ${commodity.name} for ${cost.toLocaleString()} credits.`,
				);
			}
			if ((state.cargo[commodity.id] || 0) < quantity)
				return this.fail("You do not carry that much of this commodity.");
			const income = this.sellPrice(commodity.id) * quantity;
			state.cargo[commodity.id] -= quantity;
			if (!state.cargo[commodity.id]) delete state.cargo[commodity.id];
			this.earn(income);
			return this.success(
				`Sold ${quantity} tons of ${commodity.name} for ${income.toLocaleString()} credits.`,
			);
		}
		if (action === "buyShip") {
			if (state.flagshipLoanId && !payload.keepCurrent)
				return this.fail(
					"Your current prototype still carries loaned systems. Complete its return mission, or purchase the new hull while keeping this one.",
				);
			const ship = byId(SHIPS, payload.shipId);
			if (!ship) return this.fail("Unknown ship.");
			if (!this.availableShips().some((item) => item.id === ship.id))
				return this.fail("This ship is not sold at the current shipyard.");
			if (ship.id === state.shipId)
				return this.fail("You already command this model.");
			if (ship.requiredFlag && !state.flags[ship.requiredFlag])
				return this.fail(
					"This shipyard requires a faction license. Complete its side story.",
				);
			if (
				this.cargoUsed() > ship.cargoCapacity ||
				this.passengersUsed() > ship.passengerCapacity
			)
				return this.fail(
					"Deliver your cargo or passengers before switching to this smaller ship.",
				);
			const tradeIn = Math.floor(byId(SHIPS, state.shipId).price * 0.72);
			const navigation = payload.keepCurrent
				? []
				: state.outfits.filter(
						(id) =>
							["jump-drive", "keystone", "cloak"].includes(
								byId(OUTFITS, id)?.tag,
							) || Number(byId(OUTFITS, id)?.sourceAttributes.starlining) > 0,
					);
			if (
				navigation.reduce(
					(sum, id) => sum + (byId(OUTFITS, id)?.space || 0),
					0,
				) > ship.outfitCapacity
			)
				return this.fail(
					"This hull cannot carry your retained navigation equipment. Choose a roomier ship or keep your current vessel.",
				);
			const outfitRefund = state.outfits
				.filter((id) => !navigation.includes(id))
				.reduce(
					(n, id) => n + Math.floor((byId(OUTFITS, id)?.price || 0) * 0.75),
					0,
				);
			const price = payload.keepCurrent
				? ship.price
				: ship.price - tradeIn - outfitRefund;
			if (state.credits < price)
				return this.fail(
					`You need ${price.toLocaleString()} credits after trade-in.`,
				);
			state.credits -= price;
			if (payload.keepCurrent) state.fleet.push(this.flagshipRecord());
			state.flagshipId = this.nextShipId();
			state.flagshipLoanId = null;
			state.outfits = navigation;
			state.extraCrew = 0;
			state.shipCapabilities = {};
			state.shipId = ship.id;
			state.flagshipName = ship.name;
			this.resetAmmunition();
			state.hull = ship.maxHull;
			state.shield = ship.maxShield;
			state.fuel = ship.maxFuel;
			this.log(
				"New command",
				`${ship.name} acquired. ${payload.keepCurrent ? "Your previous ship and its equipment are in the hangar." : "Your previous ship was traded in; navigation equipment was retained and other outfits refunded."}`,
			);
			return this.success(
				`Welcome aboard your ${ship.name}. ${price < 0 ? `Received ${(-price).toLocaleString()} credits after trade-in.` : `Paid ${price.toLocaleString()} credits${payload.keepCurrent ? "; previous ship retained" : " after trade-in"}.`}`,
			);
		}
		if (action === "buyOutfit") {
			const outfit = byId(OUTFITS, payload.outfitId);
			if (!outfit) return this.fail("Unknown outfit.");
			if (Number(outfit.sourceAttributes.map) > 0) {
				if (!this.availableOutfits().some((item) => item.id === outfit.id))
					return this.fail("These charts are not sold here.");
				const fresh = this.chartableSystems(outfit.sourceAttributes.map).filter(
					(id) => !this.isCharted(id),
				);
				if (!fresh.length)
					return this.fail(
						"You already have every chart available in this local map.",
					);
				if (state.credits < outfit.price)
					return this.fail("You do not have enough credits.");
				state.credits -= outfit.price;
				this.chartSystems(outfit.sourceAttributes.map);
				return this.success(
					`Downloaded detailed charts for ${fresh.length} systems. The map is consumed rather than installed.`,
					{ charted: fresh },
				);
			}
			if (isAmmunition(outfit))
				return this.equipmentAction("buyAmmo", {
					ammoId: outfit.id,
					quantity: payload.quantity || 1,
				});
			if (!this.availableOutfits().some((item) => item.id === outfit.id))
				return this.fail("This outfit is not sold by the current outfitter.");
			if (outfit.requiredFlag && !state.flags[outfit.requiredFlag])
				return this.fail(
					"Complete the associated faction story to unlock this outfit.",
				);
			if (state.outfits.includes(outfit.id) && !outfit.stackable)
				return this.fail("This outfit is already installed.");
			if (this.stats().outfitUsed + outfit.space > this.stats().outfitCapacity)
				return this.fail(
					"Insufficient outfit space. Upgrade your ship or remove an outfit.",
				);
			if (
				this.stats().freeCargo + (outfit.effects?.cargoCapacity || 0) < 0 ||
				this.stats().freeBunks + (outfit.effects?.passengerCapacity || 0) < 0
			)
				return this.fail(
					"Unload cargo or passengers before converting this space.",
				);
			if (state.credits < outfit.price)
				return this.fail("You do not have enough credits.");
			state.credits -= outfit.price;
			state.outfits.push(outfit.id);
			state.hull = Math.min(
				this.stats().maxHull,
				state.hull + (outfit.effects?.maxHull || 0),
			);
			state.shield = Math.min(
				this.stats().maxShield,
				state.shield + (outfit.effects?.maxShield || 0),
			);
			return this.success(`${outfit.name} installed.`);
		}
		if (action === "sellOutfit") {
			const outfit = byId(OUTFITS, payload.outfitId),
				index = state.outfits.indexOf(payload.outfitId);
			if (!outfit || index < 0)
				return this.fail("That outfit is not installed.");
			const error = this.outfitRemovalError(outfit);
			if (error) return this.fail(error);
			state.outfits.splice(index, 1);
			this.earn(Math.floor(outfit.price * 0.7), false);
			state.hull = Math.min(state.hull, this.stats().maxHull);
			state.shield = Math.min(state.shield, this.stats().maxShield);
			state.fuel = Math.min(state.fuel, this.stats().maxFuel);
			return this.success(
				`${outfit.name} sold for ${Math.floor(outfit.price * 0.7).toLocaleString()} credits.`,
			);
		}
		if (action === "payDebt") {
			const amount = int(payload.amount);
			if (!positive(amount)) return this.fail("Enter a positive payment.");
			const payment = Math.min(amount, state.debt);
			if (!payment) return this.fail("Your loan is already paid off.");
			if (payment > state.credits)
				return this.fail("You do not have enough credits.");
			state.credits -= payment;
			state.debt -= payment;
			return this.success(
				`Paid ${payment.toLocaleString()} credits. Debt remaining: ${state.debt.toLocaleString()}.`,
			);
		}
		if (action === "repair") {
			if (!this.currentSystem().inhabited)
				return this.fail("There is no repair yard on this planet.");
			const cost = Math.ceil((this.stats().maxHull - state.hull) * 20);
			if (!cost) return this.fail("Your hull is fully repaired.");
			this.spend(cost);
			state.hull = this.stats().maxHull;
			state.shield = this.stats().maxShield;
			state.energy = this.stats().maxEnergy;
			state.heat = 0;
			state.overheated = false;
			return this.success(
				`Ship restored. ${cost.toLocaleString()} credits; unpaid costs were added to your loan.`,
			);
		}
		if (action === "refuel") {
			if (!this.currentSystem().inhabited)
				return this.fail("There is no fuel service on this planet.");
			const cost = Math.ceil((this.stats().maxFuel - state.fuel) * 16);
			if (!cost) return this.fail("Your fuel tanks are full.");
			this.spend(cost);
			state.fuel = this.stats().maxFuel;
			return this.success(`Refueled for ${cost} credits.`);
		}
		if (action === "hireEscort") {
			if (state.escorts.length >= 6)
				return this.fail("Your fleet is at its six-escort command limit.");
			const cost = 14000 + state.escorts.length * 2000;
			if (state.credits < cost)
				return this.fail(
					`Hiring another escort costs ${cost.toLocaleString()} credits.`,
				);
			state.credits -= cost;
			let number = 1;
			while (
				state.escorts.some((escort) => escort.name === `Sparrow ${number}`)
			)
				number++;
			const escort = {
				id: `escort-${this.nextShipId()}`,
				name: `Sparrow ${number}`,
				shipId: "sparrow",
				contract: true,
				bond: 5000,
				hull: 100,
				maxHull: 100,
				command: "protect",
			};
			state.escorts.push(escort);
			return this.success(
				`${escort.name} joined your fleet. Wages: 90 credits per day.`,
			);
		}
		if (action === "dismissEscort") {
			const index = state.escorts.findIndex(
				(escort) => escort.id === payload.escortId,
			);
			if (index < 0) return this.fail("Select an active escort.");
			if (state.escorts[index].temporary)
				return this.fail(
					"This vessel belongs to an active source mission. Complete or abandon its contract first.",
				);
			if (!state.escorts[index].contract)
				return this.fail(
					"This is an owned ship. Park it in your hangar to sell it at its proper value.",
				);
			const [escort] = state.escorts.splice(index, 1);
			this.earn(escort.bond || 5000, false);
			return this.success(
				`${escort.name} released. 5,000 credit bond returned.`,
			);
		}
		if (action === "fleetCommand") {
			if (!["protect", "attack", "hold"].includes(payload.command))
				return this.fail("Choose Protect, Attack, or Hold.");
			if (
				payload.escortId &&
				!state.escorts.some((escort) => escort.id === payload.escortId)
			)
				return this.fail("Select an active escort.");
			state.escorts
				.filter((escort) => !payload.escortId || escort.id === payload.escortId)
				.forEach((escort) => {
					escort.command = payload.command;
				});
			return this.success(`Fleet command: ${payload.command}.`);
		}
		if (action === "escortDamage") {
			const escort = state.escorts.find(
				(escort) => escort.id === payload.escortId,
			);
			if (state.mode !== "flight" || !escort || !positive(payload.amount))
				return this.fail("No escort damage applied.");
			escort.hull = Math.max(0, escort.hull - Number(payload.amount));
			if (!escort.hull) {
				if (escort.temporary) {
					state.sourceEscortHealth ??= {};
					state.sourceEscortHealth[escort.id] = 0;
					this.notifySource({
						type: "destroy",
						missionId: escort.missionId,
						npcId: escort.npcId,
					});
				}
				state.escorts = state.escorts.filter((item) => item.id !== escort.id);
				this.log(
					"Escort lost",
					`${escort.name} was destroyed in ${this.currentSystem().name}.`,
				);
			}
			return this.success(
				escort.hull
					? `${escort.name} is taking fire.`
					: `${escort.name} has been lost.`,
				{ destroyed: !escort.hull },
			);
		}
		if (action === "story") {
			const mission = CAMPAIGN[state.storyIndex];
			if (!mission)
				return this.fail(
					"The Free Worlds story is complete. The rest of the galaxy remains open.",
				);
			if (this.availableStory()?.locked)
				return this.fail(this.availableStory().lockedReason);
			if (!state.activeStory) return this.acceptMission(mission);
			return this.finishMission(
				mission,
				state.activeStory,
				payload.choice || "complete",
			);
		}
		if (action === "acceptArc") {
			const arc = byId(ARCS, payload.arcId);
			if (!arc || state.completedArcs.includes(arc.id))
				return this.fail("This story is complete or unavailable.");
			if (this.arcLock(arc)) return this.fail(this.arcLock(arc));
			if (state.activeArcs.some((active) => active.arcId === arc.id))
				return this.fail("This assignment is already active.");
			if (state.activeArcs.length >= 3)
				return this.fail(
					"Complete an active side assignment before accepting another.",
				);
			return this.acceptMission(arc.missions[state.arcs[arc.id] || 0], arc.id);
		}
		if (action === "completeArc") {
			const active = state.activeArcs.find(
				(active) => active.arcId === payload.arcId,
			);
			if (!active) return this.fail("Accept this assignment first.");
			return this.finishMission(
				this.missionDefinition(active),
				active,
				payload.choice || "complete",
				payload.arcId,
			);
		}
		if (action === "kill") {
			if (state.mode !== "flight" || !state.enemies)
				return this.fail("No hostile contact to defeat.");
			if (
				payload.wreck?.id &&
				state.wrecks.some((wreck) => wreck.id === payload.wreck.id)
			)
				return this.fail("That vessel has already been disabled.");
			state.enemies--;
			state.kills++;
			const wreck = {
				id: payload.wreck?.id || `wreck-${state.day}-${state.kills}`,
				shipId: byId(SHIPS, payload.wreck?.shipId)
					? payload.wreck.shipId
					: "sparrow",
				systemId: state.systemId,
				x: Number.isFinite(payload.wreck?.x) ? payload.wreck.x : 5,
				z: Number.isFinite(payload.wreck?.z) ? payload.wreck.z : 6,
			};
			state.wrecks.push(wreck);
			state.disabled = state.wrecks.length;
			if (!state.enemies) {
				const operation = this.activeMissions().find(
					({ active, definition }) =>
						definition.destinationId === state.systemId &&
						definition.stealthSeconds &&
						(active.stealthElapsed || 0) < definition.stealthSeconds,
				);
				if (operation) {
					state.enemies = operation.definition.encounterCount || 4;
					state.combatSerial++;
					this.log(
						"Hostile reinforcements",
						"More ships are entering the battle. Complete the cloaked evasion objective before withdrawing.",
					);
				}
				state.battles++;
				state.encountersCleared[state.systemId] = state.day;
			}
			const bounty = 700 + this.currentSystem().danger * 250;
			this.earn(bounty);
			for (const { active, definition } of this.activeMissions())
				if (definition.destinationId === state.systemId) active.kills++;
			for (const job of state.jobs)
				if (job.kind === "bounty" && job.destinationId === state.systemId)
					job.progress++;
			return this.success(
				`Hostile disabled. +${bounty} credits. ${state.enemies} contacts remain.`,
				{ disabled: true, wreck },
			);
		}
		if (action === "damage") {
			if (state.mode !== "flight" || !positive(payload.amount))
				return this.fail("No damage applied.");
			if (state.cloaked) {
				state.cloaked = false;
				state.cloakCooldown = 4;
			}
			let damage = Number(payload.amount);
			damage *= Math.max(
				0.4,
				1 - (this.stats().evasion || 0) - (this.stats().armor || 0),
			);
			const shieldDamage = Math.min(state.shield, damage);
			state.shield -= shieldDamage;
			damage -= shieldDamage;
			state.hull = Math.max(0, state.hull - damage);
			if (state.hull <= 0) {
				state.mode = "destroyed";
				this.log(
					"Mayday",
					"Your vessel is disabled. A rescue tug can recover your ship and captain.",
				);
			}
			return this.success(
				state.mode === "destroyed"
					? "Ship disabled. Activate rescue."
					: "Shields taking fire.",
				{ destroyed: state.mode === "destroyed" },
			);
		}
		if (action === "regenerate") {
			if (state.mode !== "flight" || !positive(payload.seconds))
				return this.fail("No regeneration applied.");
			state.shield = Math.min(
				this.stats().maxShield,
				state.shield +
					(state.cloaked
						? 0
						: Math.min(Number(payload.seconds), 1) *
							(this.stats().shieldRegen || 1.2)),
			);
			state.secondaryCooldown = Math.max(
				0,
				state.secondaryCooldown - Math.min(Number(payload.seconds), 1),
			);
			if (this.stats().fuelGeneration)
				state.fuel = Math.min(
					this.stats().maxFuel,
					state.fuel +
						Math.min(Number(payload.seconds), 1) *
							this.stats().fuelGeneration *
							0.01,
				);
			state.miningCooldown = Math.max(
				0,
				state.miningCooldown - Math.min(Number(payload.seconds), 1),
			);
			if (this.stats().hullRepair && !state.cloaked)
				state.hull = Math.min(
					this.stats().maxHull,
					state.hull +
						Math.min(Number(payload.seconds), 1) * this.stats().hullRepair,
				);
			const elapsed = Math.min(Number(payload.seconds), 1);
			state.energy = Math.min(
				this.stats().maxEnergy,
				state.energy + elapsed * this.stats().energyRegen,
			);
			state.heat = Math.max(0, state.heat - elapsed * this.stats().cooling);
			if (state.heat <= this.stats().maxHeat * 0.4) state.overheated = false;
			state.cloakCooldown = Math.max(0, state.cloakCooldown - elapsed);
			if (state.cloaked) {
				const stats = this.stats();
				state.energy = Math.max(
					0,
					state.energy - stats.cloakEnergyCost * elapsed,
				);
				state.fuel = Math.max(0, state.fuel - stats.cloakFuelCost * elapsed);
				if (!stats.cloakAvailable || state.energy <= 0 || state.fuel <= 0) {
					state.cloaked = false;
					state.cloakCooldown = 4;
					this.log(
						"Cloak offline",
						"Insufficient energy or fuel. The cloaking field has collapsed.",
					);
				}
			}
			for (const { active, definition } of this.activeMissions())
				if (
					definition.stealthSeconds &&
					active.stealthElapsed < definition.stealthSeconds
				) {
					active.stealthElapsed =
						definition.destinationId === state.systemId &&
						state.cloaked &&
						state.enemies > 0
							? Math.min(
									definition.stealthSeconds,
									(active.stealthElapsed || 0) + elapsed,
								)
							: 0;
					if (active.stealthElapsed >= definition.stealthSeconds) {
						state.enemies = 0;
						state.encounter = null;
						state.combatSerial++;
						state.encountersCleared[state.systemId] = state.day;
						this.log(
							"The Oathkeepers arrive",
							"Your cloak has held long enough. The allied fleet contains the nuclear-armed ships and clears your withdrawal corridor.",
						);
					}
				}
			return this.success("Ship systems updated.");
		}
		if (action === "fire") {
			if (state.cloaked) return this.fail("Decloak before firing weapons.");
			if (state.mode !== "flight")
				return this.fail("Weapons are safe while landed.");
			const stats = this.stats();
			if (state.overheated)
				return this.fail("Weapons are overheated. Allow them to cool.");
			if (state.energy < stats.energyCost)
				return this.fail(
					"Insufficient weapon energy. Install a power outfit or wait for recharge.",
				);
			state.energy = Math.max(0, state.energy - stats.energyCost);
			state.heat = Math.min(stats.maxHeat * 1.2, state.heat + stats.shotHeat);
			if (state.heat >= stats.maxHeat) state.overheated = true;
			return this.success("Weapons fired.");
		}
		if (action === "pickup") {
			if (state.mode !== "flight" || !positive(payload.credits))
				return this.fail("No salvage available.");
			const credits = Math.min(2000, int(payload.credits));
			this.earn(credits);
			return this.success(`Recovered ${credits} credits of salvage.`);
		}
		if (action === "scan") {
			if (state.mode !== "flight") return this.fail("Launch before scanning.");
			this.trackJobVisit("scan");
			for (const { active, definition } of this.activeMissions()) {
				if (definition.destinationId === state.systemId) active.scanned = true;
				if (
					definition.scanSystems?.includes(state.systemId) &&
					!(active.scannedSystems || []).includes(state.systemId)
				) {
					active.scannedSystems ||= [];
					active.scannedSystems.push(state.systemId);
				}
			}
			this.chartSystems(this.capability("tactical scan power") > 0 ? 2 : 1);
			state.flags[`scanned:${state.systemId}`] = true;
			return this.success(
				`Survey of ${this.currentSystem().name} complete. ${this.currentSystem().description}`,
			);
		}
		if (action === "selectMineral") {
			if (!payload.mineralId || payload.mineralId === "metal") {
				state.mineralFocus = null;
				return this.success("Mining focus: common metals.");
			}
			const mineral = this.availableMinerals().find(
				(item) => item.id === payload.mineralId,
			);
			if (!mineral)
				return this.fail(
					"This mineral does not occur in the current asteroid field.",
				);
			state.mineralFocus = mineral.id;
			return this.success(`Mining focus: ${mineral.name}.`);
		}
		if (action === "sellMineral") {
			const mineral = this.mineralCargo().find(
					(item) => item.id === payload.mineralId,
				),
				quantity = Math.floor(Number(payload.quantity));
			if (!this.currentSystem().inhabited)
				return this.fail("There is no mineral buyer on this planet.");
			if (
				!mineral ||
				!Number.isFinite(quantity) ||
				quantity < 1 ||
				quantity > mineral.quantity
			)
				return this.fail("Choose a valid quantity of a mineral you carry.");
			state.sourceInventory[mineral.name] -= quantity;
			const proceeds = quantity * mineral.sellPrice;
			this.earn(proceeds);
			return this.success(
				`Sold ${quantity} × ${mineral.name} for ${proceeds.toLocaleString()} credits.`,
			);
		}
		if (action === "mine") {
			if (state.mode !== "flight")
				return this.fail("Launch to reach the asteroid field.");
			if (state.enemies)
				return this.fail(
					"Clear hostile contacts before operating mining equipment.",
				);
			if (this.stats().freeCargo < 1)
				return this.fail("Your hold is full. Sell ore or complete a delivery.");
			if (state.miningCooldown > 0)
				return this.fail(
					"The mining beam is cooling. Wait two seconds before the next extraction.",
				);
			let field = state.resourceReserves[state.systemId];
			if (!field || state.day - field.day >= 7)
				field = state.resourceReserves[state.systemId] = {
					day: state.day,
					remaining: 16 + (hash(state.systemId) % 20),
				};
			if (!field.remaining)
				return this.fail(
					"This asteroid field is exhausted. New material drifts in after seven days.",
				);
			const focused = this.availableMinerals().find(
				(mineral) => mineral.id === (payload.mineralId || state.mineralFocus),
			);
			if (focused) {
				if (!this.hasOutfit("mining"))
					return this.fail(
						"A Mining Laser is required to extract intact mineral samples.",
					);
				if (this.stats().freeCargo < focused.mass)
					return this.fail(
						`${focused.name} requires ${focused.mass} tons of free cargo space.`,
					);
				field.remaining--;
				state.miningCooldown = 2;
				state.sourceInventory[focused.name] =
					(state.sourceInventory[focused.name] || 0) + 1;
				state.mined += focused.mass;
				for (const { active, definition } of this.activeMissions())
					if (definition.destinationId === state.systemId)
						active.mined += focused.mass;
				return this.success(
					`Extracted ${focused.name} (${focused.mass} tons). Native contracts can use this mineral, or sell it at a spaceport.`,
				);
			}
			const amount = Math.floor(
				Math.min(
					this.stats().freeCargo,
					field.remaining,
					this.hasOutfit("mining") ? 4 : 1,
				),
			);
			field.remaining -= amount;
			state.miningCooldown = 2;
			state.cargo.metal = (state.cargo.metal || 0) + amount;
			state.mined += amount;
			for (const { active, definition } of this.activeMissions())
				if (definition.destinationId === state.systemId) active.mined += amount;
			return this.success(
				`Extracted ${amount} tons of Metal.${this.hasOutfit("mining") ? "" : " A Mining Laser increases your extraction rate."}`,
			);
		}
		if (action === "board") {
			if (state.mode !== "flight" || !state.wrecks.length)
				return this.fail("Disable a hostile ship before boarding.");
			if (state.enemies)
				return this.fail("Clear hostile contacts before boarding.");
			const index = payload.wreckId
				? state.wrecks.findIndex((wreck) => wreck.id === payload.wreckId)
				: 0;
			if (index < 0) return this.fail("This wreck is no longer available.");
			const wreck = state.wrecks[index],
				ship = byId(SHIPS, wreck.shipId) || byId(SHIPS, "sparrow");
			if (
				payload.choice === "capture" &&
				this.capturePower() < this.captureRequirement(ship.id)
			)
				return this.fail(
					`Your boarding strength is ${Math.floor(this.capturePower())}; the ${ship.name} requires ${Math.ceil(this.captureRequirement(ship.id))}. Hire crew or install boarding weapons.`,
				);
			if (payload.choice === "capture" && state.credits < 3000)
				return this.fail("You need 3,000 credits to hire a prize crew.");
			state.wrecks.splice(index, 1);
			state.disabled = state.wrecks.length;
			state.boarded++;
			for (const { active, definition } of this.activeMissions())
				if (definition.destinationId === state.systemId) active.boarded = true;
			if (payload.choice === "capture") {
				state.credits -= 3000;
				const captured = {
					id: this.nextShipId(),
					name: `Captured ${ship.name}`,
					shipId: ship.id,
					hull: Math.max(1, Math.round(ship.maxHull * 0.25)),
					maxHull: ship.maxHull,
					damage: ship.damage,
					speed: ship.speed,
					command: "protect",
				};
				const parked = state.escorts.length >= 6;
				(parked ? state.fleet : state.escorts).push(captured);
				return this.success(
					`${ship.name} captured for 3,000 credits. ${parked ? "The prize crew will take it to your hangar." : "A prize crew has joined your fleet."}`,
					{ wreckId: wreck.id },
				);
			}
			const reward = 2400 + this.currentSystem().danger * 600;
			this.earn(reward);
			return this.success(
				`Boarding secured the flight recorder and salvage worth ${reward.toLocaleString()} credits.`,
				{ wreckId: wreck.id },
			);
		}
		if (action === "scoop") {
			if (state.mode !== "flight")
				return this.fail("Launch to collect stellar fuel.");
			if (state.enemies)
				return this.fail("Clear hostile contacts before harvesting fuel.");
			if (state.fuel >= this.stats().maxFuel)
				return this.fail("Your tanks are full.");
			const equipped = this.hasOutfit("ramscoop");
			state.fuel = Math.min(
				this.stats().maxFuel,
				state.fuel + (equipped ? 2 : 1),
			);
			this.advanceDay(equipped ? 1 : 2);
			return this.success(
				equipped
					? "Ramscoop collected two fuel units in one day."
					: "Emergency stellar collection yielded one fuel unit over two days. A Ramscoop is much faster.",
			);
		}
		if (action === "hail") {
			if (state.mode !== "flight")
				return this.fail("Launch to open a ship-to-ship channel.");
			const faction = FACTIONS.find(
				(f) => f.name === this.currentSystem().faction,
			);
			return this.success(
				faction?.greeting ||
					"Independent vessel, your transponder is clear. Safe travels, captain.",
			);
		}
		if (action === "rescue") {
			if (!["flight", "destroyed"].includes(state.mode))
				return this.fail("You are already safe in port.");
			const cost = 3500 + Math.floor(byId(SHIPS, state.shipId).price * 0.025);
			this.spend(cost);
			state.rescues++;
			if (!this.currentPlanet()?.inhabited) {
				const spaceport = (systemId) =>
					this.systemById(systemId)?.planets.find((planet) => planet.inhabited);
				let haven = spaceport(state.systemId) && state.systemId;
				// Breadth-first order reaches the fewest-jumps spaceport first.
				const queue = [state.systemId],
					seen = new Set(queue);
				for (let i = 0; i < queue.length && !haven; i++)
					for (const next of this.neighbors(queue[i])) {
						if (seen.has(next)) continue;
						if (spaceport(next)) {
							haven = next;
							break;
						}
						seen.add(next);
						queue.push(next);
					}
				haven ||= "rutilicus";
				if (haven !== state.systemId) {
					state.systemId = haven;
					if (!state.visited.includes(haven)) state.visited.push(haven);
					this.chartSystems(1);
				}
				state.planetName = spaceport(haven)?.name ?? state.planetName;
			}
			state.cloaked = false;
			state.mode = "port";
			state.enemies = 0;
			state.disabled = 0;
			state.wrecks = [];
			state.encounter = null;
			state.hull = this.stats().maxHull;
			state.shield = this.stats().maxShield;
			state.energy = this.stats().maxEnergy;
			state.heat = 0;
			state.overheated = false;
			state.fuel = this.stats().maxFuel;
			this.advanceDay(2);
			this.log(
				"Rescue complete",
				`Recovered at ${this.currentSystem().planet}. ${cost.toLocaleString()} credits charged; unpaid charges added to the loan.`,
			);
			return this.success(
				`Ship recovered and repaired. Rescue charge: ${cost.toLocaleString()} credits.`,
			);
		}
		if (action === "continue") {
			if (state.mode !== "ending") return this.fail("Your voyage continues.");
			state.mode = "port";
			return this.success(
				"The war is over. Your story is still being written.",
			);
		}
		return this.fail(`Unknown action: ${action}`);
	}
}

sourceMethods(Game);

equipmentMethods(Game);

fleetMethods(Game);

campaignMethods(Game);

Object.assign(Game.prototype, freelanceMethods);

Object.assign(Game.prototype, bankMethods, storageMethods);
