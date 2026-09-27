/** GPL-3.0-or-later. Authored, condensed adaptations of the cited source missions.
 * These arcs preserve the later story stages; their workload, pacing, and combat scale
 * are browser adaptations. Native quest interpretation remains a separate system.
 */
const row = (sourceMissions, target, name, description, requirements = {}) => ({
	sourceMissions: Array.isArray(sourceMissions)
		? sourceMissions
		: [sourceMissions],
	target,
	name,
	description,
	...requirements,
});
const scan = { scan: true };
const passage = { passengers: 2 };
const freight = { cargo: 8 };
const battle = { kills: 4 };
const boarding = { kills: 3, board: true };
const choice = (id, label, flag, outcome) => ({
	id,
	label,
	flag,
	description: outcome,
	outcome,
});

const heli = (requirements = {}) => ({
	...requirements,
	whenFlag: "expanded-heliarch",
});
const lunar = (requirements = {}) => ({
	...requirements,
	whenFlag: "expanded-lunarium",
});
const specifications = [
	{
		id: "wanderer-exodus",
		name: "Wanderers · the long evacuation",
		faction: "Wanderer",
		requiredFlag: "hai-license",
		file: "data/wanderer/wanderers start.txt",
		missions: [
			row(
				[
					"First Contact: Wanderer",
					"Wanderers: Hai Diplomat",
					"Wanderers: Diplomacy",
				],
				"Vara K'chrai",
				"Sayari’s introduction",
				"Carry the Hai diplomat Sayari to the Wanderer homeworld. Shared language is the first bridge between the two civilizations.",
				{ passengers: 1 },
			),
			row(
				["Wanderers: Translation Machine", "Human Cultural Archives"],
				"Alexandria",
				"A language in exchange",
				"Collect a copy of humanity’s cultural archives for Eruk, the Hai technologist working on a translation machine.",
				{ cargo: 4, scan: true },
			),
			row(
				["Cultural Data to Greenwater", "Visit Wanderers Again"],
				"Greenwater",
				"The translation machine",
				"Bring the cultural archive to Eruk and collect the translator that will let you speak with the Wanderers more freely.",
				{ cargo: 4, flag: "wanderer-translator" },
			),
			row(
				[
					"Wanderers: Defend Vara Ke'sok Hint",
					"Wanderers: Defend Vara Ke'sok",
					"Wanderers: Defended Vara Ke'sok",
				],
				"Vara Ke'sok",
				"A frontier under attack",
				"Deliver the repair shipment and defend Vara Ke’sok from an Unfettered attack. The pressure is moving deeper into Wanderer space.",
				{ cargo: 8, kills: 4 },
			),
			row(
				[
					"Wanderers: Unfettered Diplomacy 1",
					"Wanderers: Unfettered Diplomacy 1A",
					"Wanderers: Unfettered Diplomacy 1B",
					"Wanderers: Unfettered Diplomacy 1C",
				],
				"Firelode",
				"Food as a peace offering",
				"Carry the Wanderer food consignment to Firelode. Iktat Rek hopes a negotiated pause will protect more lives than another battle.",
				{ cargo: 12, passengers: 1 },
			),
			row(
				["Wanderers: Truce Check", "Wanderers: Jump Drive Source"],
				"Vara K'chrai",
				"Where the jump drives come from",
				"Bring back the Unfettered trade records. Rek wants to know who has been supplying the technology behind their growing reach.",
				{ scan: true, cargo: 4 },
			),
			row(
				[
					"Wanderers: Alpha Surveillance A",
					"Wanderers: Alpha Surveillance B",
					"Wanderers: Alpha Surveillance C",
				],
				"Alta Hai",
				"An Alpha connection",
				"Deliver the surveillance record to Alta Hai. The Quarg may be able to track the supplier that ordinary hyperspace sensors cannot follow.",
				{ cargo: 4, scan: true },
			),
			row(
				[
					"Wanderers: Alpha Surveillance D",
					"Wanderers: Alpha Surveillance E",
					"Wanderers: Alpha Surveillance F",
				],
				"Avalon",
				"Danforth’s expedition",
				"Join Danforth’s expedition to Avalon. Defeat the defenders and recover the Alpha base’s supply record.",
				{ kills: 5, board: true },
			),
			row(
				[
					"Wanderers: Alpha Surveillance G",
					"Wanderers: Alpha Surveillance H",
					"Wanderers: Alpha Surveillance I",
					"Wanderers: Alpha Surveillance J",
				],
				"Vara K'chrai",
				"The report after Avalon",
				"Return the expedition report to Rek after seeing Elias Hanover safely back to Quarg protection. The supplier is exposed, but the invasion threat remains.",
				{ cargo: 4, passengers: 1 },
			),
			row(
				["Wanderers Invaded 0", "Wanderers Invaded 1", "Wanderers Invaded 1B"],
				"Var' Kar'i'i",
				"Freighters for refugees",
				"Help the evacuation fleet carry people away from the frontier. Civilian hulls now serve as refugee transports.",
				{ passengers: 3, cargo: 6 },
			),
			row(
				["Wanderers Invaded 2", "Wanderers Invaded 3", "Wanderers Invaded 3B"],
				"Varu Mer'ek",
				"Time bought in battle",
				"Drive off the Unfettered assault and protect the next civilian departure. The defenders are fighting for time, not territory.",
				{ kills: 5, passengers: 2 },
			),
			row(
				[
					"Wanderers Invaded 3C",
					"Wanderers Hai Assistance 1",
					"Wanderers Hai Assistance 2",
					"Wanderers Hai Assistance 3",
				],
				"Darkcloak",
				"A pause at the front",
				"Bring Sayari’s appeal to Darkcloak. The Hai are trying to restrain the Unfettered long enough for the Wanderers to evacuate.",
				{ passengers: 1, scan: true },
			),
			row(
				[
					"Wanderers Solifuge Recon 1",
					"Wanderers Solifuge Recon 2",
					"Wanderers Solifuge Recon 3",
					"Wanderers Solifuge Recon 4",
				],
				"Vara Ke'sok",
				"The new Unfettered warship",
				"Defeat the new attackers and recover the Solifuge reconnaissance. Their development is alarming even the Hai council.",
				{ kills: 5, board: true },
			),
			row(
				[
					"Wanderers Evacuation 1",
					"Wanderers Evacuation 1B",
					"Wanderers Evacuation 1C",
					"Wanderers Defend Sich'ka'ara",
				],
				"Vara K'chrai",
				"Another convoy home",
				"Bring the refugees to the homeworld and defend the closing approach. Every completed transport buys another family a future.",
				{ passengers: 3, kills: 5 },
			),
			row(
				["Wanderers Rescue 1", "Wanderers Rescue 1B", "Wanderers Rescue 1C"],
				"Kort Vek'kri",
				"The warriors left behind",
				"Cover the rescue operation on the occupied world. Recover the stranded warriors and their flight records.",
				{ passengers: 3, kills: 5 },
			),
			row(
				[
					"Wanderers Rek 0",
					"Wanderers Rek 1",
					"Wanderers Rek 2",
					"Wanderers Rek 3",
				],
				"Tik Klai",
				"Rek and the Eye",
				"Take the ailing Rek to Tik Klai and survey Sko’karak for the change he expects. The Eye may offer a future beyond the invasion.",
				{ passengers: 1, scanSystems: ["Sko'karak"] },
			),
			row(
				["Wanderers Ap'arak 1", "Wanderers Ap'arak 2", "Wanderers Ap'arak 3"],
				"Varu Tev'kei",
				"A stand at Ap’arak",
				"Join the defense where the Wanderers have chosen to make their stand. Protect the civilian route while their leaders prepare the next stage of their people’s journey.",
				{
					kills: 6,
					flag: "wanderer-exodus-complete",
					reward: 115000,
					outcome:
						"The evacuation and defense records are complete. The Wanderers have survived this stage of the invasion, with the Eye and the damaged Korath worlds opening another chapter.",
				},
			),
		],
	},

	{
		id: "remnant-cognizance",
		name: "Cognizance · the living void",
		faction: "Remnant",
		requiredFlag: "remnant-license",
		file: "data/remnant/remnant 2 cognizance.txt",
		missions: [
			row(
				"Remnant: Cognizance 1",
				"Nasqueron",
				"Return to Nenia",
				"Plume requests follow-up observations of the void sprites. Take a new atmospheric survey from Nasqueron before comparing it with the earlier research.",
				scan,
			),
			row(
				["Remnant: Cognizance 2", "Remnant: Cognizance 3"],
				"Caelian",
				"Chilia’s emergency",
				"A Korath incursion interrupts the research. Break the raiders threatening the route and take Plume’s warning to Prefect Chilia.",
				battle,
			),
			row(
				["Remnant: Cognizance 4", "Remnant: Cognizance 5"],
				"Caelian",
				"Hunt in the Ember Waste",
				"Chilia needs the newly detected Korath force contained before it can reach the hidden settlements. Patrol Caelian’s approaches and eliminate the raiders.",
				{ kills: 5, scan: true },
			),
			row(
				["Remnant: Cognizance 6", "Remnant: Cognizance 7"],
				"Nasqueron",
				"A witness among the sprites",
				"Carry Plume to Nasqueron. The researchers need firsthand observations of the strange change in the void sprites.",
				{ passengers: 1, scan: true },
			),
			row(
				["Remnant: Cognizance 8", "Remnant: Cognizance 9"],
				"Esquiline",
				"The engineering record",
				"Plume’s records point to a new experiment. Carry an engineer and the instrument package to Esquiline.",
				{ passengers: 1, cargo: 6 },
			),
			row(
				["Remnant: Cognizance 10", "Remnant: Cognizance 11"],
				"Viminal",
				"A crystal of measurements",
				"A technician has prepared the comparison readings. Deliver the data crystal and calibration equipment to Viminal.",
				freight,
			),
			row(
				"Remnant: Cognizance 12",
				"Esquiline",
				"A shipment of atmosphere",
				"Protect the transport carrying an atmosphere shipment to the experiment on Esquiline. Clear its approach and deliver the pressure-control package.",
				{ cargo: 10, kills: 3 },
			),
			row(
				["Remnant: Cognizance 13", "Remnant: Cognizance 14"],
				"Ssil Vida",
				"Waves in the dark",
				"Chilia’s sensors have detected unusual gravitational waves. Investigate Ssil Vida and bring back a careful survey.",
				scan,
			),
			row(
				[
					"Remnant: Cognizance 15",
					"Remnant: Cognizance 16",
					"Remnant: Cognizance 17",
				],
				"Nasqueron",
				"The creature’s constellations",
				"The creature appears to arrange constellations as a guide. Follow its signal to Nasqueron and record the encounter without firing.",
				scan,
			),
			row(
				["Remnant: Cognizance 18", "Remnant: Cognizance 19"],
				"Aventine",
				"The Pelican collection",
				"The Pelican crews return with void-sprite observations and new navigation data. Protect the rendezvous and deliver their samples.",
				{ cargo: 8, kills: 3 },
			),
			row(
				[
					"Remnant: Cognizance 20",
					"Remnant: Cognizance 21",
					"Remnant: Cognizance 22",
				],
				"Ssil Vida",
				"A laboratory beyond the charts",
				"Establish the next expedition at Ssil Vida with researchers, instruments and Taely’s backed-up records.",
				{ passengers: 3, cargo: 12, scan: true },
			),
			row(
				"Remnant: Cognizance 23",
				"Ssil Vida",
				"First flight of the Merganser",
				"The Merganser needs cover for its first sortie. Destroy the Korath attackers while the experimental craft gathers its flight data.",
				{ kills: 5 },
			),
			row(
				["Remnant: Cognizance 24", "Remnant: Cognizance 25"],
				"Ssil Vida",
				"Dusk’s working station",
				"Bring Dusk’s equipment and sweep the nearby approaches for anything the passing Palavret left behind.",
				{ cargo: 10, scan: true, kills: 3 },
			),
			row(
				["Remnant: Cognizance 26", "Remnant: Cognizance 27"],
				"Caelian",
				"An Aeon Cell and a rescue team",
				"Gavriil needs a power-cell shipment, and Torza is gathering a recovery team. Bring the equipment manifest to Caelian.",
				{ cargo: 8, passengers: 2 },
			),
			row(
				"Remnant: Cognizance 28",
				"Baianus",
				"Recovery at Baianus",
				"Torza’s expedition must recover personnel and equipment from Baianus. Survey the site and bring the recovery team in safely.",
				{ passengers: 3, cargo: 10, scan: true },
			),
			row(
				[
					"Remnant: Cognizance 29",
					"Remnant: Cognizance 30",
					"Remnant: Cognizance 31",
				],
				"Viminal",
				"What the station remembers",
				"Return the recovered team and its records to Viminal. Chilia needs the findings before committing more people to Ssil Vida.",
				{ passengers: 3, cargo: 10 },
			),
			row(
				"Remnant: Cognizance 32",
				"Clink",
				"Fuel from an unlikely port",
				"The next experiment needs refined fuel from Clink. Collect a shipment and protect its loading operation.",
				{ cargo: 12, kills: 3 },
			),
			row(
				"Remnant: Cognizance 33",
				"Ssil Vida",
				"Fuel through the waste",
				"Bring the refined fuel to Ssil Vida. The delivery has drawn hostile attention; clear the interceptors before making the final approach.",
				{ cargo: 12, kills: 4 },
			),
			row(
				["Remnant: Cognizance 34", "Remnant: Cognizance 35"],
				"Ssil Vida",
				"Postverta changes",
				"Dusk asks you to observe what is happening outside and survey the surrounding system. These measurements will determine the next experiment.",
				scan,
			),
			row(
				["Remnant: Cognizance 36", "Remnant: Cognizance 37"],
				"Ssil Vida",
				"Darkness, then light",
				"Coordinate the station’s power-off and restoration experiment. Scan the response and decide what to preserve in the next research record.",
				{
					scan: true,
					choices: [
						choice(
							"caution",
							"Emphasize safe observation",
							"cognizance-caution",
							"The report prioritizes measured observation before further intervention.",
						),
						choice(
							"inquiry",
							"Emphasize further experiments",
							"cognizance-inquiry",
							"The report argues for a carefully controlled continuation of the research.",
						),
					],
				},
			),
			row(
				["Remnant: Cognizance 38", "Remnant: Cognizance 39"],
				"Viminal",
				"Cognizance",
				"Bring the complete research record to Viminal. The Remnant now have the evidence to judge Ssil Vida’s changes and prepare future expeditions.",
				{
					cargo: 6,
					reward: 105000,
					flag: "cognizance-complete",
					outcome:
						"The findings enter the Remnant archive. Plume, Dusk and Chilia have a shared record of what changed in the living void.",
				},
			),
		],
	},
	{
		id: "successor-ghosts",
		name: "Ghosts · the heirloom warship",
		faction: "Successor",
		requiredFlag: "successor-contact",
		file: "data/successors/successor 2 ghosts.txt",
		missions: [
			row(
				"Successors: Ghosts 1",
				"Shassa-Wyra-Orrou",
				"A summons from Seineq",
				"House Seineq wants an independent investigator after the incident at Qasa-Sija-Iri. Hear its commission and collect the first sensor package.",
				freight,
			),
			row(
				"Successors: Ghosts 2",
				"Shassa-Wyra-Orrou",
				"Eyes beyond the wormhole",
				"Deploy Seineq’s sensor net and survey the approaches. Someone may be using the old space beyond the wormhole.",
				scan,
			),
			row(
				[
					"Successors: Ghosts 3a Sioeora",
					"Successors: Ghosts 3b Kaatrij",
					"Successors: Ghosts 4",
				],
				"Raaqa-Puan-Uuoru",
				"The Houses compare stories",
				"Report the investigation to Kaatrij and bring back its account. Aqrabe’s research and Myurej’s wedding troubles offer separate leads for an independent captain.",
				passage,
			),
			row(
				["Successors: Ghosts 5", "Successors: Ghosts 6"],
				"Raaqa-Uur-Kaav",
				"Saajret’s fieldwork",
				"Carry Saajret and Kaatrij’s scientific equipment to examine the wildlife on Raaqa-Uur-Kaav.",
				{ passengers: 1, cargo: 6, scan: true },
			),
			row(
				["Successors: Ghosts 7a", "Successors: Ghosts 7b"],
				"Raaqa-Puan-Uuoru",
				"Saajret’s detour",
				"Saajret asks for a personal detour before returning home. Choose whether to make time for the request.",
				{
					passengers: 1,
					choices: [
						choice(
							"detour",
							"Hear Saajret’s request",
							"ghosts-saajret-trust",
							"You make time for Saajret’s concern and earn a more personal confidence.",
						),
						choice(
							"direct",
							"Return on the agreed schedule",
							"ghosts-duty",
							"The ship keeps its agreed schedule; Saajret’s request remains unanswered.",
						),
					],
				},
			),
			row(
				[
					"Successors: Ghosts Cloak Prompt",
					"Successors: Ghosts 8",
					"Successors: Ghosts 9",
					"Successors: Ghosts 10",
				],
				"Qasa-Sija-Iri",
				"Kaatrij’s hidden work",
				"Investigate the hidden base at Qasa-Sija-Iri. The sensor record and Saajret’s account bring you into Kaatrij’s investigation.",
				{ scan: true, kills: 3 },
			),
			row(
				"Successors: Ghosts 11",
				"Qasa-Sija-Iri",
				"The archive’s missing pieces",
				"Carry the recovered archive material and Saajret’s analysis back to the base. The old records may explain what the Houses have awakened.",
				{ cargo: 6, passengers: 1 },
			),
			row(
				["Successors: Ghosts 12", "Successors: Ghosts 13"],
				"Kasii-Cavasaa-Oa",
				"Modified keystones",
				"Collect Aqrabe’s modified quantum keystones and the test record. The new shipment is needed for the investigation beyond the wormhole.",
				freight,
			),
			row(
				"Successors: Ghosts 14",
				"Qasa-Sija-Iri",
				"The compromised sensor net",
				"Kaatrij suspects the old sensor probes are being used against it. Defeat the ships guarding the compromised net and return the recovered control record.",
				{ kills: 4, board: true },
			),
			row(
				["Successors: Ghosts 15", "Successors: Ghosts 16"],
				"Kasii-Sola",
				"The station in the veil",
				"The hidden station has become visible in Kasii-Sola. Bring Saajret to investigate its systems and record what has happened.",
				{
					passengers: 1,
					scan: true,
					destinationName: "Ijra-Ea, Shimmering Veil",
					revealPlanet: {
						systemId: "kasii-sola",
						planetName: "Ijra-Ea, Shimmering Veil",
					},
				},
			),
			row(
				"Successors: Ghosts 17",
				"Qasa-Sija-Iri",
				"A pursuit from the past",
				"The investigation draws a drone warship after you. Protect the retreat and return the station’s record to Kaatrij.",
				{ kills: 4, cargo: 4 },
			),
			row(
				"Successors: Ghosts 18",
				"Myiara-Aret-Iir",
				"A net for the unseen",
				"Deploy the Quarg cloak-detection equipment beyond the wormhole. Scan the coverage before the heirloom warship arrives.",
				{ cargo: 8, scan: true },
			),
			row(
				"Successors: Ghosts 19",
				"Qasa-Sija-Iri",
				"The heirloom warship",
				"Join Kaatrij’s strike against the Myiaran heirloom warship and return for the debriefing. The Houses must confront a danger from their own inheritance.",
				{ kills: 6, board: true, reward: 105000 },
			),
			row(
				[
					"Successors: Ghosts 20",
					"Successors: Ghosts Black Box",
					"Successors: Ghosts Reincarnation",
				],
				"Iyra-Ijasa-Iret",
				"The wedding after the ghosts",
				"Carry the final dispatch to the Myurej–Chydiyi wedding. The investigation has ended, but the records and the survivors will shape the Houses’ next choices.",
				{
					passengers: 2,
					flag: "ghosts-complete",
					reward: 70000,
					outcome:
						"The wedding proceeds with the legacy of the investigation close at hand. Your part in the Houses’ crisis is now part of their history.",
				},
			),
		],
	},
	{
		id: "aqrabe-gardens",
		name: "Aqrabe · a garden inside a star",
		faction: "Successor",
		requiredFlag: "successor-contact",
		file: "data/successors/successor 2 ghosts aqrabe.txt",
		missions: [
			row(
				[
					"Successors: Ghosts Aqrabe 1",
					"Successors: Ghosts Aqrabe Remnant",
					"Successors: Ghosts Aqrabe Hai",
				],
				"Kasii-Cavasaa-Oa",
				"Aqrabe’s keystones",
				"House Aqrabe needs quantum keystones for its experiments. Deliver a sample consignment and compare its behavior with the House’s own equipment.",
				{ cargo: 10, scan: true },
			),
			row(
				"Successors: Ghosts Aqrabe 2",
				"Myiara-Aret-Iir",
				"A different resonance",
				"Accompany Aqrabe’s test expedition through the wormhole. Survey the keystone response at Myiara-Aret-Iir.",
				{ scan: true, passengers: 2 },
			),
			row(
				"Successors: Ghosts Aqrabe 3",
				"Kasii-Cavasaa-Oa",
				"The stellar garden",
				"Aqrabe’s first attempt to reach the exotic-metal garden raises a practical problem. Bring back the readings so its engineers can plan a specialized vessel.",
				scan,
			),
			row(
				"Successors: Ghosts Aqrabe 4",
				"Raaqa-Puan-Uuoru",
				"A modified Vujlet",
				"Pick up the engineering team and hardware prepared by Kaatrij for the modified Vujlet.",
				{ cargo: 8, passengers: 1 },
			),
			row(
				"Successors: Ghosts Aqrabe 5",
				"Kasii-Cavasaa-Oa",
				"Nnesa ti-a-Oj",
				"Bring the test craft’s support package back to Aqrabe and clear the rendezvous for its final preparations.",
				{ cargo: 8, kills: 3 },
			),
			row(
				"Successors: Ghosts Aqrabe 6",
				"Exotic Metal Garden",
				"Metal in starlight",
				"The modified equipment can reach the stellar metal garden. Conduct the close survey and extract a small research sample.",
				{ scan: true, mine: 4 },
			),
			row(
				"Successors: Ghosts Aqrabe 7",
				"Kasii-Cavasaa-Oa",
				"What followed the sample",
				"An old drone threatens the returning expedition. Cover the retreat and deliver the stellar metal to Aqrabe.",
				{
					kills: 5,
					cargo: 4,
					flag: "aqrabe-garden-complete",
					reward: 85000,
					outcome:
						"Aqrabe has the stellar sample and a sobering record of what guards the garden.",
				},
			),
		],
	},
	{
		id: "myurej-wedding",
		name: "Myurej · the stolen wedding gifts",
		faction: "Successor",
		requiredFlag: "successor-contact",
		file: "data/successors/successor 2 ghosts myurej.txt",
		missions: [
			row(
				"Successors: Ghosts Myurej 1",
				"Kasii-Tuur-Saqru",
				"The missing gifts",
				"House Myurej’s wedding shipment has vanished. Follow the first contact to Kasii-Tuur-Saqru and examine the cargo records.",
				scan,
			),
			row(
				"Successors: Ghosts Myurej 2",
				"Vade-Osolaa-Kaska",
				"Looking for Riiria",
				"The contact points to Riiria at Vade-Osolaa-Kaska. Carry Myurej’s inquiry and search the local traffic records.",
				scan,
			),
			row(
				"Successors: Ghosts Myurej 3",
				"Myiara-Sola-Tej",
				"A trail through the Houses",
				"Riiria has moved on. Compare the next set of records at Myiara-Sola-Tej to narrow the search.",
				scan,
			),
			row(
				"Successors: Ghosts Myurej 3 Direct",
				"Maspa-Viir-Kella",
				"Riiria’s hiding place",
				"The clues lead to Maspa-Viir-Kella. Recover the shipment’s flight record and confront the final lead.",
				boarding,
			),
			row(
				"Successors: Ghosts Myurej 4",
				"Raaqa-Kvelq-Ryuit",
				"Return to Myurej",
				"Bring your findings and recovered wedding cargo to the House. Decide how candidly to describe the troubled search.",
				{
					cargo: 8,
					choices: [
						choice(
							"candid",
							"Give the full account",
							"myurej-candid",
							"Myurej receives the complete account, including the uncomfortable parts.",
						),
						choice(
							"discreet",
							"Keep the report discreet",
							"myurej-discreet",
							"The report prioritizes the recovery and protects the informants who helped you.",
						),
					],
				},
			),
			row(
				"Successors: Ghosts Myurej 5",
				"Kella-Uuoru-Sossa",
				"The hidden vault",
				"Carry Ijaset and two Myurej soldiers to the House’s hidden vault. Scan the approach before opening the old facility.",
				{ passengers: 3, scan: true },
			),
			row(
				["Successors: Ghosts Myurej 6", "Successors: Ghosts Myurej 7"],
				"Uuoru-Veldt-Stir",
				"An unexpected inheritance",
				"Warships attack the vault expedition. Defend its retreat to Uuoru-Veldt-Stir and preserve the recovered record.",
				{ kills: 5, cargo: 5 },
			),
			row(
				"Successors: Ghosts Myurej 8",
				"Iyra-Ijasa-Iret",
				"A wedding shipment, at last",
				"Deliver the replacement wedding supplies to Iyra-Ijasa-Iret. This cargo carries the possibility of an ordinary celebration after an extraordinary crisis.",
				{
					cargo: 12,
					flag: "myurej-wedding-complete",
					reward: 80000,
					outcome:
						"The supplies reach the wedding intact. The House remembers who followed its scattered trail and came back.",
				},
			),
		],
	},
	{
		id: "coalition-allegiances",
		name: "Coalition · the price of allegiance",
		faction: "Coalition",
		requiredFlag: "coalition-license",
		file: "data/coalition/heliarch intro.txt",
		missions: [
			row(
				["Heliarch Investigation 1"],
				"Ring of Friendship",
				"Choose a commitment",
				"The Heliarchs offer investigations, reconnaissance and service to the consuls. The Lunarium offers relief work and a challenge to the existing order. Choose whose longer campaign to join.",
				{
					choices: [
						choice(
							"heliarch",
							"Serve the Heliarch consuls",
							"expanded-heliarch",
							"You accept a role in the Heliarch investigation and reconnaissance program.",
						),
						choice(
							"lunarium",
							"Work with the Lunarium",
							"expanded-lunarium",
							"You commit to the Lunarium’s relief work and its search for allies.",
						),
					],
				},
			),
			row(
				"Heliarch Investigation 2 - Mebla's Portion",
				"Mebla's Portion",
				"The agents’ first inquiry",
				"Carry the Heliarch investigators to Mebla’s Portion and help them gather evidence of criminal activity.",
				heli({ passengers: 3, scan: true }),
			),
			row(
				[
					"Heliarch Investigation 2 - Stronghold of Flugbu",
					"Heliarch Investigation 2 - Shifting Sand",
				],
				"Shifting Sand",
				"A wider investigation",
				"Follow the investigators’ trail to Shifting Sand. The inquiry is spreading across communities with very different views of Heliarch order.",
				heli({ passengers: 3, scan: true }),
			),
			row(
				[
					"Heliarch Investigation 2 - Fourth Shadow",
					"Heliarch Investigation 2 - Into White",
					"Heliarch Investigation 2 - Remote Blue",
				],
				"Remote Blue",
				"The isolated lead",
				"Bring the trio to Remote Blue and finish the field report. Their findings will determine the next assignment.",
				heli({ passengers: 3, scan: true }),
			),
			row(
				["Heliarch Recon 1", "Heliarch Recon 2-A"],
				"Ring of Wisdom",
				"Looking toward the Quarg",
				"The Heliarchs want observations of Quarg facilities. Bring the survey records to the Ring of Wisdom for the scanner modification.",
				heli({ scan: true, scanSystems: ["Lagrange"] }),
			),
			row(
				"Heliarch Recon 2-B",
				"Ring of Wisdom",
				"A silent scan",
				"Use the modified sensor package to collect a distant Quarg signature, then bring the data back to the consuls.",
				heli(scan),
			),
			row(
				["Heliarch Recon 3-A", "Heliarch Recon 3-B", "Heliarch Recon 3-C"],
				"Ring of Wisdom",
				"A less silent question",
				"A deeper scan tests the limits of Quarg tolerance. Complete the readings and preserve a record of the response.",
				heli(scan),
			),
			row(
				["Heliarch Expedition 1", "Heliarch Expedition 2"],
				"Ruin",
				"The broken ringworld",
				"Travel beyond the Deneb wormhole to investigate the broken ringworld. The Heliarchs want a firsthand account of the destruction.",
				heli({
					...scan,
					requireFlag: "world:pug flee",
					lockedReason:
						"Complete the Free Worlds battle at Deneb to open the Pug wormhole before taking this expedition.",
				}),
			),
			row(
				[
					"Heliarch Expedition 3",
					"Heliarch Expedition 4",
					"Heliarch Expedition 5",
				],
				"Ring of Wisdom",
				"Consul Aulori’s debriefing",
				"Return the expedition’s instruments and protect its final approach. Aulori is waiting for the findings from the ruined ringworld.",
				heli({ cargo: 10, kills: 4 }),
			),
			row(
				["Heliarch Containment 1", "Heliarch Containment 2"],
				"Ahr",
				"Soldiers and survivors",
				"The containment operation leaves wounded soldiers needing care. Carry the medical team and injured personnel to Ahr.",
				heli({ passengers: 3, cargo: 6 }),
			),
			row(
				[
					"Heliarch Containment 3",
					"Heliarch Containment 4-A",
					"Heliarch Containment 4-B",
				],
				"Remote Blue",
				"The concealed operation",
				"Deliver the support package for the undercover Heliarch operation and clear the approach for its civilian transports.",
				heli({ cargo: 8, kills: 3 }),
			),
			row(
				"Heliarch Containment 5",
				"Station Cian",
				"Where the weapons came from",
				"Disable the fleeing armed contacts and board one for its supply records. Bring the evidence to Station Cian.",
				heli(boarding),
			),
			row(
				[
					"Heliarch Drills 1",
					"Heliarch Drills 2-A",
					"Heliarch Drills 2-B",
					"Heliarch Drills 2-C",
				],
				"Belug's Plunge",
				"A fleet’s reach",
				"Deliver the refueling support package and navigation record for the Heliarch drills. Range and reliability matter as much as firepower.",
				heli({ cargo: 10, scan: true }),
			),
			row(
				["Heliarch Drills 3", "Heliarch License 1", "Heliarch License 2"],
				"Ring of Friendship",
				"Before the consuls",
				"Submit the training record and the investigation’s evidence to the consuls. They are ready to recognize your service as a Heliarch agent.",
				heli({
					cargo: 4,
					flag: "heliarch-agent",
					reward: 105000,
					outcome:
						"The consuls grant you their confidence. The authority you chose to serve now expects you to use that trust responsibly.",
				}),
			),
			row(
				["Lunarium: Smuggling: Charity 1", "Lunarium: Smuggling: Charity 2"],
				"Into White",
				"Winter relief",
				"Carry medicines and doctors to the Kimek communities suffering through the winter on Into White.",
				lunar({
					cargo: 8,
					passengers: 2,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				[
					"Lunarium: Smuggling: Charity 3",
					"Lunarium: Smuggling: Grenades",
					"Lunarium: Smuggling: AM",
				],
				"Fourth Shadow",
				"From charity to resistance",
				"Deliver defensive supplies to Fourth Shadow. The Lunarium’s relief network is becoming a supply network for resistance.",
				lunar({
					cargo: 10,
					kills: 3,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				[
					"Lunarium: Smuggling: Torpedoes",
					"Lunarium: Smuggling: Heat",
					"Lunarium: Smuggling: Reactors",
				],
				"Secret Sky",
				"The material cost",
				"Bring the engineering consignment to Secret Sky. The movement’s ambitions now depend on the machinery and equipment captains can carry.",
				lunar({
					cargo: 12,
					kills: 4,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				["House Bebliss 1-A", "House Bebliss 2-FW", "House Bebliss 3-FW"],
				"Bourne",
				"House Bebliss and the Free Worlds",
				"Carry the Arach proposal to the Free Worlds. House Bebliss hopes its researchers can join Freya’s study of Pug technology.",
				lunar({
					passengers: 2,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				["House Bebliss 4-FW", "House Bebliss 5-FW", "House Bebliss 6-FW"],
				"Pugglemug",
				"Jumping spiders",
				"Bring the House Bebliss scientific party to Pugglemug and protect the approach to Freya’s expedition.",
				lunar({
					passengers: 2,
					kills: 3,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				[
					"House Bebliss 7-FW",
					"Lunarium: Evacuation 1",
					"Lunarium: Evacuation 2",
				],
				"Second Viridian",
				"Students coming home",
				"With the research party delivered, carry students and teachers home to Second Viridian.",
				lunar({
					passengers: 3,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				["Lunarium: Evacuation 3", "Lunarium: Evacuation 4"],
				"Shifting Sand",
				"The ranchers’ passage",
				"Return the displaced ranchers to Shifting Sand with the supplies they need to restart their work.",
				lunar({
					passengers: 3,
					cargo: 6,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				["Lunarium: Evacuation 5", "Lunarium: Evacuation 6"],
				"Ablub's Invention",
				"A place to begin again",
				"Carry immigrant families and their belongings to their new homes on Ablub’s Invention.",
				lunar({
					passengers: 3,
					cargo: 8,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				[
					"Lunarium: Propaganda 1",
					"Lunarium: Propaganda 2",
					"Lunarium: Propaganda 3",
					"Lunarium: Propaganda 4",
				],
				"Warm Slope",
				"Tummug’s traveling campaign",
				"Bring Tummug, his colleagues and their cultural posters to the last stop at Warm Slope.",
				lunar({
					passengers: 2,
					cargo: 8,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				["Lunarium: Combat Training 1", "Lunarium: Combat Training 2"],
				"Zug",
				"Lessons in human space",
				"The Lunarium’s trainees have come to human space to learn fleet tactics. Help clear the pirate threat around their training operation.",
				lunar({ kills: 5, sourceFile: "data/coalition/lunarium intro.txt" }),
			),
			row(
				["Lunarium: Combat Training 3", "Lunarium: Combat Training 4"],
				"Factory of Eblumab",
				"Pyakri’s homecoming",
				"Carry Pyakri’s returning trainees and equipment back to the Coalition.",
				lunar({
					passengers: 3,
					cargo: 10,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				["Lunarium: Questions", "Lunarium: Quarg Interview"],
				"Lagrange",
				"Oobat’s difficult interview",
				"Bring the Arach diplomat Oobat to meet the Quarg. The Lunarium needs to understand what the ancient observers think of the Coalition.",
				lunar({
					passengers: 1,
					sourceFile: "data/coalition/lunarium intro.txt",
				}),
			),
			row(
				"Lunarium: Join",
				"Remote Blue",
				"An answer to the movement",
				"Return with Oobat’s account and meet the Lunarium’s leaders. Your service has carried you beyond sympathetic cargo runs into a lasting allegiance.",
				lunar({
					passengers: 1,
					flag: "lunarium-member",
					reward: 105000,
					sourceFile: "data/coalition/lunarium intro.txt",
					outcome:
						"The Lunarium accepts you into its circle. The future it hopes for remains difficult, but the work and the relationships are real.",
				}),
			),
		],
	},
	{
		id: "gegno-corroboration",
		name: "Gegno · corroboration",
		faction: "Gegno",
		requiredFlag: "gegno-contact",
		file: "data/gegno/gegno I corroboration.txt",
		missions: [
			row(
				"Passive-Aggressive Observations",
				"Vigales",
				"A military exercise",
				"Observe the Vi landing operation on Vigales from a respectful distance. Record the activity without interrupting the soldiers.",
				scan,
			),
			row(
				"Brief Bystander",
				"Esstch",
				"Old recording instruments",
				"Survey the abandoned instruments on Esstch. A civilian Gegno worker leaves before you can make contact.",
				scan,
			),
			row(
				"Scin on Cyife",
				"Cyife",
				"The crystal moon",
				"Examine the unusual crystalline terrain and the trace of a Scin research vessel on Cyife.",
				scan,
			),
			row(
				"Battle over Zydee",
				"Zydee",
				"A world between fleets",
				"The Scin hurriedly depart as a Vi force enters Zydee’s sky. Record what is happening while keeping out of the confrontation.",
				scan,
			),
			row(
				["Gegno Suspicions", "Return to Giaru Gegno"],
				"Giaru Gegno",
				"Adrauni’s warning",
				"Bring the observations to Adrauni. The Quarg are concerned about what your presence is doing to their fragile relations with the Gegno.",
				{
					choices: [
						choice(
							"restraint",
							"Promise restraint",
							"gegno-restraint",
							"You accept Adrauni’s warning and agree to approach the Gegno without provocation.",
						),
						choice(
							"account",
							"Ask for a direct hearing",
							"gegno-hearing",
							"You ask for an opportunity to answer the Gegno directly rather than leave matters to rumor.",
						),
					],
				},
			),
			row(
				["Gegno Anticipation", "Gegno Intervention"],
				"Dueyu Eitch",
				"A formal summons",
				"Present yourself to the Gegno on Dueyu Eitch. The hearing will determine whether there is a place for an outsider in their society.",
				passage,
			),
			row(
				"Acquiescence",
				"Tschyss",
				"The silent passenger",
				"Carry the Vi warrior to the old station at Tschyss. Your passenger speaks little; the station’s exhausted workers have a more practical test in mind.",
				{ passengers: 1 },
			),
			row(
				"Gegno Asteroid Mining Prologue",
				"Tschyss",
				"Work worth recognizing",
				"Mine five tons of material for the station and deliver the load. The Gegno may not welcome you warmly, but they can recognize useful work.",
				{
					mine: 5,
					flag: "gegno-work-access",
					reward: 65000,
					outcome:
						"The workers unload your minerals and pay you. Access to the station’s work board is a modest, tangible beginning.",
				},
			),
		],
	},
	{
		id: "wanderer-machines",
		name: "Wanderers · minds and migrations",
		faction: "Wanderer",
		requiredFlag: "wanderer-exodus-complete",
		file: "data/wanderer/wanderers middle.txt",
		missions: [
			row(
				[
					"Wanderers: Surveying 1",
					"Wanderers: Surveying 2",
					"Wanderers: Nova Remnants",
				],
				"Spera Anatrusk",
				"Reading a damaged sky",
				"The Wanderers need new measurements of the damaged Korath worlds and nearby nova remnants. Survey the region and return the observations.",
				scan,
			),
			row(
				"Wanderers: Mereti Controller",
				"Spera Anatrusk",
				"A Mereti controller",
				"Disable and board a Kor Mereti raider for its control hardware. The Wanderers need evidence before trying to change the machines.",
				boarding,
			),
			row(
				"Wanderers: Sestor Controller",
				"Spera Anatrusk",
				"A Sestor controller",
				"Recover the corresponding control record from a Kor Sestor machine. Two fleets continue an old war through very different networks.",
				{ kills: 4, board: true },
			),
			row(
				"Wanderers: First Mereti Attack",
				"Spera Anatrusk",
				"The colony under attack",
				"Defend the Wanderer base from the Mereti attack. The research cannot continue if the colony is destroyed.",
				{ kills: 5 },
			),
			row(
				"Wanderers: Rek To Kor Efret",
				"Setar Fort",
				"Rek after the Molt",
				"Carry Rek, transformed by the Molt, to the Kor Efret. Her experience and patience may open a conversation that weapons cannot.",
				{ passengers: 1 },
			),
			row(
				["Wanderers: Quarg Assistance 1", "Wanderers: Quarg Assistance 2"],
				"Kuwaru Efreti",
				"Ask the Quarg",
				"Seek Quarg assistance for the threatened colonies and prepare the return expedition’s navigation record.",
				{ passengers: 1, scan: true },
			),
			row(
				["Wanderers: Pug Assistance 1", "Wanderers: Pug Assistance 2"],
				"Vara Pug",
				"The Pug’s refusal",
				"Ask the Pug to send help through the Eye. Their refusal leaves the Wanderers looking for a solution within the machine network itself.",
				passage,
			),
			row(
				"Wanderers: Mereti Observation",
				"Spera Anatrusk",
				"Listen to Mesuket",
				"Collect a fresh scan of the Mereti transmissions in Mesuket, then return to the Wanderer laboratory.",
				{ scanSystems: ["Mesuket"] },
			),
			row(
				[
					"Wanderers: Kor Efret 1",
					"Wanderers: Kor Efret 2",
					"Wanderers: Kor Efret 3",
				],
				"Laki Nemparu",
				"The engineers’ answer",
				"Bring Rek to the Kor Efret engineers and defend Laki Nemparu from the Mereti raid while they assess the network.",
				{ passengers: 1, kills: 5 },
			),
			row(
				[
					"Wanderers: Kor Efret 4",
					"Wanderers: Kor Efret 5",
					"Wanderers: Kor Mereti Hacking",
				],
				"Spera Anatrusk",
				"A failed route into the network",
				"Return the engineers’ report and test the Wanderer access device. The first attempt is inconclusive; a different kind of mind may be needed.",
				{ cargo: 4, scan: true },
			),
			row(
				["Wanderers: Mind 1", "Wanderers: Mind 2"],
				"Kort Kehai",
				"Meto’s artificial mind",
				"Collect Meto Pa’aret and the artificial mind constructed at Kort Kehai. The experiment requires a living conversation with the machine network.",
				{ passengers: 1, cargo: 8 },
			),
			row(
				["Wanderers: Mind 3", "Wanderers: Mind 4", "Wanderers: Mind 5"],
				"Rekat Moraski",
				"A mind inside the station",
				"Bring the Mind installation team to Rekat Moraski and hold off the hostile automata during their work.",
				{ passengers: 2, cargo: 8, kills: 5 },
			),
			row(
				["Wanderers: Mind 6", "Wanderers: Mind 7", "Wanderers: Mind 8"],
				"Korbatri Eska",
				"Machines choosing differently",
				"Some Mereti no longer attack. Scan their new behavior at Korbatri Eska and preserve the distinction between hostile drones and those that have changed.",
				scan,
			),
			row(
				[
					"Wanderers: Mentors 1",
					"Wanderers: Mentors 2",
					"Wanderers: Mentors 3",
				],
				"Korbatri Eska",
				"Teachers for the new minds",
				"Carry Wanderer professors and teaching equipment to the Mereti. Their task is to mentor a new intelligence, not merely reprogram a weapon.",
				{ passengers: 3, cargo: 8 },
			),
			row(
				[
					"Wanderers: Tour 1",
					"Wanderers: Tour 2",
					"Wanderers: Tour 3",
					"Wanderers: Tour 4",
					"Wanderers: Tour 5",
					"Wanderers: Tour 6",
					"Wanderers: Tour 7",
				],
				"Desi Seledrak",
				"The Kor Efret tour",
				"Return the diplomatic delegation’s record of Wanderer farms, restored worlds and the Unfettered front. Rek wants the Kor Efret to see possibilities beyond raiding.",
				{
					passengers: 3,
					scanSystems: ["Vara K'chrai", "Vara Rakak", "Varu Tev'kei"],
				},
			),
			row(
				["Wanderers: Sestor Scanning", "Wanderers: Sestor Attack"],
				"Desi Seledrak",
				"The other machine war",
				"Scan the Sestor signatures and defend Desi Seledrak. A large machine fleet has begun moving toward the Eye.",
				{ scan: true, kills: 5 },
			),
			row(
				[
					"Wanderers: Sestor Search",
					"Wanderers: Sestor Search: Human Hint",
					"Wanderers: Sestor: Farpoint Attack 1",
				],
				"Farpoint",
				"The fleet reaches human space",
				"Warn Admiral Danforth and help repel the Sestor attack on Farpoint. The Alphas may now be directing the machines.",
				{ kills: 6 },
			),
			row(
				["Wanderers: Sestor: Quarg Help 1", "Wanderers: Sestor: Quarg Help 2"],
				"Alta Hai",
				"Another appeal to the Quarg",
				"Ask the Quarg for ships to help defend human space and bring them the latest Sestor reconnaissance.",
				{ cargo: 4, scan: true },
			),
			row(
				[
					"Wanderers: Sestor: Bomb Zenith 1",
					"Wanderers: Sestor Alt: Alnilam 1",
				],
				"Farpoint",
				"Danforth’s decision",
				"Danforth offers a strike against the Alpha base on Zenith. Choose the device delivery or a direct operation with the Oathkeepers.",
				{
					choices: [
						choice(
							"device",
							"Deliver Danforth’s device",
							"expanded-zenith-bomb",
							"You agree to deliver the device above the Alpha base.",
						),
						choice(
							"assault",
							"Bring an Oathkeeper force",
							"expanded-zenith-assault",
							"You favor a direct operation backed by Oathkeeper ships.",
						),
					],
				},
			),
			row(
				[
					"Wanderers: Sestor: Bomb Zenith 1",
					"Wanderers: Sestor: Bomb Zenith 2",
				],
				"Zenith",
				"The device over Zenith",
				"Carry the device to Zenith, clear the interceptors and record its deployment above the Alpha base.",
				{ whenFlag: "expanded-zenith-bomb", cargo: 4, kills: 4, scan: true },
			),
			row(
				[
					"Wanderers: Sestor Alt: Alnilam 1",
					"Wanderers: Sestor Alt: Alnilam 2",
					"Wanderers: Sestor Alt: Alnilam 3",
				],
				"Zenith",
				"Oathkeepers at Zenith",
				"Join the Oathkeeper force at Zenith. Defeat the machine defenders and recover the Alpha base’s control record.",
				{ whenFlag: "expanded-zenith-assault", kills: 6, board: true },
			),
			row(
				[
					"Wanderers: Sestor: Kill Southern Remnant",
					"Wanderers: Sestor: Drones in Alnilam Waypoint",
					"Wanderers: Sestor: Return to Wanderers",
				],
				"Desi Seledrak",
				"The scattered machines",
				"Eliminate the remaining hostile wing and bring Danforth’s report back through the Eye. Removing the Alpha base has not ended the Sestor problem.",
				{ kills: 5, cargo: 4 },
			),
			row(
				[
					"Wanderers: Sestor: Scan Drones",
					"Wanderers: Sestor: Exiles 1",
					"Wanderers: Sestor: Exiles 2",
				],
				"Far'en Lai",
				"Speak with the Exiles",
				"Bring Rek to the Korath Exiles and survey the remaining drone production. The Wanderers need the builders’ help to shut it down.",
				{ passengers: 1, scan: true },
			),
			row(
				"Wanderers: Sestor: Exiles 3",
				"Desi Seledrak",
				"World-ships at the conference",
				"Carry the diplomatic party to the meeting with the Wanderers. The Exiles’ world-ships bring both expertise and a complicated history.",
				{ passengers: 3, cargo: 6 },
			),
			row(
				["Wanderers: Sestor: Factory 1", "Wanderers: Sestor: Factory 2"],
				"Sestor Ikfar",
				"Shut down the factory",
				"Protect the Korath engineers while they shut down the remaining Sestor factory. Keep the drones from reaching the work crews.",
				{ passengers: 2, kills: 6 },
			),
			row(
				["Wanderers: Sestor: Factory 3", "Wanderers: Sestor: Final: Patched"],
				"Desi Seledrak",
				"A guarded future",
				"Report the factory shutdown and the Exiles’ removal of equipment. The immediate machine war is contained; watchfulness must continue alongside restoration.",
				{
					scan: true,
					flag: "wanderer-machines-complete",
					reward: 125000,
					outcome:
						"The Wanderers return to rebuilding, with new minds to teach and old neighbors to understand. Peace remains work, not a switch that can be thrown.",
				},
			),
		],
	},
	{
		id: "patir-mystery",
		name: "Patir · beyond the black hole",
		faction: "Remnant",
		requiredFlag: "kahet-research",
		file: "data/kahet/kahet missions.txt",
		missions: [
			row(
				[
					"Ka'het: Patir Mystery 1",
					"Ka'het: Patir Mystery 2",
					"Ka'het: Patir Mystery 3",
				],
				"Builder Settlement",
				"The asteroid in Patir",
				"Take Taely’s survey instruments to the ancient Builder settlement and make a detailed record of the enormous asteroid.",
				{ passengers: 1, scan: true },
			),
			row(
				"Ka'het: Patir Mystery 4",
				"Builder Settlement",
				"Dusk at the settlement",
				"Bring Dusk to examine the ancient structures in person. The nearby Ka’sei make a careful approach essential.",
				{ passengers: 1, scan: true },
			),
			row(
				"Ka'het: Patir Mystery 5",
				"Aventine",
				"After first contact",
				"Return Dusk’s first-contact account to Aventine. The researchers need to understand the encounter before attempting another landing.",
				{ passengers: 1 },
			),
			row(
				["Ka'het: Patir Mystery 6", "Ka'het: Patir Mystery 7"],
				"Builder Settlement",
				"The archaeological team",
				"Bring the xenoarchaeologists and their instruments back to Patir. A second survey will compare the structures with the first expedition’s record.",
				{ passengers: 3, cargo: 8, scan: true },
			),
			row(
				["Ka'het: Patir Mystery 8A", "Ka'het: Patir Mystery 8B"],
				"Builder Settlement",
				"A laboratory at the edge",
				"Deliver the compact ground laboratory package to the Builder settlement and calibrate its instruments.",
				{ cargo: 14, scan: true },
			),
			row(
				[
					"Ka'het: Patir Mystery 9",
					"Ka'het: Patir Mystery 10",
					"Ka'het: Patir Mystery 11",
				],
				"Builder Settlement",
				"Signals around Patir",
				"Survey the neighboring skies and collect the Remnant satellite’s record of the strange local creatures.",
				scan,
			),
			row(
				["Ka'het: Patir Mystery 12.1A", "Ka'het: Patir Mystery 12.1B"],
				"Chanai Structure",
				"The station beyond",
				"Investigate the Chanai Structure with the scientists. They need to understand whether it offers a way back to the Milky Way.",
				{ passengers: 3, scan: true },
			),
			row(
				["Ka'het: Patir Mystery 12.2A", "Ka'het: Patir Mystery 12.2B"],
				"Builder Settlement",
				"Learning from an arrival",
				"Deploy the probe package and examine the trace of an arriving space rock. The Ka’sei response may reveal how this place works.",
				{ cargo: 8, scan: true },
			),
			row(
				[
					"Ka'het: Patir Mystery 13.1",
					"Ka'het: Patir Mystery 13.2",
					"Ka'het: Patir Mystery 14",
				],
				"Aventine",
				"The black hole returns",
				"Bring Dusk and the expedition’s records home after Patir’s return. Chilia will need the data to plan a safer second expedition.",
				{ passengers: 2, cargo: 8 },
			),
			row(
				[
					"Ka'het: Patir Mystery 15",
					"Ka'het: Patir Mystery 16",
					"Ka'het: Patir Mystery 17",
				],
				"Builder Settlement",
				"Chilia joins the expedition",
				"Bring Prefect Chilia and the renewed research team to the Builder settlement with the replacement equipment.",
				{ passengers: 3, cargo: 10 },
			),
			row(
				["Ka'het: Patir Mystery 18", "Ka'het: Patir Mystery 19"],
				"Caelian",
				"What the Fetri’sei swallowed",
				"Return the recovered asteroid material and the measurements of the Fetri’sei to Caelian. The samples give the theories something solid to work with.",
				{ cargo: 8, scan: true },
			),
			row(
				["Ka'het: Patir Mystery 20", "Ka'het: Patir Mystery 21"],
				"Pacili",
				"Follow the Petrel",
				"Carry the research team to Pacili and survey the route followed by the Petrel lifeboat.",
				{ passengers: 3, scan: true },
			),
			row(
				["Ka'het: Patir Mystery 22", "Ka'het: Patir Mystery 23"],
				"Caelian",
				"A test worth repeating",
				"Return the team and the Petrel test record. The Remnant can now prepare to explore farther beyond Patir.",
				{ passengers: 3, cargo: 6 },
			),
			row(
				["Ka'het: Patir Mystery 24", "Ka'het: Patir Mystery 25"],
				"Chanai Structure",
				"An expedition beyond",
				"Take the team back through Patir to the Chanai Structure. Record the unfamiliar station and keep the return manifest intact.",
				{ passengers: 3, cargo: 10, scan: true },
			),
			row(
				["Ka'het: Patir Mystery 26A", "Ka'het: Patir Mystery 26B"],
				"Builder Settlement",
				"The rendezvous",
				"Bring the scientists and their station samples back to the Builder settlement for the return trip.",
				{ passengers: 3, cargo: 10 },
			),
			row(
				"Ka'het: Patir Mystery 27",
				"Caelian",
				"Another asteroid’s remains",
				"Deliver the recovered asteroid fragments before their trail is lost. The laboratory at Caelian is ready for the next comparison.",
				{ cargo: 8, mine: 4 },
			),
			row(
				["Ka'het: Patir Mystery 28", "Ka'het: Patir Mystery 29"],
				"Ssil Vida",
				"The Swan fit checks",
				"Bring the support package to Ssil Vida and defend the Postverta cluster from the Korath ships threatening the next expedition.",
				{ cargo: 10, kills: 5 },
			),
			row(
				[
					"Ka'het: Patir Mystery 30",
					"Ka'het: Patir Mystery 31",
					"Ka'het: Patir Mystery 32",
				],
				"Builder Settlement",
				"All hands through Patir",
				"Deliver Dusk, the research team and their equipment to Patir. Check the expedition’s sensor record before the final approach.",
				{ passengers: 3, cargo: 12, scan: true },
			),
			row(
				"Ka'het: Patir Mystery 33",
				"Lathia",
				"Contact on the great asteroid",
				"The largest asteroid is now reachable. Land on its surface with the Remnant researchers and record the first-contact attempt.",
				{
					destinationName: "Magic Asteroid Planet",
					revealPlanet: {
						systemId: "lathia",
						planetName: "Magic Asteroid Planet",
					},
					passengers: 3,
					scan: true,
				},
			),
			row(
				"Ka'het: Patir Mystery 34",
				"Builder Settlement",
				"A difficult return",
				"The contact has left the team shaken. Bring every researcher and the surviving instruments back to the Builder settlement.",
				{ passengers: 3, cargo: 10 },
			),
			row(
				"Ka'het: Patir Mystery 35",
				"Caelian",
				"The findings from beyond",
				"Deliver the team and the complete scientific payload to Caelian. Preserve both the discoveries and the warning contained in the failed contact.",
				{
					passengers: 3,
					cargo: 10,
					reward: 105000,
					choices: [
						choice(
							"seven",
							"Plan shorter future expeditions",
							"patir-short",
							"The next expeditions will favor shorter stays and careful return windows.",
						),
						choice(
							"fourteen",
							"Plan extended future expeditions",
							"patir-long",
							"The next expeditions will prepare larger reserves for extended research stays.",
						),
					],
				},
			),
			row(
				["Ka'het: Patir Mystery 37A", "Ka'het: Patir Mystery 37B"],
				"Builder Settlement",
				"Seven days beyond",
				"Lead a shorter expedition beyond Patir, survey the Builder settlement again and bring its record into the permanent archive.",
				{ whenFlag: "patir-short", cargo: 12, scan: true },
			),
			row(
				["Ka'het: Patir Mystery 38A", "Ka'het: Patir Mystery 38B"],
				"Chanai Structure",
				"Fourteen days beyond",
				"Lead the extended expedition to the Chanai Structure with larger reserves and record its survey for the permanent archive.",
				{ whenFlag: "patir-long", cargo: 14, scan: true },
			),
			row(
				"Ka'het: Patir Mystery Crew job",
				"Caelian",
				"A route for future researchers",
				"Return the expedition log and the surviving instruments. What began as an isolated mystery has become a difficult but usable research route.",
				{
					cargo: 8,
					flag: "patir-expeditions-complete",
					reward: 105000,
					outcome:
						"The expedition archive is complete. Future crews have a route, a record of the dangers, and a reason to return.",
				},
			),
		],
	},
	{
		id: "rulei-umbral",
		name: "Rulei · the umbral reach",
		faction: "Rulei",
		file: "data/rulei/rulei.txt",
		missions: [
			row(
				["First Contact: Rulei", "Rulei Planet"],
				"Yniu Eiu",
				"Whispers at Kanguwa",
				"Approach the Rulei world and scan the eerie formations. The voices seem to press against your thoughts, although no speaker is visible.",
				scan,
			),
			row(
				[
					"Rulei: You Are (Not) Alone: L-118",
					"Rulei: You Are (Not) Alone: L-6181",
				],
				"Yniu Eiu",
				"You are not alone",
				"Survey the empty systems L-118 and L-6181, then return to Kanguwa. A strange presence blends into the darkness and defies the scanner’s categories.",
				{ scanSystems: ["L-118", "L-6181"] },
			),
			row(
				"Rulei: Umbral Reach",
				"Yniu Ena",
				"The phrase in the silence",
				"Return the survey to the Rulei worlds. The whispers gather into a single overwhelming expression, then leave you with the record of what you encountered.",
				{
					scan: true,
					flag: "rulei-observed",
					reward: 65000,
					outcome:
						"The log records an encounter, not an explanation. The Rulei continue their silence beside the umbral reach.",
				},
			),
		],
	},
];

// Named source story continuations beyond the introductory regional arcs.
specifications.push(
	{
		id: "sheragi-emerald",
		name: "Sheragi · the Emerald Sword",
		faction: "Republic",
		requiredFlag: "sheragi-discovery",
		file: "data/sheragi/archaeology missions.txt",
		missions: [
			row(
				"Sheragi Archaeology: The Box 1",
				"Zug",
				"Foster’s sealed discovery",
				"Return to Albert Foster at the dig on Zug. A mysterious box has survived the excavation and needs careful study.",
				scan,
			),
			row(
				"Sheragi Archaeology: The Box 2",
				"Vinci",
				"A trusted scientist",
				"Carry the sealed box to the scientist on Vinci. Its contents could change what the team understands about the Sheragi.",
				{ cargo: 4 },
			),
			row(
				"Sheragi Archaeology: The Box 3",
				"Stormhold",
				"The stolen box",
				"The box has been stolen. Seek the information broker on Stormhold and follow the mercenaries’ cargo trail.",
				scan,
			),
			row(
				["Sheragi Archaeology: The Box 4", "Sheragi Archaeology: The Box 5"],
				"Watcher",
				"The mercenaries at Watcher",
				"Confront the mercenary force and recover its flight record. Foster’s discovery must be recovered before it disappears into another private collection.",
				{ kills: 5, board: true },
			),
			row(
				["Sheragi Archaeology: The Box 6b", "Sheragi Archaeology: The Box 6c"],
				"Allhome",
				"Ask the Hai",
				"Carry the recovered evidence to the Hai. Their long history may contain a record of the lost civilization.",
				{ cargo: 4, passengers: 1 },
			),
			row(
				"Sheragi Archaeology: The Box 7a",
				"Mirrorlake",
				"The Museum of Galactic History",
				"Search the Hai museum at Mirrorlake for records that can explain the box and its makers.",
				scan,
			),
			row(
				"Sheragi Archaeology: The Box 7b",
				"Hai-home",
				"The Ministry of Culture",
				"Present the evidence to the Ministry of Culture and arrange for Hai archaeologists to join the human dig.",
				{ cargo: 4, passengers: 2 },
			),
			row(
				"Sheragi Archaeology: The Box 8",
				"Zug",
				"A shared excavation",
				"Bring the Hai archaeologists to Foster on Zug. Their knowledge gives the team a new direction.",
				{ passengers: 3 },
			),
			row(
				[
					"Sheragi Archaeology: The Emerald Sword 1",
					"Sheragi Archaeology: The Emerald Sword 2",
				],
				"Zug",
				"Preparing a recovery expedition",
				"Gather the outfitting equipment and additional personnel for the expedition to the Emerald Sword’s last known resting place.",
				{ passengers: 3, cargo: 14 },
			),
			row(
				"Sheragi Archaeology: The Emerald Sword 3",
				"Valley of the Damned",
				"The guardian of the graveyard",
				"Search Zubenelhakrabi and survey the Emerald Sword. A guardian warns that this is a place of remembrance, and that the ship is only a relic of the Sheragi’s greater tragedy.",
				{
					passengers: 3,
					cargo: 14,
					scan: true,
					grantShip: "emerald-sword",
					flag: "emerald-sword-recovered",
					reward: 90000,
				},
			),
			row(
				"Sheragi Archaeology: Epilogue",
				"Zug",
				"What survives a civilization",
				"Return the recovery record to Foster. The Emerald Sword survives, but the warning at the graveyard is as much a part of the discovery as the ship.",
				{
					cargo: 4,
					reward: 85000,
					flag: "sheragi-epilogue",
					outcome:
						"The expedition returns with an ancient ship and a record of the civilization that built it. The dig’s story has reached its epilogue.",
				},
			),
		],
	},
	{
		id: "deep-research",
		name: "The Deep · science and surveillance",
		faction: "Republic",
		requiredFlag: "deep-license",
		file: "data/human/deep missions.txt",
		missions: [
			row(
				["Deep: Questions", "Deep: Project Hawking"],
				"Midgard",
				"Project Hawking",
				"Answer the encrypted invitation and bring the research supplies to Midgard. The Deep’s scientists are studying a spatial anomaly.",
				{ cargo: 10 },
			),
			row(
				["Deep: Remnant 0", "Deep: Remnant: Keystone Research"],
				"Valhalla",
				"Ivan’s quantum keystones",
				"Bring Ivan the keystone sample shipment and survey the instruments studying its connection to Terminus.",
				{ cargo: 8, scan: true },
			),
			row(
				"Deep: Remnant 1",
				"Valhalla",
				"Beyond Terminus",
				"Survey the Ember Waste beyond the Terminus wormhole and return the navigation record to the Deep.",
				{ scanSystems: ["Terminus", "Nenia", "Arculus"] },
			),
			row(
				"Deep: Remnant 2",
				"Valhalla",
				"The wormhole loop",
				"Carry Ivan’s scanning equipment through another survey circuit and compare the spatial readings.",
				{ cargo: 6, scanSystems: ["Nenia", "Arculus"] },
			),
			row(
				["Deep: Remnant 3: Secret", "Deep: Remnant 3: Revealed"],
				"Valhalla",
				"A report with consequences",
				"Deliver the scan record from the Ember Waste. Decide whether your account emphasizes its strange life or the people you encountered there.",
				{
					scan: true,
					choices: [
						choice(
							"life",
							"Report the void-sprite research",
							"deep-protect-remnant",
							"The account preserves the Remnant’s privacy while sharing the biological findings.",
						),
						choice(
							"people",
							"Report the hidden settlements",
							"deep-reveal-remnant",
							"The Deep receives your account of the Remnant settlements and their technology.",
						),
					],
				},
			),
			row(
				[
					"Deep: Remnant: Continue Research",
					"Deep: Remnant: Engines",
					"Deep: Remnant: Generators",
					"Deep: Remnant: Inhibitor Cannon",
				],
				"Valhalla",
				"A technology comparison",
				"Return the engineering samples and their test records. Ivan’s team compares Remnant propulsion, generators and weapons with human systems.",
				{ cargo: 12, scan: true },
			),
			row(
				"Deep: Remnant Surveillance",
				"Valhalla",
				"The sensor cubes return",
				"Gather the final Remnant-world survey and return to the Deep. The familiar cubes have become an uncomfortable part of the research program.",
				{
					scanSystems: ["Caelian", "Aventine", "Viminal"],
					flag: "deep-research-complete",
					reward: 75000,
				},
			),
			row(
				"Deep: Scientist Rescue 0",
				"Haven",
				"The missing Star Queen",
				"A Star Queen carrying prominent scientists has vanished near the Far North. Trace its last flight record to Haven.",
				scan,
			),
			row(
				[
					"Deep: Scientist Rescue 1",
					"Deep: Scientist Rescue 1: Recruit Escorts",
					"Deep: Scientist Rescue 1: Recruit Reinforcements",
				],
				"Haven",
				"The rescue operation",
				"Deep Security and Navy officers are ready to help. Defeat the captors and board a hostile vessel for the missing liner’s record.",
				{ kills: 5, board: true },
			),
			row(
				"Deep: Scientist Rescue 2",
				"Valhalla",
				"Bring the scientists home",
				"Carry the recovered scientists and the liner’s research cargo back to Valhalla.",
				{ passengers: 3, cargo: 8 },
			),
			row(
				"Deep: Scientist Rescue 3A",
				"Valhalla",
				"The stolen Bactrian",
				"The scientists are safe, but the pirates retain a dangerous Bactrian. Eliminate the remaining force and return the final report.",
				{
					kills: 6,
					flag: "deep-rescue-complete",
					reward: 105000,
					outcome:
						"The scientists are home and the stolen warship no longer threatens their routes. The Deep closes its rescue operation.",
				},
			),
		],
	},
	{
		id: "skadenga-stones",
		name: "The Deep · stones of home",
		faction: "Republic",
		file: "data/human/deep missions.txt",
		missions: [
			row(
				"Stone of our Fathers 1",
				"Norn",
				"Skaldgar’s old home",
				"Carry Skaldgar back to the home he abandoned. This journey is personal, with no scientific contract to hide behind.",
				{ passengers: 1 },
			),
			row(
				"Stone of our Fathers 2",
				"Helheim",
				"Return from Norn",
				"Bring Skaldgar back to Helheim after his visit. The journey has reopened questions about family and belonging.",
				{ passengers: 1 },
			),
			row(
				["Stone of our Fathers 3", "Stone of our Fathers 4"],
				"Alfheim",
				"A family-cairn",
				"Carry Skaldgar’s stone to the family-cairn on Alfheim. Some cargo matters because of who remembers it.",
				{ cargo: 1 },
			),
			row(
				"Stone of our Fathers 5",
				"Norn",
				"The family returns",
				"Bring Ragnhild and Thorleif home to Norn after the rites.",
				{ passengers: 2 },
			),
			row(
				["Home for Skadenga 1", "Home for Skadenga 4"],
				"Valhalla",
				"A home for the Skadenga",
				"Bring the Skadenga’s request to Valhalla and arrange transportation for the community.",
				{ passengers: 2, cargo: 4 },
			),
			row(
				["Home for Skadenga 5", "Mani Refit"],
				"Mani",
				"Freighters made into homes",
				"Deliver the refit supplies to the Transport Union fleet on Mani. Cargo ships are being prepared to carry a people.",
				{ cargo: 12 },
			),
			row(
				["Home for Skadenga 6", "Home for Skadenga 7"],
				"Asgard",
				"The first resettlement",
				"Carry a refugee party and its belongings to Asgard, supporting the larger Transport Union movement.",
				{ passengers: 3, cargo: 10 },
			),
			row(
				["Skadenga Call 1", "Skadenga Call 2"],
				"Nifel",
				"Called back to Nifel",
				"The Skadenga need to return to Nifel. Bring the delegation and the record of what happened on Asgard.",
				{ passengers: 3, cargo: 4 },
			),
			row(
				["Home for Skadenga 8", "Home for Skadenga 10", "Home for Skadenga 11"],
				"Muspel",
				"Hroar’s fleet",
				"Meet Hroar on Muspel and deliver the supplies for a new attempt to move the Skadenga to a lasting home.",
				{ cargo: 12 },
			),
			row(
				["Home for Skadenga 12", "Home for Skadenga Captain"],
				"Windblain",
				"A place to remain",
				"Bring the resettlement party and its belongings to Windblain. The convoy is carrying a community’s hope of staying together.",
				{ passengers: 3, cargo: 12 },
			),
			row(
				[
					"Homecoming to Skadenga",
					"Stones of Skadenga 1",
					"Stones of Skadenga 2",
					"Stone-Bearers to Nifel",
				],
				"Nifel",
				"The mourners’ journey",
				"Return with the mourners to Nifel so they can perform the rites of their dead. A new home does not erase the old one.",
				{ passengers: 3, cargo: 2 },
			),
			row(
				["Hjlod Remembers Windblain", "Hjlod Remembers Nifel"],
				"Windblain",
				"Hjlod remembers",
				"Bring the mourners back to Windblain and meet Hjlod. The long movement of the Skadenga has become part of the story they will tell their children.",
				{
					passengers: 3,
					flag: "skadenga-home",
					reward: 75000,
					outcome:
						"The Skadenga have a home and a way to honor the place they lost. Your captain’s log holds the paths between them.",
				},
			),
		],
	},
	{
		id: "avgi-rescue",
		name: "Avgi · rescue and homecoming",
		faction: "Avgi",
		requiredFlag: "avgi-contact",
		file: "data/avgi/avgi 0 first contact.txt",
		missions: [
			row(
				"Avgi: Scout Rescue",
				"Peripheria",
				"The missing scout",
				"Find the scout’s trail in the Twirl cluster and return its crew to Peripheria.",
				{ scanSystems: ["Twirl"], passengers: 2, kills: 3 },
			),
			row(
				"Avgi: Frontline Combat",
				"Feo Platform",
				"Room for the defenders",
				"Clear the Aberrant wing threatening the northern approaches, freeing up the Avgi’s defensive forces.",
				{ kills: 5 },
			),
			row(
				"Avgi: Twilight Escape 1",
				"Vinci",
				"A route out of the Twilight",
				"Bring the escape-route record to Vinci. The route connects lives that had seemed permanently separated.",
				{ scan: true, cargo: 4 },
			),
			row(
				"Avgi: Twilight Escape 2",
				"Memory",
				"Sora’s parents",
				"Carry Sora to her parents’ farm on Memory. After the alien battles and strange technologies, this landing is about a family.",
				{
					passengers: 1,
					flag: "sora-home",
					reward: 55000,
					outcome:
						"Sora steps onto Memory to find her parents. The rescue and homecoming records are complete.",
				},
			),
		],
	},
	{
		id: "band-tour",
		name: "There Might Be Riots · the tour",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				"There Might Be Riots 1",
				"Wayfarer",
				"A band needs a ride",
				"Bring There Might Be Riots and their instruments to Wayfarer. The galaxy contains more than wars and invoices.",
				{ passengers: 3, cargo: 6 },
			),
			row(
				"There Might Be Riots part 2",
				"Prime",
				"The next show",
				"Carry the band to Prime for its next appearance. A successful tour depends on a captain who actually arrives.",
				{ passengers: 3, cargo: 6 },
			),
			row(
				"There Might Be Riots part 3A",
				"Pilot",
				"A less ordinary venue",
				"Bring the band and its equipment to Pilot. Their growing tour is drawing attention beyond the audience they expected.",
				{ passengers: 3, cargo: 6 },
			),
			row(
				"There Might Be Riots part 3B",
				"Allhome",
				"A different audience",
				"Bring the band safely to Allhome and keep its final approach clear. The musicians have found an audience beyond human space.",
				{
					passengers: 3,
					cargo: 6,
					kills: 3,
					flag: "band-tour-complete",
					reward: 50000,
					outcome:
						"The tour reaches Allhome. There Might Be Riots have crossed another cultural boundary with your help.",
				},
			),
		],
	},
	{
		id: "terraforming",
		name: "Amy’s worlds · a practical revolution",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				"Terraforming 1",
				"Glory",
				"A delegation from Rand",
				"Bring Rand’s representatives to the Academy of Planetary Sciences. They need a solution their world can afford.",
				{ passengers: 2 },
			),
			row(
				"Terraforming 2",
				"Rand",
				"Amy’s proposal",
				"Return with Amy and the delegation. Her inexpensive terraforming idea challenges the usual scale of such projects.",
				{ passengers: 3 },
			),
			row(
				"Terraforming 3",
				"Rand",
				"A push in the right direction",
				"Deploy the survey package for Amy’s asteroid-thruster plan and verify the target calculations above Rand.",
				{ cargo: 6, scan: true },
			),
			row(
				["Terraforming 4", "Terraforming 5"],
				"New Portland",
				"Plants for a darker world",
				"Bring Amy to collect hardy plants capable of growing under low-light conditions.",
				{ passengers: 1, cargo: 8 },
			),
			row(
				"Terraforming 5",
				"Rand",
				"A beginning in the soil",
				"Deliver Amy and the hardy plant shipment to Rand, along with the growing records for the first trial.",
				{ passengers: 1, cargo: 8 },
			),
			row(
				"Terraforming 6",
				"Earth",
				"The unlawful asteroid",
				"Answer the Republic’s questions about the asteroid operation. Bring the experiment’s records to Earth.",
				{ cargo: 4 },
			),
			row(
				["Terraforming 7", "Terraforming 8"],
				"Valhalla",
				"Publish the method",
				"Take Amy and Nolan to Valhalla to research, publish and plan a second trial.",
				{ passengers: 2 },
			),
			row(
				"Terraforming 9",
				"Tundra",
				"A second world",
				"Bring the research team and the experimental instruments to Tundra.",
				{ passengers: 3, cargo: 10 },
			),
			row(
				["Terraforming 10", "Terraforming 11"],
				"Earth",
				"An alternative on paper",
				"Carry the Republic representative to Earth to investigate alternatives to the asteroid plan, then prepare the report for Tundra.",
				{ passengers: 1, cargo: 4 },
			),
			row(
				["Terraforming 11", "Terraforming 12"],
				"Tundra",
				"The dormant volcano",
				"Bring the representative back and record the final targeting survey for Amy’s supervolcano plan.",
				{ passengers: 1, cargo: 6, scan: true },
			),
			row(
				"Terraforming Follow-up",
				"Rand",
				"A message from Amy",
				"Return the completed records to Rand and hear Amy’s follow-up. Two difficult worlds now have a practical example to study.",
				{
					cargo: 4,
					flag: "amy-terraforming-complete",
					reward: 80000,
					outcome:
						"Amy’s thanks closes the fieldwork. The methods and the controversy are now part of humanity’s expanding experience with its worlds.",
				},
			),
		],
	},
	{
		id: "timothy",
		name: "Timothy · a life beyond the cargo hold",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				["Timothy Radrickson 1: Stowaway", "Timothy Radrickson 1a: Accepted"],
				"Rand",
				"The man in the food crate",
				"Give Timothy Radrickson a passage to Rand. He is fleeing someone and hopes ordinary work will let him start again.",
				{ passengers: 1 },
			),
			row(
				[
					"Timothy Radrickson 2: Interlude",
					"Timothy Radrickson 2: Good Interlude",
					"Timothy Radrickson 3: Governor Notification",
				],
				"Rand",
				"Governor Tim",
				"Return to Rand after Timothy’s unexpected rise. The governor has a problem that requires a captain he already knows.",
				{ passengers: 1 },
			),
			row(
				[
					"Timothy Radrickson 3a: Rescue the Convoy",
					"Timothy Radrickson 3b: Pirate Base",
				],
				"Greenrock",
				"Rand’s captured convoy",
				"Find the pirates holding Rand’s largest convoy and recover their cargo-control records.",
				{ kills: 5, board: true },
			),
			row(
				[
					"Timothy Radrickson 3c: Escort the Convoy",
					"Timothy Radrickson 3d: Return to Rand",
				],
				"Wayfarer",
				"A convoy for Tarazed",
				"Bring the recovered convoy’s critical shipment to Wayfarer and report its survival to Tim.",
				{ cargo: 12, kills: 3 },
			),
			row(
				[
					"Timothy Radrickson 4: Imprisoned",
					"Timothy Radrickson 5a: Timshank Redemption",
				],
				"Oblivion",
				"Timshank",
				"Timothy is imprisoned on Oblivion. Decide how much preparation to undertake before returning to help him.",
				{
					choices: [
						choice(
							"complete",
							"Prepare a complete escape package",
							"tim-prepared",
							"Seek medication, a survival suit and a convincing identity before returning.",
						),
						choice(
							"medical",
							"Prioritize medical support",
							"tim-medical",
							"Bring the medication you can obtain, accepting that the preparation will be incomplete.",
						),
						choice(
							"minimal",
							"Return with limited supplies",
							"tim-minimal",
							"You will return with limited help; Tim’s chances are uncertain.",
						),
					],
				},
			),
			row(
				"Timothy Radrickson 5b: New Britain",
				"New Britain",
				"Detoxification medicine",
				"Collect the medicine Wynnafrith recommended for Tim. It is a first step toward surviving the journey out.",
				{ unlessFlag: "tim-minimal", cargo: 4 },
			),
			row(
				"Timothy Radrickson 5c: Dancer",
				"Dancer",
				"A survival suit",
				"Obtain the survival equipment Tim will need beyond the prison camp.",
				{ whenFlag: "tim-prepared", cargo: 4 },
			),
			row(
				"Timothy Radrickson 5d: Greenrock",
				"Greenrock",
				"Another name",
				"Arrange the identity documents Wynnafrith recommended. The supplies are useless if Tim cannot pass the next checkpoint.",
				{ whenFlag: "tim-prepared", cargo: 2 },
			),
			row(
				[
					"Timothy Radrickson 5e: Back to Oblivion",
					"Timothy Radrickson 6: News of Death",
				],
				"Oblivion",
				"Back beneath the ammonia sky",
				"Deliver the prepared supplies to Timothy. Later reports will not immediately make clear what happened to him.",
				{ cargo: 8 },
			),
			row(
				"Timothy Radrickson 7: Monk",
				"New Tibet",
				"A familiar monk",
				"Visit New Tibet after your thoroughly prepared intervention. Among the monks is a familiar face and the possibility of a quieter life.",
				{
					whenFlag: "tim-prepared",
					flag: "tim-monk",
					reward: 65000,
					outcome:
						"Timothy has survived to make a different life among the monks. The man from the cargo crate has finally found distance from his past.",
				},
			),
			row(
				"Timothy Radrickson 7: Hospice",
				"New Tibet",
				"The hospice",
				"Visit New Tibet after the medical intervention. The monks can tell you how Timothy’s difficult journey ended at their hospice.",
				{
					whenFlag: "tim-medical",
					flag: "tim-hospice",
					reward: 35000,
					outcome:
						"The hospice account brings Timothy’s story to a close. The incomplete preparation carried a cost that credits cannot reverse.",
				},
			),
			row(
				"Timothy Radrickson 7: Grave",
				"Oblivion",
				"The forgotten dead",
				"Return to Oblivion to seek a final account of Timothy after the poorly prepared intervention.",
				{
					whenFlag: "tim-minimal",
					flag: "tim-grave",
					reward: 15000,
					outcome:
						"Among Oblivion’s forgotten dead, the story of the man you once carried to Rand reaches its sad conclusion.",
				},
			),
		],
	},
	{
		id: "ice-queen",
		name: "Ildico · the Ice Queen",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				["Stone to Ice Queen", "Ice Queen"],
				"Clark",
				"The woman in the abandoned manor",
				"Bring Ildico Drifa away from the abandoned world to Clark. Her family’s past is only beginning to emerge.",
				{ passengers: 1 },
			),
			row(
				"Ice Queen 2",
				"Glory",
				"Looking for her father",
				"Carry Ildico to Glory and follow the academic trail of her father.",
				{ passengers: 1, scan: true },
			),
			row(
				["Ice Queen 3", "Ice Queen 4"],
				"Chiron",
				"A Republic appointment",
				"Professor McGiven’s information points to Chiron. Bring Ildico to find out what became of her father and his work.",
				{ passengers: 1 },
			),
			row(
				"Ice Queen 5",
				"Chiron",
				"Ildico’s message",
				"Return to Chiron when Ildico asks to see you. Her circumstances have changed, and she needs a captain she trusts.",
				passage,
			),
			row(
				"Ice Queen 6",
				"Haven",
				"A mother and child",
				"Carry Ildico and her child to Haven. Keep the approach clear and deliver them to the refuge she has chosen.",
				{ passengers: 2, kills: 3 },
			),
			row(
				"Ice Queen 7",
				"Haven",
				"The name in the news",
				"Return to Haven after hearing the news about Ildico. She has made a place for herself in a dangerous society.",
				scan,
			),
			row(
				["Ice Queen 8", "Ice Queen: News"],
				"Haven",
				"The Marauders at Haven",
				"Help Ildico defend her position against the Marauder force and bring its flight record back to Haven.",
				{
					kills: 5,
					board: true,
					flag: "ildico-complete",
					reward: 75000,
					outcome:
						"Ildico returns to directing her people. The passenger from an abandoned manor now commands a very different life.",
				},
			),
		],
	},
	{
		id: "adelita",
		name: "Adelita · what the camera sees",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				"Adelita 1",
				"Moonshake",
				"An exhibition to deliver",
				"Bring the Adelita collective’s installations to Moonshake and meet the artists behind the work.",
				{ cargo: 8 },
			),
			row(
				"Adelita 2",
				"Maker",
				"Behind the factory gates",
				"Carry the filming team to Maker and record the industrial district they want to document.",
				{ passengers: 2, scan: true },
			),
			row(
				"Adelita 3",
				"Hippocrates",
				"Bunker’s record",
				"Bring Bunker’s survey package past Hippocrates and collect the observation record of the transaction the collective is investigating.",
				{ passengers: 1, scan: true },
			),
			row(
				"Adelita 4",
				"Maker",
				"Return the film",
				"Bring the recorded material back to the rest of the collective on Maker.",
				{ cargo: 4 },
			),
			row(
				"Adelita 5",
				"Moonshake",
				"The work comes home",
				"Carry the team and the completed material back to Moonshake. The work now has an audience to find.",
				{
					passengers: 3,
					cargo: 6,
					flag: "adelita-complete",
					reward: 60000,
					outcome:
						"The collective has its people, its footage and the chance to show what it found. Your role in the production is complete.",
				},
			),
		],
	},
	{
		id: "syndicate-business",
		name: "Megaparsec · the investment",
		faction: "Syndicate",
		file: "data/human/human missions.txt",
		missions: [
			row(
				"Syndicate Business 1",
				"Sunracer",
				"An unusual distress call",
				"Trace the alleged abductee’s distress signal around Sunracer and recover the transmission record.",
				scan,
			),
			row(
				"Syndicate Business 2",
				"Hephaestus",
				"Howard’s paperwork",
				"Bring Howard to Hephaestus to complete the bond paperwork with Megaparsec Incorporated.",
				{ passengers: 1 },
			),
			row(
				"Syndicate Business 3",
				"Hephaestus",
				"Another opportunity",
				"Hear Howard’s next proposal and decide how enthusiastically to associate yourself with Megaparsec.",
				{
					choices: [
						choice(
							"interested",
							"Study the opportunity",
							"megaparsec-interested",
							"You keep the conversation open while examining the proposed deal.",
						),
						choice(
							"skeptical",
							"Keep the relationship cautious",
							"megaparsec-skeptical",
							"You make your reservations clear and ask for concrete terms.",
						),
					],
				},
			),
			row(
				"Syndicate Business 4",
				"Sunracer",
				"The favor behind the offer",
				"Escort Howard’s business party back to Sunracer and hear the favor tied to the investment.",
				{ passengers: 1, kills: 2 },
			),
			row(
				"Syndicate Business 5",
				"Sunracer",
				"The Marauder’s record",
				"Disable the Marauder force and recover its flight recorder as Howard requested. The opportunity now has a completed piece of work behind it.",
				{
					kills: 3,
					board: true,
					flag: "megaparsec-complete",
					reward: 65000,
					outcome:
						"Howard acknowledges the completed favor. You have a clear record of what you did for Megaparsec, whatever you decide about its promises.",
				},
			),
		],
	},
	{
		id: "lost-racer",
		name: "Artemis · the missing racer",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				"Lost Racer 1",
				"Sunracer",
				"A father searches",
				"Bring August Renard to Sunracer and examine the route of his missing daughter, Artemis.",
				{ passengers: 1, scan: true },
			),
			row(
				["Lost Racer 2 - Continued", "Lost Racer 2 - Ended"],
				"Sunracer",
				"Continue the search",
				"The first search has not found Artemis. Decide whether to pursue the new lead at Sandswell or return August home.",
				{
					choices: [
						choice(
							"continue",
							"Follow the Sandswell lead",
							"racer-continue",
							"You commit to searching Sandswell before giving up.",
						),
						choice(
							"end",
							"Return August to Glory",
							"racer-end",
							"You tell August you cannot continue the search and arrange the journey home.",
						),
					],
				},
			),
			row(
				"Lost Racer 2 - Continued",
				"Sandswell",
				"The Sandswell lead",
				"Search Sandswell for Artemis and record the final search area.",
				{ whenFlag: "racer-continue", passengers: 1, scan: true },
			),
			row(
				["Lost Racer 3", "Lost Racer Epilogue"],
				"Glory",
				"The Renards come home",
				"Bring Artemis and August back to Glory, then receive the equipment she offered after the rescue.",
				{
					whenFlag: "racer-continue",
					passengers: 2,
					flag: "artemis-rescued",
					reward: 65000,
					outcome:
						"Artemis and August are reunited at home. The racer’s later gift is a reminder of a search you chose to continue.",
				},
			),
			row(
				"Lost Racer 2 - Ended",
				"Glory",
				"A journey without an answer",
				"Return August to Glory after deciding to end the search.",
				{
					whenFlag: "racer-end",
					passengers: 1,
					flag: "artemis-search-ended",
					reward: 15000,
					outcome:
						"August arrives home without an answer about his daughter. The unresolved loss remains in the captain’s log.",
				},
			),
		],
	},
	{
		id: "paradise-fortune",
		name: "Diana · a fortune in a backpack",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				"Paradise Fortune 1",
				"Bourne",
				"A passenger fleeing paradise",
				"Carry Diana Howl away from the Paradise Worlds. Her backpack and her pursuers make this more than an ordinary fare.",
				{ passengers: 1, kills: 3 },
			),
			row(
				"Paradise Fortune 2",
				"Bourne",
				"What the fortune is for",
				"Diana wants to use part of her family’s wealth for people beyond the Paradise Worlds. Hear her plan and choose how to approach the authorities.",
				{
					passengers: 1,
					choices: [
						choice(
							"refuge",
							"Seek Free Worlds protection",
							"diana-refuge",
							"You support Diana’s appeal to the Free Worlds.",
						),
						choice(
							"navy",
							"Carry her account to the Navy",
							"diana-navy",
							"You agree to deliver Diana’s note and the credits to the Navy.",
						),
					],
				},
			),
			row(
				"Paradise Fortune 3",
				"Bourne",
				"A Free Worlds hearing",
				"Keep the final approach clear and deliver Diana’s appeal to the Free Worlds on Bourne.",
				{
					whenFlag: "diana-refuge",
					passengers: 1,
					kills: 4,
					flag: "diana-free-worlds",
					reward: 60000,
					outcome:
						"Diana’s appeal reaches the Free Worlds. The decision about her fortune now rests beyond the society she fled.",
				},
			),
			row(
				"Paradise Fortune 4",
				"New Boston",
				"A note for the Navy",
				"Bring the backpack of credits and Diana’s note to the Navy on New Boston.",
				{
					whenFlag: "diana-navy",
					cargo: 2,
					flag: "diana-navy-report",
					reward: 45000,
					outcome:
						"The Navy receives the note and the backpack. Your role in Diana’s flight has reached its chosen conclusion.",
				},
			),
		],
	},
	{
		id: "saving-artifacts",
		name: "The statues · a place in history",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				"Saving Artifacts 1",
				"Alexandria",
				"An archive needs room",
				"Carry the artifacts an Earth museum can no longer care for to Alexandria.",
				{ cargo: 10 },
			),
			row(
				"Saving Artifacts 2",
				"Greenrock",
				"Statues in a warlord’s hands",
				"Seek the stolen statues from Winter on Greenrock and trace the bargain that might recover them.",
				scan,
			),
			row(
				"Saving Artifacts 3",
				"Greenrock",
				"The bargain with the warlord",
				"Defeat Lokust’s force as agreed and recover the flight record confirming the bargain.",
				{ kills: 4, board: true },
			),
			row(
				"Saving Artifacts 4",
				"Alexandria",
				"Back into safekeeping",
				"Bring the recovered statues to Alexandria, where they can be preserved beyond the warlord’s private collection.",
				{
					cargo: 12,
					flag: "artifacts-preserved",
					reward: 65000,
					outcome:
						"The statues enter safekeeping. The archive records the route by which they were recovered.",
				},
			),
		],
	},
	{
		id: "quicksilver-mail",
		name: "Quicksilver · the misposted package",
		faction: "Republic",
		file: "data/human/human missions.txt",
		missions: [
			row(
				"Quicksilver Mixup 0",
				"Silver",
				"A package for Silver",
				"Deliver the labeled package to Silver. It seems straightforward enough.",
				{ cargo: 2, reward: 8000 },
			),
			row(
				"Quicksilver Mixup 1",
				"Quicksilver",
				"A name too similar",
				"The package was intended for Quicksilver. Carry it to the correct world despite the missed original deadline.",
				{ cargo: 2, reward: 4000 },
			),
			row(
				"Quicksilver Mixup 2",
				"Quicksilver",
				"Not the only mistake",
				"Carry another batch of misposted mail to Quicksilver and arrange the return shipment.",
				{ cargo: 6, reward: 12000 },
			),
			row(
				"Quicksilver Mixup 3",
				"Silver",
				"The return post",
				"Bring the return shipment to Silver and close the improvised postal circuit.",
				{
					cargo: 6,
					flag: "quicksilver-mail-complete",
					reward: 18000,
					outcome:
						"The mail is finally on the right worlds. Some voyages end with a corrected address rather than a battle.",
				},
			),
		],
	},
);

specifications.push(
	{
		id: "turner-business",
		name: "Greenwater · a business across cultures",
		faction: "Hai",
		requiredFlag: "hai-license",
		file: "data/hai/hai missions.txt",
		missions: [
			row(
				"Expanding Business [1]",
				"Allhome",
				"Turner’s waiting convoy",
				"Meet David Turner and the waiting freighters on Allhome. His plan needs regular trade between human and Hai space.",
				{ passengers: 1, cargo: 8 },
			),
			row(
				["Expanding Business [2]", "Expanding Business [3]"],
				"Follower",
				"Supplies for the outfitter",
				"Bring the convoy’s supply package to Follower and coordinate the human contacts helping Turner’s project.",
				{ cargo: 12, kills: 3 },
			),
			row(
				"Expanding Business [4]",
				"Greenwater",
				"The Greenwater outfitter",
				"Deliver the construction shipment and open the outfitter’s basic stock on Greenwater.",
				{
					cargo: 14,
					flag: "greenwater-outfitter",
					updatePlanet: {
						name: "Greenwater",
						outfitter: ["Basic Outfits", "Ammo North", "Ammo South"],
					},
				},
			),
			row(
				["Expanding Business [5]", "Expanding Business [6]"],
				"Sunracer",
				"A shipyard proposal",
				"Turner’s next proposal is a shipyard. Collect the supplier’s construction package from Sunracer.",
				{ cargo: 14, passengers: 1 },
			),
			row(
				"Expanding Business [7]",
				"Greenwater",
				"Ships at Greenwater",
				"Deliver the final shipment and establish the shipyard’s human stock. The project has grown from a trade route into a working port industry.",
				{
					cargo: 14,
					flag: "greenwater-shipyard",
					reward: 90000,
					updatePlanet: {
						name: "Greenwater",
						shipyard: [
							"Basic Ships",
							"Syndicate Basics",
							"Megaparsec Basics",
							"Megaparsec Advanced",
						],
						outfitter: [
							"Basic Outfits",
							"Ammo North",
							"Ammo South",
							"Common Outfits",
							"Syndicate Advanced",
							"Lovelace Basics",
						],
					},
					outcome:
						"The Greenwater shipyard and expanded outfitter are open. Turner’s cross-cultural enterprise now changes what captains can buy here.",
				},
			),
		],
	},
	{
		id: "strider-diplomacy",
		name: "Strider · technology for a defense",
		faction: "Hai",
		requiredFlag: "hai-license",
		file: "data/hai/hai missions.txt",
		missions: [
			row(
				["Strider Alt Start", "Strider 0"],
				"Hai-home",
				"An answer to the Solifuge",
				"The Hai council wants a drone carrier to counter the Unfettered Solifuge, but its designers still need hull-repair technology.",
				scan,
			),
			row(
				"Strider 1",
				"Allhome",
				"Yashili’s delegation",
				"Meet Ambassador Yashili’s delegation and choose which civilization to approach for the repair technology.",
				{
					passengers: 2,
					choices: [
						choice(
							"remnant",
							"Approach the Remnant",
							"strider-remnant",
							"Take the proposal to the Remnant, whose secrecy makes careful diplomacy essential.",
						),
						choice(
							"coalition",
							"Approach the Coalition",
							"strider-coalition",
							"Take the proposal to the Coalition and seek an agreement at the Ring of Friendship.",
						),
					],
				},
			),
			row(
				"Strider: Remnant 1",
				"Caelian",
				"Arrange a private meeting",
				"Deliver the Hai proposal to the Remnant and arrange a meeting for Yashili’s delegation.",
				{ whenFlag: "strider-remnant", cargo: 4 },
			),
			row(
				"Strider: Remnant 2",
				"Covert",
				"The Remnant negotiation",
				"Bring Yashili and the delegation to Covert to negotiate for hull-repair technology.",
				{ whenFlag: "strider-remnant", passengers: 3 },
			),
			row(
				"Strider: Remnant 3",
				"Hai-home",
				"The Remnant agreement",
				"Return the delegation and the technical record to Hai-home. The carrier team can begin its next design stage.",
				{
					whenFlag: "strider-remnant",
					passengers: 3,
					cargo: 8,
					flag: "strider-repair-technology",
					reward: 85000,
					outcome:
						"The Hai receive the agreed repair technology. The Strider project has the missing knowledge it needed.",
				},
			),
			row(
				"Strider: Coalition 1",
				"Ring of Friendship",
				"The Coalition negotiation",
				"Bring Yashili and the delegation to the Ring of Friendship to negotiate for hull-repair technology.",
				{ whenFlag: "strider-coalition", passengers: 3 },
			),
			row(
				"Strider: Coalition 2",
				"Hai-home",
				"The Coalition agreement",
				"Return the delegation and the technical record to Hai-home. The carrier team can begin its next design stage.",
				{
					whenFlag: "strider-coalition",
					passengers: 3,
					cargo: 8,
					flag: "strider-repair-technology",
					reward: 85000,
					outcome:
						"The Hai receive the agreed repair technology. The Strider project has the missing knowledge it needed.",
				},
			),
		],
	},
	{
		id: "nanachi",
		name: "Nanachi · a new captain",
		faction: "Hai",
		requiredFlag: "hai-license",
		file: "data/hai/hai missions.txt",
		missions: [
			row(
				"Nanachi 1",
				"Cloudfire",
				"Her first delivery",
				"Help Nanachi complete an early delivery to Cloudfire. She is learning how a small ship earns its living.",
				{ cargo: 6 },
			),
			row(
				"Nanachi 2",
				"Hai-home",
				"Passengers for home",
				"Bring Nanachi’s passenger party to Hai-home and help her keep the arrival orderly.",
				{ passengers: 3 },
			),
			row(
				"Nanachi 3",
				"Allhome",
				"Spices for the festival",
				"Carry the Quarg-spice shipment for the festival on Allhome with Nanachi’s convoy.",
				{ cargo: 8 },
			),
			row(
				"Nanachi 4",
				"Allhome",
				"The dangerous route",
				"Protect Nanachi’s returning convoy from the pirates that attacked the Hai trade route.",
				{
					cargo: 8,
					kills: 4,
					flag: "nanachi-mentor",
					reward: 65000,
					outcome:
						"Nanachi has completed her early voyages and survived the dangerous one. Another captain has a little more experience to rely on.",
				},
			),
		],
	},
	{
		id: "acorn-delights",
		name: "Acorn Delights · finding family",
		faction: "Hai",
		requiredFlag: "hai-license",
		file: "data/hai/hai missions.txt",
		missions: [
			row(
				"Acorn Delights: Part 1",
				"Stonebreak",
				"Eeeya’s parcel",
				"Bring Eeeya and the parcel for her missing granddaughter to Stonebreak.",
				{ passengers: 1, cargo: 4 },
			),
			row(
				"Acorn Delights: Part 2",
				"Cloudfire",
				"Another address",
				"Follow the family’s next lead to Cloudfire with Eeeya and the undelivered parcel.",
				{ passengers: 1, cargo: 4 },
			),
			row(
				"Acorn Delights: Part 3",
				"Darkcloak",
				"Beyond the divide",
				"Bring Eeeya into Unfettered space to find her granddaughter on Darkcloak.",
				{ passengers: 1, cargo: 4 },
			),
			row(
				"Acorn Delights: Part 4",
				"Allhome",
				"The shop’s paperwork",
				"Return Eeeya to Allhome to settle the Acorn Delights shop’s affairs.",
				{ passengers: 1 },
			),
			row(
				"Acorn Delights: Part 5",
				"Darkcloak",
				"A grandmother’s choice",
				"Bring Eeeya back to Darkcloak. She has chosen to live near her granddaughter, even across the division in Hai society.",
				{
					passengers: 1,
					cargo: 6,
					flag: "eeeya-reunited",
					reward: 60000,
					outcome:
						"Eeeya arrives where she has chosen to make her home. Her family’s route does not fit neatly inside the political border.",
				},
			),
		],
	},
	{
		id: "scars-legion",
		name: "Scar’s Legion · trouble in Hai space",
		faction: "Hai",
		requiredFlag: "hai-license",
		file: "data/hai/hai missions.txt",
		missions: [
			row(
				"Pirate Troubles [0]",
				"Hai-home",
				"Pirates beyond the wormhole",
				"Help the Hai repel the pirates attacking their trade routes, and recover a record of the gang’s movements.",
				boarding,
			),
			row(
				["Pirate Troubles [1]", "Pirate Troubles [2]"],
				"Haven",
				"Find Scar’s Legion",
				"Follow the Far North lead to the gang’s hiding place and locate its command traffic.",
				scan,
			),
			row(
				"Pirate Troubles [2]",
				"Haven",
				"The gang’s offer",
				"Scar’s Legion offers tribute in exchange for a deal. Choose whether to accept a settlement or refuse and face the leader’s challenge.",
				{
					choices: [
						choice(
							"refuse",
							"Refuse the tribute",
							"scar-refused",
							"You refuse the proposed tribute and accept the confrontation with the Keloid.",
						),
						choice(
							"deal",
							"Arrange a settlement",
							"scar-settlement",
							"You bring a negotiated account back to the Hai rather than pursue the duel.",
						),
					],
				},
			),
			row(
				"Pirate Troubles [3]",
				"Hai-home",
				"The Keloid’s challenge",
				"Defeat the gang’s command force and return its flight record to the Hai.",
				{ whenFlag: "scar-refused", kills: 5, board: true, reward: 65000 },
			),
			row(
				"Pirate Troubles [4]",
				"Hai-home",
				"The trade convoy resumes",
				"Bring the Hai technology convoy’s essential shipment home and report the resolution of the pirate crisis.",
				{
					cargo: 12,
					flag: "scar-legion-resolved",
					reward: 65000,
					outcome:
						"The Hai have your account of the gang and a completed convoy. The immediate threat to the trade route is resolved.",
				},
			),
		],
	},
);

// Source-authentic capability rewards and revealed destinations. These are functional
// requirements, not archive entries or free global permission flags.
function sourceStage(arcId, sourceId) {
	const entry = specifications
		.find((arc) => arc.id === arcId)
		?.missions.find((stage) => stage.sourceMissions.includes(sourceId));
	if (!entry)
		throw new Error(`Missing authored source stage: ${arcId} / ${sourceId}`);
	return entry;
}
sourceStage("remnant-cognizance", "Remnant: Cognizance 23").offerShip =
	"merganser";
sourceStage("aqrabe-gardens", "Successors: Ghosts Aqrabe 5").grantShip = {
	shipId: "vujlet",
	name: "Nnesa ti-a-Oj",
	outfits: ["radiant-shield-shunt", "multimodal-armor-keystone"],
	loanId: "aqrabe-stellar",
};
sourceStage("aqrabe-gardens", "Successors: Ghosts Aqrabe 7").revokeLoan = {
	loanId: "aqrabe-stellar",
	outfits: ["radiant-shield-shunt", "multimodal-armor-keystone"],
};
sourceStage("patir-mystery", "Ka'het: Patir Mystery 6").cloak = "enter";
sourceStage("patir-mystery", "Ka'het: Patir Mystery 8B").cloak = "land";
sourceStage("successor-ghosts", "Successors: Ghosts Cloak Prompt").cloak =
	"land";
sourceStage("patir-mystery", "Ka'het: Patir Mystery 1").worldOnAccept = [
	{
		tokens: ["planet", "Builder Settlement"],
		children: [
			{ tokens: ["remove", "attributes", "requires: ka'sei"], children: [] },
		],
	},
];
const scarMeeting = specifications.find((arc) => arc.id === "scars-legion")
	.missions[2];
scarMeeting.target = "Danoa";
scarMeeting.destinationName = "Scar's Hideout";
scarMeeting.revealPlanet = { systemId: "danoa", planetName: "Scar's Hideout" };
const scarBattle = specifications.find((arc) => arc.id === "scars-legion")
	.missions[3];
scarBattle.target = "Danoa";
scarBattle.destinationName = "Scar's Hideout";
scarBattle.description =
	"Defeat the Keloid’s command force at the hidden asteroid base and secure the approach for the Hai freighters.";
const eye = sourceStage("wanderer-exodus", "Wanderers Ap'arak 3");
eye.worldOnComplete = ["Sko'karak", "Sabriset"].map((system) => ({
	tokens: ["system", system],
	children: [{ tokens: ["add", "object", "The Eye"], children: [] }],
}));

// Patir moves physically between the source galaxies. Preparatory stages keep
// the captain on Patir when the transfer happens, and return rendezvous prevent stranding.
const patirArc = specifications.find((arc) => arc.id === "patir-mystery");
const beyond = { systemId: "patir", x: 10059.5, y: 10.5 };
const home = { systemId: "patir", x: -38, y: 553 };
for (const entry of patirArc.missions) {
	if (
		[
			"The station beyond",
			"An expedition beyond",
			"Contact on the great asteroid",
			"Seven days beyond",
			"Fourteen days beyond",
		].includes(entry.name)
	)
		entry.moveSystem = beyond;
	if (
		[
			"The black hole returns",
			"Another asteroid’s remains",
			"The findings from beyond",
			"A route for future researchers",
		].includes(entry.name)
	)
		entry.moveSystem = home;
}
function insertBefore(name, entry) {
	patirArc.missions.splice(
		patirArc.missions.findIndex((m) => m.name === name),
		0,
		entry,
	);
}
insertBefore(
	"An expedition beyond",
	row(
		"Ka'het: Patir Mystery 24",
		"Builder Settlement",
		"The second departure",
		"Assemble the research team at Patir before the black hole moves. Keep the instruments and return manifest aboard.",
		{ passengers: 3, cargo: 8 },
	),
);
insertBefore(
	"Seven days beyond",
	row(
		["Ka'het: Patir Mystery 37A", "Ka'het: Patir Mystery 38A"],
		"Builder Settlement",
		"An expedition of your own",
		"Bring the selected expedition team and its provisions to Patir. The next transfer begins only after everyone is aboard.",
		{ passengers: 3, cargo: 10 },
	),
);
insertBefore(
	"A route for future researchers",
	row(
		"Ka'het: Patir Mystery Safety Net Permanent",
		"Builder Settlement",
		"The return rendezvous",
		"Return to the Builder settlement with the expedition archive before the black hole takes the team home.",
		{ passengers: 3, cargo: 8 },
	),
);

// Verified native hostile identities; fallback pirate encounters are explicit additions.
export const EXPANDED_COMBAT_IDENTITIES = {
	"wanderer-exodus-4": {
		faction: "Hai (Unfettered)",
		evidence: "source NPC government",
		sourceId: "Wanderers: Defend Vara Ke'sok",
	},
	"wanderer-exodus-8": {
		faction: "Alpha",
		evidence: "source NPC government",
		sourceId: "Wanderers: Alpha Surveillance D",
	},
	"wanderer-exodus-11": {
		faction: "Hai (Unfettered)",
		evidence: "source NPC government",
		sourceId: "Wanderers Invaded 2",
	},
	"wanderer-exodus-13": {
		faction: "Hai (Unfettered)",
		evidence: "source NPC government",
		sourceId: "Wanderers Solifuge Recon 2",
	},
	"wanderer-exodus-14": {
		faction: "Hai (Unfettered)",
		evidence: "source NPC government",
		sourceId: "Wanderers Defend Sich'ka'ara",
	},
	"wanderer-exodus-15": {
		faction: "Hai (Unfettered)",
		evidence: "source NPC government",
		sourceId: "Wanderers Rescue 1",
	},
	"wanderer-exodus-17": {
		faction: "Hai (Unfettered)",
		evidence: "source NPC government",
		sourceId: "Wanderers Ap'arak 2",
	},
	"remnant-cognizance-2": {
		faction: "Korath",
		evidence: "source NPC government",
		sourceId: "Remnant: Cognizance 2",
	},
	"remnant-cognizance-3": {
		faction: "Korath",
		evidence: "source NPC government",
		sourceId: "Remnant: Cognizance 4",
	},
	"remnant-cognizance-7": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"remnant-cognizance-10": {
		faction: "Korath",
		evidence: "source NPC government",
		sourceId: "Remnant: Cognizance 18",
	},
	"remnant-cognizance-12": {
		faction: "Korath",
		evidence: "source NPC government",
		sourceId: "Remnant: Cognizance 23",
	},
	"remnant-cognizance-13": {
		faction: "Korath",
		evidence: "source NPC government",
		sourceId: "Remnant: Cognizance 25",
	},
	"remnant-cognizance-17": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"remnant-cognizance-18": {
		faction: "Bounty Hunter",
		evidence: "source NPC government",
		sourceId: "Remnant: Cognizance 33",
	},
	"successor-ghosts-6": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"successor-ghosts-9": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"successor-ghosts-11": {
		faction: "Solitude Enforcer",
		evidence: "source NPC government",
		sourceId: "Successors: Ghosts 17",
	},
	"successor-ghosts-13": {
		faction: "High Houses (Unknown)",
		evidence: "source NPC government",
		sourceId: "Successors: Ghosts 19",
	},
	"aqrabe-gardens-5": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"aqrabe-gardens-7": {
		faction: "Solitude Enforcer",
		evidence: "source NPC government",
		sourceId: "Successors: Ghosts Aqrabe 7",
	},
	"myurej-wedding-4": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"myurej-wedding-7": {
		faction: "Solitude Enforcer",
		evidence: "source NPC government",
		sourceId: "Successors: Ghosts Myurej 6",
	},
	"coalition-allegiances-9": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"coalition-allegiances-11": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"coalition-allegiances-12": {
		faction: "Lunarium",
		evidence: "source NPC government",
		sourceId: "Heliarch Containment 5",
	},
	"coalition-allegiances-16": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"coalition-allegiances-17": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"coalition-allegiances-19": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"coalition-allegiances-24": {
		faction: "Pirate",
		evidence: "source NPC government",
		sourceId: "Lunarium: Combat Training 2",
	},
	"wanderer-machines-2": {
		faction: "Kor Mereti",
		evidence: "named antagonist in source mission prose",
		sourceId: "Wanderers: Mereti Controller",
	},
	"wanderer-machines-3": {
		faction: "Kor Sestor",
		evidence: "named antagonist in source mission prose",
		sourceId: "Wanderers: Sestor Controller",
	},
	"wanderer-machines-4": {
		faction: "Kor Mereti",
		evidence: "source NPC government",
		sourceId: "Wanderers: First Mereti Attack",
	},
	"wanderer-machines-9": {
		faction: "Kor Mereti",
		evidence: "source NPC government",
		sourceId: "Wanderers: Kor Efret 3",
	},
	"wanderer-machines-12": {
		faction: "Kor Mereti",
		evidence: "source NPC government",
		sourceId: "Wanderers: Mind 5",
	},
	"wanderer-machines-16": {
		faction: "Kor Sestor",
		evidence: "source NPC government",
		sourceId: "Wanderers: Sestor Attack",
	},
	"wanderer-machines-17": {
		faction: "Kor Sestor",
		evidence: "source NPC government",
		sourceId: "Wanderers: Sestor: Farpoint Attack 1",
	},
	"wanderer-machines-20": {
		faction: "Alpha",
		evidence: "named antagonist in source mission prose",
		sourceId: "Wanderers: Sestor: Bomb Zenith 1",
	},
	"wanderer-machines-21": {
		faction: "Alpha",
		evidence: "named antagonist in source mission prose",
		sourceId: "Wanderers: Sestor Alt: Alnilam 1",
	},
	"wanderer-machines-22": {
		faction: "Kor Sestor",
		evidence: "named antagonist in source mission prose",
		sourceId: "Wanderers: Sestor: Kill Southern Remnant",
	},
	"wanderer-machines-25": {
		faction: "Kor Sestor",
		evidence: "source NPC government",
		sourceId: "Wanderers: Sestor: Factory 2",
	},
	"patir-mystery-18": {
		faction: "Korath",
		evidence: "source NPC government",
		sourceId: "Ka'het: Patir Mystery 29",
	},
	"sheragi-emerald-4": {
		faction: "Bounty Hunter",
		evidence: "source NPC government",
		sourceId: "Sheragi Archaeology: The Box 5",
	},
	"deep-research-9": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"deep-research-11": {
		faction: "Pirate",
		evidence: "source NPC government",
		sourceId: "Deep: Scientist Rescue 3A",
	},
	"avgi-rescue-1": {
		faction: "Aberrant",
		evidence: "named antagonist in source mission prose",
		sourceId: "Avgi: Scout Rescue",
	},
	"avgi-rescue-2": {
		faction: "Aberrant",
		evidence: "source NPC government",
		sourceId: "Avgi: Frontline Combat",
	},
	"band-tour-4": {
		faction: "Republic",
		evidence: "named antagonist in source mission prose",
		sourceId: "There Might Be Riots part 3B",
	},
	"timothy-3": {
		faction: "Pirate",
		evidence: "source NPC government",
		sourceId: "Timothy Radrickson 3b: Pirate Base",
	},
	"timothy-4": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"ice-queen-5": {
		faction: "Pirate",
		evidence: "added encounter for compact adaptation",
		sourceId: null,
	},
	"ice-queen-7": {
		faction: "Bounty",
		evidence: "source NPC government",
		sourceId: "Ice Queen 8",
	},
	"syndicate-business-4": {
		faction: "Pirate",
		evidence: "source NPC government",
		sourceId: "Syndicate Business 4",
	},
	"syndicate-business-5": {
		faction: "Independent (Killable)",
		evidence: "source NPC government",
		sourceId: "Syndicate Business 5",
	},
	"paradise-fortune-1": {
		faction: "Republic",
		evidence: "named antagonist in source mission prose",
		sourceId: "Paradise Fortune 1",
	},
	"paradise-fortune-3": {
		faction: "Republic",
		evidence: "source NPC government",
		sourceId: "Paradise Fortune 3",
	},
	"saving-artifacts-3": {
		faction: "Pirate",
		evidence: "source NPC government",
		sourceId: "Saving Artifacts 3",
	},
	"turner-business-2": {
		faction: "Pirate",
		evidence: "source NPC government",
		sourceId: "Expanding Business [2]",
	},
	"nanachi-4": {
		faction: "Pirate",
		evidence: "source NPC government",
		sourceId: "Nanachi 4",
	},
	"scars-legion-1": {
		faction: "Pirate",
		evidence: "source NPC government",
		sourceId: "Pirate Troubles [0]",
	},
	"scars-legion-4": {
		faction: "Scar's Legion (Killable)",
		evidence: "source NPC government",
		sourceId: "Pirate Troubles [3]",
	},
};

export function createExpandedArcs({ mission }) {
	const systemId = (name) =>
		mission("resolve", "resolve", name, "").destinationId;
	return specifications.map((arc) => ({
		id: arc.id,
		name: arc.name,
		faction: arc.faction,
		requiredFlag: arc.requiredFlag,
		description: arc.missions[0].description,
		missions: arc.missions.map((entry, index) => {
			const {
				sourceMissions,
				target,
				name,
				description,
				scanSystems,
				...requirements
			} = entry;
			return mission(`${arc.id}-${index + 1}`, name, target, description, {
				chapter: arc.name,
				faction: arc.faction,
				sourceFile: arc.file,
				sourceMissions,
				reward: 32000 + index * 1800,
				...(entry.kills
					? {
							enemyFaction:
								EXPANDED_COMBAT_IDENTITIES[`${arc.id}-${index + 1}`]?.faction ||
								"Pirate",
						}
					: {}),
				...requirements,
				...(scanSystems ? { scanSystems: scanSystems.map(systemId) } : {}),
			});
		}),
	}));
}

export const EXPANDED_ARC_SUMMARY = specifications.map((arc) => ({
	id: arc.id,
	name: arc.name,
	stages: arc.missions.length,
	sourceFiles: [
		...new Set([
			arc.file,
			...arc.missions.map((m) => m.sourceFile).filter(Boolean),
		]),
	],
	sourceMissions: [...new Set(arc.missions.flatMap((m) => m.sourceMissions))],
}));
