const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Limited angular acceleration retains the value of leading a target before launch. */
export function guideProjectile(projectile, dt, targets) {
	if (!projectile.homing) return;
	const position = projectile.mesh.position;
	const heading = Math.atan2(projectile.vx, -projectile.vz);
	let target = projectile.target;
	if (!target || !targets.includes(target) || target.hp <= 0) {
		let best = Infinity;
		target = null;
		for (const candidate of targets) {
			const at = candidate.physics.current;
			const dx = at.x - position.x,
				dz = at.z - position.z;
			const separation = Math.hypot(dx, dz);
			const error = Math.abs(wrap(Math.atan2(dx, -dz) - heading));
			if (separation > 65 || error > Math.PI * 0.7) continue;
			const score = separation + error * 18;
			if (score < best) {
				best = score;
				target = candidate;
			}
		}
		projectile.target = target;
	}
	if (!target) return;
	const at = target.physics.current;
	const desired = Math.atan2(at.x - position.x, -(at.z - position.z));
	const turn = Math.max(-dt * 3.4, Math.min(dt * 3.4, wrap(desired - heading)));
	const speed = Math.hypot(projectile.vx, projectile.vz);
	projectile.vx = Math.sin(heading + turn) * speed;
	projectile.vz = -Math.cos(heading + turn) * speed;
	projectile.mesh.rotation.y = -heading - turn;
}

/** One probability check per incoming projectile, independent of presentation frame rate. */
export function tryPointDefense(
	projectile,
	playerPosition,
	chance,
	ready,
	random = Math.random,
) {
	if (
		!projectile.hostile ||
		projectile.interceptionTried ||
		!ready ||
		chance <= 0
	)
		return false;
	if (
		Math.hypot(
			projectile.mesh.position.x - playerPosition.x,
			projectile.mesh.position.z - playerPosition.z,
		) > 8
	)
		return false;
	projectile.interceptionTried = true;
	return random() < Math.min(1, chance);
}
