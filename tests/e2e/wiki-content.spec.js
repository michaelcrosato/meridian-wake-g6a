import { expect, test } from "@playwright/test";
import { Game } from "../../src/game.js";

async function start(page) {
	await page.addInitScript(() =>
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", volume: 0, muted: true }),
		),
	);
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page
		.getByRole("button", { name: "Begin your voyage", exact: true })
		.click();
	await page.getByRole("button", { name: /^Begin voyage/ }).click();
	await expect(
		page.getByRole("heading", { name: "New Boston Spaceport" }),
	).toBeVisible();
}
async function jump(page, name) {
	await page.keyboard.press("m");
	await page.locator("#system-search").fill(name);
	await page.locator("#system-search").press("Tab");
	await page
		.getByRole("button", { name: new RegExp(`Jump to ${name}`) })
		.click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.systemId))
		.toBe(name.toLowerCase());
}
async function land(page, name) {
	await page.getByRole("button", { name: /^Land/ }).click();
	await expect(
		page.getByRole("heading", { name: `${name} Spaceport` }),
	).toBeVisible({ timeout: 60000 });
}

test("concourse, searchable setting guide and civilian choices are reachable on desktop and phone", async ({
	page,
}) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await start(page);
	await page.getByRole("button", { name: "Concourse", exact: true }).click();
	await expect(page.locator(".spaceport-prose")).toContainText(
		"concrete landing pads",
	);
	await expect(page.locator(".concourse-voice")).toHaveCount(3);
	await expect(
		page.getByRole("heading", { name: "One missing pump" }),
	).toBeVisible();
	await page.screenshot({ path: "artifacts/wiki-concourse-desktop.png" });
	await page.getByRole("button", { name: /Open the field guide/ }).click();
	await page
		.getByRole("searchbox", { name: "Search the field guide" })
		.fill("Humanitarian");
	await expect(page.locator(".guide-entry")).toHaveCount(1);
	await expect(page.locator(".guide-entry")).toContainText(
		"conscientious objectors",
	);
	await page.getByRole("searchbox").fill("2210");
	await page.getByRole("button", { name: "History", exact: true }).click();
	await expect(page.locator(".guide-entry")).toContainText("Charles Plot");
	await page.getByRole("searchbox").fill("nothing-in-this-guide");
	await expect(page.locator(".empty-state")).toContainText(
		"No matching entries",
	);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole("searchbox").fill("2210");
	await expect(page.locator(".guide-entry")).toContainText("The Plot device");
	await page.locator(".guide-entry").scrollIntoViewIfNeeded();
	await page.screenshot({ path: "artifacts/wiki-guide-mobile.png" });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
	await page.getByRole("button", { name: "Close panel", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Beyond the arrivals hall" }),
	).toBeVisible();
	await page
		.locator('[data-action="acceptArc"][data-id="wiki-harvest"]')
		.click();
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.meridian.state.activeArcs.some(
					(a) => a.arcId === "wiki-harvest",
				),
			),
		)
		.toBe(true);
	await page.reload();
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page.getByRole("button", { name: "Continue your voyage" }).click();
	await page.getByRole("button", { name: "Concourse", exact: true }).click();
	await expect(
		page.locator('[data-id="wiki-harvest"][data-action="completeArc"]'),
	).toBeDisabled();
	expect(errors).toEqual([]);
});

test("a new captain flies a survey round trip and completes a civilian delivery through the UI", async ({
	page,
}) => {
	await start(page);
	await page
		.locator(".job-card")
		.filter({
			has: page.getByRole("heading", {
				name: "Navigation survey: Arcturus",
				exact: true,
			}),
		})
		.getByRole("button", { name: "Accept job" })
		.click();
	await page.getByRole("button", { name: "Concourse", exact: true }).click();
	await page
		.locator('[data-action="acceptArc"][data-id="wiki-harvest"]')
		.click();
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await jump(page, "Arcturus");
	await page.keyboard.press("r");
	await expect
		.poll(() =>
			page.evaluate(() => window.meridian.state.jobs[0].scannedSystems),
		)
		.toEqual(["arcturus"]);
	await land(page, "New Greenland");
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.jobs.length))
		.toBe(1);
	await page.getByRole("button", { name: "Concourse", exact: true }).click();
	await page
		.locator('[data-action="completeArc"][data-id="wiki-harvest"]')
		.click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.arcs["wiki-harvest"]))
		.toBe(1);
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await jump(page, "Rutilicus");
	await land(page, "New Boston");
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.jobs.length))
		.toBe(0);
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.meridian.state.completedJobs.some((id) =>
					id.startsWith("survey:"),
				),
			),
		)
		.toBe(true);
	expect(await page.evaluate(() => window.meridian.state.earnings)).toBe(11900);
});

test("an earned captain can borrow, repay and store/reinstall an upgrade through port services", async ({
	page,
}) => {
	const game = new Game();
	const act = (action, payload) => {
		const result = game.act(action, payload);
		expect(result.ok, result.message).toBe(true);
	};
	// Earn qualification through model contracts. Browser steps exercise services;
	// physical flight is covered by the separate survey round-trip test.
	for (let trip = 0; trip < 20 && game.bankStatus().allowance < 12000; trip++) {
		const target =
			game.state.systemId === "rutilicus" ? "arcturus" : "rutilicus";
		const job = game
			.availableJobs()
			.find((j) => j.kind === "delivery" && j.destinationId === target);
		act("acceptJob", { jobId: job.id });
		act("launch");
		act("jump", { systemId: target });
		act("selectPlanet", { planetName: job.destinationPlanet });
		act("land", { approach: true });
	}
	expect(game.bankStatus().allowance).toBeGreaterThanOrEqual(12000);
	if (game.state.systemId !== "rutilicus") {
		act("launch");
		act("jump", { systemId: "rutilicus" });
		act("land", { approach: true });
	}
	await page.addInitScript((save) => {
		localStorage.setItem("meridian-wake-save-v1", save);
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", muted: true }),
		);
	}, game.save());
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page.getByRole("button", { name: "Continue your voyage" }).click();
	await page.getByRole("button", { name: "Fleet & bank", exact: true }).click();
	await expect(page.locator(".modal-body")).toContainText(
		"Daily mortgage payment",
	);
	await page.getByLabel("Amount to borrow (credits)").fill("1000");
	const debt = await page.evaluate(() => window.meridian.state.debt);
	await page.getByRole("button", { name: "Take loan", exact: true }).click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.debt))
		.toBe(debt + 1000);
	await page.getByRole("button", { name: "Pay 1,000 cr", exact: true }).click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.debt))
		.toBe(debt);
	await page.screenshot({ path: "artifacts/wiki-bank-desktop.png" });
	await page.getByRole("button", { name: "Outfitter", exact: true }).click();
	await page
		.getByRole("searchbox", { name: "Search local inventory" })
		.fill("Cargo Scanner");
	await page
		.locator('[data-action="buyOutfit"][data-id="cargo-scanner"]')
		.click();
	await page
		.locator('[data-action="storeOutfit"][data-id="cargo-scanner"]')
		.click();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.meridian.state.outfitStorage["New Boston"]?.["cargo-scanner"],
			),
		)
		.toBe(1);
	await page
		.locator('[data-action="installStoredOutfit"][data-id="cargo-scanner"]')
		.click();
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.meridian.state.outfits.includes("cargo-scanner"),
			),
		)
		.toBe(true);
	await page
		.locator('[data-action="storeOutfit"][data-id="cargo-scanner"]')
		.click();
	await page
		.locator('[data-action="sellStoredOutfit"][data-id="cargo-scanner"]')
		.click();
	await expect(
		page.locator('[data-action="sellStoredOutfit"][data-id="cargo-scanner"]'),
	).toHaveCount(0);
});
