# Expanded campaign source mapping

These are authored, condensed playable continuations, separate from the optional native interpreter. Every stage below maps to exact source mission identifiers. Cargo quantities, battle sizes, deadlines, timing, prose, some encounter placement and some choices are adapted. A row combining native IDs is one browser stage, not a claim of identical native scripting.

The **29 added arcs contain 283 stage definitions**, referencing **483 distinct native mission IDs**. Mutually exclusive branches reduce each played path. `tests/expanded-arcs.test.js` passes **50 tests**: both main settlements, every expanded arc, major alternate paths, all three Timothy outcomes, source destination/ID validation, combat faction identity, objective gates, save/load, unique Emerald Sword ownership and Greenwater shop construction. Captured records, tested revision and fixture boundaries are in [expanded-traversal-evidence.json](expanded-traversal-evidence.json).

The integrated traversal first earns the main story and all 15 introductory arcs through actual Game actions. It then clones that earned checkpoint for each continuation and plays any further prerequisite arc; it does not inject plot flags or test credits. A standard Nimbo Cirrus and named navigation outfits are supplied as disclosed late-game test gear after the main ending. Equipment acquisition economics have a separate earned traversal in `tests/game.test.js`. Ordinary mined cargo is sold through the real market before switching to the small source loan prototype.

Original on-accept Merganser reward, the named Vujlet stellar-outfit loan/removal, cloaked Patir entry/landing, cloaked Ghosts landing, Builder access clearance, Danoa’s Scar's Hideout and both Eye landmarks are executable mission metadata. The garden journey commands the actual awarded Vujlet; it does not invent a starlining flag. Required Nasqueron/Slylandro stopovers are registered by actual land actions. Source-protected convoys send explicit actor-specific safe-arrival receipts before landing, preserving the Game arrival gate. These model events verify rules and persistence, not the renderer’s physical proximity check. Separate integrated tests cover disable→assist→arrival, loss→landing→paid retry, concurrency, and all 14 members of the largest convoy before docking.

## Concrete major-beat coverage

| Source family | Playable source-derived coverage | Evidence / meaningful outcomes |
| --- | --- | --- |
| Wanderers | Contact/translation, Alpha supply investigation, Unfettered invasion and evacuation, Rek/Eye/Ap’arak; Mereti/Sestor controllers, the Mind, mentors, Kor Efret diplomacy, human-space incursion, Zenith alternative, Exile factory shutdown | `wanderer-exodus` 17 stages; `wanderer-machines` 26 definitions, 25 played per Zenith route; actual scan circuits and faction-specific battles |
| Remnant | Nenia void-sprite follow-up, Chilia’s Korath defenses, Plume’s engineering work, gravitational anomaly, Ssil Vida laboratory, Merganser, Baianus recovery, refined fuel, power experiments, reporting | `remnant-cognizance` 21 stages after the original introduction |
| Successors | Seineq investigation, Kaatrij/Saajret, hidden station, cloak detectors, heirloom warship and wedding; Aqrabe keystone/stellar-garden expedition; Myurej stolen gifts/vault/escape | `successor-ghosts` 14 + `aqrabe-gardens` 7 + `myurej-wedding` 8; actual revealed Ijra-Ea landing object |
| Coalition | Distinct Heliarch investigations/Quarg reconnaissance/ringworld expedition/containment/drills/license versus Lunarium relief/supply/Bebliss/evacuees/culture/training/Quarg interview/joining | `coalition-allegiances` 27 definitions, 14 stages per exclusive allegiance; different final flags verified |
| Gegno | Vi military/civilian/Scin observations, Zydee, Quarg warning, summons, Vi passenger and work at Tschyss | `gegno-corroboration` 8 stages ending with meaningful mining work |
| Ka’het / beyond Patir | Builder settlement/research, Chanai, return mechanism, Petrel and Pacili, later expeditions, great-asteroid contact and return, shorter/extended expedition branches | `patir-mystery` 27 definitions, 26 per branch; real coordinate transfers between the Milky Way and beyond region, exact landing selection |
| Rulei | Kanguwa encounter, L-118/L-6181 emptiness/presence, Umbral Reach expression | `rulei-umbral` 3 stages; both empty systems must actually be scanned |
| Sheragi | Box discovery/theft/recovery, Hai historical research, joint dig, Emerald Sword recovery and epilogue | `sheragi-emerald` 11 stages; the actual ship enters the owned fleet exactly once |
| Deep | Hawking and keystones, Ember Waste surveys, technology/privacy decision, surveillance; Star Queen/scientist rescue and stolen Bactrian; Skaldgar’s stones and Skadenga resettlement/mourning | `deep-research` 11 and `skadenga-stones` 12, supplementing the original cubes/blockade arc |
| Avgi | Original contact/Ensemble/miners/Darius plus missing scout, frontline, escape route and Sora’s homecoming | Existing `avgi` plus `avgi-rescue` 4 |
| Human named stories | Band core tour; Amy’s Rand/Tundra terraforming; Timothy’s rise/captured convoy/imprisonment/preparation-dependent endings; Ildico; Adelita; Megaparsec; Artemis search/ending; Diana’s fortune; artifact recovery; misposted mail | Individually named runtime arcs below, with source IDs and branch tests |
| Hai | Turner outfitter and shipyard growth; Strider repair-technology diplomacy via Remnant or Coalition; Nanachi’s first voyages; Eeeya’s family and shop; Scar’s Legion | Five arcs, source shop inventory actually changes on Greenwater; distinct diplomacy branches verified |

## Fidelity boundaries and remaining work

The identified major narrative families and the substantial named human/Hai chains above have playable compact paths verified through the integrated rules. This is a source-based adaptation, not a byte-for-byte mission engine port. The main Free Worlds routes and introductory faction arcs remain in `src/content.js`; this document covers their additions. The main test distinguishes the Reconciliation-only Syndicate nuclear climax from Checkmate's separate `FWC End` Parliament settlement and verifies both open the source Pug wormhole. Final browser, hardware and publication evidence is recorded separately in [verification.md](verification.md) and the [requirements audit](completion-audit.md).

Remaining source-native differences are explicit: the original event timing (including Turner’s 95/180-day construction and Patir’s precise calendar windows) is compressed into stage completion; some research payloads become smaller cargo/passenger contracts; original repeated scans and some conversation branches are condensed; several investigations use a fixed destination where source filters choose one; the full original stealth/infiltration/timer and NPC instruction set is not ported. Named protected mobile groups use actual source rosters rather than being substituted with cargo alone. The optional native interpreter guards 77 definitions with unsupported root runtime features; see [source-runtime.md](source-runtime.md). Do not interpret the other 2,267 declarations as universally verified playable.

Minor source content still outside the authored anthology includes one-off passengers and cultural encounters, repeatable regional job variants, alternative random destinations, short Pookie/Lost Boy/Moving House/Hauler prototype episodes, small Hai film/pilgrimage/convention stories, and Remnant ancillary research visits. Their exact definitions remain in the source catalog/native system; general trade, passenger, delivery, escort, rescue and mining categories have real gameplay. Catalog presence is not a claim that every individual minor script executes.

## Combat identity and additions

All 61 authored combat stages specify an enemy government. Native hostile NPC governments are preserved where explicit; protected friendly escorts are excluded. Some plain source prose names the antagonist instead. The 14 rows below deliberately add a small pirate encounter to a condensed mission whose referenced source script does not define that hostile NPC. They are additions, not source-authored battles.

| Added encounter | Source mapping |
| --- | --- |
| remnant-cognizance-7 — A shipment of atmosphere | `Remnant: Cognizance 12` |
| remnant-cognizance-17 — Fuel from an unlikely port | `Remnant: Cognizance 32` |
| successor-ghosts-6 — Kaatrij’s hidden work | `Successors: Ghosts Cloak Prompt`, `Successors: Ghosts 8`, `Successors: Ghosts 9`, `Successors: Ghosts 10` |
| successor-ghosts-9 — The compromised sensor net | `Successors: Ghosts 14` |
| aqrabe-gardens-5 — Nnesa ti-a-Oj | `Successors: Ghosts Aqrabe 5` |
| myurej-wedding-4 — Riiria’s hiding place | `Successors: Ghosts Myurej 3 Direct` |
| coalition-allegiances-9 — Consul Aulori’s debriefing | `Heliarch Expedition 3`, `Heliarch Expedition 4`, `Heliarch Expedition 5` |
| coalition-allegiances-11 — The concealed operation | `Heliarch Containment 3`, `Heliarch Containment 4-A`, `Heliarch Containment 4-B` |
| coalition-allegiances-16 — From charity to resistance | `Lunarium: Smuggling: Charity 3`, `Lunarium: Smuggling: Grenades`, `Lunarium: Smuggling: AM` |
| coalition-allegiances-17 — The material cost | `Lunarium: Smuggling: Torpedoes`, `Lunarium: Smuggling: Heat`, `Lunarium: Smuggling: Reactors` |
| coalition-allegiances-19 — Jumping spiders | `House Bebliss 4-FW`, `House Bebliss 5-FW`, `House Bebliss 6-FW` |
| deep-research-9 — The rescue operation | `Deep: Scientist Rescue 1`, `Deep: Scientist Rescue 1: Recruit Escorts`, `Deep: Scientist Rescue 1: Recruit Reinforcements` |
| timothy-4 — A convoy for Tarazed | `Timothy Radrickson 3c: Escort the Convoy`, `Timothy Radrickson 3d: Return to Rand` |
| ice-queen-5 — A mother and child | `Ice Queen 6` |

The complete combat provenance table is `EXPANDED_COMBAT_IDENTITIES` in `src/expanded-arcs.js`.

## Wanderers · the long evacuation

Runtime arc: `wanderer-exodus`; prerequisite: `hai-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| wanderer-exodus-1 — Sayari’s introduction | Vara K'chrai | `First Contact: Wanderer`, `Wanderers: Hai Diplomat`, `Wanderers: Diplomacy` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-2 — A language in exchange | Alexandria | `Wanderers: Translation Machine`, `Human Cultural Archives` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-3 — The translation machine | Greenwater | `Cultural Data to Greenwater`, `Visit Wanderers Again` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-4 — A frontier under attack | Vara Ke'sok | `Wanderers: Defend Vara Ke'sok Hint`, `Wanderers: Defend Vara Ke'sok`, `Wanderers: Defended Vara Ke'sok` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-5 — Food as a peace offering | Firelode | `Wanderers: Unfettered Diplomacy 1`, `Wanderers: Unfettered Diplomacy 1A`, `Wanderers: Unfettered Diplomacy 1B`, `Wanderers: Unfettered Diplomacy 1C` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-6 — Where the jump drives come from | Vara K'chrai | `Wanderers: Truce Check`, `Wanderers: Jump Drive Source` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-7 — An Alpha connection | Alta Hai | `Wanderers: Alpha Surveillance A`, `Wanderers: Alpha Surveillance B`, `Wanderers: Alpha Surveillance C` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-8 — Danforth’s expedition | Avalon | `Wanderers: Alpha Surveillance D`, `Wanderers: Alpha Surveillance E`, `Wanderers: Alpha Surveillance F` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-9 — The report after Avalon | Vara K'chrai | `Wanderers: Alpha Surveillance G`, `Wanderers: Alpha Surveillance H`, `Wanderers: Alpha Surveillance I`, `Wanderers: Alpha Surveillance J` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-10 — Freighters for refugees | Var' Kar'i'i | `Wanderers Invaded 0`, `Wanderers Invaded 1`, `Wanderers Invaded 1B` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-11 — Time bought in battle | Varu Mer'ek | `Wanderers Invaded 2`, `Wanderers Invaded 3`, `Wanderers Invaded 3B` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-12 — A pause at the front | Darkcloak | `Wanderers Invaded 3C`, `Wanderers Hai Assistance 1`, `Wanderers Hai Assistance 2`, `Wanderers Hai Assistance 3` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-13 — The new Unfettered warship | Vara Ke'sok | `Wanderers Solifuge Recon 1`, `Wanderers Solifuge Recon 2`, `Wanderers Solifuge Recon 3`, `Wanderers Solifuge Recon 4` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-14 — Another convoy home | Vara K'chrai | `Wanderers Evacuation 1`, `Wanderers Evacuation 1B`, `Wanderers Evacuation 1C`, `Wanderers Defend Sich'ka'ara` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-15 — The warriors left behind | Kort Vek'kri | `Wanderers Rescue 1`, `Wanderers Rescue 1B`, `Wanderers Rescue 1C` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-16 — Rek and the Eye | Tik Klai | `Wanderers Rek 0`, `Wanderers Rek 1`, `Wanderers Rek 2`, `Wanderers Rek 3` | `data/wanderer/wanderers start.txt` |
| wanderer-exodus-17 — A stand at Ap’arak | Varu Tev'kei | `Wanderers Ap'arak 1`, `Wanderers Ap'arak 2`, `Wanderers Ap'arak 3` | `data/wanderer/wanderers start.txt` |

## Cognizance · the living void

Runtime arc: `remnant-cognizance`; prerequisite: `remnant-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| remnant-cognizance-1 — Return to Nenia | Nasqueron | `Remnant: Cognizance 1` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-2 — Chilia’s emergency | Caelian | `Remnant: Cognizance 2`, `Remnant: Cognizance 3` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-3 — Hunt in the Ember Waste | Caelian | `Remnant: Cognizance 4`, `Remnant: Cognizance 5` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-4 — A witness among the sprites | Nasqueron | `Remnant: Cognizance 6`, `Remnant: Cognizance 7` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-5 — The engineering record | Esquiline | `Remnant: Cognizance 8`, `Remnant: Cognizance 9` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-6 — A crystal of measurements | Viminal | `Remnant: Cognizance 10`, `Remnant: Cognizance 11` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-7 — A shipment of atmosphere | Esquiline | `Remnant: Cognizance 12` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-8 — Waves in the dark | Ssil Vida | `Remnant: Cognizance 13`, `Remnant: Cognizance 14` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-9 — The creature’s constellations | Nasqueron | `Remnant: Cognizance 15`, `Remnant: Cognizance 16`, `Remnant: Cognizance 17` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-10 — The Pelican collection | Aventine | `Remnant: Cognizance 18`, `Remnant: Cognizance 19` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-11 — A laboratory beyond the charts | Ssil Vida | `Remnant: Cognizance 20`, `Remnant: Cognizance 21`, `Remnant: Cognizance 22` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-12 — First flight of the Merganser | Ssil Vida | `Remnant: Cognizance 23` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-13 — Dusk’s working station | Ssil Vida | `Remnant: Cognizance 24`, `Remnant: Cognizance 25` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-14 — An Aeon Cell and a rescue team | Caelian | `Remnant: Cognizance 26`, `Remnant: Cognizance 27` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-15 — Recovery at Baianus | Baianus | `Remnant: Cognizance 28` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-16 — What the station remembers | Viminal | `Remnant: Cognizance 29`, `Remnant: Cognizance 30`, `Remnant: Cognizance 31` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-17 — Fuel from an unlikely port | Clink | `Remnant: Cognizance 32` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-18 — Fuel through the waste | Ssil Vida | `Remnant: Cognizance 33` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-19 — Postverta changes | Ssil Vida | `Remnant: Cognizance 34`, `Remnant: Cognizance 35` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-20 — Darkness, then light | Ssil Vida | `Remnant: Cognizance 36`, `Remnant: Cognizance 37` | `data/remnant/remnant 2 cognizance.txt` |
| remnant-cognizance-21 — Cognizance | Viminal | `Remnant: Cognizance 38`, `Remnant: Cognizance 39` | `data/remnant/remnant 2 cognizance.txt` |

## Ghosts · the heirloom warship

Runtime arc: `successor-ghosts`; prerequisite: `successor-contact`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| successor-ghosts-1 — A summons from Seineq | Shassa-Wyra-Orrou | `Successors: Ghosts 1` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-2 — Eyes beyond the wormhole | Shassa-Wyra-Orrou | `Successors: Ghosts 2` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-3 — The Houses compare stories | Raaqa-Puan-Uuoru | `Successors: Ghosts 3a Sioeora`, `Successors: Ghosts 3b Kaatrij`, `Successors: Ghosts 4` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-4 — Saajret’s fieldwork | Raaqa-Uur-Kaav | `Successors: Ghosts 5`, `Successors: Ghosts 6` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-5 — Saajret’s detour | Raaqa-Puan-Uuoru | `Successors: Ghosts 7a`, `Successors: Ghosts 7b` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-6 — Kaatrij’s hidden work | Qasa-Sija-Iri | `Successors: Ghosts Cloak Prompt`, `Successors: Ghosts 8`, `Successors: Ghosts 9`, `Successors: Ghosts 10` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-7 — The archive’s missing pieces | Qasa-Sija-Iri | `Successors: Ghosts 11` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-8 — Modified keystones | Kasii-Cavasaa-Oa | `Successors: Ghosts 12`, `Successors: Ghosts 13` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-9 — The compromised sensor net | Qasa-Sija-Iri | `Successors: Ghosts 14` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-10 — The station in the veil | Ijra-Ea, Shimmering Veil | `Successors: Ghosts 15`, `Successors: Ghosts 16` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-11 — A pursuit from the past | Qasa-Sija-Iri | `Successors: Ghosts 17` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-12 — A net for the unseen | Myiara-Aret-Iir | `Successors: Ghosts 18` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-13 — The heirloom warship | Qasa-Sija-Iri | `Successors: Ghosts 19` | `data/successors/successor 2 ghosts.txt` |
| successor-ghosts-14 — The wedding after the ghosts | Iyra-Ijasa-Iret | `Successors: Ghosts 20`, `Successors: Ghosts Black Box`, `Successors: Ghosts Reincarnation` | `data/successors/successor 2 ghosts.txt` |

## Aqrabe · a garden inside a star

Runtime arc: `aqrabe-gardens`; prerequisite: `successor-contact`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| aqrabe-gardens-1 — Aqrabe’s keystones | Kasii-Cavasaa-Oa | `Successors: Ghosts Aqrabe 1`, `Successors: Ghosts Aqrabe Remnant`, `Successors: Ghosts Aqrabe Hai` | `data/successors/successor 2 ghosts aqrabe.txt` |
| aqrabe-gardens-2 — A different resonance | Myiara-Aret-Iir | `Successors: Ghosts Aqrabe 2` | `data/successors/successor 2 ghosts aqrabe.txt` |
| aqrabe-gardens-3 — The stellar garden | Kasii-Cavasaa-Oa | `Successors: Ghosts Aqrabe 3` | `data/successors/successor 2 ghosts aqrabe.txt` |
| aqrabe-gardens-4 — A modified Vujlet | Raaqa-Puan-Uuoru | `Successors: Ghosts Aqrabe 4` | `data/successors/successor 2 ghosts aqrabe.txt` |
| aqrabe-gardens-5 — Nnesa ti-a-Oj | Kasii-Cavasaa-Oa | `Successors: Ghosts Aqrabe 5` | `data/successors/successor 2 ghosts aqrabe.txt` |
| aqrabe-gardens-6 — Metal in starlight | Exotic Metal Garden | `Successors: Ghosts Aqrabe 6` | `data/successors/successor 2 ghosts aqrabe.txt` |
| aqrabe-gardens-7 — What followed the sample | Kasii-Cavasaa-Oa | `Successors: Ghosts Aqrabe 7` | `data/successors/successor 2 ghosts aqrabe.txt` |

## Myurej · the stolen wedding gifts

Runtime arc: `myurej-wedding`; prerequisite: `successor-contact`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| myurej-wedding-1 — The missing gifts | Kasii-Tuur-Saqru | `Successors: Ghosts Myurej 1` | `data/successors/successor 2 ghosts myurej.txt` |
| myurej-wedding-2 — Looking for Riiria | Vade-Osolaa-Kaska | `Successors: Ghosts Myurej 2` | `data/successors/successor 2 ghosts myurej.txt` |
| myurej-wedding-3 — A trail through the Houses | Myiara-Sola-Tej | `Successors: Ghosts Myurej 3` | `data/successors/successor 2 ghosts myurej.txt` |
| myurej-wedding-4 — Riiria’s hiding place | Maspa-Viir-Kella | `Successors: Ghosts Myurej 3 Direct` | `data/successors/successor 2 ghosts myurej.txt` |
| myurej-wedding-5 — Return to Myurej | Raaqa-Kvelq-Ryuit | `Successors: Ghosts Myurej 4` | `data/successors/successor 2 ghosts myurej.txt` |
| myurej-wedding-6 — The hidden vault | Kella-Uuoru-Sossa | `Successors: Ghosts Myurej 5` | `data/successors/successor 2 ghosts myurej.txt` |
| myurej-wedding-7 — An unexpected inheritance | Uuoru-Veldt-Stir | `Successors: Ghosts Myurej 6`, `Successors: Ghosts Myurej 7` | `data/successors/successor 2 ghosts myurej.txt` |
| myurej-wedding-8 — A wedding shipment, at last | Iyra-Ijasa-Iret | `Successors: Ghosts Myurej 8` | `data/successors/successor 2 ghosts myurej.txt` |

## Coalition · the price of allegiance

Runtime arc: `coalition-allegiances`; prerequisite: `coalition-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| coalition-allegiances-1 — Choose a commitment | Ring of Friendship | `Heliarch Investigation 1` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-2 — The agents’ first inquiry | Mebla's Portion | `Heliarch Investigation 2 - Mebla's Portion` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-3 — A wider investigation | Shifting Sand | `Heliarch Investigation 2 - Stronghold of Flugbu`, `Heliarch Investigation 2 - Shifting Sand` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-4 — The isolated lead | Remote Blue | `Heliarch Investigation 2 - Fourth Shadow`, `Heliarch Investigation 2 - Into White`, `Heliarch Investigation 2 - Remote Blue` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-5 — Looking toward the Quarg | Ring of Wisdom | `Heliarch Recon 1`, `Heliarch Recon 2-A` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-6 — A silent scan | Ring of Wisdom | `Heliarch Recon 2-B` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-7 — A less silent question | Ring of Wisdom | `Heliarch Recon 3-A`, `Heliarch Recon 3-B`, `Heliarch Recon 3-C` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-8 — The broken ringworld | Ruin | `Heliarch Expedition 1`, `Heliarch Expedition 2` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-9 — Consul Aulori’s debriefing | Ring of Wisdom | `Heliarch Expedition 3`, `Heliarch Expedition 4`, `Heliarch Expedition 5` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-10 — Soldiers and survivors | Ahr | `Heliarch Containment 1`, `Heliarch Containment 2` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-11 — The concealed operation | Remote Blue | `Heliarch Containment 3`, `Heliarch Containment 4-A`, `Heliarch Containment 4-B` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-12 — Where the weapons came from | Station Cian | `Heliarch Containment 5` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-13 — A fleet’s reach | Belug's Plunge | `Heliarch Drills 1`, `Heliarch Drills 2-A`, `Heliarch Drills 2-B`, `Heliarch Drills 2-C` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-14 — Before the consuls | Ring of Friendship | `Heliarch Drills 3`, `Heliarch License 1`, `Heliarch License 2` | `data/coalition/heliarch intro.txt` |
| coalition-allegiances-15 — Winter relief | Into White | `Lunarium: Smuggling: Charity 1`, `Lunarium: Smuggling: Charity 2` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-16 — From charity to resistance | Fourth Shadow | `Lunarium: Smuggling: Charity 3`, `Lunarium: Smuggling: Grenades`, `Lunarium: Smuggling: AM` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-17 — The material cost | Secret Sky | `Lunarium: Smuggling: Torpedoes`, `Lunarium: Smuggling: Heat`, `Lunarium: Smuggling: Reactors` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-18 — House Bebliss and the Free Worlds | Bourne | `House Bebliss 1-A`, `House Bebliss 2-FW`, `House Bebliss 3-FW` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-19 — Jumping spiders | Pugglemug | `House Bebliss 4-FW`, `House Bebliss 5-FW`, `House Bebliss 6-FW` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-20 — Students coming home | Second Viridian | `House Bebliss 7-FW`, `Lunarium: Evacuation 1`, `Lunarium: Evacuation 2` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-21 — The ranchers’ passage | Shifting Sand | `Lunarium: Evacuation 3`, `Lunarium: Evacuation 4` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-22 — A place to begin again | Ablub's Invention | `Lunarium: Evacuation 5`, `Lunarium: Evacuation 6` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-23 — Tummug’s traveling campaign | Warm Slope | `Lunarium: Propaganda 1`, `Lunarium: Propaganda 2`, `Lunarium: Propaganda 3`, `Lunarium: Propaganda 4` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-24 — Lessons in human space | Zug | `Lunarium: Combat Training 1`, `Lunarium: Combat Training 2` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-25 — Pyakri’s homecoming | Factory of Eblumab | `Lunarium: Combat Training 3`, `Lunarium: Combat Training 4` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-26 — Oobat’s difficult interview | Lagrange | `Lunarium: Questions`, `Lunarium: Quarg Interview` | `data/coalition/lunarium intro.txt` |
| coalition-allegiances-27 — An answer to the movement | Remote Blue | `Lunarium: Join` | `data/coalition/lunarium intro.txt` |

## Gegno · corroboration

Runtime arc: `gegno-corroboration`; prerequisite: `gegno-contact`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| gegno-corroboration-1 — A military exercise | Vigales | `Passive-Aggressive Observations` | `data/gegno/gegno I corroboration.txt` |
| gegno-corroboration-2 — Old recording instruments | Esstch | `Brief Bystander` | `data/gegno/gegno I corroboration.txt` |
| gegno-corroboration-3 — The crystal moon | Cyife | `Scin on Cyife` | `data/gegno/gegno I corroboration.txt` |
| gegno-corroboration-4 — A world between fleets | Zydee | `Battle over Zydee` | `data/gegno/gegno I corroboration.txt` |
| gegno-corroboration-5 — Adrauni’s warning | Giaru Gegno | `Gegno Suspicions`, `Return to Giaru Gegno` | `data/gegno/gegno I corroboration.txt` |
| gegno-corroboration-6 — A formal summons | Dueyu Eitch | `Gegno Anticipation`, `Gegno Intervention` | `data/gegno/gegno I corroboration.txt` |
| gegno-corroboration-7 — The silent passenger | Tschyss | `Acquiescence` | `data/gegno/gegno I corroboration.txt` |
| gegno-corroboration-8 — Work worth recognizing | Tschyss | `Gegno Asteroid Mining Prologue` | `data/gegno/gegno I corroboration.txt` |

## Wanderers · minds and migrations

Runtime arc: `wanderer-machines`; prerequisite: `wanderer-exodus-complete`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| wanderer-machines-1 — Reading a damaged sky | Spera Anatrusk | `Wanderers: Surveying 1`, `Wanderers: Surveying 2`, `Wanderers: Nova Remnants` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-2 — A Mereti controller | Spera Anatrusk | `Wanderers: Mereti Controller` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-3 — A Sestor controller | Spera Anatrusk | `Wanderers: Sestor Controller` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-4 — The colony under attack | Spera Anatrusk | `Wanderers: First Mereti Attack` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-5 — Rek after the Molt | Setar Fort | `Wanderers: Rek To Kor Efret` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-6 — Ask the Quarg | Kuwaru Efreti | `Wanderers: Quarg Assistance 1`, `Wanderers: Quarg Assistance 2` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-7 — The Pug’s refusal | Vara Pug | `Wanderers: Pug Assistance 1`, `Wanderers: Pug Assistance 2` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-8 — Listen to Mesuket | Spera Anatrusk | `Wanderers: Mereti Observation` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-9 — The engineers’ answer | Laki Nemparu | `Wanderers: Kor Efret 1`, `Wanderers: Kor Efret 2`, `Wanderers: Kor Efret 3` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-10 — A failed route into the network | Spera Anatrusk | `Wanderers: Kor Efret 4`, `Wanderers: Kor Efret 5`, `Wanderers: Kor Mereti Hacking` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-11 — Meto’s artificial mind | Kort Kehai | `Wanderers: Mind 1`, `Wanderers: Mind 2` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-12 — A mind inside the station | Rekat Moraski | `Wanderers: Mind 3`, `Wanderers: Mind 4`, `Wanderers: Mind 5` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-13 — Machines choosing differently | Korbatri Eska | `Wanderers: Mind 6`, `Wanderers: Mind 7`, `Wanderers: Mind 8` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-14 — Teachers for the new minds | Korbatri Eska | `Wanderers: Mentors 1`, `Wanderers: Mentors 2`, `Wanderers: Mentors 3` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-15 — The Kor Efret tour | Desi Seledrak | `Wanderers: Tour 1`, `Wanderers: Tour 2`, `Wanderers: Tour 3`, `Wanderers: Tour 4`, `Wanderers: Tour 5`, `Wanderers: Tour 6`, `Wanderers: Tour 7` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-16 — The other machine war | Desi Seledrak | `Wanderers: Sestor Scanning`, `Wanderers: Sestor Attack` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-17 — The fleet reaches human space | Farpoint | `Wanderers: Sestor Search`, `Wanderers: Sestor Search: Human Hint`, `Wanderers: Sestor: Farpoint Attack 1` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-18 — Another appeal to the Quarg | Alta Hai | `Wanderers: Sestor: Quarg Help 1`, `Wanderers: Sestor: Quarg Help 2` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-19 — Danforth’s decision | Farpoint | `Wanderers: Sestor: Bomb Zenith 1`, `Wanderers: Sestor Alt: Alnilam 1` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-20 — The device over Zenith | Zenith | `Wanderers: Sestor: Bomb Zenith 1`, `Wanderers: Sestor: Bomb Zenith 2` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-21 — Oathkeepers at Zenith | Zenith | `Wanderers: Sestor Alt: Alnilam 1`, `Wanderers: Sestor Alt: Alnilam 2`, `Wanderers: Sestor Alt: Alnilam 3` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-22 — The scattered machines | Desi Seledrak | `Wanderers: Sestor: Kill Southern Remnant`, `Wanderers: Sestor: Drones in Alnilam Waypoint`, `Wanderers: Sestor: Return to Wanderers` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-23 — Speak with the Exiles | Far'en Lai | `Wanderers: Sestor: Scan Drones`, `Wanderers: Sestor: Exiles 1`, `Wanderers: Sestor: Exiles 2` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-24 — World-ships at the conference | Desi Seledrak | `Wanderers: Sestor: Exiles 3` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-25 — Shut down the factory | Sestor Ikfar | `Wanderers: Sestor: Factory 1`, `Wanderers: Sestor: Factory 2` | `data/wanderer/wanderers middle.txt` |
| wanderer-machines-26 — A guarded future | Desi Seledrak | `Wanderers: Sestor: Factory 3`, `Wanderers: Sestor: Final: Patched` | `data/wanderer/wanderers middle.txt` |

## Patir · beyond the black hole

Runtime arc: `patir-mystery`; prerequisite: `kahet-research`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| patir-mystery-1 — The asteroid in Patir | Builder Settlement | `Ka'het: Patir Mystery 1`, `Ka'het: Patir Mystery 2`, `Ka'het: Patir Mystery 3` | `data/kahet/kahet missions.txt` |
| patir-mystery-2 — Dusk at the settlement | Builder Settlement | `Ka'het: Patir Mystery 4` | `data/kahet/kahet missions.txt` |
| patir-mystery-3 — After first contact | Aventine | `Ka'het: Patir Mystery 5` | `data/kahet/kahet missions.txt` |
| patir-mystery-4 — The archaeological team | Builder Settlement | `Ka'het: Patir Mystery 6`, `Ka'het: Patir Mystery 7` | `data/kahet/kahet missions.txt` |
| patir-mystery-5 — A laboratory at the edge | Builder Settlement | `Ka'het: Patir Mystery 8A`, `Ka'het: Patir Mystery 8B` | `data/kahet/kahet missions.txt` |
| patir-mystery-6 — Signals around Patir | Builder Settlement | `Ka'het: Patir Mystery 9`, `Ka'het: Patir Mystery 10`, `Ka'het: Patir Mystery 11` | `data/kahet/kahet missions.txt` |
| patir-mystery-7 — The station beyond | Chanai Structure | `Ka'het: Patir Mystery 12.1A`, `Ka'het: Patir Mystery 12.1B` | `data/kahet/kahet missions.txt` |
| patir-mystery-8 — Learning from an arrival | Builder Settlement | `Ka'het: Patir Mystery 12.2A`, `Ka'het: Patir Mystery 12.2B` | `data/kahet/kahet missions.txt` |
| patir-mystery-9 — The black hole returns | Aventine | `Ka'het: Patir Mystery 13.1`, `Ka'het: Patir Mystery 13.2`, `Ka'het: Patir Mystery 14` | `data/kahet/kahet missions.txt` |
| patir-mystery-10 — Chilia joins the expedition | Builder Settlement | `Ka'het: Patir Mystery 15`, `Ka'het: Patir Mystery 16`, `Ka'het: Patir Mystery 17` | `data/kahet/kahet missions.txt` |
| patir-mystery-11 — What the Fetri’sei swallowed | Caelian | `Ka'het: Patir Mystery 18`, `Ka'het: Patir Mystery 19` | `data/kahet/kahet missions.txt` |
| patir-mystery-12 — Follow the Petrel | Pacili | `Ka'het: Patir Mystery 20`, `Ka'het: Patir Mystery 21` | `data/kahet/kahet missions.txt` |
| patir-mystery-13 — A test worth repeating | Caelian | `Ka'het: Patir Mystery 22`, `Ka'het: Patir Mystery 23` | `data/kahet/kahet missions.txt` |
| patir-mystery-14 — The second departure | Builder Settlement | `Ka'het: Patir Mystery 24` | `data/kahet/kahet missions.txt` |
| patir-mystery-15 — An expedition beyond | Chanai Structure | `Ka'het: Patir Mystery 24`, `Ka'het: Patir Mystery 25` | `data/kahet/kahet missions.txt` |
| patir-mystery-16 — The rendezvous | Builder Settlement | `Ka'het: Patir Mystery 26A`, `Ka'het: Patir Mystery 26B` | `data/kahet/kahet missions.txt` |
| patir-mystery-17 — Another asteroid’s remains | Caelian | `Ka'het: Patir Mystery 27` | `data/kahet/kahet missions.txt` |
| patir-mystery-18 — The Swan fit checks | Ssil Vida | `Ka'het: Patir Mystery 28`, `Ka'het: Patir Mystery 29` | `data/kahet/kahet missions.txt` |
| patir-mystery-19 — All hands through Patir | Builder Settlement | `Ka'het: Patir Mystery 30`, `Ka'het: Patir Mystery 31`, `Ka'het: Patir Mystery 32` | `data/kahet/kahet missions.txt` |
| patir-mystery-20 — Contact on the great asteroid | Magic Asteroid Planet | `Ka'het: Patir Mystery 33` | `data/kahet/kahet missions.txt` |
| patir-mystery-21 — A difficult return | Builder Settlement | `Ka'het: Patir Mystery 34` | `data/kahet/kahet missions.txt` |
| patir-mystery-22 — The findings from beyond | Caelian | `Ka'het: Patir Mystery 35` | `data/kahet/kahet missions.txt` |
| patir-mystery-23 — An expedition of your own | Builder Settlement | `Ka'het: Patir Mystery 37A`, `Ka'het: Patir Mystery 38A` | `data/kahet/kahet missions.txt` |
| patir-mystery-24 — Seven days beyond | Builder Settlement | `Ka'het: Patir Mystery 37A`, `Ka'het: Patir Mystery 37B` | `data/kahet/kahet missions.txt` |
| patir-mystery-25 — Fourteen days beyond | Chanai Structure | `Ka'het: Patir Mystery 38A`, `Ka'het: Patir Mystery 38B` | `data/kahet/kahet missions.txt` |
| patir-mystery-26 — The return rendezvous | Builder Settlement | `Ka'het: Patir Mystery Safety Net Permanent` | `data/kahet/kahet missions.txt` |
| patir-mystery-27 — A route for future researchers | Caelian | `Ka'het: Patir Mystery Crew job` | `data/kahet/kahet missions.txt` |

## Rulei · the umbral reach

Runtime arc: `rulei-umbral`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| rulei-umbral-1 — Whispers at Kanguwa | Yniu Eiu | `First Contact: Rulei`, `Rulei Planet` | `data/rulei/rulei.txt` |
| rulei-umbral-2 — You are not alone | Yniu Eiu | `Rulei: You Are (Not) Alone: L-118`, `Rulei: You Are (Not) Alone: L-6181` | `data/rulei/rulei.txt` |
| rulei-umbral-3 — The phrase in the silence | Yniu Ena | `Rulei: Umbral Reach` | `data/rulei/rulei.txt` |

## Sheragi · the Emerald Sword

Runtime arc: `sheragi-emerald`; prerequisite: `sheragi-discovery`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| sheragi-emerald-1 — Foster’s sealed discovery | Zug | `Sheragi Archaeology: The Box 1` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-2 — A trusted scientist | Vinci | `Sheragi Archaeology: The Box 2` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-3 — The stolen box | Stormhold | `Sheragi Archaeology: The Box 3` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-4 — The mercenaries at Watcher | Watcher | `Sheragi Archaeology: The Box 4`, `Sheragi Archaeology: The Box 5` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-5 — Ask the Hai | Allhome | `Sheragi Archaeology: The Box 6b`, `Sheragi Archaeology: The Box 6c` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-6 — The Museum of Galactic History | Mirrorlake | `Sheragi Archaeology: The Box 7a` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-7 — The Ministry of Culture | Hai-home | `Sheragi Archaeology: The Box 7b` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-8 — A shared excavation | Zug | `Sheragi Archaeology: The Box 8` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-9 — Preparing a recovery expedition | Zug | `Sheragi Archaeology: The Emerald Sword 1`, `Sheragi Archaeology: The Emerald Sword 2` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-10 — The guardian of the graveyard | Valley of the Damned | `Sheragi Archaeology: The Emerald Sword 3` | `data/sheragi/archaeology missions.txt` |
| sheragi-emerald-11 — What survives a civilization | Zug | `Sheragi Archaeology: Epilogue` | `data/sheragi/archaeology missions.txt` |

## The Deep · science and surveillance

Runtime arc: `deep-research`; prerequisite: `deep-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| deep-research-1 — Project Hawking | Midgard | `Deep: Questions`, `Deep: Project Hawking` | `data/human/deep missions.txt` |
| deep-research-2 — Ivan’s quantum keystones | Valhalla | `Deep: Remnant 0`, `Deep: Remnant: Keystone Research` | `data/human/deep missions.txt` |
| deep-research-3 — Beyond Terminus | Valhalla | `Deep: Remnant 1` | `data/human/deep missions.txt` |
| deep-research-4 — The wormhole loop | Valhalla | `Deep: Remnant 2` | `data/human/deep missions.txt` |
| deep-research-5 — A report with consequences | Valhalla | `Deep: Remnant 3: Secret`, `Deep: Remnant 3: Revealed` | `data/human/deep missions.txt` |
| deep-research-6 — A technology comparison | Valhalla | `Deep: Remnant: Continue Research`, `Deep: Remnant: Engines`, `Deep: Remnant: Generators`, `Deep: Remnant: Inhibitor Cannon` | `data/human/deep missions.txt` |
| deep-research-7 — The sensor cubes return | Valhalla | `Deep: Remnant Surveillance` | `data/human/deep missions.txt` |
| deep-research-8 — The missing Star Queen | Haven | `Deep: Scientist Rescue 0` | `data/human/deep missions.txt` |
| deep-research-9 — The rescue operation | Haven | `Deep: Scientist Rescue 1`, `Deep: Scientist Rescue 1: Recruit Escorts`, `Deep: Scientist Rescue 1: Recruit Reinforcements` | `data/human/deep missions.txt` |
| deep-research-10 — Bring the scientists home | Valhalla | `Deep: Scientist Rescue 2` | `data/human/deep missions.txt` |
| deep-research-11 — The stolen Bactrian | Valhalla | `Deep: Scientist Rescue 3A` | `data/human/deep missions.txt` |

## The Deep · stones of home

Runtime arc: `skadenga-stones`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| skadenga-stones-1 — Skaldgar’s old home | Norn | `Stone of our Fathers 1` | `data/human/deep missions.txt` |
| skadenga-stones-2 — Return from Norn | Helheim | `Stone of our Fathers 2` | `data/human/deep missions.txt` |
| skadenga-stones-3 — A family-cairn | Alfheim | `Stone of our Fathers 3`, `Stone of our Fathers 4` | `data/human/deep missions.txt` |
| skadenga-stones-4 — The family returns | Norn | `Stone of our Fathers 5` | `data/human/deep missions.txt` |
| skadenga-stones-5 — A home for the Skadenga | Valhalla | `Home for Skadenga 1`, `Home for Skadenga 4` | `data/human/deep missions.txt` |
| skadenga-stones-6 — Freighters made into homes | Mani | `Home for Skadenga 5`, `Mani Refit` | `data/human/deep missions.txt` |
| skadenga-stones-7 — The first resettlement | Asgard | `Home for Skadenga 6`, `Home for Skadenga 7` | `data/human/deep missions.txt` |
| skadenga-stones-8 — Called back to Nifel | Nifel | `Skadenga Call 1`, `Skadenga Call 2` | `data/human/deep missions.txt` |
| skadenga-stones-9 — Hroar’s fleet | Muspel | `Home for Skadenga 8`, `Home for Skadenga 10`, `Home for Skadenga 11` | `data/human/deep missions.txt` |
| skadenga-stones-10 — A place to remain | Windblain | `Home for Skadenga 12`, `Home for Skadenga Captain` | `data/human/deep missions.txt` |
| skadenga-stones-11 — The mourners’ journey | Nifel | `Homecoming to Skadenga`, `Stones of Skadenga 1`, `Stones of Skadenga 2`, `Stone-Bearers to Nifel` | `data/human/deep missions.txt` |
| skadenga-stones-12 — Hjlod remembers | Windblain | `Hjlod Remembers Windblain`, `Hjlod Remembers Nifel` | `data/human/deep missions.txt` |

## Avgi · rescue and homecoming

Runtime arc: `avgi-rescue`; prerequisite: `avgi-contact`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| avgi-rescue-1 — The missing scout | Peripheria | `Avgi: Scout Rescue` | `data/avgi/avgi 0 first contact.txt` |
| avgi-rescue-2 — Room for the defenders | Feo Platform | `Avgi: Frontline Combat` | `data/avgi/avgi 0 first contact.txt` |
| avgi-rescue-3 — A route out of the Twilight | Vinci | `Avgi: Twilight Escape 1` | `data/avgi/avgi 0 first contact.txt` |
| avgi-rescue-4 — Sora’s parents | Memory | `Avgi: Twilight Escape 2` | `data/avgi/avgi 0 first contact.txt` |

## There Might Be Riots · the tour

Runtime arc: `band-tour`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| band-tour-1 — A band needs a ride | Wayfarer | `There Might Be Riots 1` | `data/human/human missions.txt` |
| band-tour-2 — The next show | Prime | `There Might Be Riots part 2` | `data/human/human missions.txt` |
| band-tour-3 — A less ordinary venue | Pilot | `There Might Be Riots part 3A` | `data/human/human missions.txt` |
| band-tour-4 — A different audience | Allhome | `There Might Be Riots part 3B` | `data/human/human missions.txt` |

## Amy’s worlds · a practical revolution

Runtime arc: `terraforming`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| terraforming-1 — A delegation from Rand | Glory | `Terraforming 1` | `data/human/human missions.txt` |
| terraforming-2 — Amy’s proposal | Rand | `Terraforming 2` | `data/human/human missions.txt` |
| terraforming-3 — A push in the right direction | Rand | `Terraforming 3` | `data/human/human missions.txt` |
| terraforming-4 — Plants for a darker world | New Portland | `Terraforming 4`, `Terraforming 5` | `data/human/human missions.txt` |
| terraforming-5 — A beginning in the soil | Rand | `Terraforming 5` | `data/human/human missions.txt` |
| terraforming-6 — The unlawful asteroid | Earth | `Terraforming 6` | `data/human/human missions.txt` |
| terraforming-7 — Publish the method | Valhalla | `Terraforming 7`, `Terraforming 8` | `data/human/human missions.txt` |
| terraforming-8 — A second world | Tundra | `Terraforming 9` | `data/human/human missions.txt` |
| terraforming-9 — An alternative on paper | Earth | `Terraforming 10`, `Terraforming 11` | `data/human/human missions.txt` |
| terraforming-10 — The dormant volcano | Tundra | `Terraforming 11`, `Terraforming 12` | `data/human/human missions.txt` |
| terraforming-11 — A message from Amy | Rand | `Terraforming Follow-up` | `data/human/human missions.txt` |

## Timothy · a life beyond the cargo hold

Runtime arc: `timothy`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| timothy-1 — The man in the food crate | Rand | `Timothy Radrickson 1: Stowaway`, `Timothy Radrickson 1a: Accepted` | `data/human/human missions.txt` |
| timothy-2 — Governor Tim | Rand | `Timothy Radrickson 2: Interlude`, `Timothy Radrickson 2: Good Interlude`, `Timothy Radrickson 3: Governor Notification` | `data/human/human missions.txt` |
| timothy-3 — Rand’s captured convoy | Greenrock | `Timothy Radrickson 3a: Rescue the Convoy`, `Timothy Radrickson 3b: Pirate Base` | `data/human/human missions.txt` |
| timothy-4 — A convoy for Tarazed | Wayfarer | `Timothy Radrickson 3c: Escort the Convoy`, `Timothy Radrickson 3d: Return to Rand` | `data/human/human missions.txt` |
| timothy-5 — Timshank | Oblivion | `Timothy Radrickson 4: Imprisoned`, `Timothy Radrickson 5a: Timshank Redemption` | `data/human/human missions.txt` |
| timothy-6 — Detoxification medicine | New Britain | `Timothy Radrickson 5b: New Britain` | `data/human/human missions.txt` |
| timothy-7 — A survival suit | Dancer | `Timothy Radrickson 5c: Dancer` | `data/human/human missions.txt` |
| timothy-8 — Another name | Greenrock | `Timothy Radrickson 5d: Greenrock` | `data/human/human missions.txt` |
| timothy-9 — Back beneath the ammonia sky | Oblivion | `Timothy Radrickson 5e: Back to Oblivion`, `Timothy Radrickson 6: News of Death` | `data/human/human missions.txt` |
| timothy-10 — A familiar monk | New Tibet | `Timothy Radrickson 7: Monk` | `data/human/human missions.txt` |
| timothy-11 — The hospice | New Tibet | `Timothy Radrickson 7: Hospice` | `data/human/human missions.txt` |
| timothy-12 — The forgotten dead | Oblivion | `Timothy Radrickson 7: Grave` | `data/human/human missions.txt` |

## Ildico · the Ice Queen

Runtime arc: `ice-queen`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| ice-queen-1 — The woman in the abandoned manor | Clark | `Stone to Ice Queen`, `Ice Queen` | `data/human/human missions.txt` |
| ice-queen-2 — Looking for her father | Glory | `Ice Queen 2` | `data/human/human missions.txt` |
| ice-queen-3 — A Republic appointment | Chiron | `Ice Queen 3`, `Ice Queen 4` | `data/human/human missions.txt` |
| ice-queen-4 — Ildico’s message | Chiron | `Ice Queen 5` | `data/human/human missions.txt` |
| ice-queen-5 — A mother and child | Haven | `Ice Queen 6` | `data/human/human missions.txt` |
| ice-queen-6 — The name in the news | Haven | `Ice Queen 7` | `data/human/human missions.txt` |
| ice-queen-7 — The Marauders at Haven | Haven | `Ice Queen 8`, `Ice Queen: News` | `data/human/human missions.txt` |

## Adelita · what the camera sees

Runtime arc: `adelita`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| adelita-1 — An exhibition to deliver | Moonshake | `Adelita 1` | `data/human/human missions.txt` |
| adelita-2 — Behind the factory gates | Maker | `Adelita 2` | `data/human/human missions.txt` |
| adelita-3 — Bunker’s record | Hippocrates | `Adelita 3` | `data/human/human missions.txt` |
| adelita-4 — Return the film | Maker | `Adelita 4` | `data/human/human missions.txt` |
| adelita-5 — The work comes home | Moonshake | `Adelita 5` | `data/human/human missions.txt` |

## Megaparsec · the investment

Runtime arc: `syndicate-business`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| syndicate-business-1 — An unusual distress call | Sunracer | `Syndicate Business 1` | `data/human/human missions.txt` |
| syndicate-business-2 — Howard’s paperwork | Hephaestus | `Syndicate Business 2` | `data/human/human missions.txt` |
| syndicate-business-3 — Another opportunity | Hephaestus | `Syndicate Business 3` | `data/human/human missions.txt` |
| syndicate-business-4 — The favor behind the offer | Sunracer | `Syndicate Business 4` | `data/human/human missions.txt` |
| syndicate-business-5 — The Marauder’s record | Sunracer | `Syndicate Business 5` | `data/human/human missions.txt` |

## Artemis · the missing racer

Runtime arc: `lost-racer`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| lost-racer-1 — A father searches | Sunracer | `Lost Racer 1` | `data/human/human missions.txt` |
| lost-racer-2 — Continue the search | Sunracer | `Lost Racer 2 - Continued`, `Lost Racer 2 - Ended` | `data/human/human missions.txt` |
| lost-racer-3 — The Sandswell lead | Sandswell | `Lost Racer 2 - Continued` | `data/human/human missions.txt` |
| lost-racer-4 — The Renards come home | Glory | `Lost Racer 3`, `Lost Racer Epilogue` | `data/human/human missions.txt` |
| lost-racer-5 — A journey without an answer | Glory | `Lost Racer 2 - Ended` | `data/human/human missions.txt` |

## Diana · a fortune in a backpack

Runtime arc: `paradise-fortune`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| paradise-fortune-1 — A passenger fleeing paradise | Bourne | `Paradise Fortune 1` | `data/human/human missions.txt` |
| paradise-fortune-2 — What the fortune is for | Bourne | `Paradise Fortune 2` | `data/human/human missions.txt` |
| paradise-fortune-3 — A Free Worlds hearing | Bourne | `Paradise Fortune 3` | `data/human/human missions.txt` |
| paradise-fortune-4 — A note for the Navy | New Boston | `Paradise Fortune 4` | `data/human/human missions.txt` |

## The statues · a place in history

Runtime arc: `saving-artifacts`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| saving-artifacts-1 — An archive needs room | Alexandria | `Saving Artifacts 1` | `data/human/human missions.txt` |
| saving-artifacts-2 — Statues in a warlord’s hands | Greenrock | `Saving Artifacts 2` | `data/human/human missions.txt` |
| saving-artifacts-3 — The bargain with the warlord | Greenrock | `Saving Artifacts 3` | `data/human/human missions.txt` |
| saving-artifacts-4 — Back into safekeeping | Alexandria | `Saving Artifacts 4` | `data/human/human missions.txt` |

## Quicksilver · the misposted package

Runtime arc: `quicksilver-mail`; prerequisite: `none`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| quicksilver-mail-1 — A package for Silver | Silver | `Quicksilver Mixup 0` | `data/human/human missions.txt` |
| quicksilver-mail-2 — A name too similar | Quicksilver | `Quicksilver Mixup 1` | `data/human/human missions.txt` |
| quicksilver-mail-3 — Not the only mistake | Quicksilver | `Quicksilver Mixup 2` | `data/human/human missions.txt` |
| quicksilver-mail-4 — The return post | Silver | `Quicksilver Mixup 3` | `data/human/human missions.txt` |

## Greenwater · a business across cultures

Runtime arc: `turner-business`; prerequisite: `hai-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| turner-business-1 — Turner’s waiting convoy | Allhome | `Expanding Business [1]` | `data/hai/hai missions.txt` |
| turner-business-2 — Supplies for the outfitter | Follower | `Expanding Business [2]`, `Expanding Business [3]` | `data/hai/hai missions.txt` |
| turner-business-3 — The Greenwater outfitter | Greenwater | `Expanding Business [4]` | `data/hai/hai missions.txt` |
| turner-business-4 — A shipyard proposal | Sunracer | `Expanding Business [5]`, `Expanding Business [6]` | `data/hai/hai missions.txt` |
| turner-business-5 — Ships at Greenwater | Greenwater | `Expanding Business [7]` | `data/hai/hai missions.txt` |

## Strider · technology for a defense

Runtime arc: `strider-diplomacy`; prerequisite: `hai-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| strider-diplomacy-1 — An answer to the Solifuge | Hai-home | `Strider Alt Start`, `Strider 0` | `data/hai/hai missions.txt` |
| strider-diplomacy-2 — Yashili’s delegation | Allhome | `Strider 1` | `data/hai/hai missions.txt` |
| strider-diplomacy-3 — Arrange a private meeting | Caelian | `Strider: Remnant 1` | `data/hai/hai missions.txt` |
| strider-diplomacy-4 — The Remnant negotiation | Covert | `Strider: Remnant 2` | `data/hai/hai missions.txt` |
| strider-diplomacy-5 — The Remnant agreement | Hai-home | `Strider: Remnant 3` | `data/hai/hai missions.txt` |
| strider-diplomacy-6 — The Coalition negotiation | Ring of Friendship | `Strider: Coalition 1` | `data/hai/hai missions.txt` |
| strider-diplomacy-7 — The Coalition agreement | Hai-home | `Strider: Coalition 2` | `data/hai/hai missions.txt` |

## Nanachi · a new captain

Runtime arc: `nanachi`; prerequisite: `hai-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| nanachi-1 — Her first delivery | Cloudfire | `Nanachi 1` | `data/hai/hai missions.txt` |
| nanachi-2 — Passengers for home | Hai-home | `Nanachi 2` | `data/hai/hai missions.txt` |
| nanachi-3 — Spices for the festival | Allhome | `Nanachi 3` | `data/hai/hai missions.txt` |
| nanachi-4 — The dangerous route | Allhome | `Nanachi 4` | `data/hai/hai missions.txt` |

## Acorn Delights · finding family

Runtime arc: `acorn-delights`; prerequisite: `hai-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| acorn-delights-1 — Eeeya’s parcel | Stonebreak | `Acorn Delights: Part 1` | `data/hai/hai missions.txt` |
| acorn-delights-2 — Another address | Cloudfire | `Acorn Delights: Part 2` | `data/hai/hai missions.txt` |
| acorn-delights-3 — Beyond the divide | Darkcloak | `Acorn Delights: Part 3` | `data/hai/hai missions.txt` |
| acorn-delights-4 — The shop’s paperwork | Allhome | `Acorn Delights: Part 4` | `data/hai/hai missions.txt` |
| acorn-delights-5 — A grandmother’s choice | Darkcloak | `Acorn Delights: Part 5` | `data/hai/hai missions.txt` |

## Scar’s Legion · trouble in Hai space

Runtime arc: `scars-legion`; prerequisite: `hai-license`.

| Browser stage | Destination | Native mission IDs | Source file |
| --- | --- | --- | --- |
| scars-legion-1 — Pirates beyond the wormhole | Hai-home | `Pirate Troubles [0]` | `data/hai/hai missions.txt` |
| scars-legion-2 — Find Scar’s Legion | Haven | `Pirate Troubles [1]`, `Pirate Troubles [2]` | `data/hai/hai missions.txt` |
| scars-legion-3 — The gang’s offer | Scar's Hideout | `Pirate Troubles [2]` | `data/hai/hai missions.txt` |
| scars-legion-4 — The Keloid’s challenge | Scar's Hideout | `Pirate Troubles [3]` | `data/hai/hai missions.txt` |
| scars-legion-5 — The trade convoy resumes | Hai-home | `Pirate Troubles [4]` | `data/hai/hai missions.txt` |
