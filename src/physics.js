import RAPIER from "@dimforge/rapier3d-compat";

const STEP = 1 / 60;
let initialization;

/** Game ship stats already express world units per second, including outfit upgrades. */
export function flightSpeed(speed) {
	return Math.max(9, Number.isFinite(speed) && speed > 0 ? speed : 12);
}

/** A planar zero-gravity Rapier world. Rendering interpolates the last two fixed states. */
export async function createPhysics({ maxBodies = 48 } = {}) {
	initialization ??= RAPIER.init();
	await initialization;
	const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
	world.timestep = STEP;
	const bodies = new Map();
	let accumulator = 0;
	let limit = maxBodies;
	let droppedTime = 0;
	let disposed = false;
	let paused = false;

	function add({
		x = 0,
		z = 0,
		radius = 1,
		mass = 1,
		damping = 0.1,
		fixed = false,
	} = {}) {
		if (disposed || bodies.size >= limit) return null;
		const description = (
			fixed ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic()
		)
			.setTranslation(x, 0, z)
			.setLinearDamping(damping)
			.setCcdEnabled(true);
		const body = world.createRigidBody(description);
		body.setEnabledTranslations(true, false, true, false);
		body.setEnabledRotations(false, false, false, false);
		world.createCollider(
			RAPIER.ColliderDesc.ball(radius)
				.setMass(mass)
				.setFriction(0.35)
				.setRestitution(0.38),
			body,
		);
		const entry = { body, previous: { x, z }, current: { x, z } };
		bodies.set(body.handle, entry);
		return entry;
	}
	function remove(entry) {
		if (!entry || !bodies.has(entry.body.handle)) return;
		bodies.delete(entry.body.handle);
		world.removeRigidBody(entry.body);
	}
	function teleport(entry, x, z) {
		entry.body.setTranslation({ x, y: 0, z }, true);
		entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		Object.assign(entry.previous, { x, z });
		Object.assign(entry.current, { x, z });
	}
	function advance(dt, beforeStep) {
		if (disposed || paused) return 0;
		const accepted = Math.min(Math.max(dt, 0), 0.1);
		droppedTime += Math.max(0, dt - accepted);
		accumulator += accepted;
		let steps = 0;
		while (accumulator >= STEP && steps < 6) {
			for (const entry of bodies.values())
				Object.assign(entry.previous, entry.current);
			beforeStep?.(STEP);
			world.step();
			for (const entry of bodies.values()) {
				const position = entry.body.translation();
				entry.current.x = position.x;
				entry.current.z = position.z;
			}
			accumulator -= STEP;
			steps++;
		}
		return accumulator / STEP;
	}
	function position(entry, alpha = accumulator / STEP) {
		return {
			x: entry.previous.x + (entry.current.x - entry.previous.x) * alpha,
			z: entry.previous.z + (entry.current.z - entry.previous.z) * alpha,
		};
	}
	return {
		add,
		remove,
		teleport,
		advance,
		position,
		get count() {
			return bodies.size;
		},
		get maxBodies() {
			return limit;
		},
		get droppedTime() {
			return droppedTime;
		},
		setLimit(value) {
			limit = Math.max(1, Math.floor(value));
		},
		resetClock() {
			accumulator = 0;
		},
		setPaused(value) {
			const next = Boolean(value);
			if (next === paused) return;
			paused = next;
			accumulator = 0;
		},
		dispose() {
			if (disposed) return;
			for (const entry of [...bodies.values()]) remove(entry);
			world.free();
			disposed = true;
		},
	};
}
