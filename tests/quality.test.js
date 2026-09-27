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
