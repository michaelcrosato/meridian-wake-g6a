import { createExpandedArcs } from "./expanded-arcs.js";
import {
	SOURCE_COMMIT,
	UNIVERSE_EXTRA_PLANETS,
	UNIVERSE_OUTFITS,
	UNIVERSE_SALES,
	UNIVERSE_SHIPS,
	UNIVERSE_SYSTEMS,
} from "./universe.js";

export { SOURCE_COMMIT };
export const SYSTEMS = UNIVERSE_SYSTEMS;
export const PLANETS = [
	...new Map(
		[
			...SYSTEMS.flatMap((system) => system.planets),
			...UNIVERSE_EXTRA_PLANETS,
		].map((planet) => [planet.name, planet]),
	).values(),
];
export const SHIPS = UNIVERSE_SHIPS;
export const OUTFITS = UNIVERSE_OUTFITS;
export const SALES = UNIVERSE_SALES;
export const COMMODITIES = [
	["food", "Food", 350, "Staple crops and preserved provisions."],
	["clothing", "Clothing", 240, "Textiles and everyday clothing."],
	["metal", "Metal", 460, "Refined construction metals and mined ore."],
	["plastic", "Plastic", 420, "Industrial polymers and fabrication stock."],
	["equipment", "Equipment", 570, "Tools and precision machinery."],
	["medical", "Medical", 600, "Medicines and medical supplies."],
	["industrial", "Industrial", 800, "Factory components and bulk machinery."],
	["electronics", "Electronics", 850, "Computers, sensors, and circuitry."],
	["heavy-metals", "Heavy Metals", 930, "High-value alloys and rare metals."],
	["luxury", "Luxury Goods", 1180, "Fine goods for prosperous worlds."],
].map(([id, name, basePrice, description]) => ({
	id,
	name,
	sourceName: name,
	basePrice,
	description,
}));
export const FACTIONS = [
	[
		"Republic",
		"The Navy holds the core worlds while the southern colonies demand self-rule.",
		"Civilian captain, keep your weapons safe near the inhabited worlds.",
	],
	[
		"Free Worlds",
		"A coalition of southern planets facing the price of independence.",
		"Every independent captain counts. We have work for you at the spaceport.",
	],
	[
		"Syndicate",
		"Corporations control the eastern worlds, and their influence reaches far beyond the balance sheet.",
		"All trade is welcome. All debts are remembered.",
	],
	[
		"Hai",
		"An old civilization of traders, families, and cautious neighbors.",
		"Welcome, human. There is always room at our table.",
	],
	[
		"Hai (Unfettered)",
		"Militants who reject the restraint of the Hai government.",
		"If you wish to trade, bring something that will help our cause.",
	],
	[
		"Remnant",
		"Descendants of humans hidden in the Ember Waste, guarded by secrecy and advanced engineering.",
		"Identify your vessel. We are listening.",
	],
	[
		"Wanderer",
		"Traveling terraformers restoring worlds poisoned by ancient wars.",
		"A garden grows slowly. Every willing hand is precious.",
	],
	[
		"Korath",
		"Exiles living aboard immense raiders in the ruins of their old civilization.",
		"The transmission is a storm of warnings and desperate requests.",
	],
	[
		"Kor Mereti",
		"Autonomous machines fight a war whose builders have lost control of it.",
		"No living voice answers your hail.",
	],
	[
		"Kor Sestor",
		"A second machine fleet perpetuates the devastation of Korath space.",
		"Your hail is met with targeting emissions.",
	],
	[
		"Coalition",
		"Saryds, Kimek, and Arachi share a civilization governed by the Heliarchs.",
		"Visitors must register with the Ring of Friendship.",
	],
	[
		"Heliarch",
		"The ruling military authority of the Coalition.",
		"Maintain your course. Your credentials are being verified.",
	],
	[
		"Quarg",
		"Ancient guardians whose ringworlds and technology dwarf human ambitions.",
		"Little captain, there is much beyond your charts. Travel with care.",
	],
	[
		"Pug",
		"Enigmatic visitors able to alter the very paths between stars.",
		"Your words return to you, rearranged into something almost familiar.",
	],
	[
		"Successor",
		"Successor Houses contend over the legacies of an older civilization.",
		"State your House and your business.",
	],
	[
		"Gegno",
		"Rival Vi and Scin traditions shape an unfamiliar society.",
		"The reply is formal, measured, and difficult to translate.",
	],
	[
		"Bunrodea",
		"A secluded people whose invitation may be a summons.",
		"You have been observed. Follow the transmitted coordinates.",
	],
	[
		"Avgi",
		"A civilization caught between luminous invention and the Aberrant threat.",
		"Welcome to the Twilight. We could use another friend.",
	],
	[
		"Drak",
		"Watchers standing beyond the politics of younger civilizations.",
		"There is no reply. The immense vessel continues its watch.",
	],
].map(([name, description, greeting]) => ({
	id: name.toLowerCase().replaceAll(" ", "-"),
	name,
	description,
	greeting,
}));
function destination(name) {
	const system = SYSTEMS.find(
		(s) => s.name === name || s.planets.some((p) => p.name === name),
	);
	if (!system) throw new Error(`Unknown story destination: ${name}`);
	return system.id;
}
// This is an original condensed adaptation of the referenced upstream mission groups.
// Requirements, rewards, mission order, and prose below are authored for Meridian Wake.
function mission(id, name, target, description, requirements = {}) {
	return {
		id,
		name,
		title: name,
		destinationId: destination(target),
		destinationName: target,
		description,
		reward: 9000,
		faction: "Free Worlds",
		kind: requirements.kills
			? "combat"
			: requirements.scan
				? "survey"
				: requirements.passengers
					? "passage"
					: "delivery",
		...requirements,
	};
}
const fw = (id, chapter, name, target, description, requirements = {}) =>
	mission(id, name, target, description, {
		chapter,
		sourceFile: `data/human/free worlds ${chapter === "Prologue" ? "0 prologue" : chapter === "Independence" ? "1 start" : chapter === "Civil war" ? "2 middle" : chapter === "Reconciliation" ? "3 reconciliation" : "4 epilogue"}.txt`,
		...requirements,
	});
export const CAMPAIGN = [
	mission(
		"first-passage",
		"A captain’s first passage",
		"New Greenland",
		"James, a retired captain, asks for passage to New Greenland. He will help you learn the trade: select a nearby route, launch, jump along the hyperlanes, then land. Cargo contracts and passengers can share a voyage.",
		{
			chapter: "First flight",
			passengers: 1,
			reward: 6500,
			sourceFile: "data/human/intro missions.txt",
			sourceMissions: ["Intro [0]"],
			outcome:
				"James steps onto the wet tarmac. You are no longer merely someone who owns a ship. You are a captain.",
		},
	),
	fw(
		"pact-recon",
		"Prologue",
		"The Southern Mutual Defense Pact",
		"Glaze",
		"The southern worlds cannot rely on Navy patrols. Survey pirate movements around Glaze and bring your sensor logs to the Pact. In flight, use Scan before landing.",
		{
			scan: true,
			reward: 8500,
			sourceMissions: ["Pact Recon 0", "Pact Recon 3"],
		},
	),
	fw(
		"militia-officer",
		"Prologue",
		"An officer with a cause",
		"Glaze",
		"A militia officer needs a discreet berth. The Free Worlds are organizing, and independent captains will decide whether their people survive the months ahead.",
		{ passengers: 1, reward: 8000, sourceMissions: ["FW Recon 0"] },
	),
	fw(
		"navy-recon",
		"Prologue",
		"The developing base",
		"New Wales",
		"The Navy is building something on New Wales. Approach the system, scan its traffic, and land to compare those readings with the new base. Keep the intelligence away from curious patrols.",
		{ scan: true, reward: 12000, sourceMissions: ["FW Recon 1", "FW Recon 3"] },
	),
	fw(
		"supply-escort",
		"Prologue",
		"A convoy on the edge",
		"Wayfarer",
		"A supply convoy must reach Wayfarer. Raiders are stalking the approach. Clear two attackers, then bring the manifest ashore. Upgrade your weapons or hire an escort if the fight is too much.",
		{ kills: 2, cargo: 3, reward: 18000, sourceMissions: ["FW Escort 1"] },
	),
	fw(
		"liberate-kornephoros",
		"Independence",
		"Liberate Kornephoros",
		"Clink",
		"The Free Worlds move to free Kornephoros. Break the blockade and make contact with the defenders on Clink. This is the first battle of a war nobody can contain.",
		{
			kills: 2,
			reward: 24000,
			flag: "free-worlds-license",
			sourceMissions: ["Liberate Kornephoros"],
		},
	),
	fw(
		"parole",
		"Independence",
		"The people we capture",
		"New Tibet",
		"The battle has left Navy prisoners in Free Worlds hands. Carry a parole delegation to New Tibet. Your treatment of defeated crews will shape what kind of nation emerges.",
		{
			passengers: 2,
			reward: 14000,
			choices: [
				{
					id: "parole",
					label: "Honor their parole",
					flag: "merciful",
					description: "Build trust with the Republic.",
					outcome:
						"The prisoners return home under parole. Word of your restraint travels ahead of you.",
				},
				{
					id: "hold",
					label: "Keep a military guard",
					flag: "cautious",
					bonus: 2000,
					description: "Prioritize security over goodwill.",
					outcome:
						"The delegation accepts strict supervision. Military command approves your caution.",
				},
			],
		},
	),
	fw(
		"alondo-industry",
		"Independence",
		"Alondo’s delegation",
		"Hephaestus",
		"Alondo is seeking industrial support for the new government. Take his delegation to Hephaestus and its shipbuilders. Independence will need engines, plates, and a thousand difficult promises.",
		{ passengers: 2, reward: 18000 },
	),
	fw(
		"alondo-poisonwood",
		"Independence",
		"The distant allies",
		"Poisonwood",
		"Alondo’s diplomacy reaches the Oathkeepers on Poisonwood. Bring an envoy and relief cargo to hear what help they are willing to give.",
		{ passengers: 1, cargo: 4, reward: 19000 },
	),
	fw(
		"hope-sensors",
		"Independence",
		"Eyes at Hope",
		"Hope",
		"Deploy a sensor package in the approaches to Hope. A small early-warning network may save more lives than a squadron of warships.",
		{ cargo: 3, scan: true, reward: 18000 },
	),
	fw(
		"freya-plasma",
		"Independence",
		"Freya’s plasma trial",
		"Rust",
		"Freya’s new plasma weapon needs a combat trial near Rust. Clear the raiders and deliver your readings. Her engineering may give the militia a fighting chance.",
		{ kills: 2, scan: true, reward: 24000 },
	),
	fw(
		"pirate-choice",
		"Independence",
		"A bargain with pirates",
		"Bloodsea",
		"Pirates threaten the supply lines. After breaking their raiding wing, their surviving commanders offer a bargain. The Free Worlds can buy a truce or force submission.",
		{
			kills: 2,
			reward: 23000,
			choices: [
				{
					id: "amnesty",
					label: "Negotiate an amnesty",
					flag: "pirate-amnesty",
					description: "Turn raiders into uneasy allies.",
					outcome:
						"The pirate commanders agree to keep the convoy lanes clear.",
				},
				{
					id: "force",
					label: "Demand their surrender",
					flag: "pirate-force",
					bonus: 7000,
					description: "Take the weapons and close the base.",
					outcome:
						"The raiders surrender their weapons. The convoy lanes open under militia patrol.",
				},
			],
		},
	),
	fw(
		"senate",
		"Independence",
		"A voice in the Senate",
		"Earth",
		"Carry the Free Worlds’ arguments to Earth. The Senate must hear why the southern worlds chose independence, even while the fleets prepare for a wider war.",
		{ passengers: 2, reward: 23000 },
	),
	fw(
		"refinery",
		"Independence",
		"The fuel that keeps us moving",
		"Hephaestus",
		"A refinery shipment is exposed to interception. Deliver its critical components through the raiders and keep the Free Worlds’ ships in the air.",
		{ cargo: 8, kills: 2, reward: 28000 },
	),
	fw(
		"new-wales-talks",
		"Civil war",
		"Diplomacy under fire",
		"New Wales",
		"Alondo pursues talks with the Republic. Bring his delegation back to New Wales while a naval skirmish threatens the approach.",
		{ passengers: 2, kills: 2, reward: 30000 },
	),
	fw(
		"electron-theft",
		"Civil war",
		"The electron beam",
		"Hope",
		"Navy electron-beam technology could turn the war. Disable a ship near Hope, board it, and recover a weapon record for Freya. Boarding becomes available once the hostile contacts are clear.",
		{ kills: 2, board: true, reward: 38000 },
	),
	fw(
		"freya-trinket",
		"Civil war",
		"A workshop on Trinket",
		"Trinket",
		"Freya needs the recovered technology at her workshop on Trinket. Deliver the sealed components and help her survey the new weapon’s behavior.",
		{ cargo: 5, scan: true, reward: 25000, grantOutfit: "electron-beam" },
	),
	fw(
		"dreadnoughts",
		"Civil war",
		"The ships at Zug",
		"Zug",
		"Experimental Dreadnoughts are ready for their trial. Clear the threats over Zug and let their crews complete the flight program.",
		{ kills: 3, reward: 40000 },
	),
	fw(
		"southern-fleet",
		"Civil war",
		"The southern front",
		"Clink",
		"The southern fleet is committed. Take your place in the line and clear the opposing screen. Your escort fleet will absorb some incoming fire while set to Protect.",
		{ kills: 4, reward: 52000 },
	),
	fw(
		"prisoners",
		"Civil war",
		"Prisoners of the war",
		"New Tibet",
		"Attend the prisoner exchange hearing on New Tibet. Releasing the crews may strengthen Alondo’s diplomacy; holding them gives the fleet bargaining power.",
		{
			passengers: 1,
			reward: 30000,
			choices: [
				{
					id: "release",
					label: "Support the exchange",
					flag: "reconciliation",
					description: "Commit to reconciliation with the Republic.",
					outcome:
						"Families are reunited. A channel opens between the opposing governments.",
				},
				{
					id: "detain",
					label: "Retain the prisoners",
					flag: "checkmate",
					bonus: 10000,
					description:
						"Favor military leverage; unlock the Checkmate side operation.",
					outcome:
						"The exchange is delayed. Command prepares its Checkmate contingency.",
				},
			],
		},
	),
	fw(
		"release-prisoners",
		"Civil war",
		"The journey home",
		"New Iceland",
		"Carry the released Navy prisoners to New Iceland under the agreed exchange. The crews are going home because somebody chose to trust the other side.",
		{ passengers: 3, reward: 20000, whenFlag: "reconciliation" },
	),
	fw(
		"keep-prisoners",
		"Civil war",
		"The prison at Clink",
		"Clink",
		"Carry the retained prisoners to Clink. They will remain in custody while command pursues a military conclusion to the war.",
		{ passengers: 3, reward: 24000, whenFlag: "checkmate" },
	),
	fw(
		"secure-north",
		"Civil war",
		"Secure the northern route",
		"New Tibet",
		"The northern route is exposed. Clear the hostile patrol over New Tibet before the next convoy enters the system.",
		{ kills: 3, reward: 36000 },
	),
	fw(
		"sensor-network",
		"Civil war",
		"A web of warnings",
		"New Holland",
		"Extend the warning net from Hope and Clark toward New Holland. Deliver the sensor package and perform a calibration scan.",
		{ cargo: 5, scan: true, reward: 30000 },
	),
	fw(
		"medical-convoy",
		"Civil war",
		"Medicine across the lines",
		"Clark",
		"Hospitals are running short of medicine. Escort this shipment through the interdiction wing and land on Clark. The crates are marked with no government’s insignia.",
		{ cargo: 10, kills: 2, reward: 34000 },
	),
	fw(
		"alpha-raid",
		"Civil war",
		"The raid on Poisonwood",
		"Poisonwood",
		"The Alphas threaten Poisonwood. Join the defense and retrieve the attackers’ flight records. Allies made here and in the pirate negotiations remember your choices.",
		{ kills: 4, board: true, reward: 60000 },
	),
	fw(
		"bloodsea",
		"Civil war",
		"The trail through Bloodsea",
		"Bloodsea",
		"The surviving evidence leads through pirate space. Bring down the interception wing and scan Bloodsea’s traffic for the supply trail.",
		{ kills: 3, scan: true, reward: 44000 },
	),
	fw(
		"albatross",
		"Civil war",
		"Safe harbor at Albatross",
		"Albatross",
		"Refugees and intelligence teams need safe passage to Albatross. Get the delegation through while the fleet regroups.",
		{ passengers: 3, kills: 2, reward: 36000 },
	),
	fw(
		"rand-watch",
		"Civil war",
		"The quiet before Rand",
		"Rand",
		"Rand’s position near Syndicate space makes it vulnerable. Deliver communications equipment and scan the outer approaches. Something in the traffic does not fit the familiar pattern of war.",
		{ cargo: 6, scan: true, reward: 38000 },
	),
	fw(
		"checkmate-offensive",
		"Checkmate",
		"The northern offensive",
		"New Iceland",
		"Command prepares Checkmate around Kaus Borealis and Cebalrai. Break the opposing screen and deliver the strategic map.",
		{
			kills: 4,
			cargo: 2,
			reward: 48000,
			whenFlag: "checkmate",
			sourceFile: "data/human/free worlds 3 checkmate.txt",
		},
	),
	fw(
		"checkmate-nuclear",
		"Checkmate",
		"The nuclear supply line",
		"Clink",
		"Protect the nuclear supply convoy while command weighs the cost of escalation. A narrow military victory could come at a terrible price.",
		{
			kills: 4,
			cargo: 6,
			reward: 52000,
			whenFlag: "checkmate",
			sourceFile: "data/human/free worlds 3 checkmate.txt",
		},
	),
	fw(
		"checkmate-truce",
		"Checkmate",
		"A truce that fails",
		"Earth",
		"Carry the last truce proposal to Earth. Resistance in Parliament closes the door; the fleet prepares to strike Menkent.",
		{
			passengers: 2,
			reward: 42000,
			whenFlag: "checkmate",
			sourceFile: "data/human/free worlds 3 checkmate.txt",
		},
	),
	fw(
		"checkmate-menkent",
		"Checkmate",
		"The assault on Menkent",
		"Menkent",
		"Clear the defensive wing around Menkent. Before victory is settled, reports of an alien invasion transform the conflict.",
		{
			kills: 5,
			reward: 70000,
			whenFlag: "checkmate",
			flag: "checkmate-complete",
			sourceFile: "data/human/free worlds 3 checkmate.txt",
		},
	),
	fw(
		"mutiny-evidence",
		"Reconciliation",
		"Katya’s evidence",
		"Mutiny",
		"Katya, Sawyer, and Ijs are tracing who has profited from this war. Recover a ship’s records near Mutiny. Evidence, rather than another broadside, may finally change the Republic’s mind.",
		{ unlessFlag: "checkmate", kills: 3, board: true, reward: 50000 },
	),
	fw(
		"parliament",
		"Reconciliation",
		"Before Parliament",
		"Earth",
		"Take the evidence to Earth’s Parliament. The case against the forces prolonging the war must survive both scrutiny and the journey.",
		{
			unlessFlag: "checkmate",
			cargo: 2,
			passengers: 2,
			reward: 42000,
			outcome:
				"The evidence reaches Parliament. A settlement becomes possible, and the Republic and Free Worlds begin to stand down.",
		},
	),
	fw(
		"deep-oathkeepers",
		"Reconciliation",
		"Allies beyond the front",
		"Valhalla",
		"Secure support from the Deep and carry the Oathkeepers’ reports to Valhalla. The investigation reaches beyond human fleet movements.",
		{ unlessFlag: "checkmate", passengers: 2, reward: 36000 },
	),
	fw(
		"soylent",
		"Reconciliation",
		"The Soylent trail",
		"Nimbus",
		"The Syndicate trail leads to Nimbus and the Soylent. Disable its defenders, board a ship, and recover the records before the evidence disappears.",
		{ unlessFlag: "checkmate", kills: 4, board: true, reward: 62000 },
	),
	fw(
		"pug-arrival",
		"Reconciliation",
		"When the lanes went silent",
		"New Tibet",
		"Rand’s transmissions have stopped. Survey the severed hyperlanes from Cebalrai and Ascella, then report to the Free Worlds on New Tibet. The missing links are real: the Pug have changed the routes through human space.",
		{
			kills: 0,
			scan: false,
			scanSystems: ["cebalrai", "ascella"],
			reward: 65000,
			flag: "pug-invasion",
			enemyFaction: "Pug",
			sourceMissions: ["FW Pug 1"],
		},
	),
	fw(
		"jump-drive",
		"Reconciliation",
		"A way between the stars",
		"Hephaestus",
		"A captured Jump Drive is being studied on Hephaestus. Escort the research shipment home. The device can cross short gaps without a hyperlane and opens routes far beyond human space.",
		{
			cargo: 5,
			kills: 3,
			reward: 55000,
			grantOutfit: "jump-drive",
			outcome:
				"The recovered Jump Drive is installed. Nearby systems can now be reached even without a hyperlane.",
		},
	),
	fw(
		"quarg-alliance",
		"Reconciliation",
		"Ask the ancient ones",
		"Lagrange",
		"The human fleets need every ally they can find. Carry a delegation to the Quarg. Their reply reminds you how small this war looks to those who have watched civilizations rise and fall.",
		{ passengers: 3, reward: 45000 },
	),
	fw(
		"pugglemug",
		"Reconciliation",
		"The battle at Pugglemug",
		"Pugglemug",
		"The combined human fleet converges on Deneb. Break the Pug defensive wing, scan the installation, and bring the final report to Pugglemug. The ships around you flew on opposite sides of the war only days ago.",
		{
			kills: 6,
			scan: true,
			reward: 125000,
			enemyFaction: "Pug",
			outcome:
				"The allied fleet holds. The Pug withdraw, leaving more questions than answers, but the invasion is over.",
		},
	),
	fw(
		"syndicate-answers",
		"Reconciliation",
		"Answers at Foundry",
		"Foundry",
		"With the Pug driven back, Admiral Danforth accompanies you to another meeting with the Syndicate leadership. Alastair Korban must account for a nuclear-armed extremist fleet now controlled by the Alphas.",
		{
			passengers: 1,
			reward: 42000,
			whenFlag: "reconciliation",
			sourceMissions: ["FW Syndicate Extremists 1"],
		},
	),
	fw(
		"cloak-at-hephaestus",
		"Reconciliation",
		"A shadow against the missiles",
		"Hephaestus",
		"Korban has offered a Cloaking Device for the operation. Take Danforth and the technical team to Hephaestus, where the yard will fit the device before you approach the extremists. The device drains power while concealing your ship.",
		{
			passengers: 1,
			reward: 38000,
			grantOutfit: "cloaking-device",
			whenFlag: "reconciliation",
			sourceMissions: [
				"FW Syndicate Extremists 1A",
				"FW Syndicate Extremists 1B",
			],
			outcome:
				"The Cloaking Device is installed. Toggle it with C or the Cloak control; watch your energy reserves.",
		},
	),
	fw(
		"algenib-extremists",
		"Reconciliation",
		"The nuclear fleet at Algenib",
		"Buccaneer Bay",
		"The Alpha-controlled Syndicate fleet occupies Algenib with nuclear weapons. Enter the system, draw its attention, and cloak to survive while the Oathkeepers move in. Keep the cloak powered for eight seconds, then reach Buccaneer Bay to confirm the fleet has been contained.",
		{
			requireTag: "cloak",
			whenFlag: "reconciliation",
			stealthSeconds: 8,
			encounterCount: 4,
			enemyFaction: "Syndicate (Extremist)",
			reward: 95000,
			sourceMissions: ["FW Syndicate Extremists 1B"],
			flag: "extremists-contained",
			outcome:
				"The bait worked. The Oathkeepers contain the extremist fleet, and Algenib falls under Navy protection.",
		},
	),
	fw(
		"parliament-resolution",
		"Reconciliation",
		"The last report to Parliament",
		"Earth",
		"Return to Parliament with your account of the Pug withdrawal and the extremist fleet. What began as a southern civil war now ends with a settlement, public answers, and a chance for the Republic and Free Worlds to rebuild.",
		{
			passengers: 1,
			reward: 180000,
			whenFlag: "reconciliation",
			sourceMissions: ["FW Syndicate Extremists 1C"],
			flag: "human-war-resolved",
			outcome:
				"Parliament accepts the report. The Free Worlds settlement stands, the nuclear threat is over, and the Starship Works release their new Stack Core to civilian outfitters.",
		},
	),
	fw(
		"checkmate-parliament",
		"Checkmate",
		"A settlement for the Free Worlds",
		"Earth",
		"Return to Parliament with Alondo and Katya to report the victory over the Pug. The Republic and Free Worlds must turn their wartime alliance into a lasting settlement, while Kaus Borealis is returned to the Republic.",
		{
			passengers: 2,
			reward: 180000,
			whenFlag: "checkmate",
			sourceFile: "data/human/free worlds 3 checkmate.txt",
			sourceMissions: ["FWC End"],
			sourceEvents: [
				"deep sky tech available",
				"syndicate tech available",
				"stack core for sale",
				"fwc kaus borealis ceded back",
			],
			flag: "human-war-resolved",
			outcome:
				"Parliament accepts the settlement. The Free Worlds retain their independence, the Republic regains Kaus Borealis, and the civilian yards release the technology developed during the war.",
		},
	),
	fw(
		"new-horizon",
		"Epilogue",
		"A sky worth keeping",
		"New Boston",
		"Return to New Boston. The Free Worlds have survived, the human war has ended, and the Pug have withdrawn. You have earned a place in this history. There are still unexplored stars beyond every frontier.",
		{
			reward: 100000,
			outcome:
				"On New Boston, nobody can quite reconcile the captain on the news with the person who left in a tiny ship. The rain smells the same. For the first time in years, the sky is peaceful. Your next destination belongs to you.",
		},
	),
];
const arc = (id, name, faction, sourceFile, definitions) => ({
	id,
	name,
	faction,
	description: `A condensed adaptation of ${name}.`,
	missions: definitions.map((definition, index) =>
		mission(`${id}-${index + 1}`, definition[0], definition[1], definition[2], {
			chapter: name,
			faction,
			sourceFile,
			reward: 26000 + index * 5000,
			...(definition[3] || {}),
		}),
	),
});
export const ARCS = [
	arc("hai", "Beyond the wormhole", "Hai", "data/hai/hai missions.txt", [
		[
			"A human among the Hai",
			"Hai-home",
			"Beyond the northern wormhole, humans have lived beside the Hai for generations. Visit Hai-home and survey the civilian traffic.",
			{ scan: true },
		],
		[
			"The stowaway",
			"Hai-home",
			"A Hai stowaway wants a passage home. Return them safely and listen to the lives that lie behind an unfamiliar face.",
			{ passengers: 1 },
		],
		[
			"Turner’s route",
			"Stonebreak",
			"Turner sees a trade route between human and Hai space. Carry a trial shipment and help build something more durable than a first-contact rumor.",
			{ cargo: 10, flag: "hai-license" },
		],
		[
			"Unfettered border",
			"Hai-home",
			"The Unfettered reject the restraint of the Hai government. Defend a civilian convoy near Hai-home and recover its attackers’ logs.",
			{ kills: 3, board: true, flag: "hai-unfettered-contact" },
		],
	]),
	arc(
		"remnant",
		"The Ember Waste",
		"Remnant",
		"data/remnant/remnant 1 introduction.txt",
		[
			[
				"A hidden humanity",
				"Caelian",
				"The Remnant have made a home in the Ember Waste. Help defend Caelian from Korath raiders, then submit to their cautious first-contact procedures.",
				{ kills: 3 },
			],
			[
				"A warning in the waste",
				"Caelian",
				"Plant a surveillance package and scan the approaches. The Remnant cannot afford to be surprised by the next Korath raid.",
				{ cargo: 4, scan: true },
			],
			[
				"A different source of keystones",
				"Viminal",
				"Hai quantum keystones could ease the Remnant’s isolation. Bring a sample shipment to the outfitter on Viminal.",
				{ cargo: 5, grantOutfit: "quantum-keystone" },
			],
			[
				"Creatures between the stars",
				"Aventine",
				"The Remnant are studying void sprites. Carry the research team to Aventine and record a long-range scan of their habitat.",
				{ passengers: 2, scan: true, grantShip: "puffin" },
			],
			[
				"The Puffin survey",
				"Aventine",
				"A Puffin exploration program ventures into the gas-giant habitats of the void sprites. Return atmospheric samples and sensor data to the Remnant scientists.",
				{
					cargo: 5,
					scan: true,
					visitPlanets: ["Nasqueron", "Slylandro"],
					requireTag: "gaslining",
				},
			],
			[
				"Earned trust",
				"Viminal",
				"A prefect is ready to sponsor your Remnant license. Carry the official home and protect the final approach.",
				{ passengers: 1, kills: 2, flag: "remnant-license", reward: 65000 },
			],
		],
	),
	arc(
		"wanderers",
		"The gardeners of broken worlds",
		"Wanderer",
		"data/wanderer/wanderers start.txt",
		[
			[
				"The new neighbors",
				"Spera Anatrusk",
				"Meet the Wanderers and survey the worlds they are patiently restoring. Their ships carry seed, soil, and an optimism that seems impossible in Korath space.",
				{ scan: true },
			],
			[
				"A garden after the war",
				"Spera Anatrusk",
				"Carry terraforming equipment to the Wanderer settlements. Their work is practical: damaged soils, poisoned air, and worlds that can become homes again.",
				{ cargo: 12 },
			],
			[
				"The Mereti control system",
				"Setar Fort",
				"Korath machine fleets continue a war without living commanders. Disable their attackers and board one to recover a control record for analysis.",
				{ kills: 4, board: true },
			],
			[
				"The Sestor threat",
				"Setar Fort",
				"A rival autonomous fleet threatens the restoring worlds. Defeat its forward ships and retrieve the sensor signatures that distinguish it from the Mereti.",
				{ kills: 4, scan: true },
			],
			[
				"Rek after the Molt",
				"Setar Fort",
				"Rek after the Molt need supplies and a future beyond raiding. Deliver humanitarian cargo through the machine war.",
				{ cargo: 12, kills: 3 },
			],
			[
				"A colony under attack",
				"Spera Anatrusk",
				"Protect a Wanderer colony while its evacuees board your ship. Every restored field is too precious to abandon, but the people must survive.",
				{ passengers: 3, kills: 5 },
			],
			[
				"The Pug beyond the garden",
				"Vara Pug",
				"Follow the Wanderers’ search for help to the Pug. Survey their domain and bring back a record of the encounter. The answers will not be as simple as an alliance.",
				{ scan: true, flag: "wanderer-license", reward: 85000 },
			],
		],
	),
	arc(
		"coalition",
		"Three peoples, one sky",
		"Coalition",
		"data/coalition/coalition missions.txt",
		[
			[
				"The Ring of Friendship",
				"Ring of Friendship",
				"Register with the Coalition at the Ring of Friendship. Saryds, Kimek, and Arachi share these worlds under the watch of the Heliarchs.",
				{ passengers: 1 },
			],
			[
				"The value of yottrite",
				"Bloptab's Furnace",
				"Arachi researchers are studying yottrite. Mine a sample batch and bring your mineral report to Bloptab’s Furnace.",
				{ mine: 3 },
			],
			[
				"A place as a contributor",
				"Ring of Friendship",
				"Your work has earned a hearing with the Heliarchs. Bring a contribution of industrial supplies and apply for contributor status.",
				{ cargo: 12, flag: "coalition-license" },
			],
			[
				"The other voices",
				"Ring of Friendship",
				"The Heliarchs present order; the Lunarium asks who pays for it. Carry an observer delegation and choose whose confidence to cultivate.",
				{
					passengers: 2,
					choices: [
						{
							id: "order",
							label: "Work with the Heliarchs",
							flag: "heliarch-contact",
							bonus: 10000,
							description: "Gain the ruling authority’s trust.",
							outcome:
								"The Heliarch liaison opens a guarded but valuable channel.",
						},
						{
							id: "reform",
							label: "Hear the Lunarium",
							flag: "lunarium-contact",
							description: "Listen to the reformers.",
							outcome:
								"A quiet meeting introduces you to the Lunarium and its hopes for change.",
						},
					],
				},
			],
		],
	),
	arc(
		"deep",
		"Questions from the Deep",
		"Republic",
		"data/human/deep missions.txt",
		[
			[
				"A convoy for science",
				"Memory",
				"The Deep’s researchers need a supply convoy. Carry instruments through pirate interference and deliver them to Memory.",
				{ cargo: 8, kills: 2 },
			],
			[
				"Lieutenant Paris’s cubes",
				"Memory",
				"Lieutenant Paris has entrusted you with mysterious cubes. Deploy a test batch and survey the response before reporting to the Deep.",
				{ cargo: 4, scan: true },
			],
			[
				"Beelzebub’s blockade",
				"Maelstrom",
				"The warlord Beelzebub is the target of a blockade at Maelstrom. Disable a runner and recover its flight record.",
				{ kills: 3, board: true },
			],
			[
				"Reinforcements for Farpoint",
				"Farpoint",
				"Deliver the reinforcements that hold Farpoint’s blockade together. The Deep’s quiet experiments have become a very public crisis.",
				{ passengers: 3, kills: 3, flag: "deep-license" },
			],
		],
	),
	arc(
		"sheragi",
		"The archaeology of silence",
		"Republic",
		"data/sheragi/archaeology missions.txt",
		[
			[
				"Foster’s samples",
				"Midgard",
				"An archaeologist on Vinci is investigating an ancient church on Midgard. Bring back survey data and wood samples that might place it in a much older history.",
				{ scan: true, cargo: 2 },
			],
			[
				"Below the ruins",
				"Zug",
				"Albert Foster’s work leads to Zug and traces of an ancient alien civilization. Deliver excavation equipment and protect the dig.",
				{ cargo: 10, kills: 2 },
			],
			[
				"The xenobiologist",
				"Lagrange",
				"Meet Amelia Lee and her Quarg friend Yarthis at Lagrange. Their expertise could explain what Foster has found.",
				{ passengers: 2 },
			],
			[
				"Defend the dig",
				"Zug",
				"Pirates descend on Zug. Keep the excavation team alive and survey the exposed remains when the airspace is clear.",
				{ kills: 4, scan: true, flag: "sheragi-discovery", reward: 65000 },
			],
		],
	),
	arc("kestrel", "A ship of your own", "Republic", "data/human/kestrel.txt", [
		[
			"The Kestrel trial",
			"Wayfarer",
			"Tarazed is testing a new warship. Disable the prototype’s escort wing and return your telemetry to the engineers. Your feedback helps decide the shape of the Kestrel program.",
			{ kills: 4, scan: true },
		],
		[
			"The final specification",
			"Wayfarer",
			"The yard offers a choice of emphasis for its new design. Deliver the test record and make your recommendation.",
			{
				cargo: 2,
				choices: [
					{
						id: "weapons",
						label: "Prioritize weapons",
						flag: "kestrel-weapons",
						description: "Support the combat design.",
						outcome: "The weapons layout is approved for your Kestrel license.",
					},
					{
						id: "engines",
						label: "Prioritize engines",
						flag: "kestrel-engines",
						description: "Support the fast design.",
						outcome: "The engine layout is approved for your Kestrel license.",
					},
					{
						id: "shields",
						label: "Prioritize shields",
						flag: "kestrel-shields",
						description: "Support the defensive design.",
						outcome: "The shield layout is approved for your Kestrel license.",
					},
					{
						id: "bays",
						label: "Add more fighter bays",
						flag: "kestrel-bays",
						description: "Carry two additional fighters or drones.",
						outcome:
							"Two additional fighter bays are approved for the Kestrel.",
					},
				],
				flag: "kestrel-license",
			},
		],
	]),
	arc(
		"musicians",
		"There Might Be Riots",
		"Republic",
		"data/human/deep missions.txt",
		[
			[
				"Find the band",
				"Greenwater",
				"The scientists on Midgard want a concert by There Might Be Riots. Follow the band’s trail to Greenwater and offer them a ride.",
				{ passengers: 1 },
			],
			[
				"A concert in the Deep",
				"Midgard",
				"Carry the band and their instruments to Midgard. For one night, the scientists will have something to talk about besides research and war.",
				{ passengers: 3, cargo: 5, reward: 38000, flag: "tmbr-concert" },
			],
		],
	),
	arc(
		"avgi",
		"Voices of the Twilight",
		"Avgi",
		"data/avgi/avgi 0 first contact.txt",
		[
			[
				"The ship that beckoned",
				"Peripheria",
				"Follow the Avgi invitation to Peripheria. Scan the unfamiliar sky and establish a channel with the people of the Twilight.",
				{ scan: true },
			],
			[
				"A human on Aktina",
				"Aktina Cylinder",
				"Another human, Darius Calwell, is stranded in Avgi space. Visit Aktina Cylinder and hear the journey that brought him here.",
				{ passengers: 1 },
			],
			[
				"The defense of Ensemble",
				"Weledos",
				"An Aberrant raid threatens Ensemble. Join the defenders and hold the line until the relief force arrives.",
				{ kills: 5 },
			],
			[
				"The miners’ delegation",
				"Outpost Tekis",
				"Carry the Consonance delegate Hriso to the miners at Outpost Tekis. Negotiation is another kind of difficult approach.",
				{ passengers: 1 },
			],
			[
				"A way home",
				"Valhalla",
				"Carry Darius home to Valhalla. The sky has changed him; perhaps someone there has kept a place for him.",
				{ passengers: 1, flag: "avgi-contact", reward: 60000 },
			],
		],
	),
	arc(
		"gegno",
		"Between Vi and Scin",
		"Gegno",
		"data/gegno/gegno intro missions.txt",
		[
			[
				"A traveler called Gegno",
				"Dueyu Eitch",
				"Bring the Gegno traveler you assisted to Dueyu Eitch. The Vi receive you cautiously, and your translator is working at its limits.",
				{ passengers: 1 },
			],
			[
				"The Scin’s coordinates",
				"Yiia Iyr",
				"A strange device displays coordinates in Scin space. Follow them to Yiia Iyr and scan the station before approaching.",
				{ scan: true },
			],
			[
				"Adrauni’s warning",
				"Giaru Gegno",
				"Visit the Quarg in Gegno space. Adrauni has watched the tension between Vi and Scin for longer than any human captain could.",
				{ passengers: 1, flag: "gegno-contact" },
			],
		],
	),
	arc(
		"bunrodea",
		"An intriguing invitation",
		"Bunrodea",
		"data/bunrodea/bunrodea missions.txt",
		[
			[
				"The observers",
				"Erabuthro",
				"Mantis-like aliens have followed your ship through human space. Their transmission is an invitation, or perhaps a summons. Visit Erabuthro and learn who has been watching.",
				{ scan: true, flag: "bunrodea-contact", reward: 55000 },
			],
		],
	),
	arc(
		"incipias",
		"The stranded and the silent",
		"Quarg",
		"data/incipias/incipias first contact.txt",
		[
			[
				"The guardian’s warning",
				"Pon'tes",
				"A guardian watches the Incipias frontier. Approach carefully, scan the system, and seek a way to communicate with its people.",
				{ scan: true },
			],
			[
				"Help for a stranded ship",
				"Pon'tes",
				"A disabled Incipias vessel needs help. Carry the rescue specialists and their equipment home, making a connection one rescued crew at a time.",
				{ passengers: 2, cargo: 5, flag: "incipias-contact" },
			],
		],
	),
	arc(
		"kahet",
		"Death in the Graveyard",
		"Remnant",
		"data/kahet/kahet missions.txt",
		[
			[
				"A machine in the wreckage",
				"Viminal",
				"The Remnant have encountered unfamiliar Ka’het machines. Deliver wreckage samples and a sensor report to Viminal.",
				{ cargo: 5, scan: true },
			],
			[
				"Plume’s expedition",
				"Aventine",
				"Plume’s team is studying an unusual downed Ka’het. Protect the return convoy and recover a hostile machine’s control record.",
				{ kills: 4, board: true },
			],
			[
				"The ringworld debris",
				"Aventine",
				"Analyze the remnants of the broken ringworld with the Remnant team. The Graveyard contains the aftermath of a history far larger than the human war.",
				{ mine: 4, scan: true, flag: "kahet-research" },
			],
		],
	),
	arc(
		"successors",
		"The Houses beyond the horizon",
		"Successor",
		"data/successors/successor 1 prologue.txt",
		[
			[
				"The first House",
				"Staja-Kella-Oa",
				"Enter the territory of the Successor Houses at Staja-Kella-Oa. Every greeting is also a statement of allegiance. Survey the approaches before meeting the authorities.",
				{ scan: true },
			],
			[
				"Kaatrij’s passage",
				"Raaqa-Puan-Uuoru",
				"Carry Kaatrij’s delegation to Raaqa-Puan-Uuoru. The Houses’ disagreements reach into questions of inheritance, technology, and who may shape the future.",
				{ passengers: 2, cargo: 4, flag: "successor-contact" },
			],
		],
	),
	arc("drak", "Those who watch", "Drak", "data/drak/drak missions.txt", [
		[
			"The distant guardian",
			"Earth",
			"Reports from several peoples describe immense guardians. Gather the human observations around Jupiter and Earth without provoking the watchers.",
			{ scan: true },
		],
		[
			"A patient perspective",
			"Darkwaste",
			"The Hai have their own stories about the Drak. Carry the observations to Darkwaste and compare the accounts. Some powers in this galaxy measure time in civilizations.",
			{ cargo: 2, scan: true, flag: "drak-observed" },
		],
	]),
];
ARCS.push(...createExpandedArcs({ mission }));

// Licenses are progression rewards, while ordinary human models remain open to an independent captain.
for (const ship of SHIPS) {
	if (ship.sourceFile.includes("/remnant/"))
		ship.requiredFlag = "remnant-license";
	else if (ship.sourceFile.includes("/wanderer/"))
		ship.requiredFlag = "wanderer-license";
	else if (ship.sourceFile.includes("/coalition/"))
		ship.requiredFlag = "coalition-license";
	else if (ship.id.startsWith("kestrel")) ship.requiredFlag = "kestrel-license";
}
