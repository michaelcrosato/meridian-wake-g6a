// Original contracts grounded in the wiki's regional setting and player manual.
import { SYSTEMS } from "./content.js";
import { regionFor } from "./wiki-content.js";

const hash = (text) =>
	[...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
const FREIGHT = {
	"dirt belt": [
		"Irrigation spares",
		"Growers' cooperative",
		"Replacement pumps are keeping a farm's harvest from failing.",
		4,
	],
	core: [
		"Factory filters",
		"Independent maintenance crew",
		"The next shift cannot safely start until its air filters arrive.",
		6,
	],
	deep: [
		"Calibrated instruments",
		"University field laboratory",
		"Packed instruments must reach the receiving laboratory intact.",
		3,
	],
	paradise: [
		"Greenhouse equipment",
		"Municipal gardeners",
		"Replacement controls will keep a public greenhouse open.",
		5,
	],
	rim: [
		"Clinic restock",
		"Local health cooperative",
		"A clinic is sharing its last supplies between several wards.",
		3,
	],
	pirate: [
		"Water-purifier parts",
		"Dockside repair collective",
		"Civilian homes need clean water regardless of who controls the port.",
		4,
	],
	"near earth": [
		"School workshop supplies",
		"Neighborhood school",
		"A practical science course is waiting for its workshop materials.",
		4,
	],
	south: [
		"Emergency shelter kits",
		"Relief volunteers",
		"The receiving community is making space for displaced households.",
		6,
	],
};
const PASSAGE = {
	"dirt belt": [
		"A family's next season",
		"A farming family has arranged work offworld and saved enough to travel together.",
	],
	core: [
		"Workers changing shifts",
		"A maintenance team needs passage to its next industrial contract.",
	],
	deep: [
		"Students in the field",
		"A student team has permission to study offworld, but still needs transport.",
	],
	paradise: [
		"A home within reach",
		"A retiring domestic worker is moving somewhere their savings will stretch further.",
	],
	rim: [
		"The first outward ticket",
		"Young travelers from a port town have finally booked their first offworld journey.",
	],
	pirate: [
		"A quiet departure",
		"Civilian passengers want a new beginning away from the violence of the docks.",
	],
	"near earth": [
		"Room to begin again",
		"An Earth family is leaving a crowded district for a promised job offworld.",
	],
	south: [
		"Reuniting a household",
		"Relatives separated by disrupted shipping have arranged a safe meeting place.",
	],
};
const accessible = (planet) =>
	planet.inhabited && !planet.attributes.some((a) => a.startsWith("requires:"));

export const freelanceMethods = {
	availableJobs() {
		const origin = this.currentPlanet();
		if (this.state.mode !== "port" || !origin?.inhabited) return [];
		const system = this.currentSystem();
		let destinations = this.neighbors()
			.map((id) => this.systemById(id))
			.filter((s) => s?.planets.some(accessible));
		if (!destinations.length) {
			// One breadth-first search finds every system within three jumps.
			const nearby = new Set([system.id]);
			let frontier = [system.id];
			for (let depth = 0; depth < 3; depth++)
				frontier = frontier.flatMap((id) =>
					this.neighbors(id).filter((next) => {
						if (nearby.has(next)) return false;
						nearby.add(next);
						return true;
					}),
				);
			destinations = SYSTEMS.filter(
				(s) => s.id !== system.id && nearby.has(s.id),
			)
				.map((s) => this.systemById(s.id))
				.filter((s) => s.planets.some(accessible))
				.slice(0, 5);
		}
		const region = regionFor(system, origin)?.id;
		const [freight, issuer, brief, tons] = FREIGHT[region] || [
			"Habitat maintenance",
			"Port supply office",
			"Essential parts are needed by the receiving habitat.",
			4,
		];
		const [passage, passageBrief] = PASSAGE[region] || [
			"Neighbors in transit",
			"A small group needs reliable passage to another inhabited world.",
		];
		const key = `${system.id}:${origin.name}:${this.state.day}`;
		const targets = destinations.slice(0, 5).map((target) => {
			const salt = hash(`${key}:${target.id}`);
			const planets = target.planets.filter(accessible);
			return { system: target, planet: planets[salt % planets.length], salt };
		});
		const jobs = targets.flatMap(({ system: target, planet, salt }, index) => {
			const base = {
				destinationId: target.id,
				destinationPlanet: planet.name,
				originPlanet: origin.name,
				issuer,
				faction: system.faction,
				cargo: 0,
				passengers: 0,
			};
			return [
				{
					...base,
					id: `freight:${key}:${target.id}`,
					name: `${freight} → ${planet.name}`,
					description: `${brief} Deliver to ${planet.name} in ${target.name}.`,
					cargo: tons + (salt % 4),
					reward: 3200 + (salt % 2200),
					deadline: this.state.day + 8,
					kind: "delivery",
				},
				{
					...base,
					id: `passengers:${key}:${target.id}`,
					name: `${passage} → ${planet.name}`,
					description: `${passageBrief} Their destination is ${planet.name} in ${target.name}.`,
					issuer: "Passenger booking desk",
					passengers: 1 + (salt % 3),
					reward: 2800 + (salt % 2000),
					deadline: this.state.day + 7,
					kind: "passengers",
				},
				{
					...base,
					id: `bounty:${key}:${target.id}`,
					name: `Patrol ${target.name}`,
					description: `Defeat a raider in ${target.name}, then report to ${planet.name}.`,
					issuer: "Local shipping patrol",
					reward: 6800 + (salt % 3500),
					deadline: this.state.day + 12,
					kind: "bounty",
					kills: 1,
					progress: 0,
				},
				...(index === 0
					? [
							{
								...base,
								id: `courier:${key}:${target.id}`,
								name: `Priority dispatch → ${planet.name}`,
								description: `A time-sensitive maintenance authorization must reach ${planet.name}. A data pouch uses one ton of secure hold space; the deadline leaves little room for detours.`,
								cargo: 1,
								reward: 5100 + (salt % 1400),
								deadline:
									this.state.day +
									Math.max(2, this.routeTo(target.id).length + 1),
								kind: "courier",
							},
						]
					: []),
			];
		});
		if (targets.length) {
			const target = targets[0];
			const home = {
				destinationId: system.id,
				destinationPlanet: origin.name,
				originPlanet: origin.name,
				faction: system.faction,
				cargo: 0,
				passengers: 0,
				scannedSystems: [],
				visitedPlanets: [],
			};
			jobs.push({
				...home,
				id: `survey:${key}`,
				name: `Navigation survey: ${target.system.name}`,
				issuer: "Civilian navigation office",
				kind: "survey",
				scanSystems: [target.system.id],
				reward: 6400,
				deadline: this.state.day + 12,
				description: `Scan ${target.system.name} in flight after accepting, then return the readings to ${origin.name}. Existing charts cannot replace a fresh survey.`,
			});
			jobs.push({
				...home,
				id: `prospecting:${key}`,
				name: `Prospector’s assay: ${target.system.name}`,
				issuer: "Materials laboratory",
				kind: "prospecting",
				scanSystems: [target.system.id],
				deliveryCommodity: "metal",
				deliveryTons: 4,
				reward: 7800,
				deadline: this.state.day + 14,
				description: `Survey ${target.system.name} and deliver four tons of Metal to ${origin.name} for comparison. Mine the metal or buy it; keep it aboard until the laboratory takes delivery.`,
			});
			const stops = targets.slice(0, 2).map(({ system: s, planet: p }) => ({
				systemId: s.id,
				planetName: p.name,
			}));
			jobs.push({
				...home,
				id: `tour:${key}`,
				name: "A journey with a way home",
				kind: "tour",
				issuer: "Community travel circle",
				passengers: 1,
				stops,
				reward: 8600 + stops.length * 900,
				deadline: this.state.day + 20,
				description: `Carry one traveler to ${stops.map((s) => s.planetName).join(" and ")}, land at each stop, then bring them home to ${origin.name}. Their berth remains reserved for the entire trip.`,
			});
		}
		return jobs.filter(
			(job) =>
				!this.state.jobs.some((active) => active.id === job.id) &&
				!this.state.completedJobs.includes(job.id),
		);
	},
	jobObjective(job) {
		return [
			...(job.scanSystems || [])
				.filter((id) => !(job.scannedSystems || []).includes(id))
				.map((id) => `Scan ${this.systemById(id)?.name || id} in flight`),
			...(job.stops || [])
				.filter((stop) => !(job.visitedPlanets || []).includes(stop.planetName))
				.map((stop) => `Land on ${stop.planetName}`),
			...(job.kills
				? [`Defeat raiders: ${job.progress || 0}/${job.kills}`]
				: []),
			...(job.deliveryCommodity
				? [
						`Deliver ${job.deliveryTons}t Metal (${this.state.cargo[job.deliveryCommodity] || 0}t aboard)`,
					]
				: []),
			`Land on ${job.destinationPlanet || this.systemById(job.destinationId)?.planet || job.destinationId}`,
		].join(" · ");
	},
	jobReady(job) {
		return (
			job.deadline >= this.state.day &&
			job.destinationId === this.state.systemId &&
			(!job.destinationPlanet ||
				job.destinationPlanet === this.currentPlanet()?.name) &&
			(!job.kills || job.progress >= job.kills) &&
			(job.scanSystems || []).every((id) =>
				(job.scannedSystems || []).includes(id),
			) &&
			(job.stops || []).every((stop) =>
				(job.visitedPlanets || []).includes(stop.planetName),
			) &&
			(!job.deliveryCommodity ||
				(this.state.cargo[job.deliveryCommodity] || 0) >= job.deliveryTons)
		);
	},
	trackJobVisit(type) {
		for (const job of this.state.jobs) {
			if (type === "scan" && job.scanSystems?.includes(this.state.systemId)) {
				job.scannedSystems ||= [];
				if (!job.scannedSystems.includes(this.state.systemId))
					job.scannedSystems.push(this.state.systemId);
			}
			if (
				type === "land" &&
				job.stops?.some(
					(stop) =>
						stop.systemId === this.state.systemId &&
						stop.planetName === this.currentPlanet()?.name,
				)
			) {
				job.visitedPlanets ||= [];
				if (!job.visitedPlanets.includes(this.currentPlanet().name))
					job.visitedPlanets.push(this.currentPlanet().name);
			}
		}
	},
	settleJobs() {
		const delivered = [];
		// Evaluate and consume one at a time: two assays cannot sell the same metal twice.
		for (const job of this.state.jobs) {
			if (!this.jobReady(job)) continue;
			if (job.deliveryCommodity) {
				this.state.cargo[job.deliveryCommodity] -= job.deliveryTons;
				if (!this.state.cargo[job.deliveryCommodity])
					delete this.state.cargo[job.deliveryCommodity];
			}
			this.earn(job.reward);
			this.state.completedJobs.push(job.id);
			delivered.push(job);
			this.log(
				"Contract complete",
				`${job.name}: ${job.reward.toLocaleString()} credits earned.`,
			);
		}
		this.state.jobs = this.state.jobs.filter((job) => !delivered.includes(job));
		this.state.completedJobs = this.state.completedJobs.slice(-300);
		return delivered;
	},
};
