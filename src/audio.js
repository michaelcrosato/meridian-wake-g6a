/** Audio assets and tuning come exclusively from /audio/manifest.json. */
export class AudioManager {
	constructor(options = {}) {
		this.volume = Math.min(1, Math.max(0, options.volume ?? 0.6));
		this.muted = options.muted ?? false;
		this.context = null;
		this.master = null;
		this.manifest = null;
		this.buffers = new Map();
		this.lastPlayed = new Map();
		this.voices = new Set();
		this.music = null;
		this.errors = [];
		this.ready = null;
		this.manifestReady = null;
		this.pending = new Map();
		this.desiredMusic = "music";
		this.musicRequest = 0;
	}

	// Call from a click/tap/key handler so the browser grants audio playback.
	init() {
		if (this.muted) return Promise.resolve(false);
		const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!Context) return Promise.resolve(false);
		if (!this.context) {
			this.context = new Context();
			this.master = this.context.createGain();
			this.master.connect(this.context.destination);
			this.updateGain();
		}
		// Resume before awaiting network operations; this retains user activation.
		if (this.context.state === "suspended")
			this.context.resume().catch(() => {});
		if (this.ready) return this.ready;
		const ready = this.load();
		this.ready = ready;
		// A failed request is retried by the next init instead of silencing the session.
		ready.then(() => {
			if (this.ready !== ready) return;
			const assets = Object.entries(this.manifest?.assets || {});
			if (
				!assets.length ||
				assets.some(([id, asset]) => !asset.loop && !this.buffers.has(id))
			)
				this.ready = null;
		});
		return ready;
	}

	loadManifest() {
		this.manifestReady ??= (async () => {
			const response = await fetch("/audio/manifest.json");
			if (!response.ok)
				throw new Error(`Audio manifest: HTTP ${response.status}`);
			this.manifest = await response.json();
			return this.manifest;
		})().catch((error) => {
			this.manifestReady = null;
			throw error;
		});
		return this.manifestReady;
	}

	loadAsset(id) {
		if (this.buffers.has(id)) return Promise.resolve(true);
		if (this.pending.has(id)) return this.pending.get(id);
		const context = this.context;
		const asset = this.manifest?.assets[id];
		if (!context || !asset) return Promise.resolve(false);
		const request = Promise.resolve().then(async () => {
			try {
				const response = await fetch(asset.url);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const buffer = await context.decodeAudioData(
					await response.arrayBuffer(),
				);
				if (this.context !== context) return false;
				this.buffers.set(id, buffer);
				return true;
			} catch (error) {
				if (this.context === context)
					this.errors.push(`${id}: ${error.message}`);
				return false;
			} finally {
				if (this.pending.get(id) === request) this.pending.delete(id);
			}
		});
		this.pending.set(id, request);
		return request;
	}

	async load() {
		try {
			await this.loadManifest();
			// Short effects are ready for interaction; long ambience loads only when selected.
			await Promise.all(
				Object.entries(this.manifest.assets)
					.filter(([, asset]) => !asset.loop)
					.map(([id]) => this.loadAsset(id)),
			);
			return this.buffers.size > 0;
		} catch (error) {
			this.errors.push(error.message);
			return false;
		}
	}

	play(id) {
		if (!this.context || !this.buffers.has(id) || this.muted) return false;
		const asset = this.manifest.assets[id];
		if (!asset || (asset.loop && this.music?.id === id)) return false;
		// A suspended context would queue effects and release them all at once.
		if (!asset.loop && this.context.state !== "running") return false;
		const now = this.context.currentTime;
		if (now - (this.lastPlayed.get(id) ?? -Infinity) < (asset.cooldown ?? 0))
			return false;
		if (this.voices.size >= 24) return false;
		const source = this.context.createBufferSource();
		const gain = this.context.createGain();
		source.buffer = this.buffers.get(id);
		source.loop = !!asset.loop;
		gain.gain.value = asset.gain ?? 1;
		source.connect(gain);
		gain.connect(this.master);
		this.voices.add(source);
		source.onended = () => {
			this.voices.delete(source);
			source.disconnect();
			gain.disconnect();
		};
		source.start();
		this.lastPlayed.set(id, now);
		if (asset.loop) {
			this.stopMusic();
			this.music = { id, source, gain };
		}
		return true;
	}

	async startMusic(id = "music") {
		this.desiredMusic = id;
		const request = ++this.musicRequest;
		if (this.muted) return false;
		await this.init();
		if (request !== this.musicRequest || this.muted) return false;
		if (!(await this.loadAsset(id))) return false;
		if (request !== this.musicRequest || this.muted) return false;
		return this.play(id);
	}

	/** Silence a hidden tab. Stricter browsers may wait for the next gesture to resume. */
	setBackground(hidden) {
		if (!this.context || this.context.state === "closed") return;
		if (hidden) this.context.suspend().catch(() => {});
		else if (!this.muted) this.context.resume().catch(() => {});
	}

	stopMusic() {
		if (this.music) {
			this.music.source.stop();
			this.music = null;
		}
	}

	setVolume(value) {
		if (!Number.isFinite(Number(value))) return;
		this.volume = Math.min(1, Math.max(0, Number(value)));
		this.updateGain();
	}

	setMuted(muted) {
		this.muted = !!muted;
		this.updateGain();
		if (this.muted) {
			this.musicRequest++;
			this.stopMusic();
		} else this.startMusic(this.desiredMusic);
	}

	updateGain() {
		if (!this.master) return;
		const now = this.context.currentTime;
		this.master.gain.cancelScheduledValues(now);
		// A stopped/silent graph may stop advancing a scheduled fade in some browsers.
		if (this.muted) this.master.gain.setValueAtTime(0, now);
		else this.master.gain.setTargetAtTime(this.volume, now, 0.025);
	}

	async dispose() {
		this.musicRequest++;
		for (const source of this.voices) source.stop();
		this.voices.clear();
		this.music = null;
		if (this.context && this.context.state !== "closed")
			await this.context.close();
		this.context = null;
		this.master = null;
		this.ready = null;
		this.pending.clear();
		this.buffers.clear();
	}
}
