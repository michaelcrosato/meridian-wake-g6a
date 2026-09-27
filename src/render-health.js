/** Keep a lost graphics device from leaving a live, invisible simulation behind. */
export function watchRenderHealth(renderer, onDeviceLost) {
	const original = renderer.onDeviceLost;
	let loss = null;
	let disposed = false;
	renderer.onDeviceLost = (info = {}) => {
		if (disposed || loss) return;
		loss = {
			api: String(info.api || "Graphics"),
			message: String(
				info.message || "The graphics device became unavailable.",
			),
			reason: info.reason ? String(info.reason) : null,
		};
		// Retain Three's own device-loss flag and diagnostics before notifying the UI.
		original?.call(renderer, info);
		onDeviceLost?.({ ...loss });
	};
	return {
		get ready() {
			return !disposed && !loss;
		},
		get loss() {
			return loss ? { ...loss } : null;
		},
		dispose() {
			disposed = true;
		},
	};
}
