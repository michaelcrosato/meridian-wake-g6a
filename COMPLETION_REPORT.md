# Meridian Wake completion report

Generated **26 September 2026** with **GPT-6 Astra (g6a)**.

Meridian Wake is a playable browser adaptation of Endless Sky, with a bank-financed beginning, two Free Worlds routes to an ending, and continued open-world play. It retains top-down inertial flight, trading, passenger and cargo work, combat, boarding, mining, outfit decisions, ship ownership, escorts and exploration. Narrative scale and combat are adapted for the browser.

The authoritative source is pinned to [`3248c43994eb3d545265366c8eba909a6646f4d2`](https://github.com/endless-sky/endless-sky/tree/3248c43994eb3d545265366c8eba909a6646f4d2). The [source checklist](docs/source-audit.md), [per-stage story mapping](docs/expanded-campaign-audit.md), [convoy provenance](docs/campaign-convoys.md), and [per-declaration catalog](public/source-catalog.json) distinguish playable adaptations from imported native records.

## Delivered game

| Source content / requirement | Playable implementation |
| --- | --- |
| New captain and human economy | Sparrow, Shuttle or Star Barge; loan and crew costs; local port jobs, trading, fuel/repair, banking, shipyards and outfitters |
| Free Worlds | 47 stage definitions covering reconnaissance, independence, diplomacy, research, prisoner choice, protected convoys, civil war, distinct Reconciliation/Checkmate operations, Pug invasion and settlement; mutually exclusive stages are skipped |
| Reconciliation climax | Syndicate inquiry, fitted Cloaking Device, timed Algenib nuclear-fleet evasion and Parliament settlement |
| Checkmate climax | Separate territorial/nuclear campaign and `FWC End` Parliament settlement; Kaus Borealis returns to the Republic |
| Major alien and human stories | 44 side arcs / 334 stage definitions. Hai, Wanderers, Remnant, Coalition/Heliarch/Lunarium, Successors/Aqrabe/Myurej, Gegno, Avgi, Sheragi, Korath, Ka’het/Patir, Incipias, Quarg/Drak, Rulei, Deep, Kestrel and substantial human/Hai personal stories |
| Galaxy and transitions | 694 source systems, all planets in each system selectable, directed wormholes, source coordinates/links, actual story-driven topology and revealed destinations; gas giants, stellar gardens, ringworlds and stations have distinct geometry |
| Ships and equipment | 351 base hull records, 735 runtime outfit records, source local sales and gates; primary/secondary weapons, finite ammunition, point defense, energy/heat, engines, cargo/bunks, scanners, cloak, Jump Drive, Quantum Keystone, gaslining/starlining and local charts |
| Fleet and encounters | Faction-specific source hulls, bounded reinforcement waves, persistent exact-hull wrecks/capture, owned hangars, rented/owned escorts, fleet orders, crew, and protected mission ships with real damage, disable/assist, arrival, loss and retry |
| Mining and salvage | Actual mineral cargo, finite extraction/cooldowns, sale transactions, salvage and captured ships |
| Presentation | Original brick-built 3D geometry, source-informed interface, readable objectives/route/fuel feedback, hit/exhaust/pickup effects, landing assistance, handbook/options, desktop and portrait/landscape touch |
| Rendering | Pinned Three.js WebGPURenderer; automatic WebGL2 fallback; shared TSL/node PBR materials, HDR environment, soft shadows, contact tint/GTAO, restrained bloom, four-sample AA and node RenderPipeline |
| Quality / physics | Auto/High/Balanced with measured selection; pixel ratio, shadows, effects, rocks, particles and body caps vary. Rapier fixed 1/60 stepping, interpolation, bounded catch-up, simple mass/friction colliders and cleanup; repeated pause calls preserve substeps at high refresh rates |
| Audio | Eleven original, unmodified Endless Sky effects/ambient tracks in one replaceable manifest. Official GitHub source approved by the user; every asset is listed and attributed in README |
| Persistence and ending | Local autosave, validated JSON import/export, results screen and continued sandbox; volume/mute/fullscreen and saved preferences |
| Compatibility improvements | Remappable keys, standard gamepad flight/menu navigation, simultaneous touch with stable held controls, modal focus, short/narrow layouts, storage-failure throttling and graphics-loss recovery |
| Delivery | Static Vite build to `dist`, pinned dependencies, GitHub CI and zero-configuration Vercel import; no server/API keys needed |

The 29 expanded continuations account for 283 side-stage definitions and reference 483 distinct original mission IDs. The catalog contains 2,344 native mission declarations, including hidden support scripts and alternatives. **These counts do not assert an exact port of every original script.** The optional Local Contacts interpreter exposes supported original conversations/jobs while the authored campaign supplies the major complete narrative routes.

## Verification

[Verification evidence](docs/verification.md) records test results, browser observations, screenshots and measured performance. The subsequent [compatibility audit](docs/compatibility-audit.md) expands browser, input and screen-size coverage and records its fixes and remaining gaps. [Model voyage evidence](docs/model-voyage.json) records progression from an actual Sparrow and 24,000 credits through earned upgrades and the main/side stories, without injected money or progression flags. Model tests simulate combat and protected-arrival notifications; browser tests independently exercise physical flight and the user interface. The epilogue browser test uses an earned save fixture and does not claim every earlier battle was played in-browser.

## Original additions and adaptations

- Original title, mission prose, interface, 3D toy geometry, lighting, animation and visual effects. Original source ship sprites are not used as a substitute for 3D models.
- Condensed story timing, payloads and encounters; combined native errands become individual browser stages. Visible story offers replace much of the original random discovery. Route previews, explicit blocked reasons, touch controls, rescue, convoy retry and portable saves improve accessibility.
- Ship/outfit attributes are normalized to toy-scale flight and combat. The battle scheduler limits active enemies and queues additional waves; fleets and escorts are smaller than native fleet simulations.
- Fourteen added pirate encounters are identified individually in the [expanded story audit](docs/expanded-campaign-audit.md). They are adaptation encounters, not claims about native hostile NPCs.
- The New Boston concluding passage and continued-play result presentation are original. Source factions, places, named events, character arcs and equipment are attributed to Endless Sky contributors.

## Known boundaries

- This is an independent adaptation, not binary/script compatibility with Endless Sky. Minor native errands, incidental reactions, alternate native starts, detailed political/economic simulation, covert/legal-cargo behavior and every original NPC schedule are not reproduced one-for-one. The [native runtime document](docs/source-runtime.md) lists unsupported interpreter behavior; 77 native definitions with guarded timer/stealth/infiltration/transition features are not offered through that interpreter. Corresponding major stories have explicit authored gameplay, including physical convoys, cloak objectives and capability-gated travel.
- Native fleet sizes, weapon ballistics, mass, cargo distribution, calendar pacing and some conversations are simplified. Ambient civilian traffic is decorative. Dynamic source events are implemented where supported by the interpreter or explicit campaign adapters, not certified across every possible original event chain.
- The music manifest slot contains original ambient soundscape, not a composed score. All audio came from the user-approved official repository because the requested portals yielded no verifiable Endless Sky package.
- Hardware performance is measured on one desktop GPU. Browser emulation and a native Android emulator supplement desktop vendor-browser tests; the [compatibility report](docs/compatibility-audit.md) distinguishes these environments and Apple simulator results. No physical phone or controller was available. WebGPU visual checks used software Vulkan on Linux, so those checks do not establish hardware WebGPU or phone frame rates.
- Loading the optional full native Contacts archive downloads a comparatively large source-data chunk. It is lazy-loaded to keep the normal game startup smaller. A browser with working WebGPU or WebGL2 hardware acceleration is required.

## Licensing and deployment

The game/adapted source data use GPL-3.0-or-later; original audio and Lato fonts retain their recorded licenses. See [third-party notices](THIRD_PARTY_NOTICES.md) and `licenses/`.

Run `npm ci`, `npm run dev`, or `npm run build`. Import the published repository into Vercel with its detected settings; `vercel.json` selects Vite and `dist`. No environment variables or manual service provisioning are required. Full setup, controls and all asset-source links are in [README](README.md).
