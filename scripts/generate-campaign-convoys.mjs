/** Compile small, inspectable protected-convoy rosters from the pinned native source. */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	FLEET_DATA,
	MISSION_DATA,
	SHIP_DATA,
	SOURCE_COMMIT,
} from "../src/source-data.js";

const { CAMPAIGN, ARCS, SHIPS, OUTFITS } = await import(
	pathToFileURL(
		resolve(process.env.MERIDIAN_CONTENT_ROOT || ".", "src/content.js"),
	)
);
const sources = new Map(MISSION_DATA.map((m) => [m.name, m]));
const supplementary = {
	parole: ["FW Prisoner Parole"],
	"release-prisoners": ["FW Southern Prisoners - Release"],
	"keep-prisoners": ["FW Southern Prisoners - Release"],
	"southern-fleet": ["FW Southern Battle 1B"],
	"medical-convoy": ["FW Northern 4.1A"],
	"checkmate-nuclear": ["FWC Nuke Supply 1B", "FWC Nuke Supply 1C"],
	"mutiny-evidence": ["FW Reconciliation 1B"],
	soylent: ["FW Syndicate Capture 1"],
};
function ship(model) {
	const original = SHIP_DATA.find((s) => s.variant === model);
	const plain = model.replace(/\s*\([^)]*\)/g, "").trim();
	return (
		SHIPS.find((s) => s.name === model) ||
		SHIPS.find((s) => s.name === original?.name) ||
		SHIPS.find((s) => s.name === plain)
	);
}
function armament(model, hull) {
	const variant = SHIP_DATA.find((item) => item.variant === model);
	const loadout =
		variant && Object.keys(variant.outfits).length
			? variant.outfits
			: hull.stockOutfits || {};
	const weapons = Object.entries(loadout).flatMap(([name, count]) => {
		const outfit = OUTFITS.find((outfit) => outfit.name === name);
		const damage =
			Number(outfit?.weapon?.["shield damage"] || 0) +
			Number(outfit?.weapon?.["hull damage"] || 0);
		return damage > 0
			? [
					{
						name,
						count,
						dps: ((damage * 60) / (Number(outfit.weapon.reload) || 60)) * count,
					},
				]
			: [];
	});
	return {
		canFight: weapons.length > 0,
		damage: weapons.length
			? Math.max(
					1,
					Math.min(
						24,
						Math.round(
							Math.sqrt(weapons.reduce((sum, item) => sum + item.dps, 0)),
						),
					),
				)
			: 0,
		weapons: weapons.map(({ name, count }) => ({ name, count })),
	};
}
const rosters = {};
for (const stage of [...CAMPAIGN, ...ARCS.flatMap((a) => a.missions)]) {
	const groups = [],
		members = [];
	const identities = new Set();
	let slot = 0;
	for (const sourceId of [
		...new Set([
			...(stage.sourceMissions || []),
			...(supplementary[stage.id] || []),
		]),
	]) {
		const mission = sources.get(sourceId);
		if (!mission) throw Error(`Unknown source mission ${sourceId}`);
		for (const [index, npc] of mission.nodes
			.filter((n) => n.tokens[0] === "npc")
			.entries()) {
			const personality =
				npc.children.find((node) => node.tokens[0] === "personality")?.tokens ||
				[];
			if (
				!npc.tokens.includes("save") ||
				!(
					npc.tokens.includes("accompany") ||
					(personality.includes("escort") && !personality.includes("derelict"))
				)
			)
				continue;
			const faction =
				npc.children.find((n) => n.tokens[0] === "government")?.tokens[1] ||
				"Merchant";
			const group = {
				sourceMission: sourceId,
				sourceFile: mission.sourceFile,
				sourceLine: npc.line,
				sourceNpcIndex: index,
				faction,
				sourceObjectives: npc.tokens.slice(1),
				sourcePersonality: personality.slice(1),
				roster: [],
			};
			function add(model, name, generatedName = false, ordinal = 0) {
				const hull = ship(model);
				if (!hull) throw Error(`No runtime hull for ${model} in ${sourceId}`);
				const identity = `${faction}:${model}:${name || ordinal}`;
				if (identities.has(identity)) return;
				identities.add(identity);
				const member = {
					key: `ship-${slot++}`,
					name: name || `${hull.name} ${ordinal + 1}`,
					generatedName,
					sourceModel: model,
					shipId: hull.id,
					faction,
					category: hull.category,
					maxHull: hull.maxHull,
					maxShield: hull.maxShield || 0,
					speed: hull.speed,
					...armament(model, hull),
					sourceMission: sourceId,
					sourceLine: npc.line,
				};
				members.push(member);
				group.roster.push(member.key);
			}
			for (const n of npc.children) {
				if (n.tokens[0] === "ship")
					add(n.tokens[1], n.tokens[2], !n.tokens[2], 0);
				if (n.tokens[0] === "fleet") {
					const definition = n.children.length
						? n.children
						: FLEET_DATA.find((f) => f.name === n.tokens[1])?.nodes;
					if (!definition)
						throw Error(`Missing fleet ${n.tokens[1]} in ${sourceId}`);
					const variant = definition.find((n) => n.tokens[0] === "variant");
					if (!variant) throw Error(`No fleet variant in ${sourceId}`);
					const repetitions = n.children.length
						? Number(n.tokens[1]) || 1
						: Number(n.tokens[2]) || 1;
					group.fleetVariantLine = variant.line;
					group.fleetVariantSelection =
						"First source variant, deterministic for this adaptation";
					for (let repeat = 0; repeat < repetitions; repeat++)
						for (const member of variant.children) {
							const count = Number(member.tokens[1]) || 1;
							for (let i = 0; i < count; i++)
								add(member.tokens[0], undefined, true, repeat * count + i);
						}
				}
			}
			if (group.roster.length) groups.push(group);
		}
	}
	if (members.length)
		rosters[stage.id] = {
			stageName: stage.name,
			sourceCommit: SOURCE_COMMIT,
			groups,
			members,
		};
}
await writeFile(
	"src/campaign-convoys.js",
	`// Generated by scripts/generate-campaign-convoys.mjs from Endless Sky ${SOURCE_COMMIT}.\n// GPL-3.0-or-later. Only native save groups with accompany or escort personality; never inferred from story prose.\nexport const CAMPAIGN_CONVOYS = ${JSON.stringify(rosters, null, 2)};\n`,
);
console.log(
	JSON.stringify({
		stages: Object.keys(rosters).length,
		ships: Object.values(rosters).reduce((n, v) => n + v.members.length, 0),
		largest: Math.max(...Object.values(rosters).map((v) => v.members.length)),
	}),
);
