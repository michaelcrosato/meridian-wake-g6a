import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

// Exercise a vendor browser through its native W3C WebDriver server.
// This script intentionally uses actual click/key endpoints for all controls.
const browserName = process.env.WEBDRIVER_BROWSER || "safari";
const browserLabel =
	browserName === "firefox" ? "Mozilla Firefox Stable" : "Apple Safari";
const root = process.env.WEBDRIVER_URL || "http://127.0.0.1:4174";
const driverRoot = "http://127.0.0.1:4444";
const artifacts = process.env.WEBDRIVER_ARTIFACTS || `artifacts/${browserName}`;
await mkdir(artifacts, { recursive: true });
const server = spawn(
	process.execPath,
	[
		"node_modules/vite/bin/vite.js",
		"preview",
		"--host",
		"127.0.0.1",
		"--port",
		new URL(root).port || "4174",
		"--strictPort",
	],
	{ stdio: ["ignore", "pipe", "pipe"] },
);
const driver = spawn(
	process.env.WEBDRIVER_EXECUTABLE || "/usr/bin/safaridriver",
	["--port", "4444"],
	{
		stdio: ["ignore", "pipe", "pipe"],
	},
);
const output = [];
for (const proc of [server, driver])
	for (const stream of [proc.stdout, proc.stderr])
		stream.on("data", (b) => output.push(b.toString()));
let session;
const evidence = {
	browser: browserLabel,
	startedAt: new Date().toISOString(),
	checks: [],
	screens: [],
};
async function command(path, method = "GET", body) {
	const response = await fetch(
		`${driverRoot}${session ? `/session/${session}` : ""}${path}`,
		{
			method,
			headers: { "Content-Type": "application/json" },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
			signal: AbortSignal.timeout(90000),
		},
	);
	const json = await response.json();
	if (!response.ok || json.value?.error)
		throw new Error(`${path}: ${JSON.stringify(json.value)}`);
	return json.value;
}
async function until(fn, timeout = 60000) {
	const start = Date.now();
	let error;
	while (Date.now() - start < timeout) {
		try {
			const result = await fn();
			if (result) return result;
		} catch (e) {
			error = e;
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw error || new Error("Timed out waiting for browser state");
}
const execute = (script, args = []) =>
	command("/execute/sync", "POST", { script, args });
const find = (selector) =>
	command("/element", "POST", { using: "css selector", value: selector }).then(
		(e) => e["element-6066-11e4-a52e-4f735466cecf"],
	);
async function click(selector) {
	const id = await until(() => find(selector));
	await command(`/element/${id}/click`, "POST", {});
}
async function key(value, holdMs = 0) {
	await command("/actions", "POST", {
		actions: [
			{
				type: "key",
				id: "keyboard",
				actions: [
					{ type: "keyDown", value },
					{ type: "pause", duration: holdMs },
					{ type: "keyUp", value },
				],
			},
		],
	});
}
async function screenshot(name) {
	const data = await command("/screenshot");
	await writeFile(`${artifacts}/${name}.png`, Buffer.from(data, "base64"));
}
try {
	await until(async () => {
		const r = await fetch(root);
		return r.ok;
	});
	await until(async () => {
		const r = await fetch(`${driverRoot}/status`);
		return r.ok;
	});
	const created = await command("/session", "POST", {
		capabilities: {
			alwaysMatch: {
				browserName,
				...(browserName === "firefox"
					? {
							"moz:firefoxOptions": {
								binary: process.env.FIREFOX_BINARY,
								prefs: { "webgl.force-enabled": true },
							},
						}
					: {}),
				acceptInsecureCerts: false,
			},
		},
	});
	session = created.sessionId;
	evidence.capabilities = created.capabilities;
	await command("/window/rect", "POST", { width: 1440, height: 1000 });
	await command("/url", "POST", { url: root });
	await until(() => execute("return Boolean(window.meridian)"));
	await execute(
		"localStorage.setItem('meridian-wake-settings-v1',JSON.stringify({quality:'Balanced',muted:true,volume:0.4}));localStorage.removeItem('meridian-wake-save-v1');return true;",
	);
	await command("/refresh", "POST", {});
	await until(() => execute("return Boolean(window.meridian)"));
	await execute(
		'window.auditErrors=[];addEventListener("error",e=>auditErrors.push(e.message));addEventListener("unhandledrejection",e=>auditErrors.push(String(e.reason)));return true;',
	);
	evidence.initial = await execute(
		"return {userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},telemetry:window.meridian.telemetry}",
	);
	for (const [width, height] of [
		[1440, 1000],
		[1366, 900],
		[1024, 850],
		[800, 700],
	]) {
		await command("/window/rect", "POST", { width, height });
		const actual = await execute(
			"return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}",
		);
		assert.equal(actual.overflow, false);
		evidence.screens.push(actual);
		await screenshot(`title-${width}x${height}`);
	}
	evidence.checks.push(
		"Title renders at four actual browser window sizes without horizontal overflow",
	);
	await command("/window/rect", "POST", { width: 1440, height: 1000 });
	await click('[data-action="new"]');
	await click('[data-action="begin"]');
	await until(() => execute('return window.meridian.state.mode === "port"'));
	await click('[data-action="story"][data-choice="accept"]');
	assert.equal(
		await execute("return window.meridian.state.activeStory.id"),
		"first-passage",
	);
	await click('.modal [data-action="launch"]');
	await until(() => execute('return window.meridian.state.mode === "flight"'));
	await key("w", 800);
	await until(() => execute("return window.meridian.telemetry.speed > 1"));
	await key("\uE013", 400);
	await key("\uE015", 400);
	await key(" ", 300);
	await key("m");
	const input = await find("#system-search");
	await command(`/element/${input}/value`, "POST", { text: "Arcturus" });
	await key("\uE004");
	await click('[data-action="jump"]');
	await until(() =>
		execute('return window.meridian.state.systemId === "arcturus"'),
	);
	await click('[data-action="land"]');
	await until(
		() => execute('return window.meridian.state.mode === "port"'),
		90000,
	);
	await click('[data-action="story"][data-choice="complete"]');
	assert.equal(await execute("return window.meridian.state.storyIndex"), 1);
	evidence.checks.push(
		"Keyboard flight, arrows, primary fire, map search, jump, assisted dock and actual mission completion",
	);
	await screenshot("completed-first-mission");
	await key("\uE00C");
	await click('.hud-nav [data-action="options"]');
	await click('.modal [data-action="toggleMute"]');
	await until(() => execute("return window.meridian.audio.loaded === 10"));
	evidence.audio = await execute("return window.meridian.audio");
	assert.equal(evidence.audio.contextState, "running");
	assert.deepEqual(evidence.audio.errors, []);
	evidence.checks.push(
		"Nine effects and the selected port ambience decode; AudioContext resumes through actual input",
	);
	evidence.errorsBeforeReload = await execute(
		"return window.auditErrors || []",
	);
	assert.deepEqual(evidence.errorsBeforeReload, []);
	await command("/refresh", "POST", {});
	await until(() => execute("return Boolean(window.meridian)"));
	await click('[data-action="continue"]');
	assert.equal(await execute("return window.meridian.state.storyIndex"), 1);
	evidence.checks.push("Local save survives page reload and Continue");
	evidence.final = await execute(
		"return {telemetry:window.meridian.telemetry,state:{mode:window.meridian.state.mode,systemId:window.meridian.state.systemId,storyIndex:window.meridian.state.storyIndex},errors:window.auditErrors||[]}",
	);
	assert.deepEqual(evidence.final.errors, []);
	evidence.status = "passed";
} catch (error) {
	evidence.status = "failed";
	evidence.error = error.stack;
	if (session) {
		try {
			evidence.body = await execute("return document.body.innerText");
			await screenshot("failure");
		} catch {}
	}
	process.exitCode = 1;
} finally {
	if (session)
		try {
			await command("", "DELETE");
		} catch {}
	server.kill("SIGTERM");
	driver.kill("SIGTERM");
	evidence.finishedAt = new Date().toISOString();
	await writeFile(
		`${artifacts}/evidence.json`,
		JSON.stringify(evidence, null, 2) + "\n",
	);
	await writeFile(`${artifacts}/runner.log`, output.join(""));
	console.log(JSON.stringify(evidence, null, 2));
}
