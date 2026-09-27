import * as THREE from "three/webgpu";
import { createShipModel, disposeObject } from "./ship-model.js";

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const terminal = (status) =>
	["destroyed", "captured", "departed"].includes(status);
const actorStatus = (record) =>
	record.status || (record.disabled ? "disabled" : "active");
const actorKey = (record) => String(record.id || record.actorId);

/** Exact native NPC identities, distinct from random encounters and the hired fleet. */
export function createMissionActors({
	physics,
	world,
	player,
	reserveSlot,
	shoot,
	burst,
	actorLimit,
	genericHostiles,
	combatTargets = () => [],
}) {
	const actors = new Map();
	const destroyed = new Set();
	const events = [];
	let roster = [];
	let selectedId = null;
	let context = { active: false, time: 0, yaw: 0, speed: 30, view: "title" };

	function event(actor, action, detail = {}) {
		return {
			type: "missionActor",
			action,
			actorId: actor.id,
			missionId: actor.missionId,
			npcId: actor.npcId,
			...detail,
		};
	}
	function remove(actor) {
		physics.remove(actor.physics);
		disposeObject(actor.mesh);
		actors.delete(actor.id);
	}
	function clear() {
		for (const actor of [...actors.values()]) remove(actor);
		roster = [];
		destroyed.clear();
		selectedId = null;
		events.length = 0;
	}
	function sync(records = []) {
		roster = records.filter(
			(record) =>
				record &&
				(record.id || record.actorId) &&
				!terminal(actorStatus(record)) &&
				Number(record.hull ?? 100) > 0,
		);
		// Protected/disabled actors take priority over newly entering hostile waves.
		const available = [...roster].sort(
			(a, b) => Number(b.role === "escort") - Number(a.role === "escort"),
		);
		const desired = available
			.filter((record) => !destroyed.has(actorKey(record)))
			.slice(0, actorLimit());
		const ids = new Set(desired.map(actorKey));
		for (const actor of [...actors.values()])
			if (!ids.has(actor.id)) remove(actor);
		desired.forEach((record, index) => {
			const id = actorKey(record);
			let actor = actors.get(id);
			if (actor && actor.shipId !== (record.shipId || "shuttle")) {
				remove(actor);
				actor = null;
			}
			if (!actor) {
				if (!reserveSlot()) return;
				const hostile = record.role === "hostile";
				const angle = index * 2.4 + 0.5;
				const x = Number.isFinite(record.x)
					? record.x
					: player.current.x +
						(hostile
							? Math.cos(angle) * 22
							: (index % 2 ? 1 : -1) * (5 + (index % 3) * 2.3));
				const z = Number.isFinite(record.z)
					? record.z
					: player.current.z +
						(hostile ? Math.sin(angle) * 22 : 5 + Math.floor(index / 2) * 3);
				const body = physics.add({
					x,
					z,
					radius: 1.3,
					mass: hostile ? 7 : 9,
					damping: 0.3,
				});
				if (!body) return;
				const mesh = createShipModel(record.shipId || "shuttle", hostile, {
					faction: record.faction,
					category: record.category,
				});
				mesh.scale.multiplyScalar(0.85);
				mesh.position.set(x, 0.2, z);
				const marker = new THREE.Mesh(
					new THREE.TorusGeometry(1.85, 0.027, 4, 48),
					new THREE.MeshBasicNodeMaterial({
						color: hostile
							? 0xff9073
							: record.role === "escort"
								? 0xa1dfba
								: 0xebca86,
						transparent: true,
						opacity: 0.7,
						depthWrite: false,
					}),
				);
				marker.rotation.x = Math.PI / 2;
				marker.position.y = -0.72;
				mesh.add(marker);
				world.add(mesh);
				actor = {
					...record,
					id,
					shipId: record.shipId || "shuttle",
					physics: body,
					mesh,
					marker,
					hp: record.hull ?? 100,
					maxHull: record.maxHull || record.hull || 100,
					status: actorStatus(record),
					authoritative: "",
					yaw: context.yaw,
					shot: 1 + index * 0.3,
					index,
					disableGrace: 0,
					scanPulse: 0,
					safeSent: false,
				};
				actors.set(id, actor);
			}
			const signature = `${record.hull ?? 100}:${actorStatus(record)}`;
			if (signature !== actor.authoritative) {
				actor.hp = record.hull ?? 100;
				actor.status = actorStatus(record);
				actor.authoritative = signature;
			}
			actor.role = record.role || "neutral";
			actor.objectives = record.objectives || [];
			actor.missionId = record.missionId;
			actor.npcId = record.npcId;
			actor.name =
				record.name || record.shipName || record.shipId || "Mission vessel";
			actor.damage = Number.isFinite(record.damage)
				? Math.max(0, record.damage)
				: actor.role === "hostile"
					? 7
					: 0;
			actor.canFight = record.canFight ?? actor.role === "hostile";
			actor.speed = record.speed;
			actor.index = index;
		});
	}
	function hostiles() {
		return [...actors.values()].filter(
			(actor) =>
				actor.role === "hostile" && actor.status === "active" && actor.hp > 0,
		);
	}
	function protectedActors() {
		return [...actors.values()].filter(
			(actor) => actor.role === "escort" && actor.hp > 0,
		);
	}
	function hostileCount() {
		return roster.filter((record) => {
			const id = actorKey(record);
			const status = actors.get(id)?.status || actorStatus(record);
			return (
				record.role === "hostile" && status === "active" && !destroyed.has(id)
			);
		}).length;
	}
	function defensiveTarget(actor) {
		if (
			actor.role !== "escort" ||
			!actor.canFight ||
			actor.damage <= 0 ||
			actor.status !== "active"
		)
			return null;
		return (
			combatTargets()
				.filter(
					(target) =>
						target.hp > 0 &&
						target.status !== "disabled" &&
						distance(actor.physics.current, target.physics.current) < 28,
				)
				.sort(
					(a, b) =>
						distance(actor.physics.current, a.physics.current) -
						distance(actor.physics.current, b.physics.current),
				)[0] || null
		);
	}

	function setContext(value) {
		context = { ...context, ...value };
	}
	function fixedStep(dt) {
		for (const actor of actors.values()) {
			const at = actor.physics.current;
			const velocity = actor.physics.body.linvel();
			let destination = at;
			if (actor.status !== "disabled" && actor.role === "escort") {
				const side = (actor.index % 2 ? 1 : -1) * (5 + (actor.index % 3) * 2);
				destination = {
					x:
						player.current.x +
						Math.cos(context.yaw) * side -
						Math.sin(context.yaw) * 6,
					z:
						player.current.z +
						Math.sin(context.yaw) * side +
						Math.cos(context.yaw) * 6,
				};
			} else if (actor.status !== "disabled" && actor.role === "hostile") {
				if (!context.cloaked) actor.lastKnown = { ...player.current };
				const ally = [...protectedActors(), ...(context.escorts || [])].filter(
					(ally) => ally.hp > 0,
				)[
					actor.index %
						Math.max(
							1,
							protectedActors().length + (context.escorts || []).length,
						)
				];
				const target = context.cloaked
					? ally?.physics.current || actor.lastKnown || at
					: player.current;
				actor.targetPosition = target;
				const dx = at.x - target.x,
					dz = at.z - target.z;
				const length = Math.hypot(dx, dz) || 1;
				destination = {
					x: target.x + (dx / length) * 9,
					z: target.z + (dz / length) * 9,
				};
			}
			const dx = destination.x - at.x,
				dz = destination.z - at.z;
			const length = Math.hypot(dx, dz) || 1;
			const speed =
				actor.status === "disabled"
					? 0
					: Math.min(
							actor.speed ||
								(actor.role === "hostile" ? 7 : context.speed * 0.95),
							length * 1.5,
						);
			const follow =
				actor.role === "escort" && actor.status !== "disabled"
					? player.body.linvel()
					: { x: 0, z: 0 };
			const blend = Math.min(1, dt * 2.2);
			actor.physics.body.setLinvel(
				{
					x:
						velocity.x +
						((dx / length) * speed + follow.x * 0.25 - velocity.x) * blend,
					y: 0,
					z:
						velocity.z +
						((dz / length) * speed + follow.z * 0.25 - velocity.z) * blend,
				},
				true,
			);

			const defensive = defensiveTarget(actor);
			const facing =
				actor.status === "disabled" || actor.role === "neutral"
					? actor.yaw
					: defensive
						? Math.atan2(
								defensive.physics.current.x - at.x,
								-(defensive.physics.current.z - at.z),
							)
						: actor.role === "hostile"
							? Math.atan2(
									(actor.targetPosition || at).x - at.x,
									-((actor.targetPosition || at).z - at.z),
								)
							: Math.hypot(dx, dz) > 0.5
								? Math.atan2(dx, -dz)
								: context.yaw;

			actor.yaw += wrap(facing - actor.yaw) * Math.min(1, dt * 2.4);
		}
	}
	function tick(dt, alpha) {
		for (const actor of actors.values()) {
			if (context.active) {
				actor.shot -= dt;
				actor.disableGrace = Math.max(0, actor.disableGrace - dt);
				if (
					actor.role === "hostile" &&
					actor.canFight &&
					actor.damage > 0 &&
					actor.status === "active" &&
					actor.shot <= 0
				) {
					const allies = [
						...protectedActors(),
						...(context.escorts || []),
					].filter((ally) => ally.hp > 0);
					const ally = allies[actor.index % Math.max(1, allies.length)];
					const destination =
						(context.cloaked || actor.index % 3 === 1) && ally
							? ally.physics.current
							: context.cloaked
								? null
								: player.current;
					const at = actor.physics.current;
					if (destination && distance(at, destination) < 34) {
						shoot(
							at.x,
							at.z,
							Math.atan2(destination.x - at.x, -(destination.z - at.z)),
							true,
							actor.damage,
							actor.id,
						);
						actor.shot = 1.4;
					}
				}
				const defensive = defensiveTarget(actor);
				if (defensive && actor.shot <= 0) {
					const at = actor.physics.current,
						target = defensive.physics.current;
					const aim = Math.atan2(target.x - at.x, -(target.z - at.z));
					if (Math.abs(wrap(aim - actor.yaw)) < 0.3) {
						shoot(at.x, at.z, aim, false, actor.damage, actor.id);
						actor.shot = 1.1;
					}
				}
			}
			const at = physics.position(actor.physics, alpha);
			actor.mesh.position.set(at.x, 0.25, at.z);
			actor.mesh.rotation.set(
				0,
				-actor.yaw,
				actor.status === "disabled" ? 0.18 : 0,
			);
			actor.mesh.visible = context.view !== "title";
			const velocity = actor.physics.body.linvel();
			actor.mesh.userData.exhaust.visible = actor.status !== "disabled";
			actor.mesh.userData.exhaust.scale.z =
				0.15 + Math.min(0.8, Math.hypot(velocity.x, velocity.z) * 0.07);
			actor.scanPulse = Math.max(0, actor.scanPulse - dt);
			actor.marker.scale.setScalar(
				actor.scanPulse > 0 ? 1 + (1 - actor.scanPulse) * 3 : 1,
			);
			actor.marker.material.opacity =
				actor.id === selectedId
					? 0.95
					: actor.status === "disabled"
						? 0.62 + Math.sin(context.time * 5) * 0.2
						: 0.48;
			if (actor.status === "disabled")
				actor.marker.material.color.setHex(0xf1c26c);
			const safe =
				actor.role === "escort" &&
				actor.status === "active" &&
				(context.hasLanding === false ||
					distance(actor.physics.current, { x: 12, z: 1 }) < 13) &&
				distance(actor.physics.current, player.current) < 16 &&
				genericHostiles() === 0 &&
				hostileCount() === 0;
			if (context.active && safe && !actor.safeSent) {
				events.push(event(actor, "safe"));
				actor.safeSent = true;
			}
			if (!safe) actor.safeSent = false;
		}
	}
	function hit(shot, segmentDistance) {
		const actor = [...actors.values()].find((candidate) => {
			if (candidate.hp <= 0 || candidate.id === shot.owner) return false;
			if (
				shot.hostile
					? candidate.role === "hostile"
					: shot.owner !== "player" && candidate.role !== "hostile"
			)
				return false;
			return segmentDistance(candidate.physics.current) < 1.5;
		});
		if (!actor) return false;
		if (actor.disableGrace > 0) return true;
		const previous = actor.hp;
		const needsDisabled = actor.objectives.some((type) =>
			["disable", "board", "capture", "assist"].includes(
				typeof type === "string" ? type : type.type,
			),
		);
		actor.hp = Math.max(
			actor.status === "active" && needsDisabled ? 1 : 0,
			actor.hp - shot.damage,
		);
		events.push(
			event(actor, "damage", { damage: previous - actor.hp, hull: actor.hp }),
		);
		burst(
			actor.physics.current.x,
			actor.physics.current.z,
			actor.hp <= 0 ? 26 : 7,
			actor.role === "hostile" ? 2 : 1,
		);
		if (actor.hp <= 0) {
			events.push(event(actor, "destroy", { hull: 0 }));
			destroyed.add(actor.id);
			remove(actor);
		} else if (actor.status === "active" && actor.hp <= actor.maxHull * 0.22) {
			actor.status = "disabled";
			actor.disableGrace = 1.5;
			events.push(event(actor, "disable", { hull: actor.hp }));
		}
		return true;
	}
	function telemetry() {
		const playerSpeed = Math.hypot(
			player.body.linvel().x,
			player.body.linvel().z,
		);
		return [...actors.values()].map((actor) => {
			const separation = distance(actor.physics.current, player.current);
			return {
				id: actor.id,
				actorId: actor.id,
				missionId: actor.missionId,
				npcId: actor.npcId,
				name: actor.name,
				role: actor.role,
				status: actor.status,
				hull: actor.hp,
				maxHull: actor.maxHull,
				...actor.physics.current,
				distance: separation,
				scanReady: separation <= 18,
				boardReady:
					separation <= 6 && playerSpeed < 5 && actor.status === "disabled",
				safe: actor.safeSent,
				selected: actor.id === selectedId,
			};
		});
	}
	function interact(action, id) {
		const actor = actors.get(String(id));
		const fail = (message) => ({ ok: false, message, events: [] });
		if (context.view !== "flight" || context.mode === "destroyed")
			return fail("Launch before contacting a vessel.");
		if (!actor)
			return fail("That mission vessel is not present in this system.");
		const separation = distance(actor.physics.current, player.current);
		const ownSpeed = Math.hypot(player.body.linvel().x, player.body.linvel().z);
		if (["scan", "scan cargo", "scan outfits"].includes(action)) {
			if (separation > 18)
				return fail(
					`Approach ${actor.name} to within 18 navigation units to scan (currently ${separation.toFixed(1)}).`,
				);
			actor.scanPulse = 1;
			return {
				ok: true,
				message: `${actor.name}: scan complete.`,
				events: [event(actor, action)],
			};
		}
		if (action === "hail") {
			if (separation > 30)
				return fail(
					"The vessel is beyond short-range communications. Approach within 30 units.",
				);
			return {
				ok: true,
				message: `Channel open with ${actor.name}.`,
				events: [event(actor, "hail")],
			};
		}
		if (!["board", "capture", "assist"].includes(action))
			return fail("Unknown ship interaction.");
		if (separation > 6)
			return fail(
				`Approach ${actor.name} to within 6 navigation units (currently ${separation.toFixed(1)}).`,
			);
		if (ownSpeed >= 5)
			return fail(
				"Brake below 5 units per second before docking with the vessel.",
			);
		if (actor.status !== "disabled")
			return fail(
				"This vessel must be disabled before boarding or repair operations.",
			);
		if (
			genericHostiles() > 0 ||
			hostiles().some((other) => other.id !== actor.id)
		)
			return fail("Clear active hostile contacts before boarding.");
		if (action === "capture" && actor.status !== "disabled")
			return fail("Only a disabled vessel can be captured.");
		const result = {
			ok: true,
			message: `${actor.name}: ${action === "assist" ? "repairs and assistance delivered" : action === "capture" ? "prize crew aboard" : "boarding complete"}.`,
			events: [event(actor, action, { hull: actor.hp })],
		};
		// The rules model may still reject a capture (crew, credits or fleet capacity).
		// Keep the physical actor until its authoritative roster confirms the new status.
		return result;
	}
	return {
		sync,
		clear,
		fixedStep,
		tick,
		hit,
		setContext,
		hostiles,
		protectedActors,
		hostileCount,
		telemetry,
		interact,
		drainEvents() {
			return events.splice(0);
		},
		get(id) {
			return actors.get(String(id));
		},
		select(id) {
			selectedId = actors.has(String(id)) ? String(id) : null;
			return selectedId;
		},
	};
}
