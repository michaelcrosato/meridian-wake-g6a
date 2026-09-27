# Endless Sky source audit

Research date: **2026-09-26**. Generation model: **GPT-6 Astra (g6a)**.

The authoritative guide is [endless-sky/endless-sky](https://github.com/endless-sky/endless-sky). This build pins its inventory to commit [`3248c43994eb3d545265366c8eba909a6646f4d2`](https://github.com/endless-sky/endless-sky/tree/3248c43994eb3d545265366c8eba909a6646f4d2), rather than silently treating a small handpicked mission list as the complete source game. It is an independent browser adaptation.

## How the checklist is grounded

`node scripts/source-import.mjs` obtains the full recursive Git tree, fetches all **204** source `data/**/*.txt` files, verifies each file against its Git blob SHA-1, parses the native indentation and quoted-token format, and emits:

- [`public/source-catalog.json`](../public/source-catalog.json): every source file, SHA-256, every top-level declaration's type, name, variant and source line. This is the per-item checklist and includes non-gameplay support records.
- [`src/source-data.js`](../src/source-data.js): full systems, planets, ships, outfits, mission nodes/actions/conditions, fleets and sales catalogs; auxiliary events, governments, wormholes, mineables, conversations, commodities and starts. Every record retains its source path and line.
- [`licenses/ENDLESS_SKY_COPYRIGHT`](../licenses/ENDLESS_SKY_COPYRIGHT), [`licenses/ENDLESS_SKY_CREDITS.txt`](../licenses/ENDLESS_SKY_CREDITS.txt) and the GPL license: unchanged upstream attribution.

`node scripts/verify-source.mjs` checks exported counts and record provenance against the independent catalog, all map links, representative source ship/outfit values, mission condition/action retention, every audio checksum, and decoding of every audio file. The captured result is [`docs/source-verification.json`](source-verification.json). This verifies import fidelity and assets, **not** the behavior of every original mission.

| Source type | Top-level declarations | Browser target | Fidelity boundary |
| --- | ---: | --- | --- |
| Star systems | 694 | `SYSTEM_DATA` → `SYSTEMS`, map/travel in `src/content.js` and `src/game.js` | Base positions, links, governments and prices are imported. Authored Free Worlds milestones and native events update live topology; Pug disconnections, restoration and the Deneb portal are tested. |
| Planets | 619 | `PLANET_DATA`, port descriptions and services | Every planet in the current system can be selected for landing. Gas giants, stellar gardens and restricted destinations enforce equipment or story gates. Mission events reveal hidden landing objects. Conditional source prose is combined for presentation. |
| Ships | 917 | `SHIP_DATA` → shipyard/ship stats | 351 distinct base-name strings; 917 includes named variants, patches and deprecated declarations. Counts must not be presented as 917 separately purchasable hull designs. |
| Outfits | 938 | `OUTFIT_DATA` → outfitter/upgrades | Includes ammunition, licenses, deprecated objects, weapons, engines and special alien equipment. Simplified stat conversion is not the full source outfit simulator. |
| Missions | 2,344 | `MISSION_DATA`; campaign and faction adapters | Includes hidden event/support missions, repeatable jobs and branch alternatives. Imported text is not proof all mission triggers, conversations, NPCs and events execute faithfully. |
| Fleets | 223 | `FLEET_DATA`, encounter and escort model | Faction-specific source hulls supply bounded combat waves and protected convoys. Fleet scale and combat attributes are adapted; generic traffic is decorative. |
| Governments | 128 | `EXTRA_DATA.government`, faction affiliations | Faction identity, hostility and reputation affect encounters and services; supported mission events change system ownership. This is not the complete native diplomacy simulator. |
| Events | 439 | `EXTRA_DATA.event` | Native event interpreter plus explicit authored milestones update map objects, links, governments and sales. All 439 original event chains are not claimed as independently validated. |
| Wormholes | 18 | `EXTRA_DATA.wormhole` | Directed wormhole transitions use source endpoints and capability gates. Quantum Keystone access and story-revealed connections are exercised by campaign rules tests. |
| Mineables | 34 | `EXTRA_DATA.minable`, mining activity | Actual mineral cargo, extraction cooldowns and sales are implemented. Asteroid density, yields and toy geometry are adapted. |
| Sales catalogs | 73 shipyards, 102 outfitters | `SALE_DATA` | Local native sales lists, source inventory, license/story gates and event-added offerings drive the actual outfitter and shipyard. |
| Starts | 5 | `EXTRA_DATA.start`, title/new captain | Default starter choice should not imply all alternative native starts are implemented. |

The machine inventory intentionally does not mark unchecked behaviors “complete.” The completion report must describe actual gameplay evidence for each mapped major arc. Source nodes not reached by the browser rules remain **imported but unimplemented**, even if their names appear in a codex.

## Story and area checklist

These rows identify the major source families and their exact native files. Browser mission names and behaviors must be cross-checked against `CAMPAIGN`, `ARCS`, and tests, not inferred from these inventory counts. Counts include invisible support missions. The generated per-file appendix below covers the rest of the guide.

| Major content | Source evidence | Defining source beats / encounter identity | Browser mapping and audit requirement |
| --- | --- | --- | --- |
| New captain / human economy | `human/intro missions.txt`, `human/jobs.txt`, `starts.txt` | New Boston; bank-financed Shuttle, Star Barge or Sparrow; passenger/cargo work; trading, upgrades, mining and piracy choices | Title starter selection; port job board/trading/bank/shipyard/outfitter; flight/board/mine. Verify each choice has usable progression. |
| Free Worlds prologue | `human/free worlds 0 prologue.txt` (45) | Southern Mutual Defense Pact reconnaissance; escalating pirate activity; Free Worlds Navy reconnaissance and convoy work | Playable reconnaissance and protected convoy stages. Original random offer timing and repeated support errands are condensed. |
| Free Worlds opening war | `human/free worlds 1 start.txt` (38) | Kornephoros liberation; prisoner parole; Alondo's diplomacy; Hope sensors; Freya's plasma testing; supply convoy; pirate attack/diplomacy choice; early warning/refinery | Playable liberation, diplomacy, sensor/plasma work, protected supply ships and pirate choice; targets and rewards are explicit in CAMPAIGN. |
| Free Worlds middle | `human/free worlds 2 middle.txt` (52) | Earth diplomacy; stolen Electron Beam; Dreadnought production; southern battle; prisoner release versus Clink; northern defense; medical convoy; Alphas/Poisonwood; Bloodsea; Albatross; Rand | Playable prisoner branch, boarding, protected medical convoy, scan circuits and faction-specific battles; choices select the later Reconciliation or Checkmate route. |
| Free Worlds reconciliation | `human/free worlds 3 reconciliation.txt` (57) | Sawyer/Ijs/Katya evidence at Mutiny; Parliament; Oathkeepers; Soylent capture; Republic/Free Worlds embassy; Pug invasion, lost links, jump drive and allied response | Reconciliation evidence/Parliament/Oathkeeper stages, source Pug topology, real Jump Drive acquisition, Deneb battle, cloak installation, Algenib nuclear-fleet evasion and final Parliament settlement. Protected ships must physically arrive. |
| Free Worlds checkmate | `human/free worlds 3 checkmate.txt` (40) | Kaus Borealis and Cebalrai assaults; uranium/nuclear warhead delivery; failed negotiations; Menkent; Pug invasion; stolen jump drive; Freya repairing links | Separate Kaus Borealis/Cebalrai, nuclear cargo, failed negotiations and Menkent stages, followed by Pug invasion/recovery and the native FWC End Parliament settlement. The Reconciliation-only extremist climax is skipped. |
| Free Worlds aftermath / side plots | `free worlds 4 epilogue.txt` (5), `free worlds side plots.txt` (20), war jobs (29), post-war reactions | Ending, civilian aftermath, recurring war work and continuing sandbox | A New Boston epilogue shows results and resumes the sandbox. War aftermath changes remain in the world. Minor native reactions/support errands are outside the authored stage-for-stage adaptation; see source-runtime.md. |
| Human regional and personal stories | `human/human missions.txt` (187), `deep missions.txt` (87), `kestrel.txt` (6), boarding and regional job files | Personal passengers, Deep research/defense, Kestrel development; distinct Dirt Belt, South, Rim, Core, Syndicate, Paradise, Deep, Far North/frontier/pirate economies | `ARCS.deep`, `musicians`, `kestrel`, plus `deep-research`, `skadenga-stones`, `band-tour`, `terraforming`, `timothy`, `ice-queen`, `adelita`, `syndicate-business`, `lost-racer`, `paradise-fortune`, `saving-artifacts`, `quicksilver-mail`; stage/source mapping and branch evidence in expanded-campaign-audit.md. |
| Hai / Unfettered | `hai/hai missions.txt`, `unfettered 0 prologue.txt`, `unfettered side missions.txt` | Human-Hai contact and trade, homecoming/stowaway stories, Turner trade route; Unfettered tensions | `ARCS.hai`, `turner-business`, `strider-diplomacy`, `nanachi`, `acorn-delights`, `scars-legion`, and Unfettered invasion stages in `wanderer-exodus`. Actual Greenwater sales change; Strider diplomatic routes branch. |
| Wanderers | `wanderer/wanderers start.txt` (81), `wanderers middle.txt` (79), other missions/jobs | Ecological restoration and surveying; Kor Mereti/Sestor controllers; raids; Rek's Molt; Quarg and Pug assistance; migration through the Eye | `ARCS.wanderers`, `wanderer-exodus` (17), `wanderer-machines` (26 definitions). Contact/translation, Alpha supplier, evacuation, Rek/Eye, Mind/mentors and later Sestor/Exile stages mapped explicitly. |
| Korath | `korath/korath missions.txt` (18), jobs/culture | Exiles, raiders, automated war machines and Kor Efret; salvage technology, nanobots | Korath encounters, exact-hull boarding/capture, side arc and extensive Wanderer machine-war continuation; distinct Exile, Mereti, Sestor, Efret and Aberrant hull families remain visible. |
| Remnant | `remnant 1 introduction.txt` (75), `remnant 2 cognizance.txt` (43), side missions (11) | Ember Waste wormholes; Korath defense; Hai keystones; void-sprite research; Puffin gas-giant exploration; license progression | `ARCS.remnant` plus `remnant-cognizance` (21), with Ka’het/Patir research crossovers. Native script timing/conversation differences remain documented. |
| Coalition / Heliarch / Lunarium | `coalition missions.txt` (87), `heliarch intro.txt` (42), `lunarium intro.txt` (35) | Ring of Friendship registration; contributor status; Heliarch authority and Lunarium introduction; trading and cultural work | `ARCS.coalition` plus `coalition-allegiances` (27 definitions): separate Heliarch and Lunarium 14-stage played paths with different final flags. |
| Successors / Predecessors | `successor 1 prologue.txt` (10), `successor 2 ghosts.txt` (38), Aqrabe (9), Myurej (10) | High Houses, first contact; Sioeora/Kaatrij service; Ghosts investigation with separate Aqrabe/Myurej paths; keystones and old technology | `ARCS.successors`, `successor-ghosts` (14), `aqrabe-gardens` (7), `myurej-wedding` (8). The hidden Ijra-Ea object becomes landable through its mission. |
| Gegno | `gegno intro missions.txt` (16), `gegno I corroboration.txt` (20) | Vi and Scin contact, conflict and Quarg involvement | `ARCS.gegno` plus `gegno-corroboration` (8), ending with mining work at Tschyss after the summons and Quarg mediation. |
| Avgi | `avgi 0 first contact.txt` (13), side missions (8), culture (14) | Peripheria contact; stranded human at Aktina Cylinder; Ensemble defense from Aberrants; windjammers | `ARCS.avgi` plus `avgi-rescue` (4): scout/frontline, escape route and Sora’s homecoming supplement Darius and Ensemble. |
| Sheragi | `sheragi/archaeology missions.txt` (33) | Archaeological investigation and extinct civilization's technology | `ARCS.sheragi` plus `sheragi-emerald` (11): the Box, Hai historians and real Emerald Sword ownership before the epilogue. |
| Bunrodea | `bunrodea/bunrodea missions.txt` (1), ships/outfits/weapons | Distinct alien territory, technology and contact mission | Bunrodea area/encounters/content catalog. |
| Ka'het / Aberrant / beyond Patir | `kahet/kahet missions.txt` (96), `aberrant missions.txt` (1), `map beyond patir.txt` | Ka'het encounters, alien ecology/technology, Aberrants and beyond-Patir region | `ARCS.kahet` plus `patir-mystery` (27 definitions), including physical source-coordinate transfers, Chanai, Pacili and the revealed great-asteroid landing. |
| Incipias | `incipias first contact.txt` (10), `tace mesa.txt` (1) | First contact, Tace Mesa, distinct ships/outfits | Incipias area/side arc/items. |
| Quarg / Pug / Drak | `quarg missions.txt` (8), `pug missions.txt` (4), `drak missions.txt` (6), cultures/indigenous | Powerful species and intervention; ringworld diplomacy; Pug manipulation; Drak and indigenous encounters | Main/side story encounters; full source narrative differences remain explicit. |
| Rulei / Iije / Vyrmeid | corresponding faction directories | Smaller source regions/species, Rulei missions (7) and ambient audio | `rulei-umbral` (3) covers the named Rulei encounter sequence and real L-118/L-6181 survey circuit. Iije/Vyrmeid have catalog/map/species content; no fabricated authored storyline is claimed. |

## Concrete continuation mapping

The expanded runtime now maps the later Cognizance, Ghosts (including Aqrabe and Myurej), opposing Coalition affiliations, Gegno Corroboration, Wanderer evacuation and machine-war stages, Patir expeditions and Rulei encounters to **283 authored stage definitions across 29 arcs** in `src/expanded-arcs.js`. See [the complete stage-to-native-ID mapping](expanded-campaign-audit.md) and [actual Game-API traversal evidence](expanded-traversal-evidence.json). The audit includes all substantial named human and Hai continuations, source-native differences, and the explicitly listed minor scripts outside the authored anthology. Native timer/stealth/infiltration/transition support is separately bounded in [source-runtime.md](source-runtime.md); the native catalog is not counted as playable content.

## Systems and modernization

The [official Player's Manual](https://github.com/endless-sky/endless-sky/wiki/PlayersManual) establishes the essential loop: choose a specialized starter ship, work under a loan, fly with inertia, trade/carry passengers, refuel and repair at inhabited ports, explore linked systems, fit upgrades, hire crews, fight, and board. Landing autopilot is already a source feature. Fleet cargo, crew costs, outfit constraints, fuel, and risk give the open travel decisions weight. The source has three starter roles and multiple campaign paths; a browser adaptation should retain those distinctions.

The following are qualitative player reports, not a representative survey:

| Observed player feedback | Evidence | Design response to check in this build |
| --- | --- | --- |
| Open-ended travel, ship customization, personal goals and the Free Worlds story are praised; random spaceport story discovery can be opaque. | [Steam player reviews](https://steamcommunity.com/app/404410/reviews/?browsefilter=toprated), [project discussion #9873](https://github.com/endless-sky/endless-sky/discussions/9873) | Preserve freelance trade/combat alongside story. Show explicit current objectives, destinations and next steps without forcing every player into combat. |
| Fuel-range detours and maneuvering/landing friction can distract from the story. | [A fresh playthrough discussion #7766](https://github.com/endless-sky/endless-sky/discussions/7766) | Show route, fuel and destination together; accessible autopilot/brake, clear landing state. |
| Mission direction and management can be frustrating despite affection for the game. | [Player report on mission management](https://www.reddit.com/r/endlesssky/comments/1qr55gu/hi_i_love_this_game_but_there_is_something_deeply/), [project discussion #9873](https://github.com/endless-sky/endless-sky/discussions/9873) | Persistent mission tracker, clear readiness/blocked reasons, visible spaceport action. |
| Controls and the distinction between flight and interstellar jumps need discoverability. | [Fighting and jumping discussion](https://steamcommunity.com/app/404410/discussions/0/135507548125411974/) | Keyboard/touch reference, visible jump action and connected destination selection. |

The brick-built 3D geometry, browser touch controls, condensed campaign timing and battle scale, source-stat conversion, diagnostics, rendering quality presets and original title **Meridian Wake** are adaptation decisions, not source-authored content. Exact additions belong in `COMPLETION_REPORT.md`.

## Audio portal research and fallback

Requested sources: [Sounds Resource](https://sounds.spriters-resource.com/) and [Zophar's Domain](https://www.zophar.net/).

On 2026-09-26:

1. The search-indexed [Sounds Resource PC “E” listing](https://sounds.spriters-resource.com/pc_computer/E/) includes the alphabetical stretch around “Endless” but has no Endless Sky entry. Exact site searches did not find an Endless Sky sound page. Direct requests to the site/listing and guessed game URL returned **403 / inaccessible**. This is evidence of no located listing, not proof that no unindexed upload can exist.
2. [Zophar's complete Windows music index](https://www.zophar.net/music/windows) lists 28 games and no Endless Sky. Exact site searches found unrelated music titled “To an Endless Sky,” from *Tales of Destiny 2*; that is not the source game and is not used.
3. The separate **Spriters** Resource does have [Endless Sky graphics](https://www.spriters-resource.com/pc_computer/endlesssky/asset/96715/). That does not establish a Sounds Resource audio listing.
4. The pinned official repository supplies sound effects and three `sounds/ambient/` MP3s. Selected original files are distributed as the transparent fallback, controlled exclusively by [`public/audio/manifest.json`](../public/audio/manifest.json). The `music` slot contains the original Rulei-space ambient soundscape, not a newly fabricated score.

**User-approved replacement (2026-09-26):** the user explicitly selected “Use official Endless Sky audio.” These files were fetched from the official GitHub source rather than the requested portals. The music slot is the source ambient soundscape; no composed score is misattributed to the source.

| Manifest ID | Local placeholder | Exact source path | License / changes |
| --- | --- | --- | --- |
| laser | `public/audio/laser.wav` | `sounds/blaster.wav` | Public domain, unmodified |
| hit | `public/audio/hit.wav` | `sounds/crunch.wav` | Public domain, unmodified |
| explosion | `public/audio/explosion.wav` | `sounds/explosion small.wav` | Public domain, unmodified |
| jump | `public/audio/jump.wav` | `sounds/hyperdrive.wav` | Public domain, unmodified |
| land | `public/audio/land.wav` | `sounds/landing.wav` | Public domain, unmodified |
| launch | `public/audio/launch.wav` | `sounds/takeoff.wav` | Public domain, unmodified |
| click | `public/audio/click.wav` | `sounds/ui/click soft.wav` | Public domain, unmodified |
| error | `public/audio/error.wav` | `sounds/ui/fail.wav` | Public domain, unmodified |
| reward | `public/audio/reward.wav` | `sounds/ui/target.wav` | Public domain, unmodified |
| music | `public/audio/music.mp3` | `sounds/ambient/rulei space.mp3` | Public domain ambient soundscape, unmodified |
| port | `public/audio/port.mp3` | `sounds/ambient/machinery.mp3` | Public domain ambient soundscape, unmodified |

All source links include the fixed revision in the manifest, together with SHA-256 and byte count. Attribution: Various / Endless Sky contributors, under the upstream [public-domain sounds declaration](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/copyright#L1313-L1316). The preserved full copyright document was checked for later filename-specific overrides; none applies to these selected files. `node scripts/source-import.mjs --audio` restores them from manifest URLs and verifies hashes.

`AudioManager` unlocks the browser AudioContext from user interaction, loads the single manifest, decodes assets, limits concurrent voices, and provides volume/mute and looping ambience. Unknown/unloaded IDs return safely. Replacement audio requires editing the manifest entries and files, with no playback-code changes.

## Complete source file checklist

Every file below is inventoried, including supporting files that are not standalone player content. Names/line numbers for every definition are in the machine checklist. “Parsed data” means the source definitions are shipped; it does not mark their browser behavior complete.

| Source file | Definition counts | Data location |
| --- | --- | --- |
| [_deprecated/deprecated events.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_deprecated/deprecated%20events.txt) | mission: 1; event: 7 | `MISSION_DATA`, `EXTRA_DATA` |
| [_deprecated/deprecated outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_deprecated/deprecated%20outfits.txt) | outfit: 42; effect: 1; mission: 2 | `OUTFIT_DATA`, `Catalog only`, `MISSION_DATA` |
| [_deprecated/deprecated ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_deprecated/deprecated%20ships.txt) | ship: 27 | `SHIP_DATA` |
| [_ui/flight checks.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_ui/flight%20checks.txt) | conversation: 5 | `EXTRA_DATA` |
| [_ui/help.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_ui/help.txt) | help: 40 | `Catalog only` |
| [_ui/interfaces.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_ui/interfaces.txt) | color: 159; interface: 43 | `Catalog only` |
| [_ui/landing messages.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_ui/landing%20messages.txt) | landing message: 8 | `Catalog only` |
| [_ui/messages.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_ui/messages.txt) | message category: 9; message: 27 | `Catalog only` |
| [_ui/ratings.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_ui/ratings.txt) | rating: 3 | `Catalog only` |
| [_ui/swizzles.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_ui/swizzles.txt) | swizzle: 31 | `Catalog only` |
| [_ui/tooltips.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/_ui/tooltips.txt) | tip: 574 | `Catalog only` |
| [avgi/avgi 0 first contact.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%200%20first%20contact.txt) | mission: 13; phrase: 1 | `MISSION_DATA`, `Catalog only` |
| [avgi/avgi culture conversations.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20culture%20conversations.txt) | mission: 14 | `MISSION_DATA` |
| [avgi/avgi events.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20events.txt) | event: 4; mission: 2 | `EXTRA_DATA`, `MISSION_DATA` |
| [avgi/avgi fleets.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20fleets.txt) | fleet: 15 | `FLEET_DATA` |
| [avgi/avgi hails.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20hails.txt) | phrase: 38 | `Catalog only` |
| [avgi/avgi jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20jobs.txt) | mission: 51; phrase: 8 | `MISSION_DATA`, `Catalog only` |
| [avgi/avgi news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20news.txt) | news: 16 | `Catalog only` |
| [avgi/avgi outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20outfits.txt) | outfit: 35; effect: 3 | `OUTFIT_DATA`, `Catalog only` |
| [avgi/avgi sales.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20sales.txt) | shipyard: 10; outfitter: 12 | `SALE_DATA` |
| [avgi/avgi ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20ships.txt) | ship: 42 | `SHIP_DATA` |
| [avgi/avgi side missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20side%20missions.txt) | mission: 8 | `MISSION_DATA` |
| [avgi/avgi weapons.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi%20weapons.txt) | outfit: 32; effect: 22; outfitter: 2 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [avgi/avgi.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/avgi.txt) | phrase: 14; trade: 1 | `Catalog only`, `EXTRA_DATA` |
| [avgi/windjammers.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/avgi/windjammers.txt) | phrase: 3; mission: 1; outfit: 3; ship: 4 | `Catalog only`, `MISSION_DATA`, `OUTFIT_DATA`, `SHIP_DATA` |
| [bunrodea/bunrodea missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/bunrodea/bunrodea%20missions.txt) | mission: 1 | `MISSION_DATA` |
| [bunrodea/bunrodea outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/bunrodea/bunrodea%20outfits.txt) | outfit: 24 | `OUTFIT_DATA` |
| [bunrodea/bunrodea ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/bunrodea/bunrodea%20ships.txt) | ship: 8 | `SHIP_DATA` |
| [bunrodea/bunrodea weapons.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/bunrodea/bunrodea%20weapons.txt) | outfit: 8; effect: 7; outfitter: 1 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [bunrodea/bunrodea.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/bunrodea/bunrodea.txt) | fleet: 5; outfitter: 3; shipyard: 3; phrase: 6 | `FLEET_DATA`, `SALE_DATA`, `Catalog only` |
| [categories.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/categories.txt) | category: 3 | `Catalog only` |
| [coalition/coalition culture conversations.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/coalition%20culture%20conversations.txt) | mission: 10 | `MISSION_DATA` |
| [coalition/coalition jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/coalition%20jobs.txt) | phrase: 14; mission: 74 | `Catalog only`, `MISSION_DATA` |
| [coalition/coalition missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/coalition%20missions.txt) | mission: 87; event: 11; conversation: 1 | `MISSION_DATA`, `EXTRA_DATA` |
| [coalition/coalition news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/coalition%20news.txt) | news: 29 | `Catalog only` |
| [coalition/coalition outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/coalition%20outfits.txt) | outfit: 35 | `OUTFIT_DATA` |
| [coalition/coalition ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/coalition%20ships.txt) | ship: 70 | `SHIP_DATA` |
| [coalition/coalition weapons.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/coalition%20weapons.txt) | outfit: 13; effect: 9; outfitter: 1 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [coalition/coalition.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/coalition.txt) | fleet: 10; outfitter: 5; shipyard: 4; phrase: 45; trade: 1 | `FLEET_DATA`, `SALE_DATA`, `Catalog only`, `EXTRA_DATA` |
| [coalition/heliarch intro.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/heliarch%20intro.txt) | mission: 42; event: 6 | `MISSION_DATA`, `EXTRA_DATA` |
| [coalition/lunarium intro.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/coalition/lunarium%20intro.txt) | mission: 35; event: 7 | `MISSION_DATA`, `EXTRA_DATA` |
| [commodities.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/commodities.txt) | trade: 1 | `EXTRA_DATA` |
| [confusions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/confusions.txt) | confusion: 16 | `Catalog only` |
| [dialog phrases.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/dialog%20phrases.txt) | phrase: 38 | `Catalog only` |
| [drak/drak culture conversations.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/drak/drak%20culture%20conversations.txt) | mission: 7 | `MISSION_DATA` |
| [drak/drak missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/drak/drak%20missions.txt) | mission: 6 | `MISSION_DATA` |
| [drak/drak outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/drak/drak%20outfits.txt) | outfit: 11; effect: 4 | `OUTFIT_DATA`, `Catalog only` |
| [drak/drak ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/drak/drak%20ships.txt) | ship: 5; effect: 3 | `SHIP_DATA`, `Catalog only` |
| [drak/indigenous.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/drak/indigenous.txt) | ship: 6; effect: 5; outfit: 2; fleet: 7; phrase: 1 | `SHIP_DATA`, `Catalog only`, `OUTFIT_DATA`, `FLEET_DATA` |
| [effects.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/effects.txt) | effect: 59 | `Catalog only` |
| [formations.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/formations.txt) | formation: 14 | `Catalog only` |
| [gamerules.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gamerules.txt) | gamerules preset: 1 | `Catalog only` |
| [gegno/gegno events.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno%20events.txt) | event: 8 | `EXTRA_DATA` |
| [gegno/gegno fleets.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno%20fleets.txt) | fleet: 16 | `FLEET_DATA` |
| [gegno/gegno I corroboration.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno%20I%20corroboration.txt) | mission: 20 | `MISSION_DATA` |
| [gegno/gegno intro missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno%20intro%20missions.txt) | mission: 16; conversation: 1 | `MISSION_DATA`, `EXTRA_DATA` |
| [gegno/gegno jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno%20jobs.txt) | mission: 6 | `MISSION_DATA` |
| [gegno/gegno outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno%20outfits.txt) | outfit: 47; effect: 13 | `OUTFIT_DATA`, `Catalog only` |
| [gegno/gegno sales.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno%20sales.txt) | shipyard: 10; outfitter: 7 | `SALE_DATA` |
| [gegno/gegno ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno%20ships.txt) | ship: 34 | `SHIP_DATA` |
| [gegno/gegno.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/gegno/gegno.txt) | phrase: 5 | `Catalog only` |
| [globals.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/globals.txt) | mission: 2 | `MISSION_DATA` |
| [governments.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/governments.txt) | government: 127; color: 21 | `EXTRA_DATA`, `Catalog only` |
| [hai/hai culture conversations.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/hai%20culture%20conversations.txt) | mission: 11 | `MISSION_DATA` |
| [hai/hai fleets.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/hai%20fleets.txt) | fleet: 16 | `FLEET_DATA` |
| [hai/hai jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/hai%20jobs.txt) | mission: 75; phrase: 3 | `MISSION_DATA`, `Catalog only` |
| [hai/hai missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/hai%20missions.txt) | mission: 59; event: 13; planet: 1 | `MISSION_DATA`, `EXTRA_DATA`, `PLANET_DATA` |
| [hai/hai news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/hai%20news.txt) | news: 25 | `Catalog only` |
| [hai/hai outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/hai%20outfits.txt) | outfit: 49; effect: 7; outfitter: 2 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [hai/hai ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/hai%20ships.txt) | ship: 61 | `SHIP_DATA` |
| [hai/hai.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/hai.txt) | shipyard: 7; outfitter: 5; phrase: 18 | `SALE_DATA`, `Catalog only` |
| [hai/unfettered 0 prologue.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/unfettered%200%20prologue.txt) | mission: 5 | `MISSION_DATA` |
| [hai/unfettered jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/unfettered%20jobs.txt) | phrase: 7; mission: 12 | `Catalog only`, `MISSION_DATA` |
| [hai/unfettered side missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hai/unfettered%20side%20missions.txt) | mission: 5 | `MISSION_DATA` |
| [harvesting.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/harvesting.txt) | minable: 34; outfit: 16; effect: 2 | `EXTRA_DATA`, `OUTFIT_DATA`, `Catalog only` |
| [hazards.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/hazards.txt) | hazard: 30; effect: 5 | `Catalog only` |
| [human/boarding missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/boarding%20missions.txt) | conversation: 4; mission: 17; phrase: 11 | `EXTRA_DATA`, `MISSION_DATA`, `Catalog only` |
| [human/campaign events.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/campaign%20events.txt) | event: 123; mission: 11; fleet: 1 | `EXTRA_DATA`, `MISSION_DATA`, `FLEET_DATA` |
| [human/culture conversations.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/culture%20conversations.txt) | mission: 37 | `MISSION_DATA` |
| [human/deep jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/deep%20jobs.txt) | phrase: 8; mission: 35 | `Catalog only`, `MISSION_DATA` |
| [human/deep missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/deep%20missions.txt) | mission: 87; event: 23; conversation: 4; ship: 2 | `MISSION_DATA`, `EXTRA_DATA`, `SHIP_DATA` |
| [human/derelicts.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/derelicts.txt) | outfitter: 4; fleet: 4; ship: 24 | `SALE_DATA`, `FLEET_DATA`, `SHIP_DATA` |
| [human/dirt belt jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/dirt%20belt%20jobs.txt) | mission: 11 | `MISSION_DATA` |
| [human/engines.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/engines.txt) | outfit: 37; effect: 3 | `OUTFIT_DATA`, `Catalog only` |
| [human/far north jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/far%20north%20jobs.txt) | mission: 4 | `MISSION_DATA` |
| [human/fleets.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/fleets.txt) | fleet: 63 | `FLEET_DATA` |
| [human/free worlds 0 prologue.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/free%20worlds%200%20prologue.txt) | mission: 45; event: 5; ship: 1 | `MISSION_DATA`, `EXTRA_DATA`, `SHIP_DATA` |
| [human/free worlds 1 start.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/free%20worlds%201%20start.txt) | mission: 38; event: 8; ship: 1 | `MISSION_DATA`, `EXTRA_DATA`, `SHIP_DATA` |
| [human/free worlds 2 middle.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/free%20worlds%202%20middle.txt) | mission: 52; event: 6; government: 1 | `MISSION_DATA`, `EXTRA_DATA` |
| [human/free worlds 3 checkmate.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/free%20worlds%203%20checkmate.txt) | mission: 40 | `MISSION_DATA` |
| [human/free worlds 3 reconciliation.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/free%20worlds%203%20reconciliation.txt) | ship: 1; mission: 57; event: 5; conversation: 1 | `SHIP_DATA`, `MISSION_DATA`, `EXTRA_DATA` |
| [human/free worlds 4 epilogue.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/free%20worlds%204%20epilogue.txt) | mission: 5; conversation: 1; event: 1 | `MISSION_DATA`, `EXTRA_DATA` |
| [human/free worlds side plots.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/free%20worlds%20side%20plots.txt) | mission: 20; ship: 1; event: 6 | `MISSION_DATA`, `SHIP_DATA`, `EXTRA_DATA` |
| [human/free worlds war jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/free%20worlds%20war%20jobs.txt) | phrase: 5; trade: 1; mission: 29 | `Catalog only`, `EXTRA_DATA`, `MISSION_DATA` |
| [human/frontier jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/frontier%20jobs.txt) | mission: 9 | `MISSION_DATA` |
| [human/hails.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/hails.txt) | phrase: 205 | `Catalog only` |
| [human/human missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/human%20missions.txt) | mission: 187; event: 30; effect: 1; outfit: 1; ship: 6; phrase: 1; conversation: 2 | `MISSION_DATA`, `EXTRA_DATA`, `Catalog only`, `OUTFIT_DATA`, `SHIP_DATA` |
| [human/intro missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/intro%20missions.txt) | conversation: 14; mission: 53; ship: 1; substitutions: 1 | `EXTRA_DATA`, `MISSION_DATA`, `SHIP_DATA`, `Catalog only` |
| [human/jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/jobs.txt) | mission: 161 | `MISSION_DATA` |
| [human/kestrel.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/kestrel.txt) | mission: 6; shipyard: 1; event: 4; ship: 6 | `MISSION_DATA`, `SALE_DATA`, `EXTRA_DATA`, `SHIP_DATA` |
| [human/marauders.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/marauders.txt) | ship: 30 | `SHIP_DATA` |
| [human/message buoys.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/message%20buoys.txt) | mission: 17; phrase: 8 | `MISSION_DATA`, `Catalog only` |
| [human/names.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/names.txt) | phrase: 81 | `Catalog only` |
| [human/near earth jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/near%20earth%20jobs.txt) | mission: 13 | `MISSION_DATA` |
| [human/news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/news.txt) | phrase: 21; news: 96 | `Catalog only` |
| [human/outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/outfits.txt) | outfit: 51 | `OUTFIT_DATA` |
| [human/paradise world jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/paradise%20world%20jobs.txt) | mission: 51; phrase: 7 | `MISSION_DATA`, `Catalog only` |
| [human/pirate jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/pirate%20jobs.txt) | color: 3; mission: 80; conversation: 3; outfit: 1 | `Catalog only`, `MISSION_DATA`, `EXTRA_DATA`, `OUTFIT_DATA` |
| [human/post-war reactions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/post-war%20reactions.txt) | mission: 4 | `MISSION_DATA` |
| [human/power.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/power.txt) | outfit: 22 | `OUTFIT_DATA` |
| [human/rim jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/rim%20jobs.txt) | mission: 10 | `MISSION_DATA` |
| [human/sales.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/sales.txt) | shipyard: 23; outfitter: 23 | `SALE_DATA` |
| [human/ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/ships.txt) | ship: 74 | `SHIP_DATA` |
| [human/south jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/south%20jobs.txt) | mission: 14; conversation: 1 | `MISSION_DATA`, `EXTRA_DATA` |
| [human/syndicate jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/syndicate%20jobs.txt) | mission: 31; ship: 4 | `MISSION_DATA`, `SHIP_DATA` |
| [human/variants.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/variants.txt) | ship: 185 | `SHIP_DATA` |
| [human/weapons.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/human/weapons.txt) | outfit: 61; effect: 21; outfitter: 7 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [iije/iije.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/iije/iije.txt) | ship: 2; effect: 2; fleet: 3 | `SHIP_DATA`, `Catalog only`, `FLEET_DATA` |
| [incipias/incipias first contact.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/incipias/incipias%20first%20contact.txt) | mission: 10; event: 1; ship: 1 | `MISSION_DATA`, `EXTRA_DATA`, `SHIP_DATA` |
| [incipias/incipias outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/incipias/incipias%20outfits.txt) | outfit: 19; effect: 4; outfitter: 1 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [incipias/incipias ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/incipias/incipias%20ships.txt) | ship: 7 | `SHIP_DATA` |
| [incipias/incipias.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/incipias/incipias.txt) | phrase: 20; fleet: 3; outfitter: 1; shipyard: 1; news: 2 | `Catalog only`, `FLEET_DATA`, `SALE_DATA` |
| [incipias/tace mesa.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/incipias/tace%20mesa.txt) | outfit: 2; ship: 1; mission: 1 | `OUTFIT_DATA`, `SHIP_DATA`, `MISSION_DATA` |
| [kahet/aberrant missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/aberrant%20missions.txt) | mission: 1 | `MISSION_DATA` |
| [kahet/aberrant outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/aberrant%20outfits.txt) | outfit: 6; effect: 2 | `OUTFIT_DATA`, `Catalog only` |
| [kahet/aberrant ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/aberrant%20ships.txt) | ship: 26 | `SHIP_DATA` |
| [kahet/aberrant.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/aberrant.txt) | phrase: 1; fleet: 2 | `Catalog only`, `FLEET_DATA` |
| [kahet/beyond patir assets.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/beyond%20patir%20assets.txt) | phrase: 1; fleet: 1; ship: 10; outfit: 107; effect: 33 | `Catalog only`, `FLEET_DATA`, `SHIP_DATA`, `OUTFIT_DATA` |
| [kahet/kahet missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/kahet%20missions.txt) | mission: 96; event: 26; conversation: 3; ship: 14; outfit: 6 | `MISSION_DATA`, `EXTRA_DATA`, `SHIP_DATA`, `OUTFIT_DATA` |
| [kahet/kahet outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/kahet%20outfits.txt) | outfit: 21; effect: 9 | `OUTFIT_DATA`, `Catalog only` |
| [kahet/kahet ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/kahet%20ships.txt) | ship: 21 | `SHIP_DATA` |
| [kahet/kahet.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/kahet/kahet.txt) | phrase: 23; fleet: 5; outfitter: 1 | `Catalog only`, `FLEET_DATA`, `SALE_DATA` |
| [korath/korath culture conversations.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20culture%20conversations.txt) | mission: 1 | `MISSION_DATA` |
| [korath/korath hails.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20hails.txt) | phrase: 121 | `Catalog only` |
| [korath/korath jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20jobs.txt) | mission: 11 | `MISSION_DATA` |
| [korath/korath missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20missions.txt) | mission: 18; event: 1; phrase: 1; substitutions: 1; ship: 1 | `MISSION_DATA`, `EXTRA_DATA`, `Catalog only`, `SHIP_DATA` |
| [korath/korath news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20news.txt) | news: 6 | `Catalog only` |
| [korath/korath outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20outfits.txt) | outfit: 49; effect: 5 | `OUTFIT_DATA`, `Catalog only` |
| [korath/korath ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20ships.txt) | ship: 32 | `SHIP_DATA` |
| [korath/korath variants.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20variants.txt) | ship: 43 | `SHIP_DATA` |
| [korath/korath weapons.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath%20weapons.txt) | outfit: 35; effect: 26; outfitter: 4 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [korath/korath.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/korath.txt) | phrase: 5; fleet: 19; outfitter: 3 | `Catalog only`, `FLEET_DATA`, `SALE_DATA` |
| [korath/nanobots.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/korath/nanobots.txt) | ship: 1; outfit: 1; effect: 1; fleet: 1 | `SHIP_DATA`, `OUTFIT_DATA`, `Catalog only`, `FLEET_DATA` |
| [map beyond patir.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/map%20beyond%20patir.txt) | galaxy: 1; system: 9; planet: 4; wormhole: 2 | `Catalog only`, `SYSTEM_DATA`, `PLANET_DATA`, `EXTRA_DATA` |
| [map planets.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/map%20planets.txt) | planet: 613; wormhole: 15 | `PLANET_DATA`, `EXTRA_DATA` |
| [map systems.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/map%20systems.txt) | galaxy: 25; system: 685 | `Catalog only`, `SYSTEM_DATA` |
| [persons.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/persons.txt) | person: 16; ship: 15; phrase: 2; outfit: 8; effect: 8 | `Catalog only`, `SHIP_DATA`, `OUTFIT_DATA` |
| [pug/pug missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/pug/pug%20missions.txt) | mission: 4 | `MISSION_DATA` |
| [pug/pug news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/pug/pug%20news.txt) | news: 7 | `Catalog only` |
| [pug/pug outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/pug/pug%20outfits.txt) | outfit: 14; effect: 8 | `OUTFIT_DATA`, `Catalog only` |
| [pug/pug ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/pug/pug%20ships.txt) | ship: 4 | `SHIP_DATA` |
| [pug/pug.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/pug/pug.txt) | phrase: 4; fleet: 4 | `Catalog only`, `FLEET_DATA` |
| [quarg/quarg missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/quarg/quarg%20missions.txt) | mission: 8 | `MISSION_DATA` |
| [quarg/quarg news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/quarg/quarg%20news.txt) | news: 10; phrase: 2 | `Catalog only` |
| [quarg/quarg outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/quarg/quarg%20outfits.txt) | outfit: 25; effect: 7 | `OUTFIT_DATA`, `Catalog only` |
| [quarg/quarg ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/quarg/quarg%20ships.txt) | ship: 6 | `SHIP_DATA` |
| [quarg/quarg.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/quarg/quarg.txt) | phrase: 2; conversation: 1; fleet: 11 | `Catalog only`, `EXTRA_DATA`, `FLEET_DATA` |
| [remnant/remnant 1 introduction.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%201%20introduction.txt) | mission: 75; conversation: 3; phrase: 1; ship: 2; outfit: 1 | `MISSION_DATA`, `EXTRA_DATA`, `Catalog only`, `SHIP_DATA`, `OUTFIT_DATA` |
| [remnant/remnant 2 cognizance.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%202%20cognizance.txt) | mission: 43 | `MISSION_DATA` |
| [remnant/remnant 2 side missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%202%20side%20missions.txt) | mission: 11 | `MISSION_DATA` |
| [remnant/remnant commodities.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%20commodities.txt) | trade: 1 | `EXTRA_DATA` |
| [remnant/remnant events.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%20events.txt) | event: 52; mission: 1 | `EXTRA_DATA`, `MISSION_DATA` |
| [remnant/remnant jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%20jobs.txt) | mission: 21; ship: 1; outfit: 1 | `MISSION_DATA`, `SHIP_DATA`, `OUTFIT_DATA` |
| [remnant/remnant news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%20news.txt) | phrase: 6; news: 4 | `Catalog only` |
| [remnant/remnant outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%20outfits.txt) | outfit: 34; effect: 13; outfitter: 1 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [remnant/remnant ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant%20ships.txt) | ship: 39 | `SHIP_DATA` |
| [remnant/remnant.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/remnant/remnant.txt) | fleet: 7; phrase: 30; shipyard: 3; outfitter: 4 | `FLEET_DATA`, `Catalog only`, `SALE_DATA` |
| [rulei/rulei outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/rulei/rulei%20outfits.txt) | outfit: 5; effect: 4 | `OUTFIT_DATA`, `Catalog only` |
| [rulei/rulei ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/rulei/rulei%20ships.txt) | ship: 1 | `SHIP_DATA` |
| [rulei/rulei.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/rulei/rulei.txt) | mission: 7; event: 1; phrase: 1 | `MISSION_DATA`, `EXTRA_DATA`, `Catalog only` |
| [series.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/series.txt) | category: 1 | `Catalog only` |
| [sheragi/archaeology missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/sheragi/archaeology%20missions.txt) | mission: 33; ship: 1; outfit: 2; event: 5 | `MISSION_DATA`, `SHIP_DATA`, `OUTFIT_DATA`, `EXTRA_DATA` |
| [sheragi/sheragi outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/sheragi/sheragi%20outfits.txt) | outfit: 14; effect: 8 | `OUTFIT_DATA`, `Catalog only` |
| [sheragi/sheragi ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/sheragi/sheragi%20ships.txt) | ship: 3 | `SHIP_DATA` |
| [stars.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/stars.txt) | star: 87; planet mass: 78 | `Catalog only` |
| [starts.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/starts.txt) | start: 5; mission: 3; conversation: 5; ship: 1 | `EXTRA_DATA`, `MISSION_DATA`, `SHIP_DATA` |
| [substitutions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/substitutions.txt) | substitutions: 1 | `Catalog only` |
| [successors/predecessors.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/predecessors.txt) | ship: 4; effect: 10; outfit: 15 | `SHIP_DATA`, `Catalog only`, `OUTFIT_DATA` |
| [successors/successor 1 prologue.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%201%20prologue.txt) | mission: 10 | `MISSION_DATA` |
| [successors/successor 2 ghosts aqrabe.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%202%20ghosts%20aqrabe.txt) | mission: 9; conversation: 1 | `MISSION_DATA`, `EXTRA_DATA` |
| [successors/successor 2 ghosts myurej.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%202%20ghosts%20myurej.txt) | mission: 10 | `MISSION_DATA` |
| [successors/successor 2 ghosts.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%202%20ghosts.txt) | phrase: 1; mission: 38; conversation: 2 | `Catalog only`, `MISSION_DATA`, `EXTRA_DATA` |
| [successors/successor culture conversations.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20culture%20conversations.txt) | mission: 12 | `MISSION_DATA` |
| [successors/successor events.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20events.txt) | event: 26 | `EXTRA_DATA` |
| [successors/successor fleets.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20fleets.txt) | fleet: 20 | `FLEET_DATA` |
| [successors/successor hails.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20hails.txt) | phrase: 46 | `Catalog only` |
| [successors/successor jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20jobs.txt) | phrase: 13; mission: 24 | `Catalog only`, `MISSION_DATA` |
| [successors/successor news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20news.txt) | news: 8 | `Catalog only` |
| [successors/successor outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20outfits.txt) | outfit: 37; effect: 4 | `OUTFIT_DATA`, `Catalog only` |
| [successors/successor sales.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20sales.txt) | shipyard: 9; outfitter: 11 | `SALE_DATA` |
| [successors/successor ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20ships.txt) | ship: 23 | `SHIP_DATA` |
| [successors/successor side missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20side%20missions.txt) | mission: 5 | `MISSION_DATA` |
| [successors/successor variants.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20variants.txt) | ship: 26 | `SHIP_DATA` |
| [successors/successor weapons.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successor%20weapons.txt) | outfit: 12; effect: 5; outfitter: 1 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [successors/successors.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/successors/successors.txt) | phrase: 26; trade: 1 | `Catalog only`, `EXTRA_DATA` |
| [vyrmeid/vyrmeid.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/vyrmeid/vyrmeid.txt) | ship: 4; outfit: 3; effect: 1; fleet: 4 | `SHIP_DATA`, `OUTFIT_DATA`, `Catalog only`, `FLEET_DATA` |
| [wanderer/wanderer jobs.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/wanderer/wanderer%20jobs.txt) | mission: 36; phrase: 1 | `MISSION_DATA`, `Catalog only` |
| [wanderer/wanderer missions.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/wanderer/wanderer%20missions.txt) | mission: 6; event: 2 | `MISSION_DATA`, `EXTRA_DATA` |
| [wanderer/wanderer news.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/wanderer/wanderer%20news.txt) | news: 16 | `Catalog only` |
| [wanderer/wanderer outfits.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/wanderer/wanderer%20outfits.txt) | outfit: 31; effect: 4; outfitter: 1 | `OUTFIT_DATA`, `Catalog only`, `SALE_DATA` |
| [wanderer/wanderer ships.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/wanderer/wanderer%20ships.txt) | ship: 33 | `SHIP_DATA` |
| [wanderer/wanderers middle.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/wanderer/wanderers%20middle.txt) | mission: 79; event: 22 | `MISSION_DATA`, `EXTRA_DATA` |
| [wanderer/wanderers start.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/wanderer/wanderers%20start.txt) | mission: 81; event: 22; conversation: 2; ship: 2; fleet: 1 | `MISSION_DATA`, `EXTRA_DATA`, `SHIP_DATA`, `FLEET_DATA` |
| [wanderer/wanderers.txt](https://github.com/endless-sky/endless-sky/blob/3248c43994eb3d545265366c8eba909a6646f4d2/data/wanderer/wanderers.txt) | phrase: 13; fleet: 5; shipyard: 2; outfitter: 2; event: 14; planet: 1; wormhole: 1; mission: 1 | `Catalog only`, `FLEET_DATA`, `SALE_DATA`, `EXTRA_DATA`, `PLANET_DATA`, `MISSION_DATA` |
