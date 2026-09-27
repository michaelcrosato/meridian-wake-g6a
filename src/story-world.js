import { PUG_EVENTS } from "./campaign-topology.js";
import { applySourceEffects } from "./source-bridge.js";
export function applyStoryWorld(game, mission, phase) {
	let names = [];
	if (mission.id === "liberate-kornephoros" && phase === "accept")
		names = ["war begins"];
	const milestones = {
		"liberate-kornephoros": ["recapture of Kornephoros"],
		"southern-fleet": ["fw southern expansion"],
		"secure-north": ["fw northern expansion"],
		bloodsea: ["bloodsea joins free worlds"],
		albatross: ["albatross joins free worlds"],
		"checkmate-offensive": ["fwc capture kaus borealis"],
		"checkmate-menkent": ["fwc capture menkent"],
	};
	if (phase === "complete" && milestones[mission.id])
		names.push(...milestones[mission.id]);
	if (mission.id === "pirate-choice" && phase === "complete")
		names.push(
			game.state.flags["pirate-amnesty"]
				? "bloodsea joins free worlds"
				: "fw suppressed Bloodsea",
		);
	if (phase === "complete" && mission.sourceEvents)
		names.push(...mission.sourceEvents);
	if (mission.id === "pug-arrival" && phase === "accept")
		names = game.state.flags.checkmate
			? ["fwc pug invasion"]
			: ["pug invasion"];
	if (
		mission.id === "jump-drive" &&
		phase === "accept" &&
		!game.state.flags.checkmate
	)
		names = ["pug invasion 2", "pug invasion 3", "pug invasion 4"];
	if (mission.id === "pugglemug" && phase === "complete")
		names = game.state.flags.checkmate
			? [
					"pug flee",
					"fwc liberation of rasalhague",
					"fwc battle for rasalhague",
					"fwc reconnect ascella",
					"fwc reconnect zeta aquilae",
					"fwc reconnect vega",
					"fwc link restoration 1",
					"fwc link restoration 2",
					"fwc link restoration 3",
				]
			: [
					"pug flee",
					"pug territory liberated",
					"reconnected delta capricorni",
					"reconnected altair",
					"pug link restoration 1",
					"pug link restoration 2",
					"pug link restoration 3",
					"pug link restoration 4",
				];
	for (const name of names) {
		const event = PUG_EVENTS[name];
		if (!event) throw new Error(`Missing compiled source world event: ${name}`);
		applySourceEffects(game, {
			ok: true,
			effects: event.nodes.map((node) => ({ type: "world", node })),
		});
		game.state.flags[`world:${name}`] = true;
	}

	if (names.length) {
		game.syncCanonicalWorld?.();
		const pug =
			mission.id === "pug-arrival" ||
			mission.id === "jump-drive" ||
			mission.id === "pugglemug";
		game.log(
			pug
				? phase === "complete"
					? "The lanes reopen"
					: "Hyperspace disruption"
				: "The political map changes",
			pug
				? phase === "complete"
					? "The human routes are restored. A Pug wormhole remains in Deneb."
					: "The Pug have severed familiar hyperlanes and formed new links to Deneb. Your chart reflects the changed sky."
				: "The latest settlement changes the governments and technology available in affected systems.",
		);
	}
}
