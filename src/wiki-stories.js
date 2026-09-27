// Original civilian stories inspired by the wiki; not adaptations of native mission IDs.
export function createWikiArcs({ mission }) {
	const arc = (id, name, faction, region, sources, stages) => ({
		id,
		name,
		faction,
		region,
		wikiSources: sources,
		adaptation: "original-wiki-story",
		missions: stages.map(
			([title, destination, description, requirements = {}], index) =>
				mission(`${id}-${index + 1}`, title, destination, description, {
					chapter: name,
					faction,
					reward: 5500 + index * 2000,
					wikiSources: sources,
					adaptation: "original-wiki-story",
					...requirements,
				}),
		),
	});
	return [
		arc(
			"wiki-harvest",
			"The price of a harvest",
			"Independent",
			"dirt belt",
			["HumanSpace", "MajorOrganizations"],
			[
				[
					"One missing pump",
					"New Greenland",
					"At New Boston's freight counter, a grower shows you the repair bill for an irrigation pump. The part is ordinary; the cost of sending it is not. Carry the cooperative's two crates to New Greenland so its mechanic can finish a replacement assembly.",
					{
						cargo: 2,
						outcome:
							"The mechanic unpacks the crates before asking your name. By evening, a repaired pump is running on the test bench.",
					},
				],
				[
					"A ledger of small margins",
					"New Boston",
					"The mechanic asks you to bring the assembly and a grower's ledger home. Before returning, land on both New Greenland and New Boston so the two shipping offices can stamp a shared manifest. The growers want to know what pooling deliveries would actually save.",
					{
						cargo: 2,
						visitPlanets: ["New Greenland", "New Boston"],
						outcome:
							"The two offices agree on a common manifest. Nobody calls it historic. They calculate how many meals the saved fees will buy.",
					},
				],
				[
					"Who owns the next shipment?",
					"New Boston",
					"An established broker offers a guaranteed rate in exchange for an exclusive shipping arrangement. The growers could instead publish their records and organize their own deliveries. Bring the proposal to the cooperative's meeting and help them choose.",
					{
						cargo: 1,
						choices: [
							{
								id: "cooperate",
								label: "Back the cooperative",
								flag: "wiki-cooperative",
								outcome:
									"The growers keep control of their shipments and make the figures available to neighboring settlements. A new cooperative notice appears on port boards.",
							},
							{
								id: "broker",
								label: "Take the guaranteed rate · +2,000 cr",
								bonus: 2000,
								flag: "wiki-broker",
								outcome:
									"The broker pays a signing fee. The growers gain certainty for this season, with the next season's terms still to be negotiated.",
							},
						],
					},
				],
			],
		),
		arc(
			"wiki-research",
			"A science worth sharing",
			"Republic",
			"deep",
			["HumanSpace", "HistoricalTimeline"],
			[
				[
					"Beyond the laboratory",
					"Midgard",
					"A student from the Deep has funding for equipment but needs a captain for fieldwork. Deliver two tons of calibration instruments to Midgard and scan the Aludra system on arrival. Their supervisor insists that a fresh reading is worth more than an impressive theory.",
					{
						cargo: 2,
						scan: true,
						outcome:
							"The supervisor compares your readings with the instruments. A discrepancy becomes a research question rather than a reason to discard the data.",
					},
				],
				[
					"The caravan's old road",
					"Valhalla",
					"The student traces the trading caravans that once reconnected isolated human worlds. Carry one researcher to Valhalla, surveying both Aludra and the Valhalla system along the way. Your logs will connect a present-day field result with the region's public history.",
					{
						passengers: 1,
						scanSystems: [],
						scan: true,
						outcome:
							"The researcher finds handwritten uncertainties in an old caravan log. Even the famous captains did not know quite what they were doing.",
					},
				],
				[
					"The results belong somewhere",
					"Midgard",
					"The team's findings are ready. A commercial laboratory offers more money for exclusive access; the university library will publish them for other survey crews. Take the records back to Midgard and decide where the complete observations should go.",
					{
						cargo: 1,
						choices: [
							{
								id: "open",
								label: "Deposit in the public archive",
								flag: "wiki-open-research",
								outcome:
									"The library releases the observations with their uncertainties intact. Civilian survey teams begin requesting copies.",
							},
							{
								id: "license",
								label: "License the findings · +3,000 cr",
								bonus: 3000,
								flag: "wiki-licensed-research",
								outcome:
									"The laboratory funds another season of fieldwork in exchange for exclusive access. The students celebrate their new equipment and argue about who will get to read the results.",
							},
						],
					},
				],
			],
		),
		arc(
			"wiki-relief",
			"A uniform and a promise",
			"Republic",
			"rim",
			["MajorOrganizations", "StyleGoals"],
			[
				[
					"The other Navy",
					"Glaze",
					"A Humanitarian Corps volunteer is traveling without a weapon. They ask for a berth to Glaze and room for two crates of dressings. The uniform gets an uneasy reception at the booking desk; the medical supplies get none of the same objections.",
					{
						passengers: 1,
						cargo: 2,
						outcome:
							"The volunteer introduces themself by profession before rank. The clinic's queue keeps moving.",
					},
				],
				[
					"Whose patients?",
					"New Boston",
					"The clinic has patients from worlds on both sides of the political divide. Bring an exhausted civilian medical worker to New Boston, with one crate of replacement supplies. The volunteer asks that the shipment be recorded as treatment, not recruitment.",
					{
						passengers: 1,
						cargo: 1,
						outcome:
							"A local nurse signs the receipt and hands the visitor a clean apron. For the next few hours, nobody asks where the uniform came from.",
					},
				],
				[
					"Names on a report",
					"Glaze",
					"The completed relief report could publicly credit the Navy and the local volunteers together, or omit their affiliations to protect a fragile collaboration. Return the report to Glaze. Both groups have earned recognition; neither wants the patients turned into a political argument.",
					{
						cargo: 1,
						choices: [
							{
								id: "credit",
								label: "Credit the joint effort",
								flag: "wiki-joint-relief",
								outcome:
									"The report names the Corps and local staff together. Some readers object, but the people who worked the wards recognize an honest account.",
							},
							{
								id: "quiet",
								label: "Keep the report civilian",
								flag: "wiki-quiet-relief",
								outcome:
									"The report records every delivery and treatment without naming the organizations. The collaboration continues quietly.",
							},
						],
					},
				],
			],
		),
		arc(
			"wiki-memory",
			"The distance from home",
			"Independent",
			"near earth",
			["HistoricalTimeline", "HumanSpace"],
			[
				[
					"A history without admirals",
					"Earth",
					"A community archivist wants to record how ordinary families first left Earth. Carry their recording equipment to Earth. They promise that the exhibition will have room for mechanics, teachers and passengers as well as famous explorers.",
					{
						cargo: 2,
						outcome:
							"The archivist opens the first recording: a parent reading a departure checklist aloud to a frightened child.",
					},
				],
				[
					"Two small steps",
					"Earth",
					"Take the archivist on a circuit of Luna and Mars, then return to Earth. Land on each world so they can collect local accounts. Mars's first settlement dates to 2080; permanent settlement on Luna followed in 2100. The people living there now have their own stories.",
					{
						passengers: 1,
						visitPlanets: ["Luna", "Mars"],
						outcome:
							"The recordings disagree on details. The archivist keeps those disagreements, saying a history can be honest without sounding unanimous.",
					},
				],
				[
					"Where the exhibition travels",
					"New Boston",
					"Bring a copy of the exhibition to New Boston's public reading room. A sponsor will pay extra for an exclusive presentation, while the archivist would prefer a copy that any village can borrow. Choose the distribution agreement when you deliver it.",
					{
						cargo: 1,
						choices: [
							{
								id: "library",
								label: "Make a traveling public exhibit",
								flag: "wiki-public-history",
								outcome:
									"The reading room begins taking reservations from village schools. The first child in line asks how much a ticket to Luna costs.",
							},
							{
								id: "sponsor",
								label: "Accept a sponsor · +2,500 cr",
								bonus: 2500,
								flag: "wiki-sponsored-history",
								outcome:
									"The sponsor funds a carefully produced exhibition. Admission is limited, but the archivist finally has a budget for preserving the original recordings.",
							},
						],
					},
				],
			],
		),
	];
}
