import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const walk = (path) =>
	readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? walk(join(path, entry.name))
			: [join(path, entry.name)],
	);
const sum = (paths) =>
	paths.reduce((total, path) => total + statSync(path).size, 0);
const files = walk("dist");
const scripts = files.filter((path) => path.endsWith(".js"));
const optional = scripts.filter((path) =>
	/source-(archive|missions)-/.test(path),
);
const initial = scripts.filter((path) => !optional.includes(path));
const wasm = files.filter((path) => path.endsWith(".wasm"));
const fonts = files.filter((path) => path.endsWith(".woff2"));
const audio = JSON.parse(readFileSync("public/audio/manifest.json", "utf8"));
const audioPaths = Object.values(audio.assets).map(
	(asset) => `dist${asset.url}`,
);
const tracked = execFileSync("git", [
	"ls-files",
	"--cached",
	"--others",
	"--exclude-standard",
	"-z",
])
	.toString()
	.split("\0")
	.filter((path) => path && existsSync(path));

// Explicit limits guard the delivery changes; budgets do not replace gameplay verification.
assert.ok(
	sum(tracked) < 12 * 1024 ** 2,
	"Tracked working tree exceeds 12 MiB; inspect generated data and audit artifacts.",
);
assert.ok(sum(files) < 24 * 1024 ** 2, "Deployment exceeds 24 MiB.");
assert.ok(
	sum(initial) < 4 * 1024 ** 2,
	"Initial JavaScript exceeds 4 MiB; keep native Contacts lazy and WASM external.",
);
assert.ok(sum(audioPaths) < 3 * 1024 ** 2, "Audio exceeds 3 MiB.");
assert.equal(wasm.length, 1, "Expected one external physics WASM asset.");
assert.equal(fonts.length, 2, "Expected two WOFF2 fonts.");
assert.deepEqual(
	readFileSync(wasm[0]),
	readFileSync(
		"node_modules/@dimforge/rapier3d-compat/dist/rapier_wasm3d_bg.wasm",
	),
);
for (const path of scripts)
	assert.ok(
		!/AGFzbQ[A-Za-z0-9+/=]{10000}/.test(readFileSync(path, "utf8")),
		"Physics WASM is embedded as base64 again.",
	);
assert.ok(
	!files.some((path) => /\.(ttf|wav|mp3|map|json\.gz)$/.test(path)),
	"Raw/duplicate development assets leaked into the deployment.",
);
for (const asset of Object.values(audio.assets))
	assert.match(asset.url, /-[a-f0-9]{12}\.(flac|opus)$/);

const compressed = (paths, compress) =>
	paths.reduce((n, path) => n + compress(readFileSync(path)).length, 0);
console.log(
	JSON.stringify(
		{
			trackedBytes: sum(tracked),
			trackedFiles: tracked.length,
			deploymentBytes: sum(files),
			deploymentFiles: files.length,
			initialJavaScriptBytes: sum(initial),
			initialJavaScriptGzipBytes: compressed(initial, (data) =>
				gzipSync(data, { level: 9 }),
			),
			initialJavaScriptBrotliBytes: compressed(initial, (data) =>
				brotliCompressSync(data, {
					params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
				}),
			),
			wasmBytes: sum(wasm),
			wasmGzipBytes: compressed(wasm, (data) => gzipSync(data, { level: 9 })),
			fontBytes: sum(fonts),
			audioBytes: sum(audioPaths),
			optionalNativeArchiveBytes: sum(optional),
			compressionNote:
				"gzip/Brotli figures are local estimates, not measured Vercel transfers; WASM is fetched separately.",
		},
		null,
		2,
	),
);
