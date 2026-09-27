import assert from "node:assert/strict";
import test from "node:test";
import { Game, OUTFITS } from "../src/game.js";

const ok = (game, action, payload) => {
	const result = game.act(action, payload);
	assert.equal(result.ok, true, `${action}: ${result.message}`);
	return result;
};
const scanner = "cargo-scanner";

test("daily mortgage pays principal and interest, records a statement and builds credit", () => {
	const game = new Game();
	assert.equal(game.bankStatus().installment, 266);
	game.advanceDay();
	assert.equal(game.state.credits, 23734);
	assert.equal(game.state.debt, 74794);
	assert.equal(game.state.bank.score, 401);
	assert.deepEqual(game.state.bank.statement, {
		day: 2,
		wages: 0,
		interest: 60,
		payment: 266,
		missed: false,
	});
	assert.deepEqual(Game.load(game.save()).bankStatus(), game.bankStatus());
});

test("missed payments accrue interest and lower credit without consuming a partial installment", () => {
	const game = new Game();
	game.state.credits = 100;
	game.advanceDay();
	assert.equal(game.state.credits, 100);
	assert.equal(game.state.debt, 75060);
	assert.equal(game.state.bank.score, 395);
	assert.equal(game.state.bank.missed, 1);
	assert.equal(game.state.bank.statement.missed, true);
	game.state.debt = 0;
	game.advanceDay();
	assert.equal(game.state.bank.score, 396);
});

test("daily settlement pays crew first and multiday settlement matches individual days", () => {
	const game = new Game();
	ok(game, "hireCrew", { count: 2 });
	game.state.credits = 280;
	game.advanceDay();
	assert.equal(game.state.credits, 250);
	assert.equal(game.state.bank.statement.wages, 30);
	assert.equal(game.state.bank.statement.missed, true);
	const batched = Game.load(game.save()),
		daily = Game.load(game.save());
	batched.advanceDay(5);
	for (let i = 0; i < 5; i++) daily.advanceDay();
	assert.deepEqual(batched.state, daily.state);
});

test("bank quotes use recent operating income, reject invalid loans, and disburse once", () => {
	const game = new Game();
	assert.equal(game.act("borrow", { amount: 100 }).ok, false);
	// Recorded revenue is a banking fixture; voyage tests separately exercise actual rewards.
	game.earn(100000);
	assert.equal(game.bankStatus().averageIncome, 1000);
	const quote = game.bankStatus();
	assert.ok(quote.allowance > 10000);
	for (const amount of [-1, 0, 99, 100.5, Infinity, NaN, quote.allowance + 1])
		assert.equal(game.act("borrow", { amount }).ok, false);
	const earnings = game.state.earnings,
		funds = game.state.credits,
		debt = game.state.debt;
	ok(game, "borrow", { amount: 10000 });
	assert.equal(game.state.credits, funds + 10000);
	assert.equal(game.state.debt, debt + 10000);
	assert.equal(game.state.earnings, earnings);
	assert.equal(game.bankStatus().averageIncome, 1000);
	assert.equal(game.bankStatus().allowance, quote.allowance - 10000);
	ok(game, "launch");
	assert.equal(game.act("borrow", { amount: 10000 }).ok, false);
});

test("credit changes new loan rates, low ratings prevent borrowing, and old revenue expires", () => {
	const game = new Game();
	game.earn(100000);
	const usual = game.bankStatus().newRate;
	game.state.bank.score = 700;
	assert.ok(game.bankStatus().newRate < usual);
	game.state.bank.score = 250;
	assert.equal(game.bankStatus().allowance, 0);
	game.state.bank.score = 400;
	game.advanceDay(100);
	assert.equal(game.bankStatus().averageIncome, 0);
	assert.equal(game.bankStatus().allowance, 0);
});

test("buying and selling the same cargo cannot inflate qualifying income", () => {
	const game = new Game();
	for (let i = 0; i < 4; i++) {
		ok(game, "buy", { commodityId: "food", quantity: 3 });
		ok(game, "sell", { commodityId: "food", quantity: 3 });
	}
	assert.equal(game.bankStatus().averageIncome, 0);
	assert.equal(game.bankStatus().allowance, 0);
});

test("stored upgrades stay on their planet, reload and can be installed without payment", () => {
	let game = new Game();
	ok(game, "buyOutfit", { outfitId: scanner });
	const paid = game.state.credits;
	ok(game, "storeOutfit", { outfitId: scanner });
	assert.equal(game.state.credits, paid);
	assert.ok(!game.state.outfits.includes(scanner));
	assert.equal(game.state.outfitStorage["New Boston"][scanner], 1);
	game = Game.load(game.save());
	ok(game, "launch");
	assert.equal(
		game.act("installStoredOutfit", { outfitId: scanner }).ok,
		false,
	);
	ok(game, "jump", { systemId: "arcturus" });
	ok(game, "land", { approach: true });
	assert.equal(game.storageAt().length, 0);
	assert.equal(
		game.act("installStoredOutfit", { outfitId: scanner }).ok,
		false,
	);
	ok(game, "launch");
	ok(game, "jump", { systemId: "rutilicus" });
	ok(game, "land", { approach: true });
	const before = game.state.credits;
	ok(game, "installStoredOutfit", { outfitId: scanner });
	assert.equal(game.state.credits, before);
	assert.ok(game.state.outfits.includes(scanner));
	assert.equal(game.storageAt().length, 0);
	assert.equal(
		game.act("installStoredOutfit", { outfitId: scanner }).ok,
		false,
	);
});

test("storage does not duplicate outfits or bypass outfit-space, cargo or passenger constraints", () => {
	const game = new Game();
	ok(game, "buyOutfit", { outfitId: scanner });
	ok(game, "storeOutfit", { outfitId: scanner });
	assert.equal(game.act("storeOutfit", { outfitId: scanner }).ok, false);
	ok(game, "buyOutfit", { outfitId: scanner });
	assert.equal(
		game.act("installStoredOutfit", { outfitId: scanner }).ok,
		false,
	);
	assert.equal(game.storageAt()[0].count, 1);
	game.state.outfits = ["cargo-expansion"];
	game.state.cargo.metal = game.stats().cargoCapacity;
	assert.equal(
		game.act("storeOutfit", { outfitId: "cargo-expansion" }).ok,
		false,
	);
	assert.equal(
		game.act("sellOutfit", { outfitId: "cargo-expansion" }).ok,
		false,
	);
	game.state.cargo = {};
	ok(game, "storeOutfit", { outfitId: "cargo-expansion" });
	const large = OUTFITS.find((o) => o.space > game.stats().outfitCapacity);
	game.state.outfitStorage["New Boston"][large.id] = 1;
	assert.equal(
		game.act("installStoredOutfit", { outfitId: large.id }).ok,
		false,
	);
	assert.equal(game.state.outfitStorage["New Boston"][large.id], 1);
});

test("storing and reinstalling defensive equipment cannot repair or refill the ship for free", () => {
	const game = new Game();
	const id = "d14-rn-shield-generator";
	ok(game, "buyOutfit", { outfitId: id });
	game.state.shield = 10;
	game.state.hull = 20;
	ok(game, "storeOutfit", { outfitId: id });
	ok(game, "installStoredOutfit", { outfitId: id });
	assert.equal(game.state.shield, 10);
	assert.equal(game.state.hull, 20);
});

test("selling stored assets pays once and does not qualify a captain for another loan", () => {
	const game = new Game();
	ok(game, "buyOutfit", { outfitId: scanner });
	ok(game, "storeOutfit", { outfitId: scanner });
	const funds = game.state.credits;
	ok(game, "sellStoredOutfit", { outfitId: scanner });
	assert.equal(game.state.credits, funds + 1120);
	assert.equal(game.bankStatus().averageIncome, 0);
	assert.equal(game.act("sellStoredOutfit", { outfitId: scanner }).ok, false);
});

test("prototype loans cannot escape mission return requirements through storage or sale", () => {
	const game = new Game();
	game.state.flagshipLoanId = "aqrabe-stellar";
	game.state.outfits.push("radiant-shield-shunt", "multimodal-armor-keystone");
	for (const outfitId of game.state.outfits) {
		assert.equal(game.act("storeOutfit", { outfitId }).ok, false);
		assert.equal(game.act("sellOutfit", { outfitId }).ok, false);
	}
});

test("old saves migrate with no fabricated income, restored records are independent, malformed storage is rejected", () => {
	const state = new Game().state;
	delete state.bank;
	delete state.outfitStorage;
	state.earnings = 500000;
	const game = new Game(state);
	assert.equal(game.state.bank.score, 400);
	assert.equal(game.bankStatus().allowance, 0);
	assert.deepEqual(game.state.outfitStorage, {});
	const restored = new Game(game.state);
	restored.earn(1000);
	assert.equal(game.state.bank.income.length, 0);
	for (const stock of [
		null,
		[],
		{ "New Boston": { [scanner]: -1 } },
		{ "Unknown planet": { [scanner]: 1 } },
	]) {
		assert.throws(
			() => new Game({ ...state, outfitStorage: stock }),
			/storage|stored outfit/,
		);
	}
	assert.throws(
		() => new Game({ ...state, bank: { ...game.state.bank, rate: -1 } }),
		/bank account/,
	);
});
