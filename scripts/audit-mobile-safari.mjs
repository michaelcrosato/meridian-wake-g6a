import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { access, cp, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";

// Apple MobileSafari on an installed iOS Simulator, not desktop emulation.
// https://webkit.org/blog/9395/webdriver-is-coming-to-safari-in-ios-13/
// Element Click synthesizes a single-finger touch; Element Send Keys supplies
// text. Never use /actions: https://bugs.webkit.org/show_bug.cgi?id=322937
// No JS click, dispatchEvent, model action, viewport override or fixture voyage
// may substitute for a failed native control in this audit.
const exec = promisify(execFile);
const ELEMENT = "element-6066-11e4-a52e-4f735466cecf";
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

function modelRank(name) {
	if (/^iPhone \d+ Pro$/.test(name)) return 0;
	if (/^iPhone \d+$/.test(name)) return 1;
	if (/^iPhone \d+e$/.test(name)) return 2;
	if (/^iPhone/.test(name)) return /Air|Max|Plus/.test(name) ? 6 : 3;
	if (/^iPad \(/.test(name)) return 0;
	if (/^iPad Air 11-inch/.test(name)) return 1;
	if (/^iPad Air/.test(name)) return 2;
	if (/^iPad mini/.test(name)) return 3;
	if (/^iPad Pro 11-inch/.test(name)) return 4;
	return 6;
}

export function validateBootStatus(output) {
	// CoreSimulator can return exit 0 for a terminal migration failure.
	assert(
		!/Data Migration Failed|System App Failed|Status=(?:3|5),\s*isTerminal=YES/i.test(
			output,
		),
		"Simulator boot failed during migration/system startup; refusing to start an app audit",
	);
}

export function selectSimulators(inventory, families, udid, runtimeVersion) {
	const available = Object.entries(inventory.devices || {}).flatMap(
		([runtime, devices]) => {
			const version = runtime.match(/\.iOS-([\d-]+)$/)?.[1];
			if (!version) return [];
			if (runtimeVersion && version.replaceAll("-", ".") !== runtimeVersion)
				return [];
			return devices
				.filter(
					(device) =>
						device.isAvailable && /^(iPhone|iPad)\b/.test(device.name),
				)
				.map((device) => ({
					...device,
					runtime,
					version: version.replaceAll("-", "."),
					family: device.name.startsWith("iPad") ? "ipad" : "iphone",
				}));
		},
	);
	available.sort(
		(a, b) =>
			b.version.localeCompare(a.version, "en", { numeric: true }) ||
			modelRank(a.name) - modelRank(b.name) ||
			b.name.localeCompare(a.name, "en", { numeric: true }),
	);
	if (udid) {
		const device = available.find((item) => item.udid === udid);
		assert(device, `Requested available iOS Simulator not found: ${udid}`);
		return [device];
	}
	return [...new Set(families)].map((family) => {
		assert(
			["iphone", "ipad"].includes(family),
			`Unknown device family: ${family}`,
		);
		const device = available.find((item) => item.family === family);
		assert(device, `No available ${family} Simulator runtime is installed`);
		return device;
	});
}

function selfTest() {
	const make = (name, udid, isAvailable = true) => ({
		name,
		udid,
		isAvailable,
	});
	const inventory = {
		devices: {
			"com.apple.CoreSimulator.SimRuntime.iOS-9-3": [make("iPhone 6", "old")],
			"com.apple.CoreSimulator.SimRuntime.iOS-26-5": [
				make("iPhone Air", "air"),
				make("iPhone 17 Pro Max", "max"),
				make("iPhone 17 Pro", "phone"),
				make("iPad Pro 13-inch (M5)", "large"),
				make("iPad (A16)", "tablet"),
			],
			"com.apple.CoreSimulator.SimRuntime.iOS-27-0": [
				make("iPhone 18", "unavailable", false),
			],
			"com.apple.CoreSimulator.SimRuntime.tvOS-99-0": [
				make("iPhone impostor", "wrong-platform"),
			],
		},
	};
	assert.deepEqual(
		selectSimulators(inventory, ["iphone", "ipad"]).map((d) => d.udid),
		["phone", "tablet"],
	);
	assert.equal(selectSimulators(inventory, [], "old")[0].version, "9.3");
	assert.throws(() => selectSimulators(inventory, [], "unavailable"));
	assert.throws(() => selectSimulators(inventory, ["android"]));
	assert.throws(() =>
		validateBootStatus("Status=3, isTerminal=YES\nData Migration Failed"),
	);
	validateBootStatus("Status=4294967295, isTerminal=YES\nFinished");
	console.log(
		"Simulator selection self-check passed; no Apple browser was run.",
	);
}

export async function main(argv = process.argv.slice(2)) {
	const { values } = parseArgs({
		args: argv,
		options: {
			devices: { type: "string", default: "iphone,ipad" },
			"device-udid": { type: "string" },
			"runtime-version": { type: "string" },
			"reuse-device": { type: "boolean", default: false },
			artifacts: { type: "string", default: "artifacts/mobile-safari" },
			url: { type: "string" },
			"preview-port": { type: "string", default: "4176" },
			"driver-port": { type: "string", default: "4446" },
			list: { type: "boolean", default: false },
			"self-test": { type: "boolean", default: false },
			help: { type: "boolean", default: false },
		},
	});
	if (values.help) {
		console.log(`Usage: node scripts/audit-mobile-safari.mjs [--devices iphone,ipad]
  --list                 Print selected installed Simulators without booting.
  --device-udid UDID      Audit one explicit installed iPhone/iPad Simulator.
  --runtime-version X.Y  Select that installed iOS runtime explicitly.
  --reuse-device         Reuse the selected preinstalled device instead of
                         creating an isolated temporary device of its type.
  --url URL              Use an existing preview; otherwise start built dist/.
  --artifacts DIRECTORY  Default: artifacts/mobile-safari.
  --self-test            Check discovery logic on any OS; does not run Safari.

Prerequisites on the macOS runner: npm ci; npm run build;
sudo /usr/bin/safaridriver --enable; installed Xcode iOS Simulator runtime.
Devices run sequentially. The actual orientation is recorded; native rotation
is probed and marked unsupported if Safari provides no rotation endpoint.`);
		return;
	}
	if (values["self-test"]) return selfTest();
	assert.equal(
		process.platform,
		"darwin",
		"Mobile Safari requires a macOS host with Xcode; no desktop-browser substitute is used.",
	);
	const artifacts = resolve(values.artifacts);
	await mkdir(artifacts, { recursive: true });
	const runnerLog = [];
	const summary = {
		browser: "Apple MobileSafari via safaridriver on iOS Simulator",
		startedAt: new Date().toISOString(),
		status: "running",
		devices: [],
		boundaries: [
			"Simulator Safari, not physical iPhone/iPad hardware performance.",
			"Native Element Click and Element Send Keys only for controls; W3C Actions intentionally excluded because WebKit bug 322937 can wedge iOS sessions.",
			"No multi-touch, long-press flight, software-keyboard presentation, or cross-session persistence claim. Safari automation storage is isolated and destroyed when its session ends.",
			"JavaScript only initializes disclosed preferences and reads/instruments evidence. It does not click, dispatch control events, move the game, or resize the viewport.",
			"Audio decoding/running context is checked; audible output on a physical device is not measured. Screenshots require visual inspection.",
		],
		sources: [
			"https://webkit.org/blog/9395/webdriver-is-coming-to-safari-in-ios-13/",
			"https://bugs.webkit.org/show_bug.cgi?id=322937",
			"https://developer.apple.com/documentation/safari-developer-tools/ios-enabling-webdriver",
		],
	};
	async function host(command, args, timeout = 30000) {
		const started = Date.now();
		try {
			const result = await exec(command, args, {
				timeout,
				maxBuffer: 8 * 1024 * 1024,
			});
			runnerLog.push(
				JSON.stringify({
					command,
					args,
					ms: Date.now() - started,
					stdout: result.stdout,
					stderr: result.stderr,
				}),
			);
			return result.stdout;
		} catch (error) {
			runnerLog.push(
				JSON.stringify({
					command,
					args,
					ms: Date.now() - started,
					error: error.message,
					stdout: error.stdout,
					stderr: error.stderr,
				}),
			);
			throw error;
		}
	}
	function processWithLog(command, args, label) {
		const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
		child.on("error", (error) => runnerLog.push(`${label}: ${error.message}`));
		for (const stream of [child.stdout, child.stderr])
			stream.on("data", (data) => runnerLog.push(`${label}: ${data}`));
		return child;
	}
	async function waitFor(check, label, timeout = 60000) {
		const end = Date.now() + timeout;
		let last;
		while (Date.now() < end) {
			try {
				const result = await check();
				if (result) return result;
			} catch (error) {
				last = error;
				if (error.name === "TimeoutError" || error.name === "AbortError")
					throw error;
			}
			await delay(350);
		}
		throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ""}`);
	}
	let server;
	try {
		const inventory = JSON.parse(
			await host("xcrun", ["simctl", "list", "devices", "available", "-j"]),
		);
		await writeFile(
			`${artifacts}/simulators.json`,
			`${JSON.stringify(inventory, null, 2)}\n`,
		);
		const devices = selectSimulators(
			inventory,
			values.devices
				.toLowerCase()
				.split(",")
				.map((s) => s.trim()),
			values["device-udid"],
			values["runtime-version"],
		);
		summary.selected = devices;
		if (values.list) {
			summary.status = "discovery-only";
			console.log(JSON.stringify(devices, null, 2));
			return;
		}
		summary.host = {
			xcode: await host("xcodebuild", ["-version"]),
			macOS: await host("sw_vers", []),
			safaridriver: await host("/usr/bin/safaridriver", ["--version"]),
			developerDirectory: (await host("xcode-select", ["-p"])).trim(),
			memoryBytes: Number((await host("sysctl", ["-n", "hw.memsize"])).trim()),
		};
		const simulatorApp = join(
			summary.host.developerDirectory,
			"Applications",
			"Simulator.app",
		);
		await access(simulatorApp);
		const port = Number(values["preview-port"]);
		const driverPort = Number(values["driver-port"]);
		for (const p of [port, driverPort])
			assert(Number.isInteger(p) && p > 1024 && p < 65536, "Invalid port");
		const root = values.url || `http://127.0.0.1:${port}`;
		const driverRoot = `http://127.0.0.1:${driverPort}`;
		if (!values.url)
			server = processWithLog(
				process.execPath,
				[
					"node_modules/vite/bin/vite.js",
					"preview",
					"--host",
					"127.0.0.1",
					"--port",
					String(port),
					"--strictPort",
				],
				"preview",
			);
		await waitFor(
			async () => (await fetch(root, { signal: AbortSignal.timeout(5000) })).ok,
			"production preview",
		);
		for (const template of devices) {
			const device = { ...template };
			const directory = `${artifacts}/${device.family}`;
			await mkdir(directory, { recursive: true });
			const evidence = {
				device,
				template,
				startedAt: new Date().toISOString(),
				status: "running",
				checks: [],
				controls: [],
				commands: [],
				screenshots: [],
				phases: [],
			};
			summary.devices.push(evidence);
			let driver,
				session,
				bootedHere = false,
				createdHere = false,
				transportTimedOut = false;
			const persist = () =>
				writeFile(
					`${directory}/evidence.json`,
					`${JSON.stringify(evidence, null, 2)}\n`,
				);
			async function phase(name) {
				evidence.phase = name;
				evidence.phases.push({ name, startedAt: new Date().toISOString() });
				console.log(`${device.family}: ${name}`);
				await persist();
			}
			async function command(path, method = "GET", body, timeout = 20000) {
				assert(
					!/\/actions(?:\/|$)/.test(path),
					"W3C Actions are prohibited in the iOS audit",
				);
				const record = {
					path,
					method,
					phase: evidence.phase,
					startedAt: new Date().toISOString(),
				};
				evidence.commands.push(record);
				await persist();
				const started = Date.now();
				try {
					const response = await fetch(
						`${driverRoot}${session ? `/session/${session}` : ""}${path}`,
						{
							method,
							headers: { "Content-Type": "application/json" },
							...(body === undefined ? {} : { body: JSON.stringify(body) }),
							signal: AbortSignal.timeout(timeout),
						},
					);
					const json = await response.json();
					record.httpStatus = response.status;
					if (!response.ok || json.value?.error) {
						const error = new Error(
							`${method} ${path}: ${JSON.stringify(json.value)}`,
						);
						error.webdriver = json.value?.error;
						throw error;
					}
					return json.value;
				} catch (error) {
					record.error = error.message;
					if (["TimeoutError", "AbortError"].includes(error.name))
						transportTimedOut = true;
					throw error;
				} finally {
					record.ms = Date.now() - started;
					await persist();
				}
			}
			const execute = (script, args = []) =>
				command("/execute/sync", "POST", { script, args });
			const find = async (selector) =>
				(
					await command("/element", "POST", {
						using: "css selector",
						value: selector,
					})
				)[ELEMENT];
			async function tap(selector) {
				const element = await waitFor(
					() => find(selector),
					`element ${selector}`,
				);
				const start = await execute(
					"return window.mobileAudit?.events.length || 0",
				);
				await command(`/element/${element}/click`, "POST", {});
				const events = await execute(
					"return (window.mobileAudit?.events || []).slice(arguments[0])",
					[start],
				);
				evidence.controls.push({
					kind: "WebDriver Element Click (iOS single-finger touch)",
					selector,
					events,
				});
				assert(
					events.some(
						(event) =>
							event.trusted &&
							["click", "pointerup", "touchend"].includes(event.type),
					),
					`No trusted input event followed native tap: ${selector}`,
				);
				await persist();
			}
			async function snapshot(name) {
				const view =
					await execute(`return {userAgent:navigator.userAgent,platform:navigator.platform,touchPoints:navigator.maxTouchPoints,
viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visual:visualViewport ? {width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null},
screen:{width:screen.width,height:screen.height,orientation:screen.orientation?.type || null,angle:window.orientation ?? null},
overflow:document.documentElement.scrollWidth>innerWidth,telemetry:window.meridian?.telemetry,
canvases:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),
state:window.meridian ? {mode:window.meridian.state.mode,systemId:window.meridian.state.systemId,storyIndex:window.meridian.state.storyIndex}:null}`);
				const data = await command("/screenshot", "GET", undefined, 30000);
				await writeFile(
					`${directory}/${name}.png`,
					Buffer.from(data, "base64"),
				);
				evidence.screenshots.push({
					name: `${device.family}/${name}.png`,
					...view,
				});
				try {
					await host("xcrun", [
						"simctl",
						"io",
						device.udid,
						"screenshot",
						`${directory}/${name}-device.png`,
					]);
				} catch (error) {
					evidence.screenshots.at(-1).deviceScreenshotError = error.message;
				}
				assert.equal(
					view.overflow,
					false,
					`${name}: horizontal document overflow`,
				);
				await persist();
				return view;
			}
			async function instrument() {
				await execute(`window.mobileAudit={errors:[],events:[]};
addEventListener('error',e=>mobileAudit.errors.push(e.message));
addEventListener('unhandledrejection',e=>mobileAudit.errors.push(String(e.reason)));
for(const type of ['pointerdown','pointerup','pointercancel','touchstart','touchend','click','input','change'])
document.addEventListener(type,e=>{if(mobileAudit.events.length<2000)mobileAudit.events.push({type:e.type,trusted:e.isTrusted,pointerType:e.pointerType||null,tag:e.target.tagName,action:e.target.closest?.('[data-action]')?.dataset.action||null,id:e.target.id||null});},true);return true;`);
			}
			async function diagnostics() {
				evidence.diagnostics = {};
				const probes = [
					["host-processes", "ps", ["-axo", "pid,ppid,rss,state,comm"]],
					["host-memory", "vm_stat", []],
					[
						"simulator-states",
						"xcrun",
						["simctl", "list", "devices", "booted", "-j"],
					],
					[
						"simulator-host-log",
						"log",
						[
							"show",
							"--last",
							"3m",
							"--style",
							"compact",
							"--predicate",
							'process == "Simulator" OR process == "safaridriver" OR process CONTAINS "CoreSimulator"',
						],
					],
				];
				for (const [name, executable, args] of probes) {
					try {
						const text = await host(executable, args, 15000);
						await writeFile(`${directory}/${name}.txt`, text);
						evidence.diagnostics[name] = `${device.family}/${name}.txt`;
					} catch (error) {
						evidence.diagnostics[name] = { error: error.message };
					}
				}
			}
			async function driverDiagnostics() {
				const source = join(homedir(), "Library/Logs/com.apple.WebDriver");
				try {
					for (const entry of await readdir(source)) {
						const path = join(source, entry);
						if ((await stat(path)).mtimeMs >= Date.parse(summary.startedAt))
							await cp(path, join(directory, "webdriver-diagnostics", entry), {
								recursive: true,
							});
					}
				} catch (error) {
					evidence.driverDiagnosticError = error.message;
				}
			}
			try {
				console.log(
					`Auditing ${device.name} / iOS ${device.version} / ${device.udid}`,
				);
				// Verify the server and host automation before CoreSimulator startup can
				// consume resources. This is infrastructure evidence, not an iOS result.
				await phase("host-driver-health");
				driver = processWithLog(
					"/usr/bin/safaridriver",
					["--port", String(driverPort), "--diagnose"],
					device.family,
				);
				await waitFor(async () => {
					assert.equal(
						driver.exitCode,
						null,
						"safaridriver exited before becoming ready",
					);
					const health = await command("/status", "GET", undefined, 10000);
					return health.ready === false ? false : health;
				}, "recorded safaridriver health");
				await phase("host-remote-automation-preflight");
				const hostSession = await command(
					"/session",
					"POST",
					{
						capabilities: {
							alwaysMatch: { browserName: "Safari", platformName: "macOS" },
						},
					},
					60000,
				);
				session = hostSession.sessionId;
				evidence.hostAutomation = {
					capabilities: hostSession.capabilities,
					status: "session-accepted",
				};
				await command("", "DELETE", undefined, 10000);
				session = undefined;
				if (!values["reuse-device"] && !values["device-udid"]) {
					await phase("create-isolated-simulator");
					assert(
						device.deviceTypeIdentifier,
						"Selected installed device lacks its device type",
					);
					device.templateUDID = device.udid;
					device.udid = (
						await host("xcrun", [
							"simctl",
							"create",
							`Meridian ${device.family} ${Date.now()}`,
							device.deviceTypeIdentifier,
							device.runtime,
						])
					).trim();
					assert(
						/^[A-F0-9-]{36}$/i.test(device.udid),
						"simctl create did not return a UDID",
					);
					device.state = "Shutdown";
					device.dataPath = join(
						homedir(),
						"Library/Developer/CoreSimulator/Devices",
						device.udid,
						"data",
					);
					device.logPath = join(
						homedir(),
						"Library/Logs/CoreSimulator",
						device.udid,
					);
					createdHere = true;
				}
				await phase("boot-simulator");
				if (device.state !== "Booted") {
					await host("xcrun", ["simctl", "boot", device.udid], 120000);
					bootedHere = true;
				}
				await host("open", [
					"-a",
					simulatorApp,
					"--args",
					"-CurrentDeviceUDID",
					device.udid,
				]);
				await phase("wait-for-complete-migration");
				evidence.bootStatus = await host(
					"xcrun",
					["simctl", "bootstatus", device.udid, "-b"],
					180000,
				);
				validateBootStatus(evidence.bootStatus);
				await phase("simulator-services");
				evidence.simulatorServices = await host(
					"xcrun",
					["simctl", "spawn", device.udid, "launchctl", "list"],
					20000,
				);
				assert(
					/SpringBoard/.test(evidence.simulatorServices),
					"SpringBoard is not running after bootstatus",
				);
				await host(
					"xcrun",
					[
						"simctl",
						"io",
						device.udid,
						"screenshot",
						`${directory}/00-booted-device.png`,
					],
					20000,
				);
				await phase("launch-mobile-safari");
				await host(
					"xcrun",
					["simctl", "launch", device.udid, "com.apple.mobilesafari"],
					60000,
				);
				await host(
					"xcrun",
					[
						"simctl",
						"io",
						device.udid,
						"screenshot",
						`${directory}/00-safari-ready.png`,
					],
					20000,
				);
				await phase("create-ios-session");
				const created = await command(
					"/session",
					"POST",
					{
						capabilities: {
							alwaysMatch: {
								browserName: "Safari",
								platformName: "iOS",
								"safari:useSimulator": true,
								"safari:deviceUDID": device.udid,
							},
						},
					},
					90000,
				);
				session = created.sessionId;
				evidence.simulatorAutomation =
					"Confirmed by accepted native iOS WebDriver session; no guessed preference writes";
				evidence.capabilities = created.capabilities;
				assert.equal(
					created.capabilities.platformName.toLowerCase(),
					"ios",
					"The driver must actually return an iOS session",
				);
				if (created.capabilities["safari:deviceUDID"])
					assert.equal(created.capabilities["safari:deviceUDID"], device.udid);
				await phase("application-journey");
				await command("/timeouts", "POST", {
					implicit: 0,
					pageLoad: 60000,
					script: 15000,
				});
				await command("/url", "POST", { url: root }, 65000);
				await waitFor(
					() => execute("return Boolean(window.meridian)"),
					"initial renderer",
					90000,
				);
				// Disclosed test setup only. All subsequent gameplay uses native endpoints.
				await execute(
					"localStorage.setItem('meridian-wake-settings-v1',JSON.stringify({quality:'Balanced',muted:true,volume:0.4,touchControls:'auto'}));return true;",
				);
				await command("/refresh", "POST", {}, 65000);
				await waitFor(
					() => execute("return Boolean(window.meridian)"),
					"balanced renderer",
					90000,
				);
				await instrument();
				const title = await snapshot("01-title");
				assert(
					title.touchPoints > 0,
					"A mobile Safari session must expose touch input",
				);
				assert(
					["WebGPU", "WebGL2"].includes(title.telemetry?.backend),
					"Renderer backend did not initialize",
				);
				evidence.checks.push(
					"Actual iOS session, touch capability and live renderer telemetry; title screenshots captured for visual review",
				);
				await tap('[data-action="new"]');
				await tap('[data-action="begin"]');
				await waitFor(
					() => execute("return window.meridian.state.mode==='port'"),
					"first spaceport",
				);
				await snapshot("02-port");
				await tap('[data-action="story"][data-choice="accept"]');
				assert.equal(
					await execute("return window.meridian.state.activeStory?.id"),
					"first-passage",
				);
				await tap('.modal [data-action="launch"]');
				await waitFor(
					() =>
						execute(
							"return window.meridian.state.mode==='flight'&&!document.querySelector('.modal')",
						),
					"launched flight",
				);
				await snapshot("03-flight");
				await tap('.hud-nav [data-action="map"]');
				const field = await find("#system-search");
				const inputStart = await execute("return mobileAudit.events.length");
				await command(`/element/${field}/clear`, "POST", {});
				await command(`/element/${field}/value`, "POST", { text: "Arcturus" });
				evidence.controls.push({
					kind: "WebDriver Element Clear / Element Send Keys",
					selector: "#system-search",
					text: "Arcturus",
					events: await execute(
						"return mobileAudit.events.slice(arguments[0])",
						[inputStart],
					),
				});
				await tap("#modal-title"); // Native tap blurs search and commits its change.
				await waitFor(
					() =>
						execute(
							"return document.querySelector('.map-detail h3')?.textContent==='Arcturus'",
						),
					"native map search",
				);
				await snapshot("04-map");
				await tap('.modal [data-action="jump"][data-id="arcturus"]');
				await waitFor(
					() => execute("return window.meridian.state.systemId==='arcturus'"),
					"jump to Arcturus",
				);
				await tap('[data-action="land"]');
				await waitFor(
					() => execute("return window.meridian.state.mode==='port'"),
					"physical assisted docking",
					120000,
				);
				await tap('[data-action="story"][data-choice="complete"]');
				assert.equal(
					await execute("return window.meridian.state.storyIndex"),
					1,
				);
				await snapshot("05-first-mission-complete");
				evidence.checks.push(
					"Trusted native taps accept the first mission, launch, search the map, jump, physically auto-dock and complete the mission",
				);
				await tap('.modal [data-action="close"]');
				await tap('.hud-nav [data-action="options"]');
				await tap('.modal [data-action="toggleMute"]');
				await waitFor(
					() =>
						execute(
							"return window.meridian.audio.loaded===11&&window.meridian.audio.contextState==='running'",
						),
					"native-gesture audio activation",
					90000,
				);
				evidence.audio = await execute("return window.meridian.audio");
				assert.equal(evidence.audio.muted, false);
				assert.deepEqual(evidence.audio.errors, []);
				await snapshot("06-options-audio");
				evidence.checks.push(
					"Eleven audio buffers decode; native user input resumes AudioContext and unmutes playback",
				);
				evidence.errorsBeforeReload = await execute(
					"return mobileAudit.errors",
				);
				assert.deepEqual(evidence.errorsBeforeReload, []);
				await command("/refresh", "POST", {}, 65000);
				await waitFor(
					() => execute("return Boolean(window.meridian)"),
					"reload renderer",
					90000,
				);
				await instrument();
				await tap('[data-action="continue"]');
				assert.equal(
					await execute("return window.meridian.state.storyIndex"),
					1,
				);
				assert.equal(
					await execute("return window.meridian.state.systemId"),
					"arcturus",
				);
				await snapshot("07-local-save-restored");
				evidence.checks.push(
					"Local save survives page reload and native Continue inside the same isolated Safari session",
				);
				// Safari documents window resize as unsupported on iOS. Probe only the
				// legacy native orientation extension; never emulate rotation with CSS.
				try {
					const before = await command("/orientation", "GET", undefined, 8000);
					await command(
						"/orientation",
						"POST",
						{ orientation: "LANDSCAPE" },
						8000,
					);
					await waitFor(
						() => execute("return innerWidth>innerHeight"),
						"native landscape rotation",
						10000,
					);
					await snapshot("08-native-landscape");
					evidence.orientation = {
						status: "native-landscape-observed",
						endpoint: "/orientation",
						before,
					};
					await command("/orientation", "POST", { orientation: before }, 8000);
				} catch (error) {
					if (transportTimedOut) throw error;
					evidence.orientation = {
						status: "unsupported-or-unconfirmed",
						error: error.message,
						boundary:
							"No viewport or CSS resize substituted for actual rotation",
					};
				}
				evidence.finalErrors = await execute("return mobileAudit.errors");
				assert.deepEqual(evidence.finalErrors, []);
				evidence.status = "passed";
			} catch (error) {
				evidence.status = "failed";
				evidence.error = error.stack;
				evidence.failurePhase = evidence.phase;
				evidence.transportTimedOut = transportTimedOut;
				await persist();
				if (session && !transportTimedOut) {
					try {
						evidence.failureBody = await execute(
							"return document.body.innerText",
						);
						await snapshot("failure");
					} catch {}
				}
				try {
					await host(
						"xcrun",
						[
							"simctl",
							"io",
							device.udid,
							"screenshot",
							`${directory}/failure-device.png`,
						],
						15000,
					);
				} catch {}
				await diagnostics();
			} finally {
				if (session && !transportTimedOut) {
					try {
						await command("", "DELETE", undefined, 5000);
					} catch {}
				}
				driver?.kill("SIGTERM");
				if (driver) {
					await delay(300);
					if (driver.exitCode === null) driver.kill("SIGKILL");
				}
				await driverDiagnostics();
				// A wedged iOS Automation pairing may outlive safaridriver itself.
				try {
					await host(
						"xcrun",
						["simctl", "terminate", device.udid, "com.apple.mobilesafari"],
						15000,
					);
				} catch {}
				if (bootedHere) {
					try {
						await host("xcrun", ["simctl", "shutdown", device.udid], 30000);
					} catch {}
				}
				if (createdHere) {
					try {
						await host("xcrun", ["simctl", "delete", device.udid], 30000);
					} catch (error) {
						evidence.cleanupError = error.message;
					}
				}
				evidence.finishedAt = new Date().toISOString();
				await persist();
				console.log(
					`${device.family}: ${evidence.status} — ${directory}/evidence.json`,
				);
			}
		}
		summary.status = summary.devices.every(
			(device) => device.status === "passed",
		)
			? "passed"
			: "failed";
		if (summary.status !== "passed") process.exitCode = 1;
	} catch (error) {
		summary.status = "failed";
		summary.error = error.stack;
		process.exitCode = 1;
	} finally {
		server?.kill("SIGTERM");
		summary.finishedAt = new Date().toISOString();
		await writeFile(
			`${artifacts}/evidence.json`,
			`${JSON.stringify(summary, null, 2)}\n`,
		);
		await writeFile(`${artifacts}/runner.log`, `${runnerLog.join("\n")}\n`);
		console.log(
			`Mobile Safari audit: ${summary.status}; evidence: ${artifacts}/evidence.json`,
		);
	}
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
	await main();
