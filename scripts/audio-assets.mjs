import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");

/** Re-encode pinned originals, retaining both source and output integrity records. */
export async function rebuildAudio(sourceDirectory) {
	const manifestPath = "public/audio/manifest.json";
	const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
	const cache = resolve(".cache/audio-originals");
	await mkdir(cache, { recursive: true });
	const obsolete = [];
	for (const [id, asset] of Object.entries(manifest.assets)) {
		const extension = extname(asset.sourcePath);
		const input = resolve(cache, `${id}${extension}`);
		let original;
		try {
			original = await readFile(
				sourceDirectory ? resolve(sourceDirectory, `${id}${extension}`) : input,
			);
		} catch {
			const response = await fetch(asset.source);
			if (!response.ok)
				throw new Error(`${id}: source HTTP ${response.status}`);
			original = Buffer.from(await response.arrayBuffer());
		}
		const sourceHash = asset.sourceSha256 || asset.sha256;
		if (digest(original) !== sourceHash)
			throw new Error(`${id}: original source checksum differs`);
		await writeFile(input, original);
		const lossless = asset.type === "sfx";
		const outputExtension = lossless ? "flac" : "opus";
		const output = resolve(cache, `${id}.optimized.${outputExtension}`);
		const encoding = lossless
			? ["-c:a", "flac", "-compression_level", "12"]
			: [
					"-c:a",
					"libopus",
					"-b:a",
					id === "port" ? "64k" : "48k",
					"-application",
					"audio",
				];
		const run = spawnSync(
			"ffmpeg",
			[
				"-hide_banner",
				"-loglevel",
				"error",
				"-y",
				"-i",
				input,
				"-map_metadata",
				"-1",
				"-fflags",
				"+bitexact",
				"-flags:a",
				"+bitexact",
				...encoding,
				output,
			],
			{ encoding: "utf8" },
		);
		if (run.status !== 0)
			throw new Error(`${id}: ffmpeg failed: ${run.stderr}`);
		const encoded = await readFile(output);
		await unlink(output);
		const sha256 = digest(encoded);
		const url = `/audio/${id}-${sha256.slice(0, 12)}.${outputExtension}`;
		await writeFile(`public${url}`, encoded);
		if (asset.url !== url) obsolete.push(`public${asset.url}`);
		Object.assign(asset, {
			url,
			sha256,
			bytes: encoded.length,
			sourceSha256: sourceHash,
			sourceBytes: original.length,
			modified: true,
			encoding: lossless
				? "FLAC; lossless PCM"
				: `Ogg Opus; ${id === "port" ? 64 : 48} kbps VBR`,
		});
	}
	manifest.version = 2;
	manifest.provenanceNote =
		"Audio from the pinned official Endless Sky source. SFX use lossless FLAC; ambience uses Ogg Opus. Source and optimized checksums are recorded separately. Compression authorized in the repository optimization request on 2026-09-27.";
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`);
	for (const path of obsolete) {
		// Only retire files explicitly superseded by this manifest.
		if (dirname(resolve(path)) === resolve("public/audio"))
			await unlink(path).catch((error) => {
				if (error.code !== "ENOENT") throw error;
			});
	}
	console.log(
		`Optimized ${Object.keys(manifest.assets).length} audio assets; ${Object.values(manifest.assets).reduce((n, a) => n + a.bytes, 0)} bytes.`,
	);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
	await rebuildAudio(process.argv[2]);
