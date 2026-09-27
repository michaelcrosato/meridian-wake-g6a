import { writeFileSync } from "node:fs";
import {
	EXTRA_DATA,
	FLEET_DATA,
	OUTFIT_DATA,
	PLANET_DATA,
	SALE_DATA,
	SHIP_DATA,
	SOURCE_COMMIT,
	SYSTEM_DATA,
} from "../src/source-data.js";

const id = (name) =>
	name
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
const color = (faction) =>
	/Republic/.test(faction)
		? "#7cc4e9"
		: /Syndicate/.test(faction)
			? "#c9a87c"
			: /Pirate|Korath|Sestor|Mereti/.test(faction)
				? "#e58178"
				: /Hai/.test(faction)
					? "#8abdaa"
					: /Remnant/.test(faction)
						? "#b8a2de"
						: /Quarg|Pug/.test(faction)
							? "#eadba5"
							: /Wanderer/.test(faction)
								? "#b4c685"
								: "#8aabc9";
const planets = new Map(PLANET_DATA.map((p) => [p.name, p]));
const systems = SYSTEM_DATA.map((s) => {
	const p = s.objects.map((n) => planets.get(n)).filter(Boolean),
		inhabited = p.find((x) => x.spaceport);
	return {
		id: id(s.name),
		name: s.name,
		x: s.pos[0],
		y: s.pos[1],
		links: s.links.map(id),
		planet: inhabited?.name || p[0]?.name || "Uncharted orbit",
		inhabited: !!inhabited,
		planets: p.map((p) => ({
			id: id(p.name),
			name: p.name,
			inhabited: !!p.spaceport,
			description: p.description.split("\n")[0],
			spaceport: p.spaceport.split("\n")[0],
			attributes: p.attributes,
			shipyard: p.shipyard,
			outfitter: p.outfitter,
		})),
		faction: s.government,
		region: s.attributes?.[0] || s.government,
		color: color(s.government),
		danger: /Korath|Sestor|Mereti|Pirate|Unfettered|Pug/.test(s.government)
			? 2
			: /Uninhabited/.test(s.government)
				? 1
				: 0,
		description:
			inhabited?.description.split("\n")[0] ||
			p[0]?.description.split("\n")[0] ||
			"A quiet stellar frontier. Survey its planets, mine its asteroids, or follow the hyperlanes onward.",
		trade: s.trade,
		minables: (s.minables || []).map((field) => {
			const source = EXTRA_DATA.minable.find(
				(minable) => minable.name === field.name,
			);
			const payload = source?.nodes.find(
				(node) => node.tokens[0] === "payload",
			);
			return {
				...field,
				mineralName: payload?.tokens[1] || field.name,
				mineralId: id(payload?.tokens[1] || field.name),
			};
		}),
		asteroids: s.asteroids || [],
		sourceFile: s.sourceFile,
		sourceLine: s.sourceLine,
	};
});
const systemMap = new Map(systems.map((s) => [s.id, s]));
for (const wormhole of EXTRA_DATA.wormhole)
	for (const node of wormhole.nodes)
		if (node.tokens[0] === "link") {
			const from = systemMap.get(id(node.tokens[1])),
				to = systemMap.get(id(node.tokens[2]));
			if (from && to && !from.links.includes(to.id)) {
				from.links.push(to.id);
				from.wormholes ||= [];
				from.wormholes.push({
					name: wormhole.name,
					to: to.id,
					...(planets
						.get(wormhole.name)
						?.attributes.includes("requires: quantum keystone")
						? { requiresTag: "keystone" }
						: {}),
				});
			}
		}
for (const s of systems)
	s.links = s.links.filter((link) => systemMap.has(link));
const unique = (items) => [
	...new Map(items.map((item) => [item.id, item])).values(),
];
const ships = unique(
	SHIP_DATA.filter(
		(s) =>
			!s.variant &&
			Number(s.attributes.hull) > 0 &&
			!s.sourceFile.includes("/deprecated/"),
	).map((s) => {
		const a = s.attributes,
			mass = Number(a.mass) || 100,
			cost = Number(a.cost) || 100000,
			weaponCount = Object.entries(s.outfits).reduce(
				(n, [k, q]) =>
					n +
					(/Laser|Cannon|Blaster|Gun|Launcher|Turret|Lance|Slicer|Disruptor|Repeater|Projector|Thrasher|Piercer/.test(
						k,
					)
						? q
						: 0),
				0,
			);
		return {
			id: id(s.name),
			name: s.name,
			category: s.category || "Transport",
			price: Math.max(18000, Math.round(cost / 5 / 100) * 100),
			maxHull: Math.round(50 + Math.sqrt(a.hull) * 3.5),
			maxShield: Math.round(Math.sqrt(Number(a.shields) || 0) * 3.2),
			maxFuel: Math.max(
				3,
				Math.round((Number(a["fuel capacity"]) || 300) / 100),
			),
			cargoCapacity: Math.max(0, Number(a["cargo space"]) || 0),
			passengerCapacity: Math.max(
				0,
				(Number(a.bunks) || 1) - (Number(a["required crew"]) || 1),
			),
			outfitCapacity: Math.max(25, Number(a["outfit space"]) || 60),
			speed: Math.round(17 + 2000 / (mass + 85)),
			damage: Math.round(12 + weaponCount * 3 + Math.sqrt(mass) / 3),
			energy: 100,
			heat: 80,
			crew: Math.max(1, Number(a["required crew"]) || 1),
			description: s.description.split("\n")[0],
			sourceFile: s.sourceFile,
			sourceLine: s.sourceLine,
			sourceAttributes: a,
			stockOutfits: s.outfits,
		};
	}),
);
// Human starters have a little extra hold and fuel to support every opening playstyle.
for (const s of ships)
	if (["sparrow", "shuttle", "star-barge"].includes(s.id)) {
		s.cargoCapacity = Math.max(s.cargoCapacity, 15);
		s.passengerCapacity = Math.max(s.passengerCapacity, 3);
		s.maxFuel = Math.max(s.maxFuel, 6);
	}
function resolvedWeapon(outfit, seen = new Set()) {
	const result = { ...(outfit.weapon || {}) };
	if (seen.has(outfit.name)) return result;
	const nextSeen = new Set([...seen, outfit.name]);
	const subs = result.submunition;
	const children =
		typeof subs === "string"
			? [[subs, 1]]
			: Array.isArray(subs)
				? typeof subs[0] === "string"
					? [[subs[0], typeof subs[1] === "number" ? subs[1] : 1]]
					: subs.map((value) =>
							typeof value === "string" ? [value, 1] : value,
						)
				: [];
	for (const [name, count = 1] of children) {
		const child = OUTFIT_DATA.find((item) => item.name === name);
		if (!child || nextSeen.has(name)) continue;
		const weapon = resolvedWeapon(child, nextSeen);
		for (const key of [
			"shield damage",
			"hull damage",
			"ion damage",
			"heat damage",
			"slowing damage",
			"disruption damage",
		])
			result[key] =
				(Number(result[key]) || 0) + (Number(weapon[key]) || 0) * Number(count);
	}
	return result;
}
const outfits = unique(
	OUTFIT_DATA.filter(
		(o) => Number(o.cost) > 0 && !o.sourceFile.includes("/deprecated/"),
	).map((o) => {
		const a = o.attributes,
			w = resolvedWeapon(o),
			effects = {};
		if (a["cargo space"]) effects.cargoCapacity = Number(a["cargo space"]);
		if (a.bunks) effects.passengerCapacity = Number(a.bunks);
		if (a["fuel capacity"]) effects.maxFuel = Number(a["fuel capacity"]) / 100;
		if (a["energy generation"] || a["energy capacity"] || a["solar collection"])
			effects.energy = Math.round(
				(Number(a["energy generation"]) || 0) * 5 +
					(Number(a["energy capacity"]) || 0) / 50 +
					(Number(a["solar collection"]) || 0) * 5,
			);
		if (a.cooling || a["active cooling"] || a["heat dissipation"])
			effects.heat = Math.round(
				(Number(a.cooling) || 0) * 2 +
					(Number(a["active cooling"]) || 0) * 2 +
					(Number(a["heat dissipation"]) || 0) * 200,
			);
		if (a["shield generation"] || a["delayed shield generation"]) {
			effects.maxShield = Math.round(
				Math.sqrt(
					(Number(a["shield generation"]) || 0) +
						(Number(a["delayed shield generation"]) || 0),
				) * 35,
			);
			effects.shieldRegen = Math.max(
				0.1,
				Math.sqrt(
					(Number(a["shield generation"]) || 0) +
						(Number(a["delayed shield generation"]) || 0),
				) * 0.3,
			);
		}
		if (a["hull repair rate"])
			effects.hullRepair = Math.sqrt(Number(a["hull repair rate"])) * 0.2;
		if (a.thrust || a["afterburner thrust"])
			effects.speed = Math.min(
				9,
				Math.sqrt(
					(Number(a.thrust) || 0) + (Number(a["afterburner thrust"]) || 0),
				),
			);
		if (a["reverse thrust"])
			effects.braking = Math.min(
				3,
				Math.sqrt(Number(a["reverse thrust"])) / 10,
			);
		if (w["tractor beam"]) effects.tractor = Number(w["tractor beam"]);
		if (a.turn) effects.turn = Math.min(0.7, Number(a.turn) / 1000);
		if (a["capture attack"] || a["capture defense"])
			effects.boarding =
				Number(a["capture attack"] || 0) + Number(a["capture defense"] || 0);
		if (
			a["outfit scan power"] ||
			a["cargo scan power"] ||
			a["asteroid scan power"] ||
			a["tactical scan power"]
		)
			effects.scanner = 1;
		if (a["scan interference"] || a["radar jamming"] || a["optical jamming"])
			effects.evasion = Math.min(
				0.35,
				Number(
					a["scan interference"] || a["radar jamming"] || a["optical jamming"],
				) / 100,
			);
		if (w["shield damage"] || w["hull damage"])
			effects.damage = Math.max(
				1,
				Math.min(
					40,
					Math.round(
						Math.sqrt(
							(((Number(w["shield damage"]) || 0) +
								(Number(w["hull damage"]) || 0)) *
								60) /
								(Number(w.reload) || 60),
						) * 2,
					),
				),
			);
		if (a["shield protection"] || a["hull protection"])
			effects.armor = Math.min(
				0.4,
				Number(a["shield protection"] || a["hull protection"]),
			);
		const tag = a["jump drive"]
			? "jump-drive"
			: a.ramscoop || a["fuel generation"]
				? "ramscoop"
				: a["quantum keystone"]
					? "keystone"
					: w.prospecting
						? "mining"
						: a.cloak
							? "cloak"
							: a.hyperdrive || a["scram drive"]
								? "hyperdrive"
								: undefined;
		if (a.cloak) effects.evasion = 0.2;
		if (a["fuel generation"]) effects.fuelGeneration = 1;
		return {
			id: id(o.name),
			name: o.name,
			category: o.category || "Special",
			price: Math.max(100, Math.round(o.cost / 5 / 10) * 10),
			space: Math.max(0, -(Number(a["outfit space"]) || 0)),
			effects,
			tag,
			stackable: !!effects.damage || o.category === "Ammunition",
			description: o.description.split("\n")[0],
			sourceFile: o.sourceFile,
			sourceLine: o.sourceLine,
			sourceAttributes: Object.fromEntries(
				Object.entries(a).filter(([_k, v]) => typeof v === "number"),
			),
			weapon: w,
		};
	}),
);
const starters = [
	"sparrow",
	"shuttle",
	"star-barge",
	"hauler",
	"argosy",
	"bounder",
	"clipper",
	"fury",
	"blackbird",
	"mule",
	"bastion",
	"falcon",
	"leviathan",
	"dreadnought",
];
ships.sort(
	(a, b) =>
		(starters.includes(a.id) ? starters.indexOf(a.id) - 100 : 0) -
			(starters.includes(b.id) ? starters.indexOf(b.id) - 100 : 0) ||
		a.price - b.price,
);
const preferred = [
	"beam-laser",
	"heavy-laser",
	"mining-laser",
	"cargo-expansion",
	"bunk-room",
	"fuel-pod",
	"ramscoop",
	"d14-rn-shield-generator",
	"jump-drive",
	"quantum-keystone",
];
outfits.sort(
	(a, b) =>
		(preferred.includes(a.id) ? preferred.indexOf(a.id) - 100 : 0) -
			(preferred.includes(b.id) ? preferred.indexOf(b.id) - 100 : 0) ||
		a.price - b.price,
);
const fleetHulls = {};
for (const fleet of FLEET_DATA) {
	const government = fleet.nodes.find((node) => node.tokens[0] === "government")
		?.tokens[1];
	if (!government) continue;
	fleetHulls[government] ||= new Set();
	for (const variant of fleet.nodes.filter(
		(node) => node.tokens[0] === "variant",
	))
		for (const entry of variant.children) {
			const name = entry.tokens[0];
			const source =
				SHIP_DATA.find((ship) => ship.variant === name) ||
				SHIP_DATA.find((ship) => ship.name === name);
			const ship = ships.find(
				(ship) =>
					ship.id === id(source?.name || name.replace(/\s*\([^)]*\)/g, "")),
			);
			if (ship && /Warship|Interceptor/.test(ship.category))
				fleetHulls[government].add(ship.id);
		}
}
const fleetCatalog = Object.fromEntries(
	Object.entries(fleetHulls).map(([name, ids]) => [
		name,
		[...ids].sort(
			(a, b) =>
				ships.find((ship) => ship.id === a).price -
				ships.find((ship) => ship.id === b).price,
		),
	]),
);
const existingPlanets = new Set(
	systems.flatMap((system) => system.planets.map((planet) => planet.name)),
);
const extraPlanets = PLANET_DATA.filter(
	(planet) => !existingPlanets.has(planet.name),
).map((planet) => ({
	id: id(planet.name),
	name: planet.name,
	inhabited: !!planet.spaceport,
	description: planet.description.split("\n")[0],
	spaceport: planet.spaceport.split("\n")[0],
	attributes: planet.attributes,
	shipyard: planet.shipyard,
	outfitter: planet.outfitter,
}));
writeFileSync(
	"src/universe.js",
	`// Generated from Endless Sky ${SOURCE_COMMIT}. Rebalanced rules are Meridian Wake additions.\nexport const SOURCE_COMMIT=${JSON.stringify(SOURCE_COMMIT)};\nexport const UNIVERSE_FLEET_HULLS=${JSON.stringify(fleetCatalog)};\nexport const UNIVERSE_EXTRA_PLANETS=${JSON.stringify(extraPlanets)};\nexport const UNIVERSE_SYSTEMS=${JSON.stringify(systems)};\nexport const UNIVERSE_SHIPS=${JSON.stringify(ships)};\nexport const UNIVERSE_OUTFITS=${JSON.stringify(outfits)};\nexport const UNIVERSE_SALES=${JSON.stringify(SALE_DATA)};\n`,
);
console.log({
	systems: systems.length,
	ships: ships.length,
	outfits: outfits.length,
	bytes: JSON.stringify({ systems, ships, outfits }).length,
});
