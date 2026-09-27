import { writeFileSync } from "node:fs";
import { EXTRA_DATA, SOURCE_COMMIT } from "../src/source-data.js";

const names = [
	"war begins",
	"recapture of Kornephoros",
	"fw southern expansion",
	"fw northern expansion",
	"bloodsea joins free worlds",
	"fw suppressed Bloodsea",
	"albatross joins free worlds",
	"pug territory liberated",
	"fwc capture kaus borealis",
	"fwc capture menkent",
	"fwc liberation of rasalhague",
	"deep sky tech available",
	"syndicate tech available",
	"stack core for sale",
	"fwc kaus borealis ceded back",
	"pug invasion",
	"pug invasion 2",
	"pug invasion 3",
	"pug invasion 4",
	"reconnected delta capricorni",
	"reconnected altair",
	"pug link restoration 1",
	"pug link restoration 2",
	"pug link restoration 3",
	"pug link restoration 4",
	"fwc pug invasion",
	"fwc battle for rasalhague",
	"fwc reconnect ascella",
	"fwc reconnect zeta aquilae",
	"fwc reconnect vega",
	"fwc link restoration 1",
	"fwc link restoration 2",
	"fwc link restoration 3",
	"pug flee",
];
const events = Object.fromEntries(
	names.map((name) => {
		const event = EXTRA_DATA.event.find((event) => event.name === name);
		if (!event) throw Error(`Missing source event: ${name}`);
		const nodes = event.nodes
			.filter((node) =>
				[
					"link",
					"unlink",
					"planet",
					"system",
					"outfitter",
					"shipyard",
				].includes(node.tokens[0]),
			)
			.map((node) => ({
				...node,
				children: node.children.filter(
					(child) =>
						!["fleet", "habitable"].includes(child.tokens[0]) &&
						!(child.tokens[0] === "add" && child.tokens[1] === "fleet"),
				),
			}))
			.filter(
				(node) =>
					["link", "unlink"].includes(node.tokens[0]) || node.children.length,
			);
		return [
			name,
			{ sourceFile: event.sourceFile, sourceLine: event.sourceLine, nodes },
		];
	}),
);
writeFileSync(
	"src/campaign-topology.js",
	`// Generated from Endless Sky ${SOURCE_COMMIT}; only world topology/object attributes are retained.\nexport const PUG_EVENTS=${JSON.stringify(events)};\n`,
);
