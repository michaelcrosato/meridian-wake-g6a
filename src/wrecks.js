import * as THREE from "three/webgpu";
import { createShipModel, disposeObject } from "./ship-model.js";

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Disabled random-encounter hulls retain their location and can only be boarded nearby. */
export function createWrecks({
	physics,
	world,
	player,
	reserveSlot,
	activeLimit,
	hostiles,
}) {
	const wrecks = new Map();
	let selectedId = null;
	let context = { view: "title", mode: "port" };

	function position(wreck) {
		return wreck.physics?.current || wreck.position;
	}
	function decorate(wreck) {
		wreck.mesh.userData.exhaust.visible = false;
		wreck.mesh.rotation.set(0, -(wreck.yaw || 0), 0.19);
		const marker = new THREE.Mesh(
			new THREE.TorusGeometry(1.8, 0.028, 4, 48),
			new THREE.MeshBasicNodeMaterial({
				color: 0xe6b465,
				transparent: true,
				opacity: 0.64,
				depthWrite: false,
			}),
		);
		marker.rotation.x = Math.PI / 2;
		marker.position.y = -0.72;
		wreck.mesh.add(marker);
		wreck.marker = marker;
		if (wreck.physics) wreck.physics.body.setLinearDamping(2.5);
	}
	function serialized(wreck) {
		const at = position(wreck);
		return {
			id: wreck.id,
			shipId: wreck.shipId,
			faction: wreck.faction,
			name: wreck.name,
			x: at.x,
			z: at.z,
			yaw: wreck.yaw,
			scale: wreck.mesh.scale.x,
		};
	}
	function adopt(enemy, record) {
		const wreck = {
			...record,
			mesh: enemy.mesh,
			physics: enemy.physics,
			position: { ...enemy.physics.current },
			yaw: enemy.yaw,
		};
		wreck.name ||= `${record.shipId || "Raider"} · disabled`;
		decorate(wreck);
		wrecks.set(wreck.id, wreck);
		return serialized(wreck);
	}
	function remove(wreck) {
		if (wreck.physics) physics.remove(wreck.physics);
		disposeObject(wreck.mesh);
		wrecks.delete(wreck.id);
		if (selectedId === wreck.id) selectedId = null;
	}
	function deactivate(wreck) {
		if (!wreck.physics) return;
		wreck.position = { ...wreck.physics.current };
		physics.remove(wreck.physics);
		wreck.physics = null;
	}
	function releaseFarthest() {
		const candidates = [...wrecks.values()].filter((wreck) => wreck.physics);
		candidates.sort(
			(a, b) =>
				distance(position(b), player.current) -
				distance(position(a), player.current),
		);
		if (!candidates.length) return false;
		deactivate(candidates[0]);
		return true;
	}
	function sync(records) {
		const wanted = new Set(records.map((record) => String(record.id)));
		for (const wreck of [...wrecks.values()])
			if (!wanted.has(wreck.id)) remove(wreck);
		for (const record of records) {
			const id = String(record.id);
			if (wrecks.has(id)) continue;
			const mesh = createShipModel(record.shipId || "sparrow", true, {
				faction: record.faction || "Pirate",
			});
			mesh.scale.setScalar(record.scale || mesh.userData.baseScale * 0.8);
			const wreck = {
				...record,
				id,
				shipId: record.shipId || "sparrow",
				mesh,
				physics: null,
				position: {
					x: Number.isFinite(record.x) ? record.x : player.current.x + 5,
					z: Number.isFinite(record.z) ? record.z : player.current.z + 5,
				},
				yaw: record.yaw || 0,
			};
			wreck.name ||= `${wreck.shipId} · disabled`;
			decorate(wreck);
			world.add(mesh);
			wrecks.set(id, wreck);
		}
	}
	function tick(alpha) {
		// Far hulks leave the active Rapier set, but their meshes and saved identities remain.
		// Nearest/selected hulks reactivate when approached. This cannot block queued combat waves.
		const sorted = [...wrecks.values()].sort((a, b) => {
			if (a.id === selectedId) return -1;
			if (b.id === selectedId) return 1;
			return (
				distance(position(a), player.current) -
				distance(position(b), player.current)
			);
		});
		const active = new Set(
			sorted.slice(0, activeLimit()).map((wreck) => wreck.id),
		);
		for (const wreck of sorted) if (!active.has(wreck.id)) deactivate(wreck);
		for (const wreck of sorted.slice(0, activeLimit())) {
			if (!wreck.physics && reserveSlot(false)) {
				wreck.physics = physics.add({
					...wreck.position,
					radius: 1.3,
					mass: 7,
					damping: 2.5,
				});
			}
		}
		for (const wreck of wrecks.values()) {
			const at = wreck.physics
				? physics.position(wreck.physics, alpha)
				: wreck.position;
			wreck.mesh.position.set(at.x, 0.22, at.z);
			wreck.mesh.visible = context.view === "flight";
			wreck.marker.material.opacity = wreck.id === selectedId ? 0.95 : 0.5;
		}
	}
	function inspect(id) {
		let wreck = id ? wrecks.get(String(id)) : wrecks.get(selectedId);
		if (!wreck && !id)
			wreck = [...wrecks.values()].sort(
				(a, b) =>
					distance(position(a), player.current) -
					distance(position(b), player.current),
			)[0];
		const fail = (message) => ({
			ok: false,
			message,
			wreck: wreck ? serialized(wreck) : null,
		});
		if (context.view !== "flight" || context.mode === "destroyed")
			return fail("Launch before boarding a vessel.");
		if (!wreck) return fail("There are no disabled vessels in local space.");
		const separation = distance(position(wreck), player.current);
		if (separation > 6)
			return fail(
				`Approach the disabled vessel to within 6 navigation units (currently ${separation.toFixed(1)}).`,
			);
		if (Math.hypot(player.body.linvel().x, player.body.linvel().z) >= 5)
			return fail("Brake below 5 units per second before boarding.");
		if (hostiles() > 0)
			return fail("Clear active hostile contacts before boarding.");
		if (!wreck.physics)
			return fail(
				"The vessel is entering boarding range. Hold position briefly.",
			);
		return {
			ok: true,
			message: "Disabled vessel is within boarding range.",
			wreck: serialized(wreck),
		};
	}
	function telemetry() {
		return [...wrecks.values()].map((wreck) => ({
			...serialized(wreck),
			distance: distance(position(wreck), player.current),
			boardReady: inspect(wreck.id).ok,
			selected: wreck.id === selectedId,
			activeBody: !!wreck.physics,
		}));
	}
	function consume(id) {
		const wreck = wrecks.get(String(id));
		if (!wreck) return false;
		remove(wreck);
		return true;
	}
	function clear() {
		for (const wreck of [...wrecks.values()]) remove(wreck);
		selectedId = null;
	}
	return {
		adopt,
		sync,
		tick,
		telemetry,
		inspect,
		consume,
		clear,
		releaseFarthest,
		setContext(value) {
			context = { ...context, ...value };
		},
		select(id) {
			selectedId = wrecks.has(String(id)) ? String(id) : null;
			return selectedId;
		},
		get(id) {
			const wreck = wrecks.get(String(id));
			return wreck
				? { ...serialized(wreck), position: { ...position(wreck) } }
				: null;
		},
	};
}
