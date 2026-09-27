# Wiki-driven content expansion

Requested scope: use the [Endless Sky wiki](https://github.com/endless-sky/endless-sky/wiki) to flesh out existing content and add missing playable content to Meridian Wake.

Research baseline: wiki repository revision `f243678789e0c7b179793697ae39bb7d00cf89d2`, inspected 27 September 2026. Game data remains pinned to its existing revision. The wiki is a mixture of player documentation, setting material, authoring instructions, and explicitly non-canonical story ideas. Its development roadmap is not a promise that every proposed upstream feature belongs in this adaptation.

## Findings and work

| Area | Observed gap | Work / verification needed |
| --- | --- | --- |
| Regional setting | Imported planet descriptions existed, but no readable regional or historical guide | Implemented eight regional guides, six organization profiles and nineteen historical entries. Search/category filters, source links, calendar dates and discovered alien dossiers are in `field-guide.js` and `wiki-content.js`. |
| Spaceport life | Native spaceport descriptions were imported but not displayed; no news/concourse | Concourse displays the selected planet's source spaceport prose, 24 regional civilian voices (plus three fallback voices), and conditional cooperative/research/peace notices. Voices rotate with travel days and remain stable on redraw/reload. |
| Freelance work | Three generic templates; deliveries accepted any planet in a system | `freelance.js` supplies seven kinds with local employers and descriptions, exact planets, fresh scans, material consumption and tour stops. The journal lists remaining objectives and route buttons. |
| Small human stories | Large campaigns dominated the available side stories | `wiki-stories.js` adds four original civilian arcs, 12 stages and eight final outcomes. All branches traverse from starter captains in rules tests; browser traversal covers the first harvest stage. |
| Bank | Repayment and interest existed; daily repayments, credit rating and qualifying borrowing were missing | `bank.js` implements daily amortization, paid/missed statements, rating changes, rolling operating income and borrowing. Fleet & bank exposes balances, charges and explicit loan actions. |
| Outfit storage | Selling worked; permanent planet-local storage was missing | `outfit-storage.js` stores/reinstalls/sells individual upgrades at their actual planet. Local and remote holdings are visible at the outfitter. Capacity, duplicate, prototype-loan and resource constraints remain enforced. |
| Guide and fidelity | Reference inventory alone did not explain what players could actually do | README, attribution and this record distinguish source grounding, new writing and game-rule adaptations. Validation is recorded below. |

This is an expansion of an existing adaptation, not a verbatim port of every native mission or the wiki's authoring syntax. Existing campaign/source-runtime limits remain documented in `source-runtime.md` and `completion-audit.md`. Evidence below will be updated from actual checks, not inferred from data counts.

## Sources

- [HumanSpace](https://github.com/endless-sky/endless-sky/wiki/HumanSpace): civilian experience in the Core, Deep, Paradise Worlds, Dirt Belt, Rim, pirate worlds and Earth.
- [MajorOrganizations](https://github.com/endless-sky/endless-sky/wiki/MajorOrganizations): Parliament, Navy, Republic Intelligence, Syndicate, Southern Mutual Defense Pact and known alien contacts.
- [HistoricalTimeline](https://github.com/endless-sky/endless-sky/wiki/HistoricalTimeline): public human history known at the 3013 start, not omniscient campaign spoilers.
- [CreatingNews](https://github.com/endless-sky/endless-sky/wiki/CreatingNews): planet-bound voices and location/condition-dependent spaceport encounters.
- [PlayersManual](https://github.com/endless-sky/endless-sky/wiki/PlayersManual): transport contracts, credit, daily expenses and local outfit storage.
- [CreatingMissions](https://github.com/endless-sky/endless-sky/wiki/CreatingMissions) and [StyleGoals](https://github.com/endless-sky/endless-sky/wiki/StyleGoals): objective tracking, choices and nuanced civilian perspectives.

New dialogue, job templates and civilian stories are original adaptations. They are not represented as upstream mission scripts. The wiki's StoryIdeas page explicitly calls its proposals non-canon; none are treated as established history here.

## Playable stories

| Arc | Actual objectives | Final decision |
| --- | --- | --- |
| The price of a harvest | Deliver pump parts to New Greenland; carry an assembly home with stamps from both exact planets; resolve a shipping agreement at New Boston | Independent cooperative and public notice, or guaranteed broker terms with a 2,000 cr bonus |
| A science worth sharing | Deliver instruments and scan Aludra; carry a researcher to Valhalla while freshly scanning both systems; return the results to Midgard | Public research notice, or exclusive laboratory funding with a 3,000 cr bonus |
| A uniform and a promise | Transport a Humanitarian Corps volunteer and supplies to Glaze; take a civilian medical worker to New Boston; return the relief report | Public joint credit or a quieter civilian report |
| The distance from home | Bring recording equipment to Earth; physically land on Luna and Mars with the archivist and return; deliver the exhibition to New Boston | Traveling public exhibit or a sponsored presentation with a 2,500 cr bonus |

All choices persist as flags and journal outcomes; cooperative and open-research choices additionally change concourse notices. Story offers use the existing remote briefing model and can be accepted from any port. No new upstream mission IDs, protected NPCs, original characters or canonical events are claimed. Jobs and civilian missions can share capacity with the existing main story, subject to its normal limits.

## Rules and migration

- New transport contracts have exact planet destinations; old saved jobs without a planet retain their original system-level completion rule. IDs include origin planet and day, so different ports in the same system no longer share one board identity.
- Surveys require scans made after acceptance. Prospecting accepts mined or purchased Metal, requires the stated survey, and consumes four tons on return. Sequential settlement prevents multiple contracts consuming the same metal. Tours need actual landings at every listed stop and the origin; just jumping through does not count. Deadlines, cargo/bunk reservation, abandonment and reloads apply to every kind.
- The adaptation keeps its existing travel clock: jumps, fuel collection and rescue advance days; merely reopening a port or repeatedly launching/landing does not. This differs from the original manual's departure-day clock. The default mortgage uses 0.08% daily interest and 365 payment days. Wages settle first. An affordable installment pays interest and principal; an unaffordable installment remains unpaid, interest accrues, and rating falls five points. Full installments raise rating one point. Debt-free days also allow recovery. Scores range from 200 to 800.
- New borrowing uses 100 days of recorded operating receipts minus commodity purchases and crew wages; unrecorded days are zero. Asset liquidation and loan disbursement do not count. The limit is 65% of annualized average income, less outstanding debt, rounded down to 100 cr and capped at 2.5 million cr. A rating below 300 prevents new borrowing. Daily rates range from 0.04% to 0.08% for eligible captains, blended with existing debt. Taking a loan resets repayment spread to 365 travel days. These are disclosed game-economy rules, not original Endless Sky prices/formulas.
- Storage contains only removable purchased/awarded upgrades; the adaptation's built-in hull equipment remains intact. Storage is keyed by the exact planet, survives changing ships and save/load, requires an inhabited port, and does not teleport items between worlds. Reinstallation checks available space and does not heal hull/shields or refill resources. Mission-owned prototype systems cannot be sold or stored to evade return requirements.
- Older version-2 saves acquire an empty storage ledger and default bank account with their existing debt intact. Historical earnings are not converted into invented daily records. New account and storage fields are validated on import. No live external wiki fetch, account or network service is needed to play.

## Verification

- `node tests/wiki-content.test.js`: 16 passing checks, including real action-driven travel through both branches of all four arcs; exact planet deliveries; fresh surveys; real material consumption; tour return, expiry, capacity and save/load. Model travel helpers supply landing/kill receipts and do not claim renderer flight coverage.
- `node tests/port-services.test.js`: 12 passing checks for payment math, missed payments, wages priority, multiday consistency, borrowing, income expiry, anti-churn accounting, storage locality, capacity, duplicate transactions, repair prevention, prototype protection and old/malformed saves.
- `npm test`: repository rule/physics/rendering/source suites pass with the new content and bank behavior. Existing wage checks now account explicitly for the separate mortgage payment.
- `npm run test:e2e`: **19/19 passed** in the final full browser run (5.8 minutes). Coverage includes the concourse/guide at desktop and 390×844, search/category filtering, save/resume, physical survey round trip, first harvest-stage delivery, and bank/storage service transactions. The banking scenario first earns qualification through nine model delivery trips, then uses real browser controls to borrow, repay, buy, store, reinstall and sell. Existing campaign, convoy, cloak, touch, input, audio and recovery scenarios also passed. A final storage-row icon/layout correction was additionally checked through the full store/reinstall/sell interaction using agent-browser on the current dev build, with no browser errors.
- `npm run build`: succeeds. The existing large generated universe/source chunks still trigger Vite's size advisory; this expansion does not claim to remove that pre-existing limitation.

- Whole-world contract audit: **420 inhabited ports**, **4,561 generated offers** on the sampled day, all with valid exact destinations. Every generated survey/tour return leg has a route. This verifies generated references and reachability, not physical traversal of all those offers.
- A separate action check stored a Cargo Scanner at New Boston, purchased a Shuttle through normal trade-in, and reinstalled that scanner on the new flagship without payment or duplication.
- `node scripts/verify-source.mjs`: source inventory and unchanged audio integrity/decoding passed.
- Biome checks pass for all new JS modules/tests; `git diff --check` passes. The existing main/style files retain their pre-existing advisory lint findings.

Screenshots: [desktop concourse](images/wiki-concourse-desktop.png), [mobile field guide](images/wiki-guide-mobile.png), [bank](images/wiki-bank-desktop.png), [outfit storage](images/wiki-outfit-storage.png).

The requested wiki enrichment and playable additions are implemented and verified against the areas in the table above. These checks demonstrate the authored additions, not universal parity with every original mission, wiki proposal, native event or browser/device.
