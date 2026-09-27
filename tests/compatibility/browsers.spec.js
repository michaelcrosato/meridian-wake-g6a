import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browserName = process.env.COMPAT_BROWSER || "chromium";
const artifacts = `artifacts/compatibility/${browserName}`;
const sizes = [
	[320, 568],
	[360, 800],
	[390, 844],
	[430, 932],
	[768, 1024],
	[1024, 768],
	[1366, 768],
	[1920, 1080],
	[2560, 1080],
	[844, 390],
	[683, 384],
];

async function setup(page) {
	await page.addInitScript(() =>
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", volume: 0.35, muted: true }),
		),
	);
	await page.goto("/");
	await expect
		.poll(() => page.evaluate(() => Boolean(window.meridian)), {
			timeout: 90000,
		})
		.toBe(true);
	await expect(page.locator(".loading")).toHaveCount(0);
}
async function begin(page) {
	await page
		.getByRole("button", { name: "Begin your voyage", exact: true })
		.click();
	await page.getByRole("button", { name: "Begin voyage", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "New Boston Spaceport" }),
	).toBeVisible();
}
async function record(page, name) {
	await mkdir(artifacts, { recursive: true });
	await page.screenshot({ path: `${artifacts}/${name}.png` });
}
async function visibleCenter(page, selector) {
	return page.locator(selector).evaluate((el) => {
		const r = el.getBoundingClientRect();
		const x = r.left + r.width / 2,
			y = r.top + r.height / 2;
		return (
			r.width > 0 &&
			r.height > 0 &&
			x >= 0 &&
			x < innerWidth &&
			y >= 0 &&
			y < innerHeight &&
			el.contains(document.elementFromPoint(x, y))
		);
	});
}

test("complete opening voyage, economy, audio and persisted progress across this browser", async ({
	page,
	browser,
}) => {
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await setup(page);
	await begin(page);
	await page.getByRole("button", { name: "Trading post", exact: true }).click();
	await page.locator("#qty-food").fill("1");
	await page.locator('[data-action="buy"][data-id="food"]').click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.cargo.food))
		.toBe(1);
	await page.locator('[data-action="sell"][data-id="food"]').click();
	await page
		.locator('.modal [data-action="portTab"][data-id="missions"]')
		.click();
	await page.locator('[data-action="story"][data-choice="accept"]').click();
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await page.keyboard.down("w");
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.speed))
		.toBeGreaterThan(3);
	await page.keyboard.up("w");
	const heading = await page.evaluate(() => window.meridian.telemetry.heading);
	await page.keyboard.down("ArrowRight");
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.heading))
		.not.toBe(heading);
	await page.keyboard.up("ArrowRight");
	await page.keyboard.down("ArrowDown");
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.speed))
		.toBeLessThan(1);
	await page.keyboard.up("ArrowDown");
	const energy = await page.evaluate(() => window.meridian.state.energy);
	await page.keyboard.down("Space");
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.energy))
		.toBeLessThan(energy);
	await page.keyboard.up("Space");
	await page.keyboard.press("m");
	await page.locator("#system-search").fill("Arcturus");
	await page.locator("#system-search").press("Tab");
	await page.getByRole("button", { name: /Jump to Arcturus/ }).click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.systemId))
		.toBe("arcturus");
	await page.getByRole("button", { name: /^Land/ }).click();
	await expect(
		page.getByRole("heading", { name: "New Greenland Spaceport" }),
	).toBeVisible({ timeout: 90000 });
	await page
		.getByRole("button", { name: "Complete mission", exact: true })
		.click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.storyIndex))
		.toBe(1);
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Options", exact: true }).click();
	await page.locator('.modal [data-action="toggleMute"]').click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.loaded), {
			timeout: 60000,
		})
		.toBe(11);
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.contextState))
		.toBe("running");
	expect(await page.evaluate(() => window.meridian.audio.errors)).toEqual([]);
	await record(page, "audio-options");
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => Boolean(window.meridian)), {
			timeout: 90000,
		})
		.toBe(true);
	await page
		.getByRole("button", { name: "Continue your voyage", exact: true })
		.click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.storyIndex))
		.toBe(1);
	await record(page, "saved-voyage");
	expect(errors).toEqual([]);
	await writeFile(
		`${artifacts}/browser.json`,
		JSON.stringify(
			{
				browser: browserName,
				version: browser.version(),
				runtime: await page.evaluate(() => ({
					userAgent: navigator.userAgent,
					viewport: {
						width: innerWidth,
						height: innerHeight,
						dpr: devicePixelRatio,
					},
					backend: window.meridian.telemetry.backend,
					audio: window.meridian.audio,
				})),
				errors,
			},
			null,
			2,
		) + "\n",
	);
});

test("title, menus, map and flight remain reachable across common CSS viewport sizes", async ({
	page,
}) => {
	test.setTimeout(300000);
	await setup(page);
	const measurements = [];
	for (const [width, height] of sizes) {
		await page.setViewportSize({ width, height });
		await expect(page.locator(".start-button")).toBeVisible();
		expect(await visibleCenter(page, ".start-button")).toBe(true);
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
		await record(page, `title-${width}x${height}`);
	}
	await page.setViewportSize({ width: 1366, height: 768 });
	await begin(page);
	for (const [width, height] of sizes) {
		await page.setViewportSize({ width, height });
		expect(
			await visibleCenter(page, '.modal-footer [data-action="launch"]'),
		).toBe(true);
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
		await record(page, `port-${width}x${height}`);
	}
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	for (const [width, height] of sizes) {
		await page.setViewportSize({ width, height });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
		for (const selector of [
			'.hud-nav [data-action="map"]',
			'.hud-nav [data-action="options"]',
			'.bottom-actions [data-action="land"]',
		])
			expect(
				await visibleCenter(page, selector),
				`${selector} at ${width}×${height}`,
			).toBe(true);
		const overlap = await page.evaluate(() => {
			const a = document
					.querySelector(".mission-tracker")
					.getBoundingClientRect(),
				b = document.querySelector(".status-panel").getBoundingClientRect();
			return (
				Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
				Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
			);
		});
		expect(overlap, `Mission/status overlap at ${width}×${height}`).toBe(0);
		measurements.push({ width, height, overlap });
		await record(page, `flight-${width}x${height}`);
		await page.getByRole("button", { name: "Starmap", exact: true }).click();
		await expect(page.locator("#system-search")).toBeVisible();
		await page.locator("#system-search").fill("Arcturus");
		await page.locator("#system-search").press("Tab");
		await expect(page.locator('.modal [data-action="jump"]')).toBeVisible();
		await page.keyboard.press("Escape");
	}
	await writeFile(
		`${artifacts}/viewport-matrix.json`,
		JSON.stringify(measurements, null, 2) + "\n",
	);
});

test("browser shortcuts and modal keyboard semantics remain intact", async ({
	page,
}) => {
	await setup(page);
	await begin(page);
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	const modifiers = await page.evaluate(() =>
		["Control", "Meta", "Alt"].map((modifier) => {
			const event = new KeyboardEvent("keydown", {
				key: "r",
				code: "KeyR",
				ctrlKey: modifier === "Control",
				metaKey: modifier === "Meta",
				altKey: modifier === "Alt",
				bubbles: true,
				cancelable: true,
			});
			document.body.dispatchEvent(event);
			return { modifier, blocked: event.defaultPrevented };
		}),
	);
	expect(modifiers.every((m) => !m.blocked)).toBe(true);
	await page.keyboard.press("m");
	await expect(page.locator(".star-map")).toBeVisible();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Starmap", exact: true }).click();
	const mapNode = page.locator(
		'[role="button"][data-action="selectSystem"][data-id="arcturus"]',
	);
	await mapNode.focus();
	await page.keyboard.press("Space");
	await expect(
		page.getByRole("button", { name: /Jump to Arcturus/ }),
	).toBeVisible();
	for (let i = 0; i < 12; i++) {
		await page.keyboard.press("Tab");
		expect(
			await page.evaluate(() =>
				Boolean(document.activeElement.closest(".modal")),
			),
		).toBe(true);
	}
	await page.keyboard.press("Escape");
	expect(
		await page.evaluate(() =>
			Boolean(document.activeElement.closest(".hud-nav")),
		),
	).toBe(true);
});
