// Setting adapted from the official Endless Sky wiki (GPL-3.0).
// Prose and civilian encounters are authored for Meridian Wake; not native missions.
export const WIKI_COMMIT = "f243678789e0c7b179793697ae39bb7d00cf89d2";
export const wikiUrl = (page) =>
	`https://github.com/endless-sky/endless-sky/wiki/${page}`;

export const REGIONS = [
	{
		id: "dirt belt",
		name: "The Dirt Belt",
		category: "Regions",
		summary:
			"Farm settlements and textile towns survive on small margins. Independence is a household ambition long before it becomes a political cause.",
		text: "Hard work is a source of pride, but poor soil, factory shifts and the price of moving goods constrain what families can earn. Tariffs on food and clothing weigh heavily here. A captain carrying irrigation parts may matter more to a village than a distant Parliament debate.",
		travel:
			"Food, clothing and machinery connect these communities. Small cargo holds and spare passenger berths are enough to begin helping.",
		source: "HumanSpace",
		voices: [
			[
				"A textile worker",
				"My mother saved for a farm. I saved for passage. We both spend our shifts looking at the same departure board.",
			],
			[
				"A dairy farmer",
				"The milk still needs collecting when a convoy is late. Find us a reliable spare-parts captain and we can handle the rest.",
			],
			[
				"A village teacher",
				"When the children draw the future, half of them draw a ship. I would like the other half to have reasons to stay.",
			],
		],
	},
	{
		id: "core",
		name: "The Core",
		category: "Regions",
		summary:
			"Factories, mines and corporate shipping bind the Syndicate's industrial worlds together. Reliable employment and lasting debt can come in the same contract.",
		text: "Many families arrive hoping to build savings and leave for a home of their own. Production schedules shape the cities; the corporations that provide work also exercise political power. The region's wealth is enormous, but a worker's share of it can remain very small.",
		travel:
			"Look for machinery, mineral and shift-worker contracts. Industrial prosperity does not make every shipping lane safe.",
		source: "HumanSpace",
		voices: [
			[
				"A shift machinist",
				"They say the line cannot stop. Funny how easily it stops when the executive transport needs the loading bay.",
			],
			[
				"A freight clerk",
				"The company got my family off Earth. I remember that. I also read every new deduction on my payslip.",
			],
			[
				"A union organizer",
				"We are asking for a rest period and replacement filters. You would think we had asked to own the star.",
			],
		],
	},
	{
		id: "deep",
		name: "The Deep",
		category: "Regions",
		summary:
			"Research, public education and advanced shipbuilding make the Deep prosperous and unusually secure.",
		text: "Scientific confidence coexists with old household traditions. People value education and often see little reason to leave. The Deep's democratic uprising and later armed trading caravans helped reconnect human worlds after centuries of fragmentation.",
		travel:
			"Research instruments, field teams and geological surveys are common work. Local shipyards are worth inspecting before buying a new hull.",
		source: "HumanSpace",
		voices: [
			[
				"A laboratory technician",
				"Our survey budget covers the instruments and a captain. It does not cover losing the instruments because the captain wanted to test a new gun.",
			],
			[
				"A student",
				"Tuition is covered. Getting my field samples home is the difficult part. I have never had to negotiate with a ship before.",
			],
			[
				"A baker",
				"Of course there is no scientific reason to leave sweet bread outside tonight. I am leaving some anyway. So did my grandmother.",
			],
		],
	},
	{
		id: "paradise",
		name: "The Paradise Worlds",
		category: "Regions",
		summary:
			"Carefully engineered climates shelter affluent communities and the workers who keep those communities comfortable.",
		text: "Safety and abundance are genuine, but unevenly shared. Domestic workers can spend their lives maintaining houses they could never afford. For some residents, an outward ticket means adventure; for others it means finding somewhere they can afford to grow old.",
		travel:
			"Tourism and luxury freight coexist with ordinary workers' passage. A beautiful destination can still be an expensive place to live.",
		source: "HumanSpace",
		voices: [
			[
				"A groundskeeper",
				"Every leaf along the arrivals walk is trimmed. I leave before the tourists wake up, so they can imagine it grows that way.",
			],
			[
				"A housekeeper",
				"My employer asked why I would leave such a lovely world. I asked whether I could retire in the spare room.",
			],
			[
				"A tour guide",
				"Yes, the sunset is scheduled to be clear. No, I cannot reschedule the star for a delayed shuttle.",
			],
		],
	},
	{
		id: "rim",
		name: "The Rim",
		category: "Regions",
		summary:
			"Spaceport towns look outward with curiosity, while militia patrols keep an anxious watch for pirates.",
		text: "Offworld travel is an enticing possibility rather than an abstraction. Yet many residents have watched a battle from their own doorstep. Local defense and dependable civilian shipping are closely connected; the arrival of medicine can be as memorable as the arrival of reinforcements.",
		travel:
			"Passenger service, medical deliveries and patrol work are useful here. Check hostile contacts before committing a lightly armed ship.",
		source: "HumanSpace",
		voices: [
			[
				"A clinic nurse",
				"Last time the freighter was late, we divided every bottle between two wards. This time I would like to keep the labels on.",
			],
			[
				"A dock welder",
				"You can tell who grew up here. A flash overhead, and we all stop talking until we know what it was.",
			],
			[
				"A travel agent",
				"I sell tickets to places I have never seen. One day I am going to keep one.",
			],
		],
	},
	{
		id: "pirate",
		name: "The Pirate Worlds",
		category: "Regions",
		summary:
			"Violence and scarcity leave people with few safe ways to earn a living or leave.",
		text: "Some crews are held by coercion, and civilian escapees may fear being treated as criminals elsewhere. A pirate port is not populated solely by willing raiders. Survival, recruitment and the possibility of passage shape everyday conversations.",
		travel:
			"Prepare for hostile traffic. Boarding and capture carry different risks from defeating an attacker; extra crew and boarding equipment help.",
		source: "HumanSpace",
		voices: [
			[
				"A repair worker",
				"I mend hulls. I do not get to ask where the holes came from. If I did, there would be another hole to mend.",
			],
			[
				"A food vendor",
				"Everyone asks whether business is good after a raid. Ask whether the schools are open. Ask who can afford a doctor.",
			],
			[
				"A young deckhand",
				"If you take passengers, say so quietly. There are people here who would rather leave than be promoted.",
			],
		],
	},
	{
		id: "near earth",
		name: "Earth and its neighbors",
		category: "Regions",
		summary:
			"Humanity's birthplace is also a crowded working world. Being at the center of history does not guarantee an easy life.",
		text: "On Earth, entire communities live between towers that hide the sun. Schools and factories crowd the same districts. The first settlements on Mars and Luna began humanity's outward journey; centuries later, leaving home still requires money, a berth and someone willing to offer work.",
		travel:
			"Sol has several inhabited destinations. A contract for Earth cannot be delivered on Luna or Mars; choose the correct landing site.",
		source: "HumanSpace",
		voices: [
			[
				"A city gardener",
				"We planted the courtyard with things that tolerate shade. A child asked what full sunlight feels like.",
			],
			[
				"A museum attendant",
				"Visitors come for the first spacecraft. Residents come because the hall is quiet and the air is clean.",
			],
			[
				"A departing factory worker",
				"The ticket says one berth. I keep checking. There has never been a line on a form that mattered more.",
			],
		],
	},
	{
		id: "south",
		name: "The southern colonies",
		category: "Regions",
		summary:
			"Widely separated communities depend on one another when distant authorities cannot keep their routes safe.",
		text: "The Southern Mutual Defense Pact draws strength from local militias and the conviction that neighbors should answer a call for help. Its supporters see protection where others fear a challenge to the Republic. The same trade route can carry relief supplies, political arguments and families looking for safety.",
		travel:
			"Freelance work and the Free Worlds story can share a voyage. Reserve enough cargo and bunks for every commitment.",
		source: "MajorOrganizations",
		voices: [
			[
				"A harbor dispatcher",
				"A patrol promised it would come. The next town sent one first. That is why people here remember names more than uniforms.",
			],
			[
				"A shopkeeper",
				"Independence sounds grand. I would settle for a week when the delivery arrives and everyone aboard is still alive.",
			],
			[
				"A volunteer cook",
				"Navy, militia, merchant: if they bring wounded people to this dock, we put the kettle on.",
			],
		],
	},
];

export const ORGANIZATIONS = [
	[
		"parliament",
		"Parliament",
		"The Republic's elected assembly",
		"Representation depends on population, leaving sparsely settled sectors with less influence. Campaigning between worlds is expensive, so the wealthy dominate political life. Critics see the interests of the Syndicate and Paradise Worlds reflected more readily than those of poorer colonies.",
	],
	[
		"navy",
		"The Republic Navy",
		"Military protection and humanitarian service",
		"The Navy's reputation rests on service and keeping its word. Its Humanitarian Corps allows conscientious objectors to serve without combat duties. The reach of its patrols is a political issue, especially where southern communities feel abandoned.",
	],
	[
		"intelligence",
		"Republic Intelligence",
		"A separate authority under Parliament",
		"Intelligence maintains its own ships, detention facilities and information networks. It answers to Parliament rather than the Navy. Even Navy officers can distrust it; the military maintains a separate intelligence branch.",
	],
	[
		"syndicate",
		"The Syndicate",
		"Employer, industrial power and political influence",
		"The corporation supplies work and much of the Republic's revenue while enjoying broad autonomy in the Core. Families seek its wages, but its leadership's discrimination, coercive relationships and influence over public decisions attract bitter criticism.",
	],
	[
		"pact",
		"Southern Mutual Defense Pact",
		"Neighboring militias promising mutual aid",
		"Southern worlds organized their militias as Navy protection concentrated elsewhere. Locally the Pact is celebrated for answering pirate attacks. In wealthier northern communities it can be seen as a worrying rival to central authority.",
	],
	[
		"quarg",
		"The Quarg",
		"Humanity's long-established alien neighbors",
		"The Quarg live in low-gravity, thin-atmosphere environments unsuitable for humans, limiting competition for settlements. Their technology greatly exceeds humanity's. Public accounts of other advanced civilizations remain fragmentary; rumors should not be confused with confirmed history.",
	],
].map(([id, name, summary, text]) => ({
	id,
	name,
	summary,
	text,
	category: "Organizations",
	source: "MajorOrganizations",
}));

export const HISTORY = [
	[2080, "A foothold on Mars", "The first human settlement on Mars begins."],
	[
		2100,
		"A permanent lunar settlement",
		"Humanity establishes a lasting settlement on Luna.",
	],
	[
		2150,
		"Generation ships reach outward",
		"Nuclear-powered generation ships colonize Alpha Centauri without faster-than-light travel.",
	],
	[
		2210,
		"The Plot device",
		"Charles Plot discovers a particle slipstream linking Sol and Alpha Centauri. His device becomes the foundation of the hyperdrive.",
	],
	[
		2260,
		"Fuel from the stars",
		"The deuterium ramscoop makes long voyages more practical. A private colony fleet eventually establishes Valhalla.",
	],
	[
		2320,
		"First contact with the Quarg",
		"Human scouts meet a technologically superior civilization on the southern rim.",
	],
	[
		2330,
		"Humanika",
		"Quarg assistance enables a human colony and embassy as envoys begin sustained contact.",
	],
	[
		2420,
		"The Turf Wars",
		"Corporate conflict over Dirt Belt mining rights turns commercial rivalry into warfare.",
	],
	[
		2450,
		"The Alpha War",
		"Genetically engineered soldiers seize worlds before advanced Deep warships force the survivors into hiding.",
	],
	[
		2500,
		"Fragmented worlds",
		"War and piracy break down interstellar commerce and isolate settlements.",
	],
	[
		2550,
		"The Deep's uprising",
		"Coordinated popular action replaces corporate rule with democratic government in the Deep.",
	],
	[
		2620,
		"The caravan era",
		"Armed merchant fleets from the Deep revive trade and connect isolated communities.",
	],
	[
		2730,
		"The Republic forms",
		"Earth and parts of the Rim, Core and Dirt Belt establish a representative union.",
	],
	[
		2750,
		"The Syndicate joins",
		"Nonviolent protests help bring corporate worlds into the Republic, though corporate influence persists in elected office.",
	],
	[
		2760,
		"Paradise and representation",
		"The Paradise Worlds join under parliamentary arrangements favorable to populous worlds.",
	],
	[
		2790,
		"The Deep and Republic unite",
		"The two representative governments merge after decades of negotiation and pressure.",
	],
	[
		2800,
		"The independent captain",
		"Affordable ships and safer routes make individual freelance ownership practical.",
	],
	[
		2920,
		"Patrols stretched thin",
		"New colonies outpace naval protection; piracy increases at the edges of the Core and on the Rim.",
	],
	[
		3000,
		"An unequal peace",
		"Pilot-license costs, trade tariffs and uneven representation deepen resentment on poorer worlds.",
	],
].map(([year, name, text]) => ({
	id: `history-${year}`,
	year,
	name,
	summary: String(year),
	text,
	category: "History",
	source: "HistoricalTimeline",
}));

export function regionFor(system, planet) {
	const attributes = planet?.attributes || [];
	let id;
	if (attributes.includes("pirate") || system.faction === "Pirate")
		id = "pirate";
	else
		id =
			REGIONS.find((region) => attributes.includes(region.id))?.id ||
			system.region;
	return REGIONS.find((region) => region.id === id) || null;
}

export function portVoices(game) {
	const system = game.currentSystem(),
		planet = game.currentPlanet();
	if (game.state.mode !== "port" || !planet?.inhabited) return [];
	const region = regionFor(system, planet);
	const voices = (
		region?.voices || [
			[
				"A cargo handler",
				"Every ship has a destination. Every crate has someone waiting for it. I wish more captains remembered the second part.",
			],
			[
				"A maintenance worker",
				"Visitors ask what lies beyond the next star. I would like to know when the next replacement air filter is coming.",
			],
			[
				"A passenger clerk",
				"Take a moment to check the manifest. Similar planet names have started more arguments than you would believe.",
			],
		]
	).map(([speaker, text], index) => ({
		id: `${region?.id || planet.name}-${index}`,
		speaker,
		text,
	}));
	const offset = (game.state.day - 1) % voices.length;
	const result = [...voices.slice(offset), ...voices.slice(0, offset)];
	if (game.state.flags["wiki-cooperative"])
		result.unshift({
			id: "cooperative",
			speaker: "A freight cooperative notice",
			text: "The cooperative's first shared shipment has reached its destination. Participating growers are keeping their own delivery records; the next captain will have fewer mysteries to untangle.",
		});
	if (game.state.flags["wiki-open-research"])
		result.unshift({
			id: "open-research",
			speaker: "A public research bulletin",
			text: "A new civilian mineral survey has been deposited in the public archive. Field crews can consult the results before planning another expedition.",
		});
	// Settlement news follows the actual captain's story, rather than a guessed calendar date.
	if (game.state.endingSeen)
		result.unshift({
			id: "peace",
			speaker: "A dockside relief coordinator",
			text: "The settlement has been signed, but families still need passage and damaged communities still need supplies. Peace does not unload the freighters by itself.",
		});
	return result;
}

export function stardate(day) {
	const date = new Date(Date.UTC(3013, 10, 16));
	date.setUTCDate(date.getUTCDate() + Math.max(0, Math.floor(day) - 1));
	return date.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}
