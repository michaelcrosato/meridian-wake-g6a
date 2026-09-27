import { test, expect } from "@playwright/test";
async function captain(page) {
	await page.addInitScript(() =>
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", muted: true }),
		),
	);
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page
		.getByRole("button", { name: "Begin your voyage", exact: true })
		.click();
	await page.getByRole("button", { name: "Begin voyage", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "New Boston Spaceport" }),
	).toBeVisible();
}
test("storage denial remains playable, reports backup status, and throttles failed autosaves", async ({
	page,
}) => {
	await page.addInitScript(() => {
		window.auditSaveAttempts = 0;
		const original = Storage.prototype.setItem;
		Storage.prototype.setItem = function (key, value) {
			if (key === "meridian-wake-save-v1") {
				window.auditSaveAttempts++;
				throw new DOMException(
					"Test storage quota exceeded",
					"QuotaExceededError",
				);
			}
			return original.call(this, key, value);
		};
	});
	await captain(page);
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await expect(page.locator("#save-status")).toHaveText("EXPORT BACKUP");
	const before = await page.evaluate(() => window.auditSaveAttempts);
	await page.waitForTimeout(21000); // Cross the real autosave interval while frames continue.
	const after = await page.evaluate(() => window.auditSaveAttempts);
	expect(after - before).toBeGreaterThanOrEqual(1);
	expect(after - before).toBeLessThanOrEqual(2);
	await expect(page.locator(".toast-stack")).not.toContainText(
		"Local storage is unavailable",
	);
	await page.getByRole("button", { name: "Options", exact: true }).click();
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export save", exact: true }).click();
	expect((await download).suggestedFilename()).toMatch(/meridian-wake-day/);
});
test("lost graphics pauses the voyage, saves it and offers a working reload path", async ({
	page,
}) => {
	await captain(page);
	await page.locator('[data-action="story"][data-choice="accept"]').click();
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await page.keyboard.down("w");
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.speed))
		.toBeGreaterThan(2);
	const lost = await page.evaluate(() => {
		const gl = document.querySelector("canvas").getContext("webgl2");
		const ext = gl?.getExtension("WEBGL_lose_context");
		if (!ext) return false;
		ext.loseContext();
		return true;
	});
	expect(lost).toBe(true);
	await expect(
		page.getByRole("heading", { name: "Graphics paused", exact: true }),
	).toBeVisible();
	const before = await page.evaluate(() => window.meridian.telemetry.position);
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => window.meridian.telemetry.position)).toEqual(
		before,
	);
	expect(
		await page.evaluate(() => window.meridian.telemetry.backendReady),
	).toBe(false);
	expect(
		await page.evaluate(
			() =>
				JSON.parse(localStorage.getItem("meridian-wake-save-v1")).activeStory
					.id,
		),
	).toBe("first-passage");
	await page.keyboard.up("w");
	await page.keyboard.press("Escape");
	await expect(
		page.getByRole("heading", { name: "Graphics paused", exact: true }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Reload graphics", exact: true })
		.click();
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page
		.getByRole("button", { name: "Continue your voyage", exact: true })
		.click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.backendReady))
		.toBe(true);
	expect(await page.evaluate(() => window.meridian.state.activeStory.id)).toBe(
		"first-passage",
	);
});
