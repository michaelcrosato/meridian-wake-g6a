import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as source from "../src/source-data.js";

const catalog = JSON.parse(
	await readFile("public/source-catalog.json", "utf8"),
);
assert.equal(catalog.commit, source.SOURCE_COMMIT);
assert.equal(catalog.files.length, 204);
for (const [type, entriesData] of Object.entries({
	system: source.SYSTEM_DATA,
	planet: source.PLANET_DATA,
	ship: source.SHIP_DATA,
	outfit: source.OUTFIT_DATA,
	mission: source.MISSION_DATA,
	fleet: source.FLEET_DATA,
})) {
	assert.equal(
		entriesData.length,
		catalog.counts[type],
		`${type} export must cover every source declaration`,
	);
	const entries = new Set(
		catalog.files.flatMap((file) =>
			file.definitions
				.filter((d) => d.type === type)
				.map((d) => `${file.path}:${d.line}:${d.name}`),
		),
	);
	for (const value of entriesData)
		assert(
			entries.has(`${value.sourceFile}:${value.sourceLine}:${value.name}`),
			`${type} provenance ${value.name}`,
		);
}
const systems = new Set(source.SYSTEM_DATA.map((s) => s.name));
const unresolvedLinks = source.SYSTEM_DATA.flatMap((s) =>
	s.links
		.filter((name) => !systems.has(name))
		.map((name) => `${s.name} -> ${name}`),
);
assert.deepEqual(unresolvedLinks, []);
assert.equal(
	source.SYSTEM_DATA.find((s) => s.name === "Rutilicus").objects[0],
	"New Boston",
);
const sparrow = source.SHIP_DATA.find(
	(s) => s.name === "Sparrow" && !s.variant,
);
assert.equal(sparrow.attributes.cost, 225000);
assert.equal(sparrow.outfits.Hyperdrive, 1);
assert.equal(sparrow.outfits["Beam Laser"], 2);
assert.equal(
	source.OUTFIT_DATA.find((o) => o.name === "Laser Rifle").cost,
	8000,
);
assert(
	source.MISSION_DATA.find((m) => m.name === "FW Southern Prisoners - Release")
		.conditions.length > 0,
);
assert(
	source.MISSION_DATA.find((m) => m.name === "FW Southern Prisoners - Keep")
		.actions.length > 0,
);
const manifest = JSON.parse(
	await readFile("public/audio/manifest.json", "utf8"),
);
const audio = [];
for (const [id, asset] of Object.entries(manifest.assets)) {
	const path = `public${asset.url}`;
	const buffer = await readFile(path);
	assert.equal(
		createHash("sha256").update(buffer).digest("hex"),
		asset.sha256,
		`${id} SHA256`,
	);
	assert.equal(buffer.length, asset.bytes, `${id} bytes`);
	const probe = spawnSync(
		"ffprobe",
		[
			"-v",
			"error",
			"-show_entries",
			"format=duration",
			"-of",
			"default=noprint_wrappers=1:nokey=1",
			path,
		],
		{ encoding: "utf8" },
	);
	assert.equal(probe.status, 0, `${id} decodes`);
	const duration = Number(probe.stdout.trim());
	assert(duration > 0, `${id} has audio`);
	audio.push({ id, duration });
}
console.log(
	JSON.stringify(
		{
			sourceCommit: source.SOURCE_COMMIT,
			catalogFiles: catalog.files.length,
			counts: catalog.counts,
			audio,
		},
		null,
		2,
	),
);
