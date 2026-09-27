/** Reproducible Endless Sky data inventory. GPL-3.0-or-later; see licenses/. */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { writeSnapshot } from "./data-snapshots.mjs";
export const COMMIT = "3248c43994eb3d545265366c8eba909a6646f4d2";
const cache = resolve(
	process.env.MERIDIAN_SOURCE_CACHE || `${homedir()}/.cache/meridian-source`,
	COMMIT,
);
const rawBase = `https://raw.githubusercontent.com/endless-sky/endless-sky/${COMMIT}/`;
async function cached(path) {
	const dest = resolve(cache, path);
	try {
		return await readFile(dest, "utf8");
	} catch {}
	const response = await fetch(
		rawBase + path.split("/").map(encodeURIComponent).join("/"),
	);
	if (!response.ok) throw new Error(`${response.status}: ${path}`);
	const text = await response.text();
	await mkdir(dirname(dest), { recursive: true });
	await writeFile(dest, text);
	return text;
}
/** The game format uses tab indentation and both double-quoted/backtick strings. */
export function tokenize(line) {
	const words = [];
	let word = "",
		quote = null,
		active = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (quote) {
			if (c === quote) quote = null;
			else word += c;
			active = true;
		} else if (c === '"' || c === "`") {
			quote = c;
			active = true;
		} else if (c === "#") break;
		else if (/\s/.test(c)) {
			if (active) words.push(word);
			word = "";
			active = false;
		} else {
			word += c;
			active = true;
		}
	}
	if (active) words.push(word);
	return words;
}
export function parse(text) {
	const roots = [];
	const stack = [];
	text.split(/\r?\n/).forEach((line, index) => {
		const tokens = tokenize(line.trim());
		if (!tokens.length) return;
		const indent = line.match(/^\s*/)[0].length;
		const node = { tokens, children: [], line: index + 1 };
		while (stack.length && stack.at(-1).indent >= indent) stack.pop();
		if (stack.length) stack.at(-1).node.children.push(node);
		else roots.push(node);
		stack.push({ indent, node });
	});
	return roots;
}
const child = (n, key) => n.children.find((c) => c.tokens[0] === key);
const values = (n, key) =>
	n.children.filter((c) => c.tokens[0] === key).map((c) => c.tokens.slice(1));
const first = (n, key) => child(n, key)?.tokens[1];
const textValue = (n, key) =>
	values(n, key)
		.map((t) => t.join(" "))
		.join("\n");
const numeric = (value) =>
	value !== undefined && Number.isFinite(Number(value)) ? Number(value) : value;
const props = (n) =>
	Object.fromEntries(
		(n?.children || [])
			.filter((c) => c.tokens.length > 1)
			.map((c) => [
				c.tokens[0],
				c.tokens.length === 2
					? numeric(c.tokens[1])
					: c.tokens.slice(1).map(numeric),
			]),
	);
const fileCache = resolve(cache, "tree.json");
let tree;
try {
	tree = JSON.parse(await readFile(fileCache, "utf8")).tree;
} catch {
	const response = await fetch(
		`https://api.github.com/repos/endless-sky/endless-sky/git/trees/${COMMIT}?recursive=1`,
	);
	if (!response.ok) throw new Error("Could not retrieve source tree");
	const result = await response.json();
	if (result.truncated) throw new Error("Source tree was truncated");
	tree = result.tree;
	await mkdir(cache, { recursive: true });
	await writeFile(fileCache, JSON.stringify(result));
}
const files = tree
	.filter((f) => f.type === "blob" && /^data\/.*\.txt$/.test(f.path))
	.sort((a, b) => a.path.localeCompare(b.path));
let cursor = 0;
const documents = [];
await Promise.all(
	Array.from({ length: 12 }, async () => {
		while (cursor < files.length) {
			const f = files[cursor++];
			const text = await cached(f.path);
			const blobHash = createHash("sha1")
				.update(`blob ${Buffer.byteLength(text)}\0`)
				.update(text)
				.digest("hex");
			if (blobHash !== f.sha)
				throw new Error(`Source integrity check failed: ${f.path}`);
			documents.push({
				path: f.path,
				bytes: Buffer.byteLength(text),
				sha256: createHash("sha256").update(text).digest("hex"),
				nodes: parse(text),
			});
		}
	}),
);
documents.sort((a, b) => a.path.localeCompare(b.path));
const definitions = documents.flatMap((doc) =>
	doc.nodes.map((node) => ({
		...node,
		sourceFile: doc.path,
		sourceLine: node.line,
	})),
);
const category = (type) => definitions.filter((n) => n.tokens[0] === type);
const provenance = (n) => ({
	sourceFile: n.sourceFile,
	sourceLine: n.sourceLine,
});
const SYSTEM_DATA = category("system").map((n) => ({
	name: n.tokens[1],
	pos: (child(n, "pos")?.tokens.slice(1) || []).map(Number),
	links: values(n, "link").flat(),
	government: first(n, "government"),
	attributes: values(n, "attributes").flat(),
	objects: n.children
		.filter((c) => c.tokens[0] === "object")
		.flatMap(function walk(c) {
			return [
				c.tokens[1],
				...c.children.filter((k) => k.tokens[0] === "object").flatMap(walk),
			].filter(Boolean);
		}),
	trade: Object.fromEntries(values(n, "trade").map(([a, b]) => [a, Number(b)])),
	minables: values(n, "minables").map(([name, count, energy]) => ({
		name,
		count: Number(count),
		energy: Number(energy),
	})),
	asteroids: values(n, "asteroids").map(([name, count, energy]) => ({
		name,
		count: Number(count),
		energy: Number(energy),
	})),
	...provenance(n),
}));
const PLANET_DATA = category("planet").map((n) => ({
	name: n.tokens[1],
	attributes: values(n, "attributes").flat(),
	description: textValue(n, "description"),
	spaceport: textValue(n, "spaceport"),
	descriptionBlocks: n.children.filter((c) => c.tokens[0] === "description"),
	spaceportBlocks: n.children.filter((c) => c.tokens[0] === "spaceport"),
	government: first(n, "government"),
	shipyard: values(n, "shipyard").flat(),
	outfitter: values(n, "outfitter").flat(),
	requiredReputation: Number(first(n, "required reputation") || 0),
	...provenance(n),
}));
const SHIP_DATA = category("ship").map((n) => ({
	name: n.tokens[1],
	variant: n.tokens[2] || null,
	attributes: props(child(n, "attributes")),
	outfits: Object.fromEntries(
		(child(n, "outfits")?.children || []).map((c) => [
			c.tokens[0],
			Number(c.tokens[1] || 1),
		]),
	),
	description: textValue(n, "description"),
	category: first(child(n, "attributes") || { children: [] }, "category"),
	...provenance(n),
}));
const OUTFIT_DATA = category("outfit").map((n) => ({
	name: n.tokens[1],
	category: first(n, "category"),
	cost: Number(first(n, "cost") || 0),
	attributes: props(n),
	weapon: props(child(n, "weapon")),
	description: textValue(n, "description"),
	...provenance(n),
}));
const MISSION_DATA = category("mission").map((n) => ({
	name: n.tokens[1],
	displayName: first(n, "name") || n.tokens[1],
	description: textValue(n, "description"),
	source: first(n, "source"),
	sourceFilter: child(n, "source")?.children || [],
	destination: first(n, "destination"),
	destinationFilter: child(n, "destination")?.children || [],
	offerConditions:
		n.children.find((c) => c.tokens[0] === "to" && c.tokens[1] === "offer")
			?.children || [],
	completeConditions:
		n.children.find((c) => c.tokens[0] === "to" && c.tokens[1] === "complete")
			?.children || [],
	conditions: n.children.filter((c) => c.tokens[0] === "to"),
	cargo: child(n, "cargo")?.tokens.slice(1) || [],
	passengers: child(n, "passengers")?.tokens.slice(1) || [],
	deadline: child(n, "deadline")?.tokens.slice(1) || [],
	actions: n.children.filter((c) => c.tokens[0] === "on"),
	nodes: n.children,
	...provenance(n),
}));
const FLEET_DATA = category("fleet").map((n) => ({
	name: n.tokens[1],
	...provenance(n),
	nodes: n.children,
}));
const SALE_DATA = [...category("shipyard"), ...category("outfitter")].map(
	(n) => ({
		type: n.tokens[0],
		name: n.tokens[1],
		items: n.children.map((c) => c.tokens[0]),
		...provenance(n),
	}),
);
const EXTRA_DATA = Object.fromEntries(
	[
		"event",
		"government",
		"wormhole",
		"minable",
		"conversation",
		"trade",
		"start",
	].map((type) => [
		type,
		category(type).map((n) => ({
			name: n.tokens[1],
			nodes: n.children,
			...provenance(n),
		})),
	]),
);
const counts = Object.fromEntries(
	[...new Set(definitions.map((n) => n.tokens[0]))]
		.sort()
		.map((key) => [key, category(key).length]),
);
const catalog = {
	formatVersion: 1,
	source: "https://github.com/endless-sky/endless-sky",
	commit: COMMIT,
	license: "GPL-3.0-or-later",
	generated: "2026-09-26",
	notice:
		"Catalog presence is inventory evidence, not proof a source behavior is implemented. See docs/content.md.",
	counts,
	files: documents.map(({ nodes, ...doc }) => ({
		...doc,
		definitions: nodes.map((n) => ({
			type: n.tokens[0],
			name: n.tokens[1] || null,
			variant: n.tokens[2] || null,
			line: n.line,
		})),
	})),
};
await mkdir("public", { recursive: true });
await mkdir("src", { recursive: true });
await writeFile("public/source-catalog.json", `${JSON.stringify(catalog)}\n`);
writeSnapshot("src/source-data.json.gz", {
	SOURCE_COMMIT: COMMIT,
	SYSTEM_DATA,
	PLANET_DATA,
	SHIP_DATA,
	OUTFIT_DATA,
	MISSION_DATA: MISSION_DATA.map(
		({
			sourceFilter,
			destinationFilter,
			offerConditions,
			completeConditions,
			conditions,
			actions,
			...mission
		}) => mission,
	),
	FLEET_DATA,
	SALE_DATA,
	EXTRA_DATA,
});
await mkdir("licenses", { recursive: true });
for (const [upstream, local] of [
	["copyright", "ENDLESS_SKY_COPYRIGHT"],

	["credits.txt", "ENDLESS_SKY_CREDITS.txt"],
])
	await writeFile(`licenses/${local}`, await cached(upstream));
console.log(
	JSON.stringify(
		{
			commit: COMMIT,
			files: files.length,
			counts,
			outputs: ["public/source-catalog.json", "src/source-data.json.gz"],
		},
		null,
		2,
	),
);
if (process.argv.includes("--audio")) {
	const { rebuildAudio } = await import("./audio-assets.mjs");
	await rebuildAudio();
}
