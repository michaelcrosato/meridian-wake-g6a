import { OUTFITS, SHIPS } from "./content.js";

const outfitById = (id) => OUTFITS.find((outfit) => outfit.id === id);
const outfitByName = (name) => OUTFITS.find((outfit) => outfit.name === name);
export function equipmentMethods(Game) {
	Object.assign(Game.prototype, {
		capability(name) {
			const base = SHIPS.find((ship) => ship.id === this.state.shipId);
			return (
				(Number(this.state.shipCapabilities?.[name]) ||
					Number(base.sourceAttributes[name]) ||
					0) +
				this.installedEquipment().reduce(
					(sum, outfit) => sum + (Number(outfit.sourceAttributes[name]) || 0),
					0,
				)
			);
		},
		installedEquipment() {
			const base = SHIPS.find((ship) => ship.id === this.state.shipId);
			const entries = Object.entries(base.stockOutfits || {}).flatMap(
				([name, count]) => {
					const outfit = outfitByName(name);
					return outfit && outfit.category !== "Ammunition"
						? Array.from({ length: Math.min(count, 100) }, () => outfit)
						: [];
				},
			);
			return [
				...entries,
				...this.state.outfits.map(outfitById).filter(Boolean),
			];
		},
		resetAmmunition() {
			this.state.ammo = {};
			for (const [name, count] of Object.entries(
				SHIPS.find((ship) => ship.id === this.state.shipId).stockOutfits || {},
			)) {
				const outfit = outfitByName(name);
				if (outfit?.category === "Ammunition")
					this.state.ammo[outfit.id] = count;
			}
			this.state.secondaryOutfitId = null;
			this.state.secondaryCooldown = 0;
		},
		ammoCapacity(ammoId) {
			const ammunition = outfitById(ammoId);
			if (ammunition?.category !== "Ammunition") return 0;
			const key = Object.keys(ammunition.sourceAttributes).find(
				(key) =>
					key.endsWith(" capacity") && ammunition.sourceAttributes[key] < 0,
			);
			return Math.max(
				0,
				Math.floor(
					this.installedEquipment()
						.filter((item) => item.category !== "Ammunition")
						.reduce(
							(sum, item) => sum + (Number(item.sourceAttributes[key]) || 0),
							0,
						),
				),
			);
		},
		secondaryWeapons() {
			return [
				...new Map(
					this.installedEquipment()
						.filter(
							(item) =>
								item.weapon?.ammo || item.category === "Secondary Weapons",
						)
						.map((item) => [item.id, item]),
				).values(),
			];
		},
		secondaryWeapon() {
			const weapons = this.secondaryWeapons();
			const weapon =
				weapons.find((item) => item.id === this.state.secondaryOutfitId) ||
				weapons[0];
			if (!weapon) return null;
			const ammoName = Array.isArray(weapon.weapon.ammo)
				? weapon.weapon.ammo[0]
				: weapon.weapon.ammo;
			const ammo = ammoName ? outfitByName(ammoName) : null;
			const count = ammo ? this.state.ammo?.[ammo.id] || 0 : null;
			const damage = Math.max(
				24,
				Math.min(
					180,
					Math.round(
						Math.sqrt(
							(Number(weapon.weapon["shield damage"]) || 0) +
								(Number(weapon.weapon["hull damage"]) || 0),
						) * 2.5,
					) || 45,
				),
			);
			const energyCost = Math.max(
				1,
				Math.min(20, Number(weapon.weapon["firing energy"]) || 2),
			);
			const heat = Math.max(
				2,
				Math.min(30, Math.sqrt(Number(weapon.weapon["firing heat"]) || 5) * 2),
			);
			return {
				id: weapon.id,
				name: weapon.name,
				ammoId: ammo?.id || null,
				ammoName: ammo?.name || "Energy",
				ammoCount: count,
				capacity: ammo ? this.ammoCapacity(ammo.id) : null,
				damage,
				energyCost,
				heat,
				cooldown: Math.max(
					0.25,
					Math.min(3, Number(weapon.weapon.reload || 60) / 60),
				),
				homing: !!(
					weapon.weapon.turn ||
					weapon.weapon["infrared tracking"] ||
					weapon.weapon["radar tracking"] ||
					weapon.weapon["optical tracking"]
				),
				speed: 32,
				ready:
					(!ammo || count > 0) &&
					this.state.energy >= energyCost &&
					!this.state.overheated &&
					!this.state.cloaked &&
					!(this.state.secondaryCooldown > 0),
			};
		},
		capturePower() {
			const stats = this.stats();
			return stats.crew * (1 + Math.max(0, stats.boarding || 0) * 0.3);
		},
		captureRequirement(shipId = "sparrow") {
			const ship = SHIPS.find((ship) => ship.id === shipId);
			return Math.max(1, (ship?.crew || 1) * 0.75);
		},
		equipmentAction(action, payload) {
			const state = this.state;
			if (action === "cloak") {
				if (state.mode !== "flight")
					return this.fail("Launch before using the cloaking system.");
				if (state.cloaked) {
					state.cloaked = false;
					state.cloakCooldown = 2;
					return this.success("Cloak disengaged.");
				}
				const stats = this.stats();
				if (!stats.cloakAvailable)
					return this.fail("This ship has no active cloaking system.");
				if (state.cloakCooldown > 0)
					return this.fail(
						`Cloak recovering: ${Math.ceil(state.cloakCooldown)} seconds.`,
					);
				if (
					state.energy < stats.cloakEnergyCost ||
					state.fuel < stats.cloakFuelCost
				)
					return this.fail("Insufficient energy or fuel to cloak.");
				state.cloaked = true;
				return this.success(
					"Cloak engaged. Weapons and shield regeneration are suspended.",
				);
			}
			if (action === "buyAmmo") {
				const ammo = outfitById(payload.ammoId || payload.outfitId),
					quantity = Math.floor(Number(payload.quantity ?? 1));
				if (
					ammo?.category !== "Ammunition" ||
					!Number.isFinite(quantity) ||
					quantity < 1
				)
					return this.fail("Choose ammunition and a positive quantity.");
				if (!this.availableOutfits().some((item) => item.id === ammo.id))
					return this.fail("This ammunition is not sold here.");
				const capacity = this.ammoCapacity(ammo.id);
				if (!capacity)
					return this.fail(
						"Install a compatible launcher or ammunition storage first.",
					);
				if ((state.ammo[ammo.id] || 0) + quantity > capacity)
					return this.fail(
						`Your magazines hold ${capacity} rounds of ${ammo.name}.`,
					);
				const cost = ammo.price * quantity;
				if (cost > state.credits)
					return this.fail(
						"You do not have enough credits for this ammunition.",
					);
				state.credits -= cost;
				state.ammo[ammo.id] = (state.ammo[ammo.id] || 0) + quantity;
				return this.success(`Loaded ${quantity} × ${ammo.name}.`);
			}
			if (action === "selectSecondary") {
				const weapon = this.secondaryWeapons().find(
					(item) => item.id === payload.outfitId,
				);
				if (!weapon) return this.fail("Install this secondary weapon first.");
				state.secondaryOutfitId = weapon.id;
				return this.success(`Secondary weapon: ${weapon.name}.`);
			}
			if (action === "secondary") {
				if (state.mode !== "flight")
					return this.fail("Launch before firing weapons.");
				const weapon = this.secondaryWeapon();
				if (!weapon)
					return this.fail("Install a launcher or other secondary weapon.");
				if (!weapon.ready)
					return this.fail(
						state.overheated
							? "Weapons are overheated."
							: state.secondaryCooldown > 0
								? "Launcher cycling."
								: weapon.ammoCount === 0
									? `Out of ${weapon.ammoName}. Replenish it at an outfitter.`
									: "Insufficient weapon energy.",
					);
				if (weapon.ammoId) state.ammo[weapon.ammoId]--;
				state.energy -= weapon.energyCost;
				state.heat += weapon.heat;
				state.secondaryCooldown = weapon.cooldown;
				if (state.heat >= this.stats().maxHeat) state.overheated = true;
				return this.success(`${weapon.name} fired.`, { weapon });
			}
			if (action === "intercept") {
				if (
					state.mode !== "flight" ||
					!this.stats().pointDefense ||
					state.cloaked ||
					state.energy < 2
				)
					return this.fail("Point defense unavailable.");
				state.energy -= 2;
				state.heat += 1;
				if (state.heat >= this.stats().maxHeat) state.overheated = true;
				return this.success("Incoming projectile intercepted.");
			}
			if (action === "hireCrew" || action === "dismissCrew") {
				const count = Math.floor(Number(payload.count ?? 1));
				if (!Number.isFinite(count) || count < 1)
					return this.fail("Choose a positive number of crew.");
				if (action === "hireCrew") {
					if (count > this.stats().freeBunks)
						return this.fail(
							"Every additional crew member needs an unoccupied bunk.",
						);
					if (count * 200 > state.credits)
						return this.fail("Hiring costs 200 credits per crew member.");
					state.credits -= count * 200;
					state.extraCrew += count;
					return this.success(
						`${count} crew hired. Wages are 15 credits per crew member per day.`,
					);
				}
				if (count > state.extraCrew)
					return this.fail("You cannot dismiss the ship’s required crew.");
				state.extraCrew -= count;
				return this.success(`${count} additional crew released.`);
			}
			return null;
		},
	});
}
