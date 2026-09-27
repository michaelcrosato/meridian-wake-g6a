import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Keep Rapier's Node-compatible entry, but emit its identical WASM separately for browsers. */
export function rapierAssetPlugin() {
	let base = "/";
	return {
		name: "meridian-rapier-wasm-asset",
		enforce: "pre",
		configResolved(config) {
			base = config.base;
		},
		// Start the download with the HTML instead of after scripts evaluate, behind the
		// scripts that must parse first. The attributes match wasm-bindgen's default fetch()
		// so browsers reuse the preloaded response.
		transformIndexHtml(_html, { bundle }) {
			const wasm = Object.values(bundle || {}).find((file) =>
				/(^|\/)rapier_wasm3d_bg-[\w-]+\.wasm$/.test(file.fileName),
			);
			if (!wasm) return;
			return [
				{
					tag: "link",
					attrs: {
						rel: "preload",
						href: `${base}${wasm.fileName}`,
						as: "fetch",
						type: "application/wasm",
						crossorigin: "",
						fetchpriority: "low",
					},
					injectTo: "head",
				},
			];
		},
		load(id) {
			if (
				!id
					.replaceAll("\\", "/")
					.endsWith("/@dimforge/rapier3d-compat/dist/rapier.mjs")
			)
				return;
			const source = readFileSync(id, "utf8");
			const expressions = [
				...source.matchAll(
					/[\w$]+\.toByteArray\("(AGFzbQ[A-Za-z0-9+/=]+)"\)\.buffer/g,
				),
			];
			if (expressions.length !== 1)
				throw new Error(
					"Rapier's pinned WASM initializer changed; review the asset extraction plugin before upgrading.",
				);
			const wasmPath = join(dirname(id), "rapier_wasm3d_bg.wasm");
			if (
				!Buffer.from(expressions[0][1], "base64").equals(readFileSync(wasmPath))
			)
				throw new Error("Rapier's inline and packaged WASM bytes differ.");
			this.addWatchFile(wasmPath);
			return `import meridianWasmUrl from "./rapier_wasm3d_bg.wasm?url";\n${source.replace(expressions[0][0], "meridianWasmUrl")}`;
		},
	};
}
