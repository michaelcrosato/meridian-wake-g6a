# Browser verification

Use current browsers with WebGPU or WebGL2 and hardware acceleration. WebGL2 is the renderer fallback. Keyboard, remapped controls, simultaneous touch and standard gamepads are supported; text entry and browser permission actions may still require a keyboard, click or tap.

```sh
npm run test:e2e
COMPAT_BROWSER=chrome npm run test:compat
COMPAT_BROWSER=firefox npm run test:compat
COMPAT_BROWSER=webkit npm run test:compat
```

Other browser selections: `chromium`, `edge`, `opera`. Install the requested browser/Playwright engine first. `COMPAT_EXECUTABLE` selects a custom executable; `COMPAT_HEADED=1` uses a visible browser under a private Xvfb display. `COMPAT_URL` selects an existing deployment. Artifacts go to ignored `artifacts/compatibility/`.

The browser matrix checks actual opening-voyage/economy/audio/save interaction, eleven viewports, keyboard remapping and focus behavior. The main suite additionally checks source dialogue, protected convoy arrivals, cloaking, loss/recovery, simultaneous touch, gamepad input, banking/storage and the wiki stories. Muted play downloads no audio; unmuted play loads nine short effects plus the selected ambience. The main audio journey switches scenes and checks decoding of all eleven files.

Audio effects are lossless FLAC. Ambient tracks use Ogg Opus, supported by current Chromium/Firefox and Safari 18.4+ on corresponding operating systems ([WebKit release notes](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)). Font delivery uses full-character WOFF2. Browser decoding and real playback remain part of verification after changing these assets.

Native Safari and vendor Firefox can be tested with `scripts/audit-webdriver.mjs`; native iOS simulator checks use `scripts/audit-mobile-safari.mjs --help`. `.github/workflows/compatibility.yml` retains the optional native/Windows automation. A desktop engine emulating phone dimensions does not establish native mobile behavior or hardware performance.

The earlier release passed vendor Chrome, Edge, Opera, macOS Safari and Firefox journeys. Its native iOS simulator attempts were infrastructure-blocked; physical flagship-phone performance and Samsung Internet were not verified. Those historical results and platform versions are [preserved in Git history](https://github.com/michaelcrosato/meridian-wake-g6a/blob/19e49a23f4ce9e41c3d937a73e6a9973cf3b49fd/docs/compatibility-audit.md), not represented as new checks of every later change.

For Linux hardware WebGPU captures, use a private Xvfb display. Some headless WebGPU configurations produce black screenshots despite successful initialization. Check the fallback and console as well as the rendered page. Renderer loss pauses flight and provides save export/reload recovery; storage failure retains in-memory play and prompts for an export backup.

For the size-optimization pass, Chromium covered real gameplay and all eleven audio files; Playwright Firefox 155 separately decoded every optimized file. Local WebKit could not launch because the host lacks required GTK/GStreamer and other shared libraries, so no fresh WebKit/Safari result is claimed for this pass.
