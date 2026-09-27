# Content and source data

The game source is pinned to Endless Sky commit [`3248c43994eb3d545265366c8eba909a6646f4d2`](https://github.com/endless-sky/endless-sky/tree/3248c43994eb3d545265366c8eba909a6646f4d2). The wiki expansion uses [`f243678789e0c7b179793697ae39bb7d00cf89d2`](https://github.com/endless-sky/endless-sky-wiki/tree/f243678789e0c7b179793697ae39bb7d00cf89d2). See [attribution](../THIRD_PARTY_NOTICES.md).

## Import and regeneration

```sh
node scripts/source-import.mjs
node scripts/generate-universe.mjs
node scripts/generate-topology.mjs
node scripts/generate-campaign-convoys.mjs
npm run verify:source
```

The importer verifies all 204 pinned data files against upstream Git blob hashes. It writes the minified `public/source-catalog.json` with file checksums and declaration locations, and the compressed `src/source-data.json.gz` snapshot. `src/source-data.js` retains its named-export API. Source downloads are cached under `~/.cache/meridian-source/<commit>` or `MERIDIAN_SOURCE_CACHE`.

The universe generator writes `src/universe.json.gz`; the other generators retain campaign topology and protected-convoy metadata. Normal builds decode the checked-in snapshots without downloading upstream. `node scripts/source-import.mjs --audio` additionally rebuilds the optimized audio from verified pinned originals. Asset URLs, source hashes, output hashes, sizes and encoding choices are in `public/audio/manifest.json`.

The inventory includes 694 systems and 2,344 native mission declarations; the runtime exposes 351 base hull names plus variants and a large outfit catalog. These counts describe inventory, not proof that every native script is playable. The Galaxy Archive exposes the reference catalog separately from playable content.

## Authored gameplay

The Free Worlds campaign has Reconciliation and Checkmate paths and a continued sandbox. Introductory and expanded arcs cover human, Hai, Wanderer, Remnant, Coalition, Successor and other major families. Definitions in `content.js` and `expanded-arcs.js` retain exact source mission IDs. `campaign-convoys.js` maps protected actors to their original rosters and source lines; destruction, assistance and physical arrival are distinct objectives.

The wiki adds eight regional guides, six organization profiles, nineteen public-history milestones and civilian concourse voices. The original stories below are inspired by the wiki, not claimed as upstream mission scripts:

| Story | Journey and final choice |
| --- | --- |
| The price of a harvest | Pump parts and shared manifests between New Boston and New Greenland; choose an independent cooperative or a guaranteed broker rate. |
| A science worth sharing | Instruments, surveys and a researcher in the Deep; publish the results or license them to a laboratory. |
| A uniform and a promise | Humanitarian Corps and civilian relief between Glaze and New Boston; credit the joint effort or keep affiliations private. |
| The distance from home | An archivist's Earth/Luna/Mars circuit, then an exhibition for New Boston; public touring access or sponsorship. |

Each has three stages and two final choices. Outcomes persist in flags and the journal; public cooperative/research choices also change concourse notices. Regional setting comes from [HumanSpace](https://github.com/endless-sky/endless-sky/wiki/HumanSpace), organizations from [MajorOrganizations](https://github.com/endless-sky/endless-sky/wiki/MajorOrganizations), and public history from [HistoricalTimeline](https://github.com/endless-sky/endless-sky/wiki/HistoricalTimeline). The wiki's StoryIdeas proposals are not treated as canon.

## Adapted economy

Freelance freight, passage, bounty, courier, survey, assay and excursion jobs track exact planets and remaining objectives. Assays consume four real tons of Metal; tours reserve a berth through all stops and return. Older saved jobs without an exact planet keep their system-level completion rule.

Travel days advance on jumps, fuel collection and rescue, not repeated launch/landing. The default mortgage uses 0.08% daily interest and 365 payment days. Wages settle first; full mortgage installments improve credit by one, misses lower it by five and accrue interest. Debt-free days rebuild credit; scores range from 200 to 800.

Borrowing uses 100 days of operating receipts minus commodity purchases and crew wages, treating unrecorded days as zero. Asset sales and loan disbursements don't count. The limit is 65% of annualized average income minus debt, rounded down to 100 cr and capped at 2.5 million cr. Ratings below 300 cannot borrow. Eligible daily rates are 0.04–0.08%, blended with existing debt; a loan spreads repayment over 365 travel days. These formulas and prices are browser-game adaptations.

Outfit storage is keyed to an exact inhabited planet. Reinstalling preserves damage and fuel and checks capacity. Built-in equipment stays with its hull; mission-owned prototype systems cannot be sold or stored to evade return requirements. Old saves receive empty storage and default credit data without fabricated income history.

## Native mission interpreter and limits

`SourceMissionEngine` mutates `state.sourceQuests`; the host applies returned resource and world effects once. `available/offer/accept/choose/complete/abort` handle native offers, dialogue and completion. `notify` accepts travel, daily and actor-specific events; kills, scans, boarding, assistance and escort arrivals must identify the mission and actor. Global kills cannot complete unrelated objectives.

The interpreter supports condition arithmetic without eval (including `>?=`/`<?=`), location filters, choices/labels, deadlines, cargo/bunk reservation, scheduled events, source actions and scoped NPC objectives. As in Endless Sky: `on offer` actions run once per offer even if its conversation is left and reopened; `launch` accepts and `depart` defers; aborting runs `on abort` (or `on fail` without one) and records both `aborted` and `failed`; a capture also counts as a kill; NPC actions run once every ship in the group has the event; `on enter`, `on waypoint` and `on stopover` fire once; and deadlines and payments use the greedy jump tour through every waypoint and stopover. An offer whose acceptance fails after its conversation closes as deferred. Calendar dates begin 16 November 3013. The authored campaign is condensed; random native destinations are deterministic, some calendar delays are compressed, and optional native conversations and behavior details remain incomplete.

Native roots using `timer`, `stealth`, `infiltrating` or `transition` are guarded rather than silently completed. The original audit counted 77 such definitions; absence of those keywords does not certify the other missions. Illegal-cargo enforcement, some condition providers/phrases, covert actions and invisible chains are not a complete native-engine port. Authored missions separately implement selected cloak, survey, capability and protected-convoy objectives.

Model tests use explicit simulated combat/arrival receipts. Browser tests cover representative physical journeys and interactions; neither claims every original mission or every world was manually traversed. Historical exhaustive source mappings and evidence remain in [the previous repository revision](https://github.com/michaelcrosato/meridian-wake-g6a/tree/19e49a23f4ce9e41c3d937a73e6a9973cf3b49fd/docs).
