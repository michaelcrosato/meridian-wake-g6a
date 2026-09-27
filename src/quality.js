const WARMUP_MS = 3000;
const WINDOW_MS = 4000;
const COOLDOWN_MS = 12000;
const MIN_SAMPLES = 8;

/** Measure visible rendering time independently of the clamped simulation clock. */
export function createQualitySampler() {
	let previous = null;
	let warmup = 0;
	let cooldown = 0;
	let duration = 0;
	let samples = [];
	let trialUpgrade = false;
	let upgradeFailed = false;
	function suspend() {
		previous = null;
		duration = 0;
		samples = [];
	}
	return {
		reset() {
			suspend();
			warmup = 0;
			cooldown = 0;
			trialUpgrade = false;
			upgradeFailed = false;
		},
		suspend,
		observe(now, quality, effective) {
			if (!Number.isFinite(now)) return { frameMs: null, preset: null };
			if (previous === null) {
				previous = now;
				return { frameMs: null, preset: null };
			}
			const frameMs = Math.max(1, now - previous);
			previous = now;
			const result = { frameMs, preset: null };
			if (quality !== "Auto") return result;
			if (warmup < WARMUP_MS) {
				warmup += frameMs;
				return result;
			}
			if (cooldown > 0) {
				cooldown = Math.max(0, cooldown - frameMs);
				return result;
			}
			// Slow foreground frames are the strongest reason to lower quality.
			// A suspended tab is excluded explicitly, never by rejecting large values.
			samples.push(frameMs);
			duration += frameMs;
			if (duration < WINDOW_MS || samples.length < MIN_SAMPLES) return result;
			const sorted = samples.sort((a, b) => a - b);
			const p75 = sorted[Math.floor(sorted.length * 0.75)];
			// Frames never arrive faster than the display refreshes, so on a 60 Hz
			// screen a steady display-rate window is the only visible headroom.
			const refresh = sorted[Math.floor(sorted.length * 0.1)];
			const displayLimited = p75 < 18 && p75 <= refresh * 1.1;
			if (effective === "High" && p75 > 23) {
				result.preset = "Balanced";
				// High failed its first window after an upgrade; do not oscillate.
				if (trialUpgrade) upgradeFailed = true;
			} else if (
				effective === "Balanced" &&
				!upgradeFailed &&
				(p75 < 13 || displayLimited)
			)
				result.preset = "High";
			trialUpgrade = result.preset === "High";
			samples = [];
			duration = 0;
			if (result.preset) cooldown = COOLDOWN_MS;
			return result;
		},
	};
}
