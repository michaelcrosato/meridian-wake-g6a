# Input compatibility audit

Baseline: `de17cab`. The audit reproduced Ctrl+R running a survey and preventing browser reload, Space failing on an SVG star button, and Tab moving behind an open modal after selecting a star. Those behaviors are corrected by the shared input module and modal lifecycle.

| Input | Supported behavior |
| --- | --- |
| Keyboard | WASD and all four arrows; primary/secondary weapons; both Shift keys; cloak, landing, map, operations, boarding, fuel, survey, journal, ship, target selection and Escape. |
| Custom keyboard | Options → Change controls, or Flight handbook → Change keyboard controls. Two physical-key bindings per action, conflict checking, reserved browser/menu keys, persistent preferences and reset. Layout labels use the optional keyboard layout API when available; the handbook explains the physical-position fallback. |
| Mouse | Every menu, map star, actor/wreck selection and operation; native buttons retain Enter/Space behavior. Always-show flight controls also permit pointer operation of steering and weapons. Mouse aiming and wheel map zoom are not implemented or advertised. |
| Touch | Simultaneous turn/thrust/brake/boost/weapons, plus the common HUD operations. Each pointer owns its hold, so releasing one finger cannot cancel another. Cancellation, lost capture, DOM replacement, hidden documents and window blur release held input. Auto/Always show/Hide supports hybrid devices. |
| Standard gamepad | Left stick/D-pad flight; RT primary, RB secondary, LT boost, LB cloak; A land/launch, B operations, X survey, Y contact selection; View map, Menu pause; left/right stick presses board/harvest. PlayStation equivalents are shown in the handbook. |
| Gamepad menus | D-pad/left stick moves focus; A activates, B/Menu goes back; left/right changes select, number and range values; right stick scrolls. Text entry requires a keyboard. |
| Focus and menus | Menus make the background inert, retain matching controls after redraws, include links/summaries in the focus cycle, and restore the opener on close. SVG star buttons support Enter and Space. Flight pauses on blur or hidden-tab transitions. A dismissed pending conversation remains available to resume. |
| Browser commands | Ctrl, Alt, Command and composition events are excluded from game shortcuts. Fullscreen state follows browser exits; unsupported fullscreen has a disabled control and explanation. |

Controller detection uses only the browser's `mapping: "standard"` model. Unknown layouts receive a message and retain keyboard/mouse/touch alternatives. Sticks have a dead zone; connecting, changing menus, losing focus or disconnecting requires a neutral release before controller input resumes. This prevents a held activation or trigger from leaking into the next screen.

Browsers may require a trusted click, tap or key event for audio, fullscreen and file interfaces. A polled controller button does not synthesize permission: the interface directs the player to a trusted activation where necessary. A later trusted input resumes suspended audio.

Validation includes eight isolated input tests, the full rules suite, and Chromium browser scenarios covering shortcut protection, SVG Space activation, focus after rerenders, saved remapping with actual ship movement, and a standard-gamepad API fixture driving menu values, flight, pause and disconnection. The controller fixture verifies the browser adapter, not a physical hardware certification. Cross-browser and responsive results belong to the release verification report.

API references: [W3C standard gamepad mapping](https://w3c.github.io/gamepad/#remapping), [navigator.getGamepads](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads), [optional keyboard layout labels](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/getLayoutMap).
