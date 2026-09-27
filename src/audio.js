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
	}

	// Call from a click/tap/key handler so the browser grants audio playback.
	init() {
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
		this.ready = this.load();
		return this.ready;
	}

	async load() {
		try {
			const response = await fetch("/audio/manifest.json");
			if (!response.ok)
				throw new Error(`Audio manifest: HTTP ${response.status}`);
			this.manifest = await response.json();
			const entries = Object.entries(this.manifest.assets);
			await Promise.all(
				entries.map(async ([id, asset]) => {
					try {
						const response = await fetch(asset.url);
						if (!response.ok) throw new Error(`HTTP ${response.status}`);
						const buffer = await this.context.decodeAudioData(
							await response.arrayBuffer(),
						);
						this.buffers.set(id, buffer);
					} catch (error) {
						this.errors.push(`${id}: ${error.message}`);
					}
				}),
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
		await this.init();
		return this.play(id);
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
		if (!this.muted && !this.music && this.buffers.has("music"))
			this.play("music");
	}

	updateGain() {
		if (this.master)
			this.master.gain.setTargetAtTime(
				this.muted ? 0 : this.volume,
				this.context.currentTime,
				0.025,
			);
	}

	async dispose() {
		for (const source of this.voices) source.stop();
		this.voices.clear();
		this.music = null;
		if (this.context && this.context.state !== "closed")
			await this.context.close();
		this.context = null;
		this.master = null;
		this.ready = null;
		this.buffers.clear();
	}
}
