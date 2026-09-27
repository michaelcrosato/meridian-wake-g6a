# Meridian Wake

A three-dimensional, brick-built browser reimagining of **Endless Sky**. Start with a small ship and a bank loan. Carry passengers, trade commodities, mine asteroids, equip a better ship, command escorts, and take a side in the Free Worlds story. Keep exploring after the ending.

![Meridian Wake title and brick-built spacecraft](docs/images/title.png)

**Generated:** 26 September 2026. **AI model:** GPT-6 Astra (`g6a`). The generation record also appears on the title and About screens.

[GitHub build checks](https://github.com/michaelcrosato/meridian-wake-g6a/actions/workflows/ci.yml) · [Completion report and coverage](COMPLETION_REPORT.md)

The authoritative source is [endless-sky/endless-sky](https://github.com/endless-sky/endless-sky), pinned to [3248c43994eb3d545265366c8eba909a6646f4d2](https://github.com/endless-sky/endless-sky/tree/3248c43994eb3d545265366c8eba909a6646f4d2). This is an independent adaptation, with original geometry, interface, mission prose, and browser game rules. See [the completion report](COMPLETION_REPORT.md) for the distinction between implemented behavior, adapted content, and source inventory.

## Run locally

Node.js 24 LTS is recommended. All direct dependency versions and the complete dependency graph are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Use a current browser with WebGPU or WebGL2 and hardware acceleration. No account, backend service, environment variables, API key, or external game-data service is required.

```sh
npm run build
npm run preview
```

The production artifact is `dist/`. All fonts, audio, and source metadata are hosted with the game.

## Deploy to Vercel

Import this GitHub repository into Vercel. The checked-in `vercel.json` selects Vite, runs `npm run build`, and publishes `dist`. Accept the detected settings; no environment variables or other manual configuration are needed. The same `dist` directory can be hosted by any static web server.

## Play

Choose the Sparrow, Shuttle, or Star Barge. Read the first transmission at New Boston's spaceport and accept it. Depart, open the starmap, select Arcturus, and jump to New Greenland. Press **L** for an assisted landing, then complete the mission at the port. The story and freelance work can be pursued in parallel.

| Desktop control | Action |
| --- | --- |
| W / Up | Thrust |
| A / D, Left / Right | Rotate |
| S / Down | Brake |
| Space | Fire primary weapons |
| F | Fire selected secondary weapon |
| C | Toggle an equipped cloak |
| T | Select a mission contact |
| Shift | Boost |
| L | Land / launch |
| M | Starmap, route planning and jump |
| E | Ship operations |
| B | Board a disabled ship |
| G | Harvest stellar fuel with a Ramscoop |
| R | Survey the system / scan the selected ship |
| J | Mission journal |
| I | Ship equipment and cargo |
| Escape | Pause / close panel |

Touch screens have simultaneous steering, thrust, brake, boost, primary/secondary fire and cloak controls, plus the same map, port, and operations interfaces. Portrait and landscape layouts preserve these decisions. Menus pause flight. A full handbook is accessible from the title and flight HUD.

Ports provide contracts, trading, local shipyards, outfitters, fleet services, and loan repayment. Interstellar travel costs fuel and advances the day; contracts have deadlines. Ship capacity, equipment space, energy, cooling, and crew costs affect your choices. Defeated enemies leave physical hulks that can be approached, boarded or captured. Protected convoys must survive and arrive; disabled allies can be assisted. Specialized ships and outfits enable gas-giant, stellar-garden, wormhole and cloaked expeditions. Rescue preserves your story after a defeat or fuel shortage.

Progress autosaves to this browser's local storage. Options provides JSON save export/import, volume, mute, fullscreen, and diagnostics. A new captain replaces the local autosave; export a backup first if you want to retain an older voyage.

## Rendering and simulation

- Vite **8.3.1**, Three.js **0.186.1**, Rapier **0.21.0**.
- `WebGPURenderer` from `three/webgpu`, with automatic WebGL2 fallback. Both backends render the same scene and materials.
- TSL/node PBR materials, procedural HDR environment, faceted geometry, directional shadows, node bloom, and GTAO in High quality. Three r186 calls its node post-processing pipeline `RenderPipeline`.
- Four-sample antialiasing. High and Balanced change pixel ratio, shadow resolution, AO/bloom, asteroid density, particle counts, and active physics limits.
- Auto chooses from measured frame time with hysteresis. It does not inspect device names or user agents. Diagnostics reports backend, effective preset, frame time, and body count.
- Rapier runs fixed 1/60-second steps with interpolated positions. The world uses simple spherical colliders, bounded mass, friction and restitution, continuous collision detection, explicit removal, and preset body caps.

## Verification

```sh
npm test
npm run test:e2e
node scripts/verify-source.mjs
npm run build
```

The source/audio verifier also uses `ffprobe` from FFmpeg. Browser tests use Playwright Chromium. If its browser is not installed, run `npx playwright install chromium` once. The browser checks follow actual UI actions through starting a captain, accepting a mission, traveling, landing, completing it, saving/reloading, trading, equipment browsing, original native dialogue, touch controls, audio/fullscreen/save export, and the earned epilogue boundary. Physics and game-rule tests exercise state invariants and complete campaign routes independently.

For Linux WebGPU visual testing without a physical desktop, use a private Xvfb display. Headless Chromium can produce black WebGPU screenshots even when rendering works. WebGL2 fallback can be tested in ordinary headless Chromium. See [verification evidence](docs/verification.md) for the checked build's results and limitations.

## Source content and provenance

[Source audit](docs/source-audit.md) contains the full file-level checklist, major story families, source references, and player-feedback notes. `public/source-catalog.json` lists every source declaration with its location and SHA-256 evidence. The in-game Galaxy Archive exposes that inventory; an archive entry alone does not establish playable implementation.

To regenerate the source inventory at the pinned revision:

```sh
node scripts/source-import.mjs
node scripts/source-import.mjs --audio
node scripts/verify-source.mjs
```

## Placeholder audio

All audio loads through **`public/audio/manifest.json`**. Replace a manifest URL/file to swap placeholders without editing playback code. The manifest stores exact revisioned URLs, original paths, byte counts, SHA-256 hashes, authors, and licenses.

The requested Sounds Resource and Zophar sites did not yield a verifiable Endless Sky download. The user approved unmodified audio from the official Endless Sky repository as the replacement on 26 September 2026. The `music` slot uses the source's ambient soundscape rather than a composed musical score. [Research evidence](docs/source-audit.md#audio-portal-research-and-fallback).

| Manifest ID | Local placeholder | Original source | License |
| --- | --- | --- | --- |
| laser | `/audio/laser.wav` | [sounds/blaster.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/blaster.wav) | Public domain; unmodified |
| hit | `/audio/hit.wav` | [sounds/crunch.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/crunch.wav) | Public domain; unmodified |
| explosion | `/audio/explosion.wav` | [sounds/explosion small.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/explosion%20small.wav) | Public domain; unmodified |
| jump | `/audio/jump.wav` | [sounds/hyperdrive.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/hyperdrive.wav) | Public domain; unmodified |
| land | `/audio/land.wav` | [sounds/landing.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/landing.wav) | Public domain; unmodified |
| launch | `/audio/launch.wav` | [sounds/takeoff.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/takeoff.wav) | Public domain; unmodified |
| click | `/audio/click.wav` | [sounds/ui/click soft.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/ui/click%20soft.wav) | Public domain; unmodified |
| error | `/audio/error.wav` | [sounds/ui/fail.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/ui/fail.wav) | Public domain; unmodified |
| reward | `/audio/reward.wav` | [sounds/ui/target.wav](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/ui/target.wav) | Public domain; unmodified |
| music | `/audio/music.mp3` | [sounds/ambient/rulei space.mp3](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/ambient/rulei%20space.mp3) | Public domain; unmodified |
| port | `/audio/port.mp3` | [sounds/ambient/machinery.mp3](https://raw.githubusercontent.com/endless-sky/endless-sky/3248c43994eb3d545265366c8eba909a6646f4d2/sounds/ambient/machinery.mp3) | Public domain; unmodified |

Attribution: Various / Endless Sky contributors. The upstream copyright declaration and credits are preserved in `licenses/`. This build is intended for internal, non-commercial testing. See [third-party notices](THIRD_PARTY_NOTICES.md).

## License

GPL-3.0-or-later for the game and adapted source data; individual third-party assets retain their recorded licenses. Lato is licensed under the SIL Open Font License, preserved in `public/fonts/LICENSE.txt`.
