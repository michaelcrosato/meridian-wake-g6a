# Browser, controls and responsive audit

Audit dates: **26–27 September 2026, America/Vancouver**. Baseline: `de17cab`. This follow-up tests the playable game, fixes observed failures and adds repeatable browser checks. It preserves the original visual direction, campaign and shared Three.js node-material rendering path.

Local validation: **155/155 node tests**, **16/16 Chromium browser scenarios**, production build and source/audio verification pass. After the last graphics-recovery guard change, the expanded device-loss/export/reload scenario passed separately. CI reruns the complete regression suite before publication.

## Browser selection and results

Chrome, Safari, Edge, Firefox and Opera together represented 95.5% of worldwide browser usage in the August 2026 [Statcounter monthly sample](https://gs.statcounter.com/browser-market-share/monthly). That motivated browser selection; testing a desktop brand does **not** establish coverage of its entire mobile share. Samsung Internet (2.01% in that sample) remains an explicit untested vendor browser.

| Actual browser / engine | Environment | Observed result |
| --- | --- | --- |
| Google Chrome 154.0.8037.57 | Linux / WSL2 | All three compatibility scenarios pass together on the final application code, including all 11 sizes (2.1 minutes) |
| Google Chrome 153.0.8010.53 | Windows hosted runner | All three compatibility scenarios pass, including all 11 sizes |
| Microsoft Edge 154.0.4258.37 | Linux / WSL2 | Opening voyage/economy/audio/save scenario passes |
| Microsoft Edge 153.0.4234.48 | Windows hosted runner | All three compatibility scenarios pass, including all 11 sizes |
| Mozilla Firefox Stable 156.0.1 / geckodriver 0.37.1 | Linux, private Xvfb, standard browser security settings | Actual keyboard flight/fire, map text entry, jump, assisted landing, mission completion, 11 decoded sounds/running audio, saved resume and four real window sizes pass |
| Opera 135.0.5973.142 / Chromium 151.0.7922.176 | Linux / WSL2 | All three compatibility scenarios pass, including all 11 sizes |
| Apple Safari 26.6.2 / macOS 26.6.2 | Native macOS hosted runner, safaridriver | Actual keyboard flight/fire, map text entry, jump, assisted landing, mission completion, 11 decoded sounds/running audio, saved resume and four real window sizes pass |
| Playwright WebKit 26.6 | Linux, private Xvfb | All three compatibility scenarios pass, including all 11 sizes; engine evidence, not a substitute for Apple Safari |
| Playwright patched Firefox 155 | Linux, private Xvfb | Layout and keyboard/focus scenarios pass. Voyage reaches completion, but the audio context remains suspended in this automation build; **not a full pass**. Vendor Firefox above passes the audio check |
| Chromium 156.0.8076.0 AndroidDesktop_x64 snapshot 1705635 | Native Android 16 emulator, ANGLE Vulkan | Original game rendering and touch journey pass within a diagnostic environment. This is not stable Chrome Mobile; see [Android evidence and limits](android-compatibility.md) |
| Native iPhone / iPad Safari | Apple iOS simulator on hosted macOS | Native validation is tracked separately below; desktop WebKit emulation does not count as a native pass |

The compatibility journey uses actual browser input to buy/sell cargo, accept James's passage, thrust, turn/brake with arrow keys, fire, search the map, jump to Arcturus, dock, complete the mission, activate audio and reload saved progress. The separate WebDriver journey covers flight, story, audio and persistence, without claiming the trading scenario. Backend observations in these vendor-browser runs are **WebGL2 automatic fallback**. Earlier independent WebGPU checks remain in [verification evidence](verification.md). The Windows cumulative-timeout diagnosis is retained in [compact trace evidence](compatibility/windows-timeout-evidence.json).

[Earlier successful Windows and desktop Safari jobs](https://github.com/michaelcrosato/meridian-wake-g6a/actions/runs/36299000280) contain per-job results and downloadable traces/screenshots. A later [Windows rerun](https://github.com/michaelcrosato/meridian-wake-g6a/actions/runs/36301252982) passed the voyage and keyboard scenarios but exhausted the layout test's cumulative 300-second budget at its ninth viewport. Both traces had completed all 11 title/port sizes and eight flight/map cases; the next otherwise-valid map click began with fewer seconds remaining than previous successful clicks needed. The 11-size test now has a 480-second total budget; per-action assertions and retries are unchanged. Native simulator failures are separate and must not be mistaken for desktop results. [Compact checked-in evidence](compatibility/browser-evidence.json) retains completed runs, versions, viewports and native driver observations without temporary profiles or workstation paths.

## Screen sizes and visual review

The automated layout matrix covers **320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1920×1080, 2560×1080, 844×390 and 683×384 CSS pixels**. It checks title, port, flight and map reachability, document overflow, actionable control centers and status/objective separation. Native Safari window content sizes were 1440×948, 1366×848, 1024×798 and 800×648; Firefox content sizes were 1440×915, 1366×815, 1024×765 and 800×615.

A separate screenshot-first Chromium review covered Options, original conversations, key bindings and forced touch layouts. Actual browser zoom was set to **200%**, yielding a 683×384 CSS viewport inside a 1366×768 capture; this supplements the matrix's equivalent-size case. Phone port tabs intentionally scroll horizontally inside their region. Long dialogs scroll while their close/footer actions remain reachable.

Fixed visual defects include title clipping at short heights/200% zoom, 320px navigation and Fire overflow, objective/status collisions, tablet landing actions overlapping status, and HUD text crossing pale planet geometry. Key bindings wrap at narrow widths; keyboard focus remains visible. Compact controls do not universally meet 44×44 pixels. This is a practical accessibility review, not WCAG or screen-reader certification.

Representative inspected captures: [320px flight](compatibility/flight-320x568.png), [actual 200% title](compatibility/title-200percent.png), [tablet with touch controls](compatibility/tablet-touch.png), [Windows Edge short viewport](compatibility/windows-edge-short.png), [vendor Firefox mission completion](compatibility/firefox-mission.png), and [actual Safari mission completion](compatibility/safari-mission.png).

## Controls and fixed bugs

[Input support](input-compatibility.md) records the full mappings and boundaries. Keyboard, mouse, simultaneous touch and standard-mapped gamepads share the same action model. Options saves two keyboard bindings per action and Auto/Always/Hide touch visibility. The browser tests verify remapping persistence through actual flight and a gamepad API fixture drives menus, values, flight, pause and disconnection. No physical controller certification is claimed.

| Reproduced issue | Correction and verification |
| --- | --- |
| Ctrl+R triggered a game survey and prevented reload | Modified browser shortcuts and IME composition bypass game bindings; browser regression checks reload/shortcut behavior |
| SVG map stars ignored Space; Tab escaped a modal after redraw | Enter/Space activation, inert background, stable focus across redraws and opener restoration; tested across browser engines |
| Safari pointer clicks did not always focus the panel opener | The clicked control is captured explicitly for focus restoration |
| Closing an original conversation trapped later flight in that dialogue | Explicit deferral retains a resumable conversation without reopening it on every panel close |
| A second finger could not trigger cloak/map while thrust was held | Guarded non-primary touch activation, drag/cancel handling and click deduplication; held touch nodes survive same-flight HUD refreshes |
| Lost focus or disconnected controllers could retain inputs | Clear held input and require neutral controller state when changing contexts or reconnecting |
| Denied browser storage retried each animation frame | Throttle failures at the autosave interval, show export-backup status, retain working JSON export; quota-denial regression crosses a real save interval |
| Lost graphics left a silent unusable scene; map shortcuts could still advance travel during recovery | Stop renderer/physics updates, clear input, save, pause game time, reject gameplay mutations and offer export/reload; actual `WEBGL_lose_context` regression verifies persisted mission recovery |
| Auto discarded very slow frames and used clamped simulation time | Sample visible wall time, include slow foreground frames and explicitly exclude background gaps; 500ms-frame regression switches High → Balanced at 7 seconds |

Audio, fullscreen and native file interfaces still follow browser user-activation requirements. A controller poll cannot grant those permissions; the game requests a real click/tap/key where necessary. Unsupported fullscreen is explained and disabled. Text entry requires a keyboard, including the device's software keyboard where available.

## Measured performance changes

Two instanced asteroid palette batches reduce a matched High title scene from **211 to 181 draw calls (14.2%)** on both rendering backends. Individual Rapier colliders and mining removal remain independent. The deterministic WebGPU images are identical; the normalized WebGL2 mean absolute pixel difference is approximately 0.000000001. Submitted triangles rise 2.4% because these inexpensive asteroids no longer receive individual frustum culling; tracked GPU memory falls slightly. These are measured workload changes, **not a universal FPS increase**.

Auto now uses a 3-second warmup, a 4-second/minimum-eight-frame sample window, percentile hysteresis and a 12-second cooldown. Hidden time does not bias quality. An actual native Android software-rendered run switched High → Balanced after **7.302 seconds**, reducing active bodies from 29 to 17. Manual presets remain fixed. [Renderer evidence](renderer-audit-evidence.json) records fixtures, image hashes, collisions, device loss, sampling thresholds and limits.

## Native mobile scope

Android testing exposed failures in the emulator's old bundled Chrome 133 and GLES translation. Diagnostic Chromium 156 with ANGLE Vulkan renders the unchanged game correctly and passes simultaneous touch flight, map/jump/dock and held-thrust/cloak checks. A native Java assertion in that snapshot's keyboard accessory prevents claiming Android text-entry success. Broad shader workarounds were rejected; the renderer remains shared and uses the original materials. [Detailed Android report](android-compatibility.md).

Native Apple simulator results will be recorded here after the bounded CI investigation. The harness uses real Safari WebDriver element clicks and text entry, not JavaScript game-state mutation. It records boot/session failures as failures. It avoids the documented [iOS WebDriver Actions hang](https://bugs.webkit.org/show_bug.cgi?id=322937); therefore a successful element-click journey would still not prove multitouch or long-press controls. The device jobs are isolated and use the free standard Intel macOS runner's 14GB rather than the ARM runner's 7GB. [Runner specifications](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

No physical phone/tablet, Samsung Internet vendor browser, native iOS Chrome shell, physical gamepad, sustained mobile thermal benchmark or hardware WebGPU measurement was available. Touch events and viewport emulation establish bounded browser behavior rather than physical-device equivalence. [Playwright browser distinctions](https://playwright.dev/docs/browsers) and [emulation documentation](https://playwright.dev/docs/emulation).

## Reproduction and tooling

```sh
npm ci
npm test
npm run test:e2e
node scripts/verify-source.mjs

# Requires the selected vendor browser or Playwright engine to be installed.
COMPAT_BROWSER=chrome npm run test:compat
COMPAT_BROWSER=edge npm run test:compat
COMPAT_BROWSER=opera COMPAT_EXECUTABLE=/path/to/opera npm run test:compat
COMPAT_BROWSER=webkit npm run test:compat
```

`COMPAT_BROWSER=firefox` selects Playwright's patched Firefox, with the lab audio limitation above. For actual Mozilla Firefox, install official Firefox and geckodriver and run:

```sh
npm run build
WEBDRIVER_BROWSER=firefox \
  WEBDRIVER_EXECUTABLE=/path/to/geckodriver \
  FIREFOX_BINARY=/path/to/firefox \
  WEBDRIVER_ARTIFACTS=artifacts/firefox-stable \
  node scripts/audit-webdriver.mjs
```

On macOS, enable Safari's WebDriver automation and run `node scripts/audit-webdriver.mjs`. For an installed iOS simulator runtime, run `node scripts/audit-mobile-safari.mjs --devices iphone --runtime-version 26.5`, then repeat for `ipad`. Its `--list` and `--self-test` modes inspect available devices and validate the harness without playing the game. The compatibility workflow runs desktop checks on matching main/audit-branch pushes and can be dispatched with `suite=desktop`, `mobile`, or `all`. Native simulator checks are explicit opt-in jobs with failure artifacts; they are not silently passed or included in the desktop success claim.

The audit installed official isolated Edge, Opera, Firefox/geckodriver, Playwright WebKit and needed userspace libraries; added an owned Android API 36 test AVD and official Chromium diagnostic APK; and used hosted Apple/Windows runners. Runtime dependencies were unchanged. Linux headed checks use private Xvfb; browsers may require working GL/Vulkan and audio output in that environment. The test tools and SDK artifacts stay outside the shipped build. No additional connected plugin or paid device-cloud account was provisioned.
