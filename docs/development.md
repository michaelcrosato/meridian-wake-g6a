# Development

Vite and vanilla JavaScript; no runtime backend. `src/main.js` owns the interface, `game.js` and its method modules validate serializable rules, and `scene.js`/`physics.js` render and simulate the flight world. Model events and renderer interactions are verified separately.

## Routine checks

- `npm test`: game, campaign, source interpreter, physics, rendering helpers, controls, banking/storage and audio-loading tests.
- `npm run test:e2e`: production build and real Chromium UI journeys, including native contacts, convoy arrival, cloak use, audio, save/recovery, controls and mobile layout.
- `npm run verify:source`: imported declaration/provenance checks, audio checksums and decoding; needs `ffprobe`.
- `npm run check:size`: build-output budgets, asset integrity and repository/build size summary; run after building.
- `npm run test:compat`: optional browser/viewport audit; see [compatibility](compatibility.md).

Use `artifacts/` or `.cache/` for captures and measurements. Both are ignored, as are `dist/`, dependencies and Playwright output. Keep durable instructions and required fixtures; don't commit successive run logs, complete browser installations, or old screenshots. Git history and CI artifacts retain prior evidence.

## Generated data

The full upstream data and adapted universe are losslessly gzip-compressed in `src/source-data.json.gz` and `src/universe.json.gz`. Their small `.js` entry points decode snapshots for Node tests and generators. Vite's `dataSnapshotsPlugin` expands them to ES modules at build/dev time, preserving tree-shaking, the public exports and lazy native-Contacts loading. Each large export is emitted as a pure `JSON.parse` string, which V8 parses about twice as fast as an equivalent object literal (the startup universe chunk measured 56 → 23 ms, the Contacts archive 350 → 140 ms on desktop) for about 1.5% more gzip. The browser does not download or decode the repository snapshots. Changes to a snapshot invalidate Vite's module cache.

`source-import.mjs` and `generate-universe.mjs` write these snapshots; see [content](content.md). Neither normal builds nor tests require network access to upstream. Snapshot compression is deterministic for the same data and encoder. Source lines, dialogue, mission conditions and all original attributes remain intact.

## Assets and caching

- Full-character Lato WOFF2 fonts are imported through CSS and get Vite content hashes. No character subset is removed. `font-display: swap` keeps text visible while fonts load.
- `scripts/audio-assets.mjs` converts the pinned originals to lossless FLAC effects and Ogg Opus ambience (48 kbps mono music, 64 kbps stereo port ambience). It verifies original checksums before conversion, records output checksums separately, and names outputs with a content hash. `node scripts/audio-assets.mjs` fetches missing originals into ignored `.cache/audio-originals/`; FFmpeg with libopus is required only for regeneration.
- Muted sessions request no audio. Unmuting loads short effects and the selected ambience. Concurrent requests are shared, old scene requests cannot replace newer music, and decoded buffers are reused.
- `rapierAssetPlugin` externalizes the pinned compatibility package's inline WASM to a hashed asset. It checks that the inline bytes match the package's `.wasm` byte for byte and fails explicitly if a dependency upgrade changes the initializer. The built HTML preloads the WASM at low priority with attributes matching wasm-bindgen's `fetch()`, so it downloads alongside the scripts, and `createScene` starts Rapier's compile before awaiting the graphics device. Node tests retain the package's normal entry. No physics code or dependency version is changed.
- Vercel serves hashed `/assets/` and audio files with immutable browser caching. HTML, the audio manifest and the source catalog retain normal revalidation. Vercel handles HTTP compression; no duplicate `.gz`/`.br` deployment copies are generated.
- `.vercelignore` excludes local audit caches, documentation, tests and test-only tooling from CLI uploads. `dist/` contains only application assets and dependency license notices. The build helper scripts and compressed source snapshots remain included as build inputs.

The optional native mission archive remains the largest application chunk. It is functional content, loaded only when opening Local contacts; the source inventory is fetched only when opening the source archive. Size optimization must preserve those features and their source attribution.

## Regeneration tools

Existing screenshots in the README use WebP. For replacements: `cwebp -q 82 -m 6 input.png -o docs/images/title.webp`. Keep only useful current illustrations.

Full-font conversion (fontTools with Brotli):

```sh
fonttools ttLib.woff2 compress input.ttf -o output.woff2
```

For headless graphics checks, Chromium can use software WebGL2. Hardware WebGPU screenshots on Linux may require a private Xvfb display; a headless WebGPU canvas can appear black. Software-rendered timing does not establish hardware performance.

## Size baseline and verification

The 27 September 2026 lean pass was measured against Git revision `19e49a2`. Decimal MB below describe current files, not Git's retained history.

| Measure | Before | After |
| --- | ---: | ---: |
| Tracked working tree | 31.0 MB | 8.5 MB |
| Static production build | 28.4 MB | 22.3 MB |
| Initial JavaScript | 7.91 MB | 3.80 MB |
| Audio assets | 5.93 MB | 2.41 MB |
| Fonts | 1.31 MB | 0.42 MB |

The initial JavaScript reduction includes moving 3.08 MB of identical WASM into its own file. Comparing **JavaScript plus WASM**, estimated gzip transfer fell from 2.53 MB to 2.10 MB (about 17%); this is a local compression comparison, not a measured Vercel transfer. The optional native Contacts archive remains lazy. Historical audit/tool caches also freed about 3 GB locally, separately from tracked repo/build savings.

Verification: 186 unit tests passed; all 20 browser scenarios passed across the full run and targeted reruns after fixing a loading-test selector and mute scheduling. Source/universe exports compared exactly with the prior revision, including after regeneration. All nine effects have bit-identical decoded PCM; both fonts retain all 2,164 Unicode characters. Audio regeneration reproduces its manifest and output hashes. Size budgets, source/audio verification and documentation links pass. Production and development startup were visually checked with the external WASM asset.
