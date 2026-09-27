# Source mission runtime

`src/source-missions.js` interprets original `MISSION_DATA` separately from the authored compact campaign. It does not count catalog entries as completed gameplay.

Use `new SourceMissionEngine()`. The engine mutates **only `state.sourceQuests`**, and commands return `{ok, message, effects, dialogue?}`. The host applies resource/world effects once. Context keys: `planetName`, `systemName`, `day`, `credits`, `cargoFree`, `bunksFree`, `outfits` (source-name/count map), `shipAttributes`, `reputation`, `conditions`, `shipName`, optional `combatRating`.

- `available(state, context, location='spaceport')` returns matching offers. Location may be `job`, `landing`, `entering`, `boarding`, `assisting`, `shipyard` or `outfitter`.
- `active(state, context)` returns active descriptors. Reserve their `cargo` and `passengers` in the host's capacity calculations.
- `offer(state, context, id)` / `accept(...)` opens the original offer conversation or accepts directly.
- `choose(state, context, index)` follows a displayed native choice/label. Dialogue is `{missionId,text,options:[{index,text}],terminal}`. Do not infer acceptance merely from opening the conversation.
- `complete(state, context, id)` requires the exact destination planet, visited waypoints/stopovers, mission conditions and actor objectives.
- `notify(state, context, event)` handles `enter`, `land`, `daily`, and NPC events. NPC events must supply `missionId` and `npcId`; unrelated kills cannot fulfill a mission. Types include `kill`, `disable`, `board`, `assist`, `scan cargo`, `scan outfits`, `capture`, `provoke`, `accompany`, `evade`, `destroy`. Destroying a protected actor fails its mission. Accompany objectives require the escort's actual arrival.
- `abort(state,context,id)` triggers source abort/fail behavior.

Effects include payment/fine/debt `{amount}`, outfit `{name,count}`, reputation `{faction,value}`, ship `{operation,name,count}`, world `{node}`, log/dialog/message `{text}`, failed `{id,reason}`, death, and explicit unsupported-action/event diagnostics. World patches are retained and affect the interpreter's government/attribute filters and link routing. The host must also apply them to its actual map, faction state, sales and rendering. Calendar dates use the source's default 16 November 3013 start.

The interpreter supports safe arithmetic/conditions (no eval), nested AND/OR, native mission state flags, spatial filters, deterministic destination selection, cargo/passenger reservation metadata, deadline semantics, source payment formulas, named/inline conversations, choices, labels, conditional text, native actions, scheduled events and actor-specific objective tracking. Exact original source fixtures cover Pact reconnaissance and the Free Worlds prisoner alternative.

## Remaining behavior gaps

77 of the 2,344 imported definitions contain guarded root features (`timer`, `stealth`, `infiltrating` or `transition`); acceptance rejects those missions until those behaviors are connected. The count **does not mean the other 2,267 missions are verified playable**. Whole-arc progression still depends on host hooks, invisible support missions, condition providers, NPC spawning/despawning and resource/world effects.

Notable guarded source IDs include `Remnant: Cognizance 33`, `Successors: Kaatrij First Contact 1`, `Successors: Ghosts 7a`, `Successors: Ghosts 7b`, `Successors: Ghosts 15`, `Successors: Unified Defense`, `Wanderers: Mereti Observation`, `Wanderers: Mind 5`, `Wanderers: Sestor Scanning`, `Wanderers: Sestor: Factory 1`, `Wanderers: Sestor: Factory 2`, `Ka'het: Lightning in a Bottle 1`, Drak guardian missions, and many human smuggling jobs. No Free Worlds file has one of these four guarded root features.

Other fidelity boundaries: fleet definitions are represented as encounter groups rather than full native fleet composition; distribution-based cargo quantities use their base quantity; filtered destinations are deterministic; special condition providers and phrase expansion are incomplete; illegal-cargo scanning, clearance, salaries, covert actions, dynamic NPC triggers and automatic invisible support chains need host-level work. Certain presentation-only native actions are deliberately omitted (native scenes/music/markers); they must not be confused with mission fulfillment.

Run `node --test tests/source-missions.test.js`. Thirteen tests cover source conditions, arithmetic safety, filters, capacity, transactions, branching/defer, exact routes/stopovers, native payment/deadline formulas, scoped combat and escort loss, events, save/load, native dialogue and map changes. These tests verify the interpreter behaviors they exercise, not every source storyline.
