import assert from "node:assert/strict";
import test from "node:test";
import { createQualitySampler } from "../src/quality.js";

test("Auto lowers High after 500ms foreground frames using visible wall time", () => {
	const sampler = createQualitySampler();
	let selected;
	for (let now = 0; now <= 8000; now += 500) {
		const result = sampler.observe(now, "Auto", "High");
		if (result.preset) selected = { now, ...result };
	}
	assert.equal(selected?.preset, "Balanced");
	assert.equal(selected.now, 7000);
	assert.equal(selected.frameMs, 500);
});

test("hidden and intentionally skipped rendering gaps do not affect quality or displayed frame time", () => {
	const sampler = createQualitySampler();
	let now = 0;
	for (let i = 0; i < 240; i++) {
		now += 1000 / 60;
		assert.equal(sampler.observe(now, "Auto", "High").preset, null);
	}
	sampler.suspend();
	now += 600000;
	assert.deepEqual(sampler.observe(now, "Auto", "High"), {
		frameMs: null,
		preset: null,
	});
	for (let i = 0; i < 300; i++) {
		now += 1000 / 60;
		const result = sampler.observe(now, "Auto", "High");
		assert.equal(result.preset, null);
		assert.ok(result.frameMs < 17);
	}
});

test("Auto retains hysteresis and a 12-second visible cooldown", () => {
	const sampler = createQualitySampler();
	for (let now = 0; now < 7000; now += 500)
		sampler.observe(now, "Auto", "High");
	assert.equal(sampler.observe(7000, "Auto", "High").preset, "Balanced");
	for (let now = 7010; now < 23000; now += 10)
		assert.equal(sampler.observe(now, "Auto", "Balanced").preset, null);
	assert.equal(sampler.observe(23000, "Auto", "Balanced").preset, "High");
});

test("manual presets remain fixed even on very slow frames", () => {
	for (const preset of ["High", "Balanced"]) {
		const sampler = createQualitySampler();
		for (let now = 0; now < 30000; now += 1000)
			assert.equal(sampler.observe(now, preset, preset).preset, null);
	}
});

// Feeds frames until the first preset change, which it applies and reports.
function run(sampler, from, to, interval, preset) {
	for (let now = from; now < to; now += interval) {
		const result = sampler.observe(now, "Auto", preset.current);
		if (result.preset) {
			preset.current = result.preset;
			return { now, preset: result.preset };
		}
	}
	return null;
}

test("Auto returns to High on a 60 Hz display once Balanced holds the display rate", () => {
	const sampler = createQualitySampler();
	const preset = { current: "High" };
	assert.equal(run(sampler, 0, 9000, 40, preset)?.preset, "Balanced");
	const frame = 1000 / 60;
	const upgrade = run(sampler, 9000, 40000, frame, preset);
	assert.equal(upgrade?.preset, "High");
	assert.equal(run(sampler, upgrade.now + frame, 90000, frame, preset), null);
	assert.equal(preset.current, "High");
});

test("Auto does not oscillate when High fails right after an upgrade, or upgrade slow steady frames", () => {
	const sampler = createQualitySampler();
	const preset = { current: "High" };
	run(sampler, 0, 9000, 40, preset);
	const upgrade = run(sampler, 9000, 40000, 1000 / 60, preset);
	assert.equal(upgrade?.preset, "High");
	// High is too slow from its first frames: revert once, then stay Balanced.
	const start = upgrade.now + 30;
	assert.equal(run(sampler, start, 80000, 30, preset)?.preset, "Balanced");
	assert.equal(run(sampler, 80000, 200000, 1000 / 60, preset), null);

	const steady = createQualitySampler();
	const slow = { current: "Balanced" };
	assert.equal(run(steady, 0, 60000, 30, slow), null);
});

test("Auto keeps measuring between unchanged windows", () => {
	const sampler = createQualitySampler();
	const preset = { current: "High" };
	assert.equal(run(sampler, 0, 8000, 1000 / 60, preset), null);
	// A dip shorter than the former 12-second blind period is still noticed.
	assert.equal(run(sampler, 8000, 16000, 40, preset)?.preset, "Balanced");
});
