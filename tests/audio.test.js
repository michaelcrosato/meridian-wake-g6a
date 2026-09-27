import assert from "node:assert/strict";
import test from "node:test";
import { AudioManager } from "../src/audio.js";

const deferred = () => {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return { promise, resolve };
};
function fixture(t, delays = {}, failures = new Set()) {
	const requests = [];
	const assets = {
		laser: { url: "/laser.flac", loop: false },
		music: { url: "/music.opus", loop: true },
		port: { url: "/port.opus", loop: true },
	};
	class Context {
		state = "running";
		currentTime = 1;
		createGain() {
			return {
				connect() {},
				disconnect() {},
				gain: {
					value: 1,
					cancelScheduledValues() {},
					setValueAtTime(value) {
						this.value = value;
					},
					setTargetAtTime(value) {
						this.value = value;
					},
				},
			};
		}
		createBufferSource() {
			return {
				connect() {},
				disconnect() {},
				start() {},
				stop() {
					this.onended?.();
				},
			};
		}
		async decodeAudioData(buffer) {
			return { buffer };
		}
		async resume() {
			this.state = "running";
		}
		async suspend() {
			this.state = "suspended";
		}
		async close() {
			this.state = "closed";
		}
	}
	const original = globalThis.AudioContext;
	globalThis.AudioContext = Context;
	t.after(() => {
		if (original) globalThis.AudioContext = original;
		else delete globalThis.AudioContext;
	});
	t.mock.method(globalThis, "fetch", async (url) => {
		requests.push(url);
		if (delays[url]) await delays[url].promise;
		if (failures.delete(url)) throw new TypeError("Failed to fetch");
		return {
			ok: true,
			json: async () => ({ assets }),
			arrayBuffer: async () => new ArrayBuffer(4),
		};
	});
	return { requests };
}

test("muted play downloads no audio; unmuting loads effects and only the selected ambience", async (t) => {
	const { requests } = fixture(t);
	const audio = new AudioManager({ muted: true });
	await audio.init();
	await audio.startMusic("port");
	assert.deepEqual(requests, []);
	assert.equal(audio.context, null);
	audio.setMuted(false);
	await audio.startMusic("port");
	assert.deepEqual([...audio.buffers.keys()].sort(), ["laser", "port"]);
	assert.equal(audio.music.id, "port");
	assert.ok(!requests.includes("/music.opus"));
	await audio.startMusic("music");
	assert.equal(audio.music.id, "music");
	assert.equal(audio.buffers.size, 3);
	assert.equal(requests.filter((url) => url === "/port.opus").length, 1);
	await audio.dispose();
});

test("a slow old ambience request cannot replace the latest scene's audio", async (t) => {
	const delay = deferred();
	fixture(t, { "/music.opus": delay });
	const audio = new AudioManager();
	await audio.init();
	const old = audio.startMusic("music");
	await Promise.resolve();
	await audio.startMusic("port");
	delay.resolve();
	await old;
	assert.equal(audio.music.id, "port");
	audio.setMuted(true);
	assert.equal(audio.music, null);
	await audio.dispose();
});

test("concurrent loads share a request and disposed managers discard its result", async (t) => {
	const delay = deferred();
	const { requests } = fixture(t, { "/port.opus": delay });
	const audio = new AudioManager();
	await audio.init();
	const first = audio.loadAsset("port"),
		second = audio.loadAsset("port");
	assert.equal(first, second);
	await Promise.resolve();
	await audio.dispose();
	delay.resolve();
	assert.equal(await first, false);
	assert.equal(audio.buffers.size, 0);
	assert.equal(requests.filter((url) => url === "/port.opus").length, 1);
	assert.deepEqual(audio.errors, []);
});

test("a failed manifest or effect request is retried by the next audio request", async (t) => {
	const failures = new Set(["/audio/manifest.json", "/laser.flac"]);
	const { requests } = fixture(t, {}, failures);
	const audio = new AudioManager();
	assert.equal(await audio.init(), false);
	// The next request retries the manifest; the effect then fails once.
	assert.equal(await audio.startMusic("port"), true);
	assert.equal(audio.buffers.has("laser"), false);
	await audio.startMusic("port");
	assert.deepEqual([...audio.buffers.keys()].sort(), ["laser", "port"]);
	assert.equal(requests.filter((url) => url === "/laser.flac").length, 2);
	await audio.init();
	assert.equal(requests.filter((url) => url === "/laser.flac").length, 2);
	await audio.dispose();
});

test("effects are dropped rather than queued while audio is suspended or the tab is hidden", async (t) => {
	fixture(t);
	const audio = new AudioManager();
	await audio.init();
	await audio.startMusic("music");
	audio.setBackground(true);
	await Promise.resolve();
	assert.equal(audio.context.state, "suspended");
	assert.equal(audio.play("laser"), false);
	audio.setBackground(false);
	await Promise.resolve();
	assert.equal(audio.play("laser"), true);
	assert.equal(audio.music.id, "music");
	await audio.dispose();
});
