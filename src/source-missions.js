/** GPL-3.0-or-later. Native source quest interpretation; see docs/content.md. */
import {
	EXTRA_DATA,
	MISSION_DATA,
	PLANET_DATA,
	SYSTEM_DATA,
} from "./source-data.js";

const node = (nodes, key, second) =>
	nodes.find(
		(n) =>
			n.tokens[0] === key && (second === undefined || n.tokens[1] === second),
	);
const nodesOf = (nodes, key) => nodes.filter((n) => n.tokens[0] === key);
const ENDPOINTS = [
	"accept",
	"decline",
	"defer",
	"die",
	"launch",
	"flee",
	"depart",
];
// Offer endpoints as in Endless Sky: launch also accepts, depart defers and flee declines.
export const offerDecision = (terminal) =>
	terminal === "accept" || terminal === "launch"
		? "accept"
		: terminal === "defer" || terminal === "depart"
			? "defer"
			: "decline";
const hash = (text) =>
	[...String(text)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);
const comparisons = {
	"==": (a, b) => a === b,
	"!=": (a, b) => a !== b,
	"<": (a, b) => a < b,
	"<=": (a, b) => a <= b,
	">": (a, b) => a > b,
	">=": (a, b) => a >= b,
};
// Condition assignments; ">?=" and "<?=" keep the larger or smaller value.
const ASSIGN = {
	"=": (_old, v) => v,
	"+=": (old, v) => old + v,
	"-=": (old, v) => old - v,
	"*=": (old, v) => old * v,
	"/=": (old, v) => (v ? Math.trunc(old / v) : 0),
	">?=": (old, v) => Math.max(old, v),
	"<?=": (old, v) => Math.min(old, v),
	"++": (old) => old + 1,
	"--": (old) => old - 1,
};
const operators = {
	"+": [1, (a, b) => a + b],
	"-": [1, (a, b) => a - b],
	"*": [2, (a, b) => a * b],
	"/": [2, (a, b) => (b ? Math.trunc(a / b) : 0)],
	"%": [2, (a, b) => (b ? a % b : 0)],
};
/** Small arithmetic parser; source expressions are never evaluated as JavaScript. */
export function evaluateExpression(tokens, lookup = () => 0) {
	let i = 0;
	function expression(min = 0) {
		let t = tokens[i++],
			value;
		if (t === "(") {
			value = expression();
			if (tokens[i++] !== ")") throw Error("Unbalanced source expression");
		} else if (t === "-") value = -expression(3);
		else
			value = Number.isFinite(Number(t)) ? Number(t) : Number(lookup(t) || 0);
		while (i < tokens.length && operators[tokens[i]]?.[0] >= min) {
			const [precedence, apply] = operators[tokens[i++]];
			value = apply(value, expression(precedence + 1));
		}
		return value;
	}
	if (!tokens.length) return 0;
	const value = expression();
	if (i !== tokens.length)
		throw Error(`Unsupported source expression: ${tokens.join(" ")}`);
	return value;
}
export function evaluateConditions(nodes, lookup = () => 0, mode = "and") {
	const test = (n) => {
		const [key, ...rest] = n.tokens;
		if (key === "and" || key === "or")
			return evaluateConditions(n.children, lookup, key);
		if (key === "never") return false;
		if (key === "has") return Number(lookup(rest[0]) || 0) !== 0;
		if (key === "not") return Number(lookup(rest[0]) || 0) === 0;
		const index = n.tokens.findIndex((t) => comparisons[t]);
		if (index >= 0)
			return comparisons[n.tokens[index]](
				evaluateExpression(n.tokens.slice(0, index), lookup),
				evaluateExpression(n.tokens.slice(index + 1), lookup),
			);
		return evaluateExpression(n.tokens, lookup) !== 0;
	};
	return mode === "or" ? nodes.some(test) : nodes.every(test);
}

export class SourceMissionEngine {
	constructor({
		missions = MISSION_DATA,
		systems = SYSTEM_DATA,
		planets = PLANET_DATA,
		events = EXTRA_DATA.event,
		conversations = EXTRA_DATA.conversation,
	} = {}) {
		this.missions = new Map(missions.map((m) => [m.name, m]));
		this.systems = new Map(systems.map((s) => [s.name, s]));
		this.planets = new Map(planets.map((p) => [p.name, p]));
		this.events = new Map(events.map((e) => [e.name, e]));
		this.conversations = new Map(conversations.map((c) => [c.name, c]));
		this.planetSystems = new Map();
		this.distanceCache = new Map();
		this.worldCache = new Map();
		for (const s of systems)
			for (const p of s.objects || []) this.planetSystems.set(p, s.name);
	}
	bind(state, context = {}) {
		state.sourceQuests ??= {
			version: 1,
			conditions: {
				"start: default": 1,
				"start: vanilla": 1,
				"human space start": 1,
				"species: human": 1,
				"license: Pilot's": 1,
			},
			active: [],
			history: [],
			events: [],
			world: {},
			dialogue: null,
		};
		this.root = state;
		if (this.store !== state.sourceQuests) this.resetWorldCaches();
		this.store = state.sourceQuests;
		this.context = {
			day: state.day || 1,
			credits: state.credits || 0,
			cargoFree: Infinity,
			bunksFree: Infinity,
			outfits: {},
			shipAttributes: {},
			reputation: {},
			conditions: {},
			...context,
		};
		this.context.reputation = { ...this.context.reputation };
		this.context.outfits = { ...this.context.outfits };
		if (!this.store.calendarInitialized) {
			for (const event of this.events.values()) {
				const date = node(event.nodes, "date")?.tokens.slice(1).map(Number);
				if (date?.length === 3)
					this.store.events.push({
						name: event.name,
						due:
							1 +
							Math.round(
								(Date.UTC(date[2], date[1] - 1, date[0]) -
									Date.UTC(3013, 10, 16)) /
									86400000,
							),
					});
			}
			this.store.calendarInitialized = true;
		}
		this.effects = [];
	}
	run(state, context, fn) {
		this.bind(state, context);
		const before = structuredClone(this.store);
		try {
			const result = fn() || {};
			return { ok: true, effects: this.effects, ...result };
		} catch (error) {
			state.sourceQuests = before;
			return { ok: false, message: error.message, effects: [] };
		}
	}
	value(key) {
		const c = this.context,
			s = this.store;
		if (Object.hasOwn(s.conditions, key)) return s.conditions[key];
		if (Object.hasOwn(c.conditions, key)) return c.conditions[key];
		if (key === "credits") return c.credits;
		if (key === "random")
			return hash(`${c.day}:${c.planetName}:${this.currentId || ""}`) % 100;
		if (key === "combat rating") return c.combatRating || 0;
		if (key === "cargo space") return c.cargoFree;
		if (key === "bunks" || key === "passenger space") return c.bunksFree;
		if (key === "day") return c.day;
		if (key === "days since start") return c.day - 1;
		const date = new Date(Date.UTC(3013, 10, 15 + c.day));
		if (key === "year") return date.getUTCFullYear();
		if (key === "month") return date.getUTCMonth() + 1;
		if (key === "days until year end")
			return Math.floor(
				(Date.UTC(date.getUTCFullYear() + 1, 0, 1) - date) / 86400000,
			);
		if (key === "days since year start")
			return Math.floor(
				(date - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000,
			);
		if (key.startsWith("reputation: ")) return c.reputation[key.slice(12)] || 0;
		if (key.startsWith("outfit (installed): "))
			return c.outfits[key.slice(20)] || 0;
		if (key.startsWith("outfit (flagship installed): "))
			return c.outfits[key.slice(29)] || 0;
		if (key.startsWith("flagship attribute: "))
			return c.shipAttributes[key.slice(20)] || 0;
		if (key.startsWith("outfit: ")) return c.outfits[key.slice(8)] || 0;
		if (key.startsWith("ship attribute: "))
			return c.shipAttributes[key.slice(16)] || 0;
		if (key.startsWith("flagship planet: "))
			return Number(c.planetName === key.slice(17));
		if (key.startsWith("flagship system: "))
			return Number(c.systemName === key.slice(17));
		if (key.startsWith("flagship planet attribute: "))
			return Number(
				this.planets.get(c.planetName)?.attributes.includes(key.slice(27)),
			);
		return 0;
	}
	conditions(nodes) {
		return evaluateConditions(nodes, (key) => this.value(key));
	}
	/** Call whenever world patches or the base system tables change. */
	resetWorldCaches() {
		this.distanceCache.clear();
		this.worldCache.clear();
	}
	// Patched views are shared, read-only snapshots until the world changes.
	worldValue(type, name) {
		const key = `${type}:${name}`;
		if (!this.worldCache.has(key))
			this.worldCache.set(key, this.patchedWorldValue(type, name));
		return this.worldCache.get(key);
	}
	patchedWorldValue(type, name) {
		const original = (type === "system" ? this.systems : this.planets).get(
			name,
		);
		if (!original) return undefined;
		const result = {
			...original,
			links: [...(original.links || [])],
			attributes: [...(original.attributes || [])],
		};
		for (const patch of Object.values(this.store.world)) {
			if (patch.tokens[0] === type && patch.tokens[1] === name)
				for (const child of patch.children) {
					const [key, value] = child.tokens;
					if (key === "government") result.government = value;
					if (key === "attributes") result.attributes = child.tokens.slice(1);
					if (key === "link" && !result.links.includes(value))
						result.links.push(value);
					if (key === "remove" && value === "link")
						result.links = result.links.filter(
							(link) => link !== child.tokens[2],
						);
				}
			if (
				type === "system" &&
				["link", "unlink"].includes(patch.tokens[0]) &&
				patch.tokens.slice(1).includes(name)
			) {
				const other = patch.tokens.slice(1).find((value) => value !== name);
				if (patch.tokens[0] === "link" && !result.links.includes(other))
					result.links.push(other);
				if (patch.tokens[0] === "unlink")
					result.links = result.links.filter((link) => link !== other);
			}
		}
		return result;
	}
	distance(from, to) {
		if (from === to) return 0;
		if (!this.distanceCache.has(from)) {
			const distances = new Map([[from, 0]]),
				queue = [from];
			for (let i = 0; i < queue.length; i++)
				for (const link of this.worldValue("system", queue[i])?.links || [])
					if (!distances.has(link)) {
						distances.set(link, distances.get(queue[i]) + 1);
						queue.push(link);
					}
			this.distanceCache.set(from, distances);
		}
		return this.distanceCache.get(from).get(to) ?? Infinity;
	}
	matches(filters, planetName, origin = this.context.systemName) {
		const planet = this.worldValue("planet", planetName),
			system = this.worldValue("system", this.planetSystems.get(planetName));
		if (!planet || !system) return false;
		const match = (n) => {
			const [type, ...args] = n.tokens;
			const extra = n.children.flatMap((c) => c.tokens);
			const names = [...args, ...extra];
			if (type === "not")
				return !this.matches(
					n.children.length ? n.children : [{ tokens: args, children: [] }],
					planetName,
					origin,
				);
			if (type === "planet") return names.includes(planetName);
			if (type === "system") return names.includes(system.name);
			if (type === "government")
				return names.includes(planet.government || system.government);
			if (type === "attributes")
				return names.some((a) =>
					[...(planet.attributes || []), ...(system.attributes || [])].includes(
						a,
					),
				);
			if (type === "near" || type === "distance") {
				const target = type === "near" ? args[0] : origin;
				const limits = type === "near" ? args.slice(1) : args;
				const min = limits.length > 1 ? Number(limits[0]) : 0,
					max = Number(limits.at(-1) || 1);
				const d = this.distance(target, system.name);
				return d >= min && d <= max;
			}
			if (type === "neighbor")
				return (system.links || []).some((name) =>
					(this.systems.get(name)?.objects || []).some((p) =>
						this.matches(
							n.children.length ? n.children : [{ tokens: args, children: [] }],
							p,
							origin,
						),
					),
				);
			if (type === "outfits")
				return names.some((name) => (this.context.outfits[name] || 0) > 0);
			return false;
		};
		return filters.every(match);
	}
	mission(id) {
		const mission = this.missions.get(id);
		if (!mission) throw Error("Unknown source mission.");
		this.currentId = id;
		return mission;
	}
	sourceMatches(m) {
		const source = node(m.nodes, "source");
		return (
			!source ||
			(source.tokens[1]
				? source.tokens[1] === this.context.planetName
				: this.matches(source.children, this.context.planetName))
		);
	}
	canOffer(m, location) {
		this.currentId = m.name;
		if (this.store.active.some((a) => a.id === m.name)) return false;
		const repeat = node(m.nodes, "repeat"),
			offered = this.value(`${m.name}: offered`);
		if (!repeat && offered) return false;
		if (repeat?.tokens[1] && offered >= Number(repeat.tokens[1])) return false;
		const locations = [
			"job",
			"landing",
			"boarding",
			"assisting",
			"entering",
			"shipyard",
			"outfitter",
			"transition",
		];
		const native = locations.find((l) => node(m.nodes, l)) || "spaceport";
		if (location !== native) return false;
		const failure = node(m.nodes, "to", "fail");
		return (
			this.sourceMatches(m) &&
			this.conditions(node(m.nodes, "to", "offer")?.children || []) &&
			(!failure || !this.conditions(failure.children))
		);
	}
	choosePlanet(n, origin, exclude = []) {
		if (!n) return this.context.planetName;
		if (n.tokens[1])
			return n.tokens[1] === "<origin>" ? this.context.planetName : n.tokens[1];
		const candidates = [...this.planets.values()].filter(
			(p) => p.spaceport && this.matches(n.children, p.name, origin),
		);
		candidates.sort(
			(a, b) =>
				this.distance(origin, this.planetSystems.get(a.name)) -
					this.distance(origin, this.planetSystems.get(b.name)) ||
				a.name.localeCompare(b.name),
		);
		// Several stops from one filter visit different places when enough match.
		return (candidates.find((p) => !exclude.includes(p.name)) || candidates[0])
			?.name;
	}
	/** "cargo random": a commodity traded at both ends, chosen deterministically. */
	randomCommodity(id, from, to) {
		const origin = Object.keys(this.systems.get(from)?.trade || {});
		const destination = this.systems.get(to)?.trade || {};
		const shared = origin.filter((name) => Object.hasOwn(destination, name));
		const options = shared.length ? shared : origin;
		if (!options.length) return "general cargo";
		const name =
			options[hash(`${id}:${this.context.day}:${from}`) % options.length];
		return name.toLowerCase();
	}
	/** Endless Sky's greedy jump estimate through every waypoint and stopover. */
	tourJumps(from, stops, destinationSystem) {
		const pending = stops.filter(Boolean);
		let jumps = 0;
		while (pending.length) {
			let best = 0;
			for (let i = 1; i < pending.length; i++)
				if (
					this.distance(from, pending[i]) < this.distance(from, pending[best])
				)
					best = i;
			const days = this.distance(from, pending[best]);
			// An unreachable stop counts as -1, as in the original engine.
			jumps += Number.isFinite(days) ? days : -1;
			[from] = pending.splice(best, 1);
		}
		const last = this.distance(from, destinationSystem);
		return jumps + (Number.isFinite(last) ? last : -1);
	}
	instantiate(m) {
		const c = this.context,
			destination = this.choosePlanet(
				node(m.nodes, "destination"),
				c.systemName,
			),
			destinationSystem = this.planetSystems.get(destination);
		if (!destination || !destinationSystem)
			throw Error("Source destination is not currently available.");
		const quantity = (n, offset = 1) =>
			Math.max(0, Math.trunc(Number(n?.tokens[offset] || 0)));
		const cargo = node(m.nodes, "cargo"),
			passengers = node(m.nodes, "passengers");
		const waypoints = [];
		const systems = [...this.systems.values()];
		for (const n of nodesOf(m.nodes, "waypoint")) {
			const fits = (s) =>
				(s.objects || []).some((p) => this.matches(n.children, p));
			// Several waypoints from one filter visit different systems when enough match.
			const system =
				n.tokens[1] ||
				(
					systems.find((s) => !waypoints.includes(s.name) && fits(s)) ||
					systems.find(fits)
				)?.name;
			if (system) waypoints.push(system);
		}
		const stopovers = [];
		for (const n of nodesOf(m.nodes, "stopover")) {
			const planet = this.choosePlanet(n, c.systemName, stopovers);
			if (planet) stopovers.push(planet);
		}
		const jumps = this.tourJumps(
			c.systemName,
			[
				...waypoints,
				...stopovers.map((planet) => this.planetSystems.get(planet)),
			],
			destinationSystem,
		);
		const deadlineNodes = nodesOf(m.nodes, "deadline");
		const deadline = deadlineNodes.length
			? c.day +
				deadlineNodes.reduce(
					(sum, n) =>
						sum +
						Number(n.tokens[1] || 0) +
						(n.tokens.length === 1 ? 2 : Number(n.tokens[2] || 0)) * jumps,
					0,
				)
			: null;
		const active = {
			id: m.name,
			origin: c.planetName,
			originSystem: c.systemName,
			destination,
			destinationSystem,
			jumps,
			cargo: quantity(cargo, 2),
			cargoName:
				cargo?.tokens[1] === "random"
					? this.randomCommodity(m.name, c.systemName, destinationSystem)
					: cargo?.tokens[1] || "",
			passengers: quantity(passengers),
			waypoints,
			stopovers,
			visitedSystems: [],
			visitedPlanets: [],
			deadline,
			acceptedDay: c.day,
			objectives: [],
			npcShips: {},
			npcEvents: {},
			unsupported: [],
			substitutions: {},
		};
		for (const replacement of node(m.nodes, "substitutions")?.children || []) {
			if (!replacement.children.length || this.conditions(replacement.children))
				active.substitutions[replacement.tokens[0].replace(/^<|>$/g, "")] =
					replacement.tokens.slice(1).join(" ");
		}
		for (const [index, n] of nodesOf(m.nodes, "npc").entries()) {
			const shipNodes = nodesOf(n.children, "ship"),
				fleetNodes = nodesOf(n.children, "fleet");
			const count = Math.max(
				1,
				shipNodes.length +
					fleetNodes.reduce(
						(a, f) => a + Math.max(1, Number(f.tokens[2]) || 1),
						0,
					),
			);
			active.npcShips[`npc-${index}`] = count;
			const systemNode = node(n.children, "system");
			const systemName =
				systemNode?.tokens[1] === "destination"
					? destinationSystem
					: systemNode?.tokens[1] && systemNode.tokens[1] !== "source"
						? systemNode.tokens[1]
						: systemNode?.children.length
							? [...this.systems.values()].find((system) =>
									(system.objects || []).some((planet) =>
										this.matches(systemNode.children, planet),
									),
								)?.name || c.systemName
							: c.systemName;
			const mobile = n.tokens.includes("accompany");
			const spawn = node(n.children, "to", "spawn");
			const enabled = !spawn || this.conditions(spawn.children);
			for (const type of n.tokens.slice(1)) {
				if (
					[
						"kill",
						"disable",
						"board",
						"assist",
						"scan cargo",
						"scan outfits",
						"capture",
						"provoke",
						"save",
						"accompany",
						"evade",
					].includes(type)
				)
					active.objectives.push({
						id: `npc-${index}:${type}`,
						npcId: `npc-${index}`,
						type,
						systemName: type === "accompany" ? destinationSystem : systemName,
						mobile,
						government: node(n.children, "government")?.tokens[1],
						shipModels: shipNodes.map((ship) => ship.tokens[1]),
						fleetNames: fleetNodes.map((fleet) => fleet.tokens[1]),
						count,
						progress: 0,
						actors: [],
						enabled,
						spawnConditions: spawn?.children || [],
						despawnConditions:
							node(n.children, "to", "despawn")?.children || [],
						shipNames: shipNodes.map((s) => s.tokens[2] || s.tokens[1]),
					});
			}
		}
		for (const key of ["timer", "stealth", "infiltrating", "transition"])
			if (node(m.nodes, key)) active.unsupported.push(key);
		return active;
	}
	substitutions(active) {
		return {
			...active.substitutions,
			planet: active.destination,
			system: active.destinationSystem,
			destination: `${active.destination} in ${active.destinationSystem}`,
			origin: active.origin,
			waypoints: active.waypoints.join(", "),
			stopovers: active.stopovers.join(", "),
			"planet stopovers": active.stopovers.join(", "),
			cargo: `${active.cargo} tons of ${active.cargoName}`,
			commodity: active.cargoName,
			tons: `${active.cargo} tons`,
			bunks: String(active.passengers),
			passengers: active.passengers === 1 ? "passenger" : "passengers",
			fare:
				active.passengers === 1
					? "a passenger"
					: `${active.passengers} passengers`,
			day: `day ${active.deadline}`,
			date: `day ${active.deadline}`,
			first: "Captain",
			last: "",
			ship: this.context.shipName || "your ship",
			model: this.context.shipName || "your ship",
			// Mission text usually reads "the <npc>".
			npc: active.objectives[0]?.shipNames[0] || "marked vessel",
			"current planet": this.context.planetName,
			"current system": this.context.systemName,
		};
	}
	text(text, active) {
		const source = String(text || "");
		if (!active || !source.includes("<")) return source;
		const vars = this.substitutions(active);
		return source.replace(/<([^>]+)>/g, (match, key) =>
			// The payment estimate is only computed for text that announces it.
			key === "payment" && !Object.hasOwn(vars, key)
				? this.paymentText(active)
				: (vars[key] ?? match),
		);
	}
	descriptor(m, a) {
		const pending = [
			...a.waypoints
				.filter((s) => !a.visitedSystems.includes(s))
				.map((s) => `Visit ${s}`),
			...a.stopovers
				.filter((p) => !a.visitedPlanets.includes(p))
				.map((p) => `Land at ${p}`),
			...a.objectives
				.filter((o) => o.enabled && o.type !== "save" && o.progress < o.count)
				.map((o) => `${o.type} ${o.progress}/${o.count} in ${o.systemName}`),
		];
		return {
			...a,
			name: this.text(m.displayName || m.name, a),
			description: this.text(m.description, a),
			sourceFile: m.sourceFile,
			sourceLine: m.sourceLine,
			objective: [
				...pending,
				`Land at ${a.destination} (${a.destinationSystem})`,
			].join(" · "),
			ready: this.ready(m, a),
			invisible: !!node(m.nodes, "invisible"),
			accepted: this.store.active.includes(a),
			location:
				[
					"job",
					"landing",
					"boarding",
					"assisting",
					"entering",
					"shipyard",
					"outfitter",
					"transition",
				].find((location) => node(m.nodes, location)) || "spaceport",
		};
	}
	available(state, context, location = "spaceport") {
		this.bind(state, context);
		const result = [];
		for (const m of this.missions.values())
			if (
				!m.sourceFile?.includes("/_deprecated/") &&
				this.canOffer(m, location)
			) {
				try {
					const a = this.instantiate(m);
					result.push(this.descriptor(m, a));
				} catch {}
			}
		return result;
	}
	active(state, context) {
		this.bind(state, context);
		return this.store.active.map((a) => this.descriptor(this.mission(a.id), a));
	}
	capacities(a) {
		if (a.cargo > this.context.cargoFree)
			throw Error(
				`This source mission requires ${a.cargo} tons of free cargo space.`,
			);
		if (a.passengers > this.context.bunksFree)
			throw Error(`This source mission requires ${a.passengers} free bunks.`);
	}
	requirements(actions) {
		for (const n of actions)
			if (
				n.tokens[0] === "require" ||
				(n.tokens[0] === "outfit" && Number(n.tokens[2]) < 0)
			) {
				const required = Math.abs(Number(n.tokens[2] || 1));
				if ((this.context.outfits[n.tokens[1]] || 0) < required)
					throw Error(`Required source outfit: ${required} × ${n.tokens[1]}.`);
			}
	}
	paymentAmount(n, active) {
		const [key, base, multiplier] = n.tokens;
		// Saves from earlier releases lack the tour estimate.
		const distance = active
			? (active.jumps ??
				this.distance(active.originSystem, active.destinationSystem))
			: 0;
		const payload = active ? active.cargo + 10 * active.passengers : 0;
		return (
			Number(base || 0) +
			(Number.isFinite(distance) ? distance + 1 : 1) *
				payload *
				(n.tokens.length === 1 && key === "payment"
					? 150
					: Number(multiplier || 0))
		);
	}
	/** The completion payment that "<payment>" announces, as Endless Sky displays it. */
	paymentText(active) {
		const m = this.missions.get(active.id);
		const apparent = Number(
			node(m?.nodes || [], "apparent payment")?.tokens[1],
		);
		const amount = Number.isFinite(apparent)
			? apparent
			: nodesOf(m?.nodes || [], "on")
					.filter((n) => n.tokens[1] === "complete")
					.flatMap((n) => nodesOf(n.children, "payment"))
					.reduce((sum, n) => sum + this.paymentAmount(n, active), 0);
		const credits = Math.abs(amount);
		return `${credits.toLocaleString("en-US")} ${credits === 1 ? "credit" : "credits"}`;
	}
	actions(nodes, active) {
		this.requirements(nodes);
		for (const n of nodes) {
			const [key, a, b] = n.tokens;
			if (key === "set" || key === "clear") {
				this.store.conditions[a] = Number(key === "set");
				continue;
			}
			if (Object.hasOwn(ASSIGN, a)) {
				const old = this.value(key),
					v = evaluateExpression(n.tokens.slice(2), (k) => this.value(k));
				this.store.conditions[key] = ASSIGN[a](old, v);
				if (key.startsWith("reputation: ")) {
					this.context.reputation[key.slice(12)] = this.store.conditions[key];
					this.effects.push({
						type: "reputation",
						faction: key.slice(12),
						value: this.store.conditions[key],
					});
					delete this.store.conditions[key];
				}
				continue;
			}
			if (key === "payment" || key === "fine" || key === "debt") {
				const amount = this.paymentAmount(n, active);
				if (key === "payment" && amount < 0 && this.context.credits < -amount)
					throw Error(`This source action requires ${-amount} credits.`);
				if (key === "payment") this.context.credits += amount;
				this.effects.push({ type: key, amount });
				continue;
			}
			if (key === "outfit") {
				const count = Number(b ?? 1);
				if ((this.context.outfits[a] || 0) + count < 0)
					throw Error(`Required source outfit: ${-count} × ${a}.`);
				this.context.outfits[a] = (this.context.outfits[a] || 0) + count;
				this.effects.push({ type: "outfit", name: a, count });
				continue;
			}
			if (key === "event") {
				const due = this.context.day + Number(b || 0);
				this.store.events.push({ name: a, due });
				continue;
			}
			if (key === "log" || key === "dialog" || key === "message") {
				const text = n.tokens
					.slice(key === "log" && n.tokens.length >= 4 ? 3 : 1)
					.join(" ");
				this.effects.push({ type: key, text: this.text(text, active) });
				continue;
			}
			if (key === "fail") {
				const target = a || active?.id;
				if (target) this.failInternal(target, "source action");
				continue;
			}
			if (key === "give" || key === "take") {
				if (a === "ship")
					this.effects.push({
						type: "ship",
						operation: key,
						name: b,
						count: Number(node(n.children, "count")?.tokens[1] || 1),
					});
				continue;
			}
			if (
				[
					"system",
					"planet",
					"link",
					"unlink",
					"galaxy",
					"fleet",
					"government",
					"outfitter",
					"shipyard",
				].includes(key)
			) {
				this.store.world[
					`${key}:${a || ""}:${Object.keys(this.store.world).length}`
				] = n;
				this.resetWorldCaches();
				this.effects.push({ type: "world", node: n });
				continue;
			}
			if (
				[
					"date",
					"conversation",
					"require",
					"mark",
					"unmark",
					"music",
					"mute",
					"scene",
					"sound",
					"remove",
				].includes(key)
			)
				continue;
			this.effects.push({ type: "unsupported-action", tokens: n.tokens });
		}
	}
	trigger(m, phase, active, target) {
		for (const n of nodesOf(m.nodes, "on").filter(
			(n) => n.tokens[1] === phase && (!n.tokens[2] || n.tokens[2] === target),
		)) {
			this.actions(n.children, active);
			const conversation = node(n.children, "conversation");
			if (conversation && phase !== "offer")
				this.startDialogue(conversation, m, active, phase);
		}
	}
	/** Each "on enter" runs once per mission; a generic one only when no specific one runs. */
	enter(m, a, systemName) {
		const handlers = nodesOf(m.nodes, "on").filter(
			(n) => n.tokens[1] === "enter",
		);
		a.entered ??= [];
		const run = (n) => {
			a.entered.push(handlers.indexOf(n));
			this.actions(n.children, a);
			const conversation = node(n.children, "conversation");
			if (conversation) this.startDialogue(conversation, m, a, "enter");
		};
		const specific = handlers.find(
			(n) =>
				n.tokens[2] === systemName && !a.entered.includes(handlers.indexOf(n)),
		);
		if (specific) return run(specific);
		const generic = handlers.find(
			(n) =>
				!n.tokens[2] &&
				!a.entered.includes(handlers.indexOf(n)) &&
				this.systemMatches(
					node(n.children, "system")?.children || [],
					systemName,
				),
		);
		if (generic) run(generic);
	}
	systemMatches(filters, systemName) {
		const system = this.worldValue("system", systemName);
		if (!system) return false;
		return filters.every((n) => {
			const [type, ...args] = n.tokens;
			const names = [...args, ...n.children.flatMap((c) => c.tokens)];
			if (type === "not")
				return !this.systemMatches(
					n.children.length ? n.children : [{ tokens: args, children: [] }],
					systemName,
				);
			if (type === "system") return names.includes(system.name);
			if (type === "government") return names.includes(system.government);
			if (type === "attributes")
				return names.some((name) => (system.attributes || []).includes(name));
			return false;
		});
	}
	acceptInternal(m, a) {
		this.capacities(a);
		if (!this.conditions(node(m.nodes, "to", "accept")?.children || []))
			throw Error("Source acceptance conditions are not met.");
		if (a.unsupported.length)
			throw Error(
				`This mission needs native behavior not yet connected: ${a.unsupported.join(", ")}.`,
			);
		this.store.active.push(a);
		this.settleOffer(m);
		this.store.conditions[`${m.name}: offered`] =
			(this.value(`${m.name}: offered`) || 0) + 1;
		this.store.conditions[`${m.name}: active`] = 1;
		this.store.conditions[`${m.name}: accepted`] =
			(this.store.conditions[`${m.name}: accepted`] || 0) + 1;
		this.trigger(m, "accept", a);
		this.processEvents();
		return a;
	}
	settleOffer(m) {
		this.store.openOffers = (this.store.openOffers || []).filter(
			(name) => name !== m.name,
		);
	}
	// Acceptance can still fail after its conversation. Undo only the attempt, and close
	// the offer as deferred so the conversation cannot trap the player.
	tryAccept(m, a) {
		const store = structuredClone(this.store),
			context = {
				...this.context,
				outfits: { ...this.context.outfits },
				reputation: { ...this.context.reputation },
			},
			effects = this.effects.length;
		try {
			this.acceptInternal(m, a);
			return null;
		} catch (error) {
			this.root.sourceQuests = this.store = store;
			this.context = context;
			this.effects.length = effects;
			this.resetWorldCaches();
			this.store.dialogue = null;
			this.store.conditions[`${m.name}: deferred`] = 1;
			return error.message;
		}
	}
	offer(state, context, id) {
		return this.run(state, context, () => {
			const m = this.mission(id);
			const pending = this.store.dialogue;
			if (pending?.phase === "offer" && pending.missionId === m.name)
				return {
					message: "Source conversation opened.",
					dialogue: this.dialogueView(),
				};
			const location =
				[
					"job",
					"landing",
					"boarding",
					"assisting",
					"entering",
					"shipyard",
					"outfitter",
					"transition",
				].find((l) => node(m.nodes, l)) || "spaceport";
			if (!this.canOffer(m, location))
				throw Error("Source offer conditions or location are not met.");
			const a = this.instantiate(m);
			this.capacities(a);
			// "on offer" actions run once per offer, however often its conversation is
			// left, replaced or reopened before the player accepts, declines or defers.
			this.store.openOffers ??= [];
			if (!this.store.openOffers.includes(m.name)) {
				this.trigger(m, "offer", a);
				this.store.openOffers.push(m.name);
			}
			const conversation = nodesOf(m.nodes, "on")
				.find((n) => n.tokens[1] === "offer")
				?.children.find((n) => n.tokens[0] === "conversation");
			if (conversation && !node(m.nodes, "job")) {
				this.startDialogue(conversation, m, a, "offer");
				return {
					message: "Source conversation opened.",
					dialogue: this.dialogueView(),
				};
			}
			this.acceptInternal(m, a);
			return {
				message: "Source mission accepted.",
				mission: this.descriptor(m, a),
				dialogue: this.dialogueView(),
			};
		});
	}
	accept(state, context, id) {
		return this.offer(state, context, id);
	}
	startDialogue(n, m, a, phase) {
		const blocks = n.tokens[1]
			? this.conversations.get(n.tokens[1])?.nodes
			: n.children;
		if (!blocks) throw Error("Named source conversation is unavailable.");
		this.store.dialogue = {
			missionId: m.name,
			active: a,
			phase,
			blocks,
			index: 0,
			text: [],
			options: [],
			terminal: null,
		};
		this.advanceDialogue();
	}
	command(n, d) {
		const [key, arg] = n.tokens;
		if (key === "goto") {
			const i = d.blocks.findIndex(
				(n) => n.tokens[0] === "label" && n.tokens[1] === arg,
			);
			if (i < 0 && ENDPOINTS.includes(arg)) {
				d.terminal = arg;
				return true;
			}
			if (i < 0) throw Error(`Missing conversation label: ${arg}`);
			d.index = i + 1;
			return true;
		}
		if (ENDPOINTS.includes(key)) {
			d.terminal = key;
			return true;
		}
		return false;
	}
	advanceDialogue() {
		const d = this.store.dialogue;
		if (!d) return;
		d.text = [];
		d.options = [];
		let steps = 0;
		while (d.index < d.blocks.length && !d.options.length && !d.terminal) {
			if (++steps > 600)
				throw Error("Source conversation loop exceeded the execution limit.");
			const n = d.blocks[d.index++];
			const [key, a, b] = n.tokens;
			if (key === "label" || key === "scene") continue;
			if (key === "branch") {
				const target = this.conditions(n.children) ? a : b;
				if (target) this.command({ tokens: ["goto", target] }, d);
				continue;
			}
			if (key === "action" || key === "apply") {
				this.actions(n.children, d.active);
				continue;
			}
			if (this.command(n, d)) continue;
			const display = node(n.children, "to", "display");
			if (display && !this.conditions(display.children)) continue;
			if (key === "choice") {
				d.options = n.children
					.filter(
						(c) =>
							!node(c.children, "to", "display") ||
							this.conditions(node(c.children, "to", "display").children),
					)
					.map((c, index) => ({
						index,
						text: this.text(c.tokens[0], d.active),
						commands: c.children.filter((n) => n.tokens[0] !== "to"),
					}));
				continue;
			}
			if (key === "name") {
				d.text.push("Your captain answers with their registered name.");
				continue;
			}
			d.text.push(this.text(n.tokens.join(" "), d.active));
			for (const c of n.children) if (this.command(c, d)) break;
		}
		if (d.index >= d.blocks.length && !d.options.length && !d.terminal)
			d.terminal = d.phase === "offer" ? "accept" : "done";
		if (!d.options.length)
			d.options = [
				{
					index: 0,
					text:
						d.phase !== "offer"
							? "Continue"
							: offerDecision(d.terminal) === "accept"
								? "Accept assignment"
								: offerDecision(d.terminal) === "decline"
									? "Leave"
									: "Continue",
					commands: [],
					finish: true,
				},
			];
	}
	dialogueView() {
		const d = this.store.dialogue;
		return d
			? {
					missionId: d.missionId,
					text: d.text.join("\n\n"),
					options: d.options.map(({ index, text }) => ({ index, text })),
					terminal: d.terminal,
					accepts:
						d.phase === "offer" && offerDecision(d.terminal) === "accept",
				}
			: null;
	}
	choose(state, context, index) {
		return this.run(state, context, () => {
			const d = this.store.dialogue;
			if (!d) throw Error("No source conversation is active.");
			const option = d.options.find((o) => o.index === Number(index));
			if (!option) throw Error("Choose one of the displayed responses.");
			if (option.finish) {
				const m = this.mission(d.missionId),
					terminal = d.terminal;
				this.store.dialogue = null;
				const decision = offerDecision(terminal);
				if (d.phase === "offer") {
					if (decision === "accept") {
						const refusal = this.tryAccept(m, d.active);
						if (refusal)
							return {
								message: `${refusal} The offer remains available.`,
								dialogue: this.dialogueView(),
							};
					} else {
						this.settleOffer(m);
						this.trigger(m, decision, d.active);
						if (decision !== "defer")
							this.store.conditions[`${m.name}: offered`] =
								(this.value(`${m.name}: offered`) || 0) + 1;
						this.store.conditions[
							`${m.name}: ${decision === "defer" ? "deferred" : "declined"}`
						] = 1;
					}
				}
				if (terminal === "die") this.effects.push({ type: "death" });
				return {
					message:
						d.phase === "offer" && decision === "accept"
							? "Source assignment accepted."
							: "Conversation closed.",
					dialogue: this.dialogueView(),
				};
			}
			for (const command of option.commands) this.command(command, d);
			this.advanceDialogue();
			return {
				message: "Conversation continued.",
				dialogue: this.dialogueView(),
			};
		});
	}
	/**
	 * As in Endless Sky, NPC actions run once every ship in the group has the event;
	 * provoke and encounter need one ship, and any capture prevents "on destroy".
	 */
	npcGroupEvent(a, event) {
		const key = `${event.npcId}:${event.type}`;
		a.npcEvents ??= {};
		a.npcEvents[key] ??= [];
		const ships = a.npcEvents[key];
		const ship = event.actorId || `event-${ships.length}`;
		if (ships.includes(ship)) return false;
		ships.push(ship);
		if (event.type === "provoke" || event.type === "encounter") return true;
		if (
			event.type === "destroy" &&
			a.npcEvents[`${event.npcId}:capture`]?.length
		)
			return false;
		// Saves from earlier releases do not record group sizes.
		const count = a.npcShips?.[event.npcId];
		return count === undefined || ships.length === count;
	}
	ready(m, a) {
		return (
			this.context.planetName === a.destination &&
			a.waypoints.every((s) => a.visitedSystems.includes(s)) &&
			a.stopovers.every((p) => a.visitedPlanets.includes(p)) &&
			a.objectives.every(
				(o) => !o.enabled || o.type === "save" || o.progress >= o.count,
			) &&
			this.conditions(node(m.nodes, "to", "complete")?.children || [])
		);
	}
	complete(state, context, id) {
		return this.run(state, context, () => {
			const m = this.mission(id),
				a = this.store.active.find((a) => a.id === id);
			if (!a) throw Error("This source mission is not active.");
			if (!this.ready(m, a)) throw Error(this.descriptor(m, a).objective);
			this.store.active = this.store.active.filter((x) => x !== a);
			this.store.conditions[`${id}: active`] = 0;
			this.store.conditions[`${id}: done`] =
				(this.value(`${id}: done`) || 0) + 1;
			this.trigger(m, "complete", a);
			this.store.history.push({
				id,
				status: "completed",
				day: this.context.day,
			});
			this.processEvents();
			return {
				message: "Source mission completed.",
				dialogue: this.dialogueView(),
			};
		});
	}
	failInternal(id, reason, phase = "fail") {
		const a = this.store.active.find((a) => a.id === id);
		if (!a) return;
		this.store.active = this.store.active.filter((x) => x !== a);
		this.store.conditions[`${id}: active`] = 0;
		// As in Endless Sky, an abort also counts as a failure for older conditions.
		this.store.conditions[`${id}: failed`] =
			(this.value(`${id}: failed`) || 0) + 1;
		if (phase === "abort")
			this.store.conditions[`${id}: aborted`] =
				(this.value(`${id}: aborted`) || 0) + 1;
		this.store.history.push({
			id,
			status: "failed",
			reason,
			day: this.context.day,
		});
		const m = this.mission(id);
		// "on fail" stands in only for missions without their own "on abort".
		const hasAbort = nodesOf(m.nodes, "on").some(
			(n) => n.tokens[1] === "abort",
		);
		this.trigger(m, phase === "abort" && !hasAbort ? "fail" : phase, a);
		this.effects.push({ type: "failed", id, reason });
	}
	abort(state, context, id) {
		return this.run(state, context, () => {
			const a = this.store.active.find((a) => a.id === id);
			if (!a) throw Error("This source mission is not active.");
			this.failInternal(id, "aborted", "abort");
			return { message: "Source mission abandoned." };
		});
	}
	processEvents() {
		let count = 0;
		while (this.store.events.some((e) => e.due <= this.context.day)) {
			if (++count > 100)
				throw Error("Source event chain exceeded execution limit.");
			const index = this.store.events.findIndex(
					(e) => e.due <= this.context.day,
				),
				[event] = this.store.events.splice(index, 1);
			this.store.conditions[`event: ${event.name}`] = 1;
			const definition = this.events.get(event.name);
			if (definition) this.actions(definition.nodes, null);
			else this.effects.push({ type: "unsupported-event", name: event.name });
		}
	}
	notify(state, context, event) {
		return this.run(state, context, () => {
			this.processEvents();
			for (const a of [...this.store.active]) {
				const m = this.mission(a.id),
					fail = node(m.nodes, "to", "fail");
				for (const o of a.objectives)
					o.enabled =
						(!o.spawnConditions.length || this.conditions(o.spawnConditions)) &&
						(!o.despawnConditions.length ||
							!this.conditions(o.despawnConditions));
				if (a.deadline !== null && this.context.day > a.deadline) {
					this.failInternal(a.id, "deadline");
					continue;
				}
				if (fail && this.conditions(fail.children)) {
					this.failInternal(a.id, "source failure condition");
					continue;
				}
				if (event.type === "enter") {
					const system = this.context.systemName;
					const first = !a.visitedSystems.includes(system);
					if (first) a.visitedSystems.push(system);
					this.enter(m, a, system);
					// "on waypoint" runs once, when the last waypoint is reached.
					if (
						first &&
						a.waypoints.includes(system) &&
						a.waypoints.every((s) => a.visitedSystems.includes(s))
					)
						this.trigger(m, "waypoint", a);
				}
				if (event.type === "land") {
					const planet = this.context.planetName;
					const first = !a.visitedPlanets.includes(planet);
					if (first) a.visitedPlanets.push(planet);
					this.trigger(m, "land", a, planet);
					if (
						first &&
						a.stopovers.includes(planet) &&
						a.stopovers.every((p) => a.visitedPlanets.includes(p))
					)
						this.trigger(m, "stopover", a);
				}
				if (event.type === "daily") this.trigger(m, "daily", a);
				if (event.missionId === a.id && event.npcId) {
					const objectives = a.objectives.filter(
						(o) =>
							o.enabled &&
							o.npcId === event.npcId &&
							(o.mobile || o.systemName === this.context.systemName),
					);
					if (
						["destroy", "capture"].includes(event.type) &&
						objectives.some(
							(o) =>
								o.type === "save" ||
								(event.type === "destroy" &&
									!["kill", "evade", "accompany"].includes(o.type) &&
									(event.actorId
										? !(o.actors || []).includes(event.actorId)
										: o.progress < o.count)),
						)
					) {
						this.failInternal(a.id, "required mission actor lost");
						continue;
					}
					for (const o of objectives)
						if (
							o.type === event.type &&
							(!event.actorId || !(o.actors || []).includes(event.actorId))
						) {
							o.progress = Math.min(o.count, o.progress + 1);
							if (event.actorId) {
								o.actors ??= [];
								o.actors.push(event.actorId);
							}
						}
					const npc = nodesOf(m.nodes, "npc")[Number(event.npcId.slice(4))];
					const handlers =
						npc?.children.filter(
							(n) => n.tokens[0] === "on" && n.tokens[1] === event.type,
						) || [];
					if (this.npcGroupEvent(a, event))
						for (const action of handlers) this.actions(action.children, a);
				}
			}
			return { message: "Source mission state updated." };
		});
	}
}
