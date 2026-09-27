# Verification evidence

Generation date: **2026-09-26** (America/Vancouver). Model: **GPT-6 Astra (g6a)**.

## Reproducible checks

The release was installed from its lockfile with `npm ci`: 20 packages installed, 21 audited, zero reported vulnerabilities. `npm test` passed **139/139** tests, with no failures or skipped tests. `npm run build` produced the static Vite `dist/` artifact successfully.

The node suites cover the real game rules, both Free Worlds branches, all major expanded routes and branch choices, source provenance/conditions/conversations/events, exact scoped NPC interactions, protected convoy damage/disable/assist/arrival/loss/retry, equipment/ammo/fleet/minerals/capability gates, required planet visits, saves, physics interpolation/body limits/cleanup, projectile authorization, source hull identity and special landmarks. Regression checks include accumulation at 120 Hz under repeated pause calls and upgraded ship speeds above 40 world units/second.

The [earned model voyage](model-voyage.json) starts with a Sparrow, 24,000 credits and the normal loan; buys a Mule for 758,100 earned credits; completes 41 Reconciliation stages and 313 selected side stages across all 44 arcs; and performs 1,380 jumps across 2,196 game days. No credits or progression flags are injected. The alternate Checkmate traversal completes 38 stages and its distinct settlement. **Combat and protected arrival events in model tests are simulated.** These results establish economic/narrative reachability, not a manual playthrough of every battle.

`node scripts/verify-source.mjs` verifies all 204 imported source files against the independent catalog, map links, representative ship/outfit values, native mission nodes, and all eleven audio checksums and decodes. [Captured source verification](source-verification.json) retains exact counts and provenance.

## Browser checks

Production-preview Playwright Chromium tests exercise actual controls and read-only runtime diagnostics. All nine release scenarios passed through actual browser input:

1. Start a captain, accept James's passage, jump to Arcturus, fly/dock, complete the mission, reload and continue the actual saved progress.
2. Buy/sell cargo, browse local equipment, change rendering settings, reject malformed saves and search the source archive.
3. Portrait touch flight and map navigation without horizontal overflow.
4. The original native James conversation, acceptance, berth reservation, travel and original completion action.
5. Import an earned epilogue checkpoint, complete New Horizon, view results and continue the sandbox. This verifies the ending boundary rather than replaying all preceding combat.
6. Decode all eleven audio assets; confirm running AudioContext, volume gain, mute, port soundscape, fullscreen enter/exit and an actual save download.
7. Landscape touch steering, thrust and firing with three simultaneous touch contacts; verify release and cancellation, visibility of boost/secondary/cloak and no horizontal overflow.

8. Import the earned Algenib checkpoint, evade incoming fire, engage the fitted cloak, consume fuel and power, remain cloaked for the actual eight-second objective, land and complete the operation. Existing projectiles can break the cloak; the flight test evades and re-engages it if necessary.
9. Import the earned Dabih checkpoint, jump to Tarazed with six named protected ships, survive physical combat, wait for every ship to arrive, land at Wayfarer and complete the convoy assignment.

Staged checkpoints are generated through actual game actions; browser tests import them through the normal Options interface. Runtime diagnostics expose snapshots and telemetry, not gameplay cheat commands.

Earlier focused browser checks also verified exact native Lost Boy boarding versus unrelated actor rejection, correct-versus-wrong cargo scan targets, unsuccessful capture preserving the actor, finite missile magazines, same-system save import resetting destroyed actors, and physical faction-specific hulks. These observations complement the checked-in regression suites; they do not assert full browser play of all 2,344 native mission definitions.

## Rendering and performance

The same Three.js WebGPURenderer scene, node materials and RenderPipeline run on both backends. WebGL2 observations arise from automatic fallback when WebGPU is unavailable. WebGPU visual verification uses Chromium with software Vulkan on private Xvfb. Linux headless WebGPU can capture a black compositor canvas, so those visual checks use a private headed display.

Recorded screenshots: [desktop title](images/title.png), [actual flight](images/flight.png), [landscape touch](images/touch-landscape.png), and the [WebGPU High stress scene](images/webgpu.png). The final WebGPU High smoke used the same twelve-hostile stress fixture: actual landing-assist input moved the flagship from (12, 14) to (12.009, 0.830), while enemies continued combat; zero page errors and an empty console were observed. Separate renderer checks observed source gas giants, stellar gardens, stations and ringworlds on both WebGPU and WebGL2 with no page errors. High enables GTAO/bloom and larger shadows; Balanced lowers resolution/effects/density/body limits while preserving the geometry and palette. Auto transitions are measured from sampled frame intervals and were observed under slow software rendering.

A hardware-accelerated 1920×1080 title sample on an NVIDIA GeForce RTX 4070 SUPER, exposed through Mesa D3D12 / ANGLE OpenGL on WSL2, recorded 592 frames over approximately ten seconds: mean **16.913 ms**, median **16.7 ms**, p95 **16.7 ms**, p99 **33.3 ms**. Auto selected High. The same hardware path showed working physical movement after the fixed-step pause correction.

The final twelve-hostile combat samples used the same hardware at 1920×1080, with a staged Quarg Hydra flagship and twelve Kor Mereti enemies. This is a rendering stress fixture, not earned progression. [Machine-readable performance evidence](performance-evidence.json) records renderer identity and scope.

| Preset | Frames / about 10 seconds | Mean frame time | p95 | Bodies | Active simulation evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| Balanced | 601 | 16.666 ms | 16.7 ms | 29 / 42 | Twelve enemies; 46 point-defense interceptions during the sample |
| High | 588 | 17.035 ms | 16.8 ms | 41 / 76 | Twelve enemies; 40 point-defense interceptions during the sample |

Both fresh imports remained responsive with enemy movement/fire and no page errors. An earlier WSL D3D12 import attempt stalled automation; it did not reproduce in these final hardware tests or the matching software WebGL2 tests. These finite samples establish approximately 60 fps for this tested desktop workload, not every device or scene.

## Limits and reproducibility

- Browser E2E tests use software Chromium, so their timing is functional evidence rather than a physical-device frame-rate claim.
- No physical phone was available. Portrait/landscape layouts and actual browser touch dispatch were tested in emulation; physical phone thermal behavior and sustained frame rate remain unmeasured.
- Hardware WebGPU performance was not measured. Software Vulkan proves backend rendering/behavior for the tested scene, not hardware performance or universal browser support.
- Performance captures are finite samples on one desktop configuration. They are not an exhaustive benchmark of every possible late-game fleet, screen resolution or driver.
- The production build reports large chunk warnings for Rapier, the universe and the full source archive. The archive/interpreter load lazily for native Contacts; all assets are local static files. Build warnings do not indicate a failed build.

Run `npm ci`, `npm test`, `npx playwright install chromium`, `npm run test:e2e`, and `node scripts/verify-source.mjs`. The GitHub workflow runs the same install, model tests, production build and all nine browser checks on every push/PR. Vercel import uses the checked-in Vite/`dist` configuration and needs no secrets or provisioned backend.

## Published deliverable

The release repository is [michaelcrosato/meridian-wake-g6a](https://github.com/michaelcrosato/meridian-wake-g6a). [GitHub CI](https://github.com/michaelcrosato/meridian-wake-g6a/actions/workflows/ci.yml) runs the checked-in verification workflow against published revisions. The repository contains the application, original audio manifest/attribution, pinned source data, tests, generated evidence, setup instructions and completion report.

The supplied Vercel configuration is import-ready. No Vercel deployment was requested or performed; importing the repository builds and hosts its static `dist` output.
