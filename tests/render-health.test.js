import assert from "node:assert/strict";
import test from "node:test";
import { watchRenderHealth } from "../src/render-health.js";

test("device loss disables updates before reporting once and preserves renderer handling", () => {
	const reports = [];
	const renderer = {
		calls: 0,
		onDeviceLost(info) {
			this.calls++;
			this.lost = info;
		},
	};
	const health = watchRenderHealth(renderer, (info) => {
		assert.equal(health.ready, false);
		assert.equal(renderer.calls, 1);
		reports.push(info);
	});
	assert.equal(health.ready, true);
	const event = { api: "WebGL", message: "context lost", originalEvent: {} };
	renderer.onDeviceLost(event);
	renderer.onDeviceLost(event);
	assert.equal(renderer.calls, 1);
	assert.deepEqual(reports, [
		{ api: "WebGL", message: "context lost", reason: null },
	]);
	assert.equal(renderer.lost, event);
	reports[0].message = "modified by caller";
	assert.equal(health.loss.message, "context lost");
});

test("intentional disposal never triggers a recovery callback", () => {
	let reports = 0;
	const renderer = {
		onDeviceLost() {
			throw new Error("disposed renderer callback");
		},
	};
	const health = watchRenderHealth(renderer, () => reports++);
	health.dispose();
	health.dispose();
	renderer.onDeviceLost({ api: "WebGPU", reason: "destroyed" });
	assert.equal(health.ready, false);
	assert.equal(health.loss, null);
	assert.equal(reports, 0);
});
