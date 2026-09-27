import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("a second-finger cloak tap preserves held thrust until release, while opening a panel clears it", async ({
	browser,
	browserName,
}) => {
	test.skip(
		browserName !== "chromium",
		"Real multi-touch injection uses Chromium CDP.",
	);
	const context = await browser.newContext({
		viewport: { width: 844, height: 390 },
		hasTouch: true,
		isMobile: true,
	});
	const page = await context.newPage();
	const checkpoint = readFileSync(
		new URL("../fixtures/earned-epilogue.json", import.meta.url),
		"utf8",
	);
	await page.addInitScript((saved) => {
		localStorage.setItem("meridian-wake-save-v1", saved);
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", muted: true }),
		);
	}, checkpoint);
	try {
		await page.goto("/");
		await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
		await page.getByRole("button", { name: "Continue your voyage" }).click();
		await page.getByRole("button", { name: "Depart", exact: true }).click();
		await expect(page.locator(".modal")).toHaveCount(0);
		const thrust = page.locator('[data-hold="thrust"]');
		const center = async (locator, id) => {
			const box = await locator.boundingBox();
			return { id, x: box.x + box.width / 2, y: box.y + box.height / 2 };
		};
		const first = await center(thrust, 11);
		const second = await center(
			page.getByRole("button", { name: "Toggle cloak" }),
			22,
		);
		const cdp = await context.newCDPSession(page);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [first],
		});
		await expect(thrust).toHaveClass(/active/);
		await page.evaluate(() => {
			window.observedThrustNode = document.querySelector(
				'[data-hold="thrust"]',
			);
		});

		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [first, second],
		});
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [second],
		});

		await expect
			.poll(() => page.evaluate(() => window.meridian.state.cloaked))
			.toBe(true);
		await expect(thrust).toHaveClass(/active/, { timeout: 3000 });
		expect(
			await page.evaluate(
				() =>
					window.observedThrustNode ===
						document.querySelector('[data-hold="thrust"]') &&
					window.observedThrustNode.isConnected,
			),
		).toBe(true);
		// Dragging a second finger away is not a tap, even under capture.
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [first, second],
		});
		const moved = { ...second, x: second.x - 40 };
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: [first, moved],
		});
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [moved],
		});
		expect(await page.evaluate(() => window.meridian.state.cloaked)).toBe(true);
		await expect(thrust).toHaveClass(/active/);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [],
		});
		await expect(thrust).not.toHaveClass(/active/);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [first],
		});
		await expect(thrust).toHaveClass(/active/);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [first, second],
		});
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchCancel",
			touchPoints: [],
		});
		await expect(thrust).not.toHaveClass(/active/);
		expect(await page.evaluate(() => window.meridian.state.cloaked)).toBe(true);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [first],
		});
		await expect(thrust).toHaveClass(/active/);
		const map = await center(
			page.getByRole("button", { name: "Starmap", exact: true }),
			22,
		);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [first, map],
		});
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [map],
		});
		await expect(page.locator(".star-map")).toBeVisible();
		await expect(page.locator("[data-hold].active")).toHaveCount(0);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [],
		});
	} finally {
		await context.close();
	}
});
