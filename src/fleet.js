import { OUTFITS, SHIPS } from "./content.js";

const shipById = (id) => SHIPS.find((ship) => ship.id === id);
const outfitById = (id) => OUTFITS.find((outfit) => outfit.id === id);
const outfitByName = (name) => OUTFITS.find((outfit) => outfit.name === name);
const copy = (value) => structuredClone(value);
export function fleetMethods(Game) {
	Object.assign(Game.prototype, {
		awardShip(spec) {
			const reward = typeof spec === "string" ? { shipId: spec } : spec;
			const ship = shipById(reward.shipId);
			if (!ship) return null;
			const record = {
				id: this.nextShipId(),
				shipId: ship.id,
				name: reward.name || ship.name,
				hull: ship.maxHull,
				maxHull: ship.maxHull,
				shield: ship.maxShield,
				fuel: ship.maxFuel,
				outfits: copy(reward.outfits || []),
				capabilities: copy(reward.attributes || reward.capabilities || {}),
				loanId: reward.loanId || null,
				command: "protect",
			};
			this.state.fleet.push(record);
			return record;
		},
		revokeShipLoan(loan) {
			if (this.state.flagshipLoanId === loan.loanId) {
				this.state.outfits = this.state.outfits.filter(
					(id) => !loan.outfits.includes(id),
				);
				this.state.flagshipLoanId = null;
			}
			for (const ship of [...this.state.fleet, ...this.state.escorts])
				if (ship.loanId === loan.loanId) {
					ship.outfits = (ship.outfits || []).filter(
						(id) => !loan.outfits.includes(id),
					);
					ship.loanId = null;
				}
		},
		nextShipId() {
			this.state.fleetSerial = (this.state.fleetSerial || 0) + 1;
			return `owned-${this.state.fleetSerial}`;
		},
		flagshipRecord() {
			return {
				id: this.state.flagshipId || "owned-0",
				shipId: this.state.shipId,
				name: this.currentShip().name,
				hull: this.state.hull,
				maxHull: this.stats().maxHull,
				shield: this.state.shield,
				fuel: this.state.fuel,
				outfits: copy(this.state.outfits),
				ammo: copy(this.state.ammo),
				extraCrew: this.state.extraCrew,
				secondaryOutfitId: this.state.secondaryOutfitId,
				capabilities: copy(this.state.shipCapabilities || {}),
				loanId: this.state.flagshipLoanId || null,
				command: "protect",
			};
		},
		fleetShipStats(record) {
			const base = shipById(record.shipId);
			const result = { ...base };
			for (const id of record.outfits || [])
				for (const [key, value] of Object.entries(
					outfitById(id)?.effects || {},
				)) {
					if (
						key === "damage" &&
						(outfitById(id)?.weapon?.ammo ||
							outfitById(id)?.category === "Secondary Weapons")
					)
						continue;
					result[key] = (result[key] || 0) + value;
				}
			result.passengerCapacity = Math.max(
				0,
				result.passengerCapacity - (record.extraCrew || 0),
			);
			result.crew += record.extraCrew || 0;
			const installed = [
				...(record.outfits || []).map(outfitById),
				...Object.keys(base.stockOutfits).map(outfitByName),
			].filter(Boolean);
			const capability = (name) =>
				(Number(record.capabilities?.[name]) ||
					Number(base.sourceAttributes[name]) ||
					0) +
				installed.reduce(
					(sum, outfit) => sum + (Number(outfit.sourceAttributes[name]) || 0),
					0,
				);
			result.gaslining = capability("gaslining") > 0;
			result.starlining = capability("starlining") > 0;
			result.cloakAvailable = capability("cloak") > 0;
			return result;
		},
		parkedShips() {
			return this.state.fleet.map((record) => ({
				...record,
				model: shipById(record.shipId)?.name,
				stats: this.fleetShipStats(record),
				saleValue: this.parkedShipValue(record),
			}));
		},
		parkedShipValue(record) {
			if (record.contract) return record.bond || 5000;
			const stats = this.fleetShipStats(record),
				hullRatio = Math.max(
					0,
					Math.min(1, (record.hull ?? stats.maxHull) / stats.maxHull),
				);
			const outfitValue = (record.outfits || []).reduce(
				(sum, id) => sum + (outfitById(id)?.price || 0),
				0,
			);
			const ammoValue = Object.entries(record.ammo || {}).reduce(
				(sum, [id, count]) => {
					const ammo = outfitById(id);
					const factory =
						Number(shipById(record.shipId).stockOutfits[ammo?.name]) || 0;
					return sum + (ammo?.price || 0) * Math.max(0, count - factory);
				},
				0,
			);
			return Math.floor(
				stats.price * 0.7 * (0.5 + 0.5 * hullRatio) +
					outfitValue * 0.7 +
					ammoValue * 0.5,
			);
		},
		fleetAction(action, payload) {
			const state = this.state;
			if (action === "storeShip")
				action = payload.escortId ? "parkEscort" : "switchShip";
			if (action === "buyoutEscort") {
				const record = [...state.escorts, ...state.fleet].find(
					(item) => item.id === (payload.escortId || payload.fleetId),
				);
				if (!record?.contract)
					return this.fail("Select a hired escort contract.");
				const cost = Math.max(
					0,
					shipById(record.shipId).price - (record.bond || 5000),
				);
				if (state.credits < cost)
					return this.fail(
						`The contract buyout costs ${cost.toLocaleString()} credits.`,
					);
				state.credits -= cost;
				record.contract = false;
				record.ownedContract = true;
				delete record.bond;
				return this.success(
					`Contract purchased for ${cost.toLocaleString()} credits. The ship is now yours.`,
				);
			}
			if (action === "switchShip") {
				const index = state.fleet.findIndex(
					(record) =>
						record.id === payload.fleetId ||
						(!payload.fleetId && record.shipId === payload.shipId),
				);
				if (index < 0)
					return this.fail("Select a ship in your hangar as the new flagship.");
				const target = copy(state.fleet[index]),
					stats = this.fleetShipStats(target);
				if (target.contract)
					return this.fail(
						`This hired ship is under contract. Buy out its contract for ${(stats.price - (target.bond || 5000)).toLocaleString()} credits before choosing it as flagship.`,
					);
				if (
					this.cargoUsed() > stats.cargoCapacity ||
					this.passengersUsed() > stats.passengerCapacity
				)
					return this.fail(
						"The replacement flagship cannot carry your active cargo or passengers. Deliver or unload them first.",
					);
				const previous = this.flagshipRecord();
				const moved = [];
				target.outfits ||= [];
				const base = shipById(target.shipId);
				for (const id of previous.outfits) {
					const outfit = outfitById(id);
					if (
						!["jump-drive", "keystone", "cloak"].includes(outfit?.tag) ||
						outfit.sourceAttributes.installable < 0 ||
						outfit.sourceAttributes["multimodal armor"] < 0
					)
						continue;
					const attribute = {
						"jump-drive": "jump drive",
						keystone: "quantum keystone",
						cloak: "cloak",
					}[outfit.tag];
					const present =
						(Number(base.sourceAttributes[attribute]) || 0) > 0 ||
						[
							...target.outfits.map(outfitById),
							...Object.keys(base.stockOutfits).map(outfitByName),
						]
							.filter(Boolean)
							.some((item) => item.tag === outfit.tag);
					if (!present) {
						target.outfits.push(id);
						moved.push(id);
					}
				}
				if (
					target.outfits.reduce(
						(sum, id) => sum + (outfitById(id)?.space || 0),
						0,
					) > stats.outfitCapacity
				)
					return this.fail(
						"This hull cannot fit your essential drive and cloaking systems. Free outfit space before switching.",
					);
				previous.outfits = previous.outfits.filter((id) => !moved.includes(id));
				state.fleet[index] = previous;
				state.flagshipId = target.id;
				state.shipId = target.shipId;
				state.flagshipName = target.name || stats.name;
				state.outfits = copy(target.outfits || []);
				state.extraCrew = target.extraCrew || 0;
				state.shipCapabilities = copy(target.capabilities || {});
				state.flagshipLoanId = target.loanId || null;
				this.resetAmmunition();
				if (target.ammo) state.ammo = copy(target.ammo);
				state.secondaryOutfitId = target.secondaryOutfitId || null;
				state.hull = Math.max(
					1,
					Math.min(stats.maxHull, target.hull ?? stats.maxHull),
				);
				state.shield = Math.min(
					stats.maxShield,
					target.shield ?? stats.maxShield,
				);
				state.fuel = Math.min(stats.maxFuel, target.fuel ?? stats.maxFuel);
				state.energy = this.stats().maxEnergy;
				state.heat = 0;
				state.overheated = false;
				this.log(
					"New flagship",
					`${stats.name} is now your flagship. ${previous.name} and its equipment are in the hangar.`,
				);
				return this.success(
					`${target.name || stats.name} selected. Cargo, passengers, and essential drive/cloak systems transferred. Other equipment remains with each ship.`,
				);
			}
			if (action === "deployShip") {
				const index = state.fleet.findIndex(
					(record) => record.id === payload.fleetId,
				);
				if (index < 0) return this.fail("Select a ship from your hangar.");
				const candidate = state.fleet[index];
				const bays = this.stats().fighterCapacity || 0;
				const fighter = ["Fighter", "Drone"].includes(
					shipById(candidate.shipId)?.category,
				);
				const largeCount = state.escorts.filter(
					(record) =>
						!["Fighter", "Drone"].includes(shipById(record.shipId)?.category),
				).length;
				if (state.escorts.length >= 6 + bays || (!fighter && largeCount >= 6))
					return this.fail(
						bays
							? "Six general escorts and the fighter bays are full. Park a ship first."
							: "You can command six active escorts. Park another ship first.",
					);
				const [record] = state.fleet.splice(index, 1),
					stats = this.fleetShipStats(record);
				record.command = "protect";
				record.damage = stats.damage;
				record.speed = stats.speed;
				record.maxHull = stats.maxHull;
				state.escorts.push(record);
				return this.success(
					`${record.name || stats.name} deployed as an escort. Daily upkeep is 90 credits.`,
				);
			}
			if (action === "parkEscort") {
				const index = state.escorts.findIndex(
					(record) => record.id === payload.escortId,
				);
				if (index < 0) return this.fail("Select an active escort.");
				if (state.escorts[index].temporary)
					return this.fail(
						"A mission convoy cannot be parked in your private hangar.",
					);
				const [record] = state.escorts.splice(index, 1);
				state.fleet.push(record);
				return this.success(
					`${record.name} parked with its equipment. Parked ships have no daily upkeep.`,
				);
			}
			if (action === "sellParked") {
				const index = state.fleet.findIndex(
					(record) => record.id === payload.fleetId,
				);
				if (index < 0) return this.fail("Select a ship from your hangar.");
				const record = state.fleet[index];
				if (record.loanId)
					return this.fail(
						"Return this prototype’s loaned systems through its mission before selling the hull.",
					);
				const value = this.parkedShipValue(record);
				state.fleet.splice(index, 1);
				this.earn(value);
				this.log(
					"Ship sold",
					`${record.name || shipById(record.shipId).name} and its equipment sold for ${value.toLocaleString()} credits.`,
				);
				return this.success(
					`Ship and installed equipment sold for ${value.toLocaleString()} credits.`,
				);
			}
			return null;
		},
	});
}
