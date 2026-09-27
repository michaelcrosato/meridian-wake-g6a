import { ARCS, OUTFITS } from "./content.js";

export const storageMethods = {
	storageAt(planetName = this.currentPlanet()?.name) {
		return Object.entries(this.state.outfitStorage[planetName] || {})
			.map(([id, count]) => ({
				outfit: OUTFITS.find((o) => o.id === id),
				count,
			}))
			.filter((entry) => entry.outfit && entry.count > 0);
	},
	outfitRemovalError(outfit) {
		if (
			outfit.category === "Unique" &&
			outfit.sourceAttributes?.installable < 0
		)
			return "This specialized system can only be removed by its mission engineers.";
		if (
			this.state.flagshipLoanId &&
			ARCS.some((arc) =>
				arc.missions.some(
					(m) =>
						m.revokeLoan?.loanId === this.state.flagshipLoanId &&
						m.revokeLoan.outfits.includes(outfit.id),
				),
			)
		)
			return "Return this loaned outfit through its mission; it cannot be sold or stored.";
		if (
			this.stats().freeCargo < (outfit.effects?.cargoCapacity || 0) ||
			this.stats().freeBunks < (outfit.effects?.passengerCapacity || 0)
		)
			return "Unload the extra cargo or passengers before removing this outfit.";
		return "";
	},
	clampShipResources() {
		const stats = this.stats();
		for (const [key, maximum] of [
			["hull", stats.maxHull],
			["shield", stats.maxShield],
			["fuel", stats.maxFuel],
			["energy", stats.maxEnergy],
		])
			this.state[key] = Math.min(this.state[key], maximum);
	},
	storageAction(action, outfitId) {
		if (
			!["storeOutfit", "installStoredOutfit", "sellStoredOutfit"].includes(
				action,
			)
		)
			return null;
		if (this.state.mode !== "port" || !this.currentPlanet()?.inhabited)
			return this.fail("Outfit storage is available at inhabited spaceports.");
		const outfit = OUTFITS.find((o) => o.id === outfitId);
		if (!outfit) return this.fail("Choose a known outfit.");
		const planet = this.currentPlanet().name;
		const stock = this.state.outfitStorage[planet] || {};
		if (action === "storeOutfit") {
			const index = this.state.outfits.indexOf(outfitId);
			if (index < 0)
				return this.fail("Only installed upgrades can be placed in storage.");
			const error = this.outfitRemovalError(outfit);
			if (error) return this.fail(error);
			this.state.outfits.splice(index, 1);
			stock[outfitId] = (stock[outfitId] || 0) + 1;
			this.state.outfitStorage[planet] = stock;
			this.clampShipResources();
			return this.success(
				`${outfit.name} stored on ${planet}. Return here to install it on your current flagship.`,
			);
		}
		if (!stock[outfitId])
			return this.fail(`That outfit is not in storage on ${planet}.`);
		if (action === "installStoredOutfit") {
			if (this.state.outfits.includes(outfitId) && !outfit.stackable)
				return this.fail("This outfit is already installed.");
			const stats = this.stats();
			if (stats.outfitUsed + outfit.space > stats.outfitCapacity)
				return this.fail(
					"Insufficient outfit space. Remove another upgrade first.",
				);
			if (
				stats.freeCargo + (outfit.effects?.cargoCapacity || 0) < 0 ||
				stats.freeBunks + (outfit.effects?.passengerCapacity || 0) < 0
			)
				return this.fail(
					"Unload cargo or passengers before converting this space.",
				);
			this.state.outfits.push(outfitId);
			this.clampShipResources();
		} else {
			this.earn(Math.floor(outfit.price * 0.7), false);
		}
		stock[outfitId]--;
		if (!stock[outfitId]) delete stock[outfitId];
		if (!Object.keys(stock).length) delete this.state.outfitStorage[planet];
		return this.success(
			action === "installStoredOutfit"
				? `${outfit.name} installed from local storage.`
				: `${outfit.name} sold from storage for ${Math.floor(outfit.price * 0.7).toLocaleString()} credits.`,
		);
	},
};
