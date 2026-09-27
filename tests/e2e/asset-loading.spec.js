import { expect, test } from "@playwright/test";

test("startup uses external WASM and WOFF2, keeps muted audio idle, and loads native data only on demand", async ({
	page,
}) => {
	const requests = [],
		errors = [];
	page.on("request", (request) => requests.push(request.url()));
	page.on("pageerror", (error) => errors.push(error.message));
	await page.addInitScript(() =>
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", muted: true }),
		),
	);
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await expect.poll(() => page.evaluate(() => !!window.meridian)).toBe(true);
	expect(requests.filter((url) => url.endsWith(".wasm"))).toHaveLength(1);
	expect(requests.some((url) => url.endsWith(".woff2"))).toBe(true);
	expect(requests.some((url) => url.endsWith(".ttf"))).toBe(false);
	expect(requests.some((url) => /source-archive|\/audio\//.test(url))).toBe(
		false,
	);
	await page
		.getByRole("button", { name: "Begin your voyage", exact: true })
		.click();
	await page.getByRole("button", { name: /^Begin voyage/ }).click();
	await expect(
		page.getByRole("heading", { name: "New Boston Spaceport" }),
	).toBeVisible();
	expect(requests.some((url) => /source-archive|\/audio\//.test(url))).toBe(
		false,
	);
	await page
		.getByRole("button", { name: "Local contacts", exact: true })
		.click();
	await expect(
		page.getByRole("heading", {
			name: "Passenger to New Greenland",
			exact: true,
		}),
	).toBeVisible();
	expect(requests.some((url) => url.includes("source-archive"))).toBe(true);
	expect(requests.some((url) => url.includes("/audio/"))).toBe(false);
	expect(errors).toEqual([]);
});
