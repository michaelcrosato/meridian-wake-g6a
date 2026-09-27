import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const sourcePath = new URL("../src/source-data.json.gz", import.meta.url);
const universePath = new URL("../src/universe.json.gz", import.meta.url);

export function readSnapshot(url) {
	return JSON.parse(gunzipSync(readFileSync(url)).toString("utf8"));
}

export function writeSnapshot(url, data) {
	writeFileSync(url, gzipSync(JSON.stringify(data), { level: 9 }));
}

export function restoreMission(mission) {
	return {
		...mission,
		sourceFilter:
			mission.nodes.find((n) => n.tokens[0] === "source")?.children || [],
		destinationFilter:
			mission.nodes.find((n) => n.tokens[0] === "destination")?.children || [],
		conditions: mission.nodes.filter((n) => n.tokens[0] === "to"),
		offerConditions:
			mission.nodes.find((n) => n.tokens[0] === "to" && n.tokens[1] === "offer")
				?.children || [],
		completeConditions:
			mission.nodes.find(
				(n) => n.tokens[0] === "to" && n.tokens[1] === "complete",
			)?.children || [],
		actions: mission.nodes.filter((n) => n.tokens[0] === "on"),
	};
}

export function readSourceData() {
	const data = readSnapshot(sourcePath);
	data.MISSION_DATA = data.MISSION_DATA.map(restoreMission);
	return data;
}

export const readUniverse = () => readSnapshot(universePath);

// V8 parses large JSON strings roughly twice as fast as equivalent object literals.
const moduleValue = (value) =>
	value !== null && typeof value === "object"
		? `/* @__PURE__ */ JSON.parse(${JSON.stringify(JSON.stringify(value))})`
		: JSON.stringify(value);

/** Expand snapshots only inside the build. Browsers receive ordinary tree-shaken ES modules. */
export function dataSnapshotsPlugin() {
	const modules = new Map([
		[
			fileURLToPath(
				new URL("../src/source-data.js", import.meta.url),
			).replaceAll("\\", "/"),
			sourcePath,
		],
		[
			fileURLToPath(new URL("../src/universe.js", import.meta.url)).replaceAll(
				"\\",
				"/",
			),
			universePath,
		],
	]);
	return {
		name: "meridian-data-snapshots",
		enforce: "pre",
		load(id) {
			const path = modules.get(id.split("?")[0]);
			if (!path) return;
			this.addWatchFile(fileURLToPath(path));
			const code = Object.entries(readSnapshot(path))
				.map(
					([name, value]) =>
						`export const ${name} = ${moduleValue(value)}${name === "MISSION_DATA" ? `.map(${restoreMission.toString()})` : ""};`,
				)
				.join("\n");
			// Generated data needs no source map; dev servers would otherwise inline one.
			return { code, map: { mappings: "" } };
		},
	};
}
