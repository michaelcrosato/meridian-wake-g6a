import { expect, test } from "@playwright/test";

async function start(page) {
	await page.addInitScript(
		() =>
			!localStorage.getItem("meridian-wake-settings-v1") &&
			localStorage.setItem(
				"meridian-wake-settings-v1",
				JSON.stringify({ quality: "Balanced", muted: true }),
			),
	);
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page.getByRole("button", { name: "Begin your voyage" }).click();
	await page.getByRole("button", { name: /^Begin voyage/ }).click();
	await page.getByRole("button", { name: "Depart", exact: true }).click();
}

test("browser shortcuts, SVG activation and modal focus remain usable across redraws", async ({
	page,
}) => {
	await start(page);
	const blocked = await page.evaluate(() =>
		["ctrlKey", "metaKey", "altKey", "isComposing"].map((flag) => {
			const event = new KeyboardEvent("keydown", {
				key: "r",
				code: "KeyR",
				[flag]: true,
				bubbles: true,
				cancelable: true,
			});
			window.dispatchEvent(event);
			return event.defaultPrevented;
		}),
	);
	expect(blocked).toEqual([false, false, false, false]);
	await page.keyboard.press("m");
	const star = page.locator('.map-node[data-id="arcturus"]');
	await star.focus();
	await page.keyboard.press("Space");
	await expect(page.locator(".map-detail h3")).toHaveText("Arcturus");
	await expect(star).toBeFocused();
	await page.keyboard.press("Tab");
	expect(
		await page.evaluate(() => !!document.activeElement.closest(".modal")),
	).toBe(true);
	const nodes = page.locator(".modal button:not([disabled])");
	await nodes.last().focus();
	await page.keyboard.press("Tab");
	await expect(page.getByRole("button", { name: "Close panel" })).toBeFocused();
	expect(await page.locator(".hud-top").evaluate((el) => el.inert)).toBe(true);
	await page.getByRole("button", { name: "Close panel" }).click();
	await expect(page.locator(".modal")).toHaveCount(0);
	await page.getByRole("button", { name: "Options", exact: true }).click();
	await page.getByRole("button", { name: "Close panel" }).click();
	await expect(
		page.getByRole("button", { name: "Options", exact: true }),
	).toBeFocused();
});

test("keyboard remaps persist, reject conflicts and do not capture search or composition input", async ({
	page,
}) => {
	await start(page);
	await page.keyboard.press("Escape");
	await page
		.getByRole("button", { name: "Change controls", exact: true })
		.click();
	await page
		.locator('[data-action="rebind"][data-id="thrust"][data-slot="0"]')
		.click();
	await page.keyboard.press("z");
	await expect(
		page.locator('[data-action="rebind"][data-id="thrust"][data-slot="0"]'),
	).toHaveText("Z");
	await page
		.locator('[data-action="rebind"][data-id="fire"][data-slot="0"]')
		.click();
	await page.keyboard.press("z");
	await expect(page.getByText(/already assigned to thrust/)).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.locator(".binding-prompt")).toHaveCount(0);
	await page.keyboard.press("Escape");
	await page.keyboard.press("Escape");
	await page.keyboard.down("z");
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.speed))
		.toBeGreaterThan(1);
	await page.keyboard.up("z");
	await page.keyboard.press("m");
	await page.locator("#system-search").fill("Mizar");
	await page.locator("#system-search").press("Tab");
	await expect(page.locator(".map-detail h3")).toHaveText("Mizar");
	const saved = await page.evaluate(() =>
		JSON.parse(localStorage.getItem("meridian-wake-settings-v1")),
	);
	expect(saved.bindings.thrust).toEqual(["KeyZ", "ArrowUp"]);
	await page.reload();
	await expect(page.locator(".loading")).toHaveCount(0);
	await page.getByRole("button", { name: "Options", exact: true }).click();
	await page
		.getByRole("button", { name: "Change controls", exact: true })
		.click();
	await expect(
		page.locator('[data-action="rebind"][data-id="thrust"][data-slot="0"]'),
	).toHaveText("Z");
});

test("standard gamepad navigates menus, changes values, flies, pauses and clears on disconnect", async ({
	page,
}) => {
	await page.addInitScript(() => {
		window.testPad = {
			id: "Synthetic standard gamepad",
			index: 0,
			mapping: "standard",
			connected: true,
			axes: [0, 0, 0, 0],
			buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
		};
		const samples = [];
		let polls = 0;
		window.sampleGamepadButton = (button) =>
			new Promise((resolve) => {
				const firstPoll = polls;
				// Each snapshot lasts for one actual gamepad poll. Wall-clock sleeps
				// can become a long press when software rendering delays automation.
				samples.push(
					{ button: null },
					{ button },
					{
						button: null,
						done: () => resolve(polls - firstPoll),
					},
				);
			});
		Object.defineProperty(navigator, "getGamepads", {
			value: () => {
				polls++;
				const sample = samples.shift();
				const snapshot = {
					...window.testPad,
					axes: [...window.testPad.axes],
					buttons: sample
						? window.testPad.buttons.map((_, index) => ({
								pressed: index === sample.button,
								value: Number(index === sample.button),
							}))
						: window.testPad.buttons.map((button) => ({ ...button })),
				};
				// Resolve after the application has consumed the final neutral sample.
				if (sample?.done) queueMicrotask(sample.done);
				return [snapshot];
			},
		});
	});
	await start(page);
	async function press(button) {
		expect(
			await page.evaluate((index) => window.sampleGamepadButton(index), button),
		).toBe(3);
	}
	await press(null); // Observe a neutral controller after launch before moving.
	await page.evaluate(() => {
		window.testPad.axes[1] = -1;
	});
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.speed))
		.toBeGreaterThan(1);
	await page.evaluate(() => {
		window.testPad.axes[1] = 0;
	});
	await press(9);
	await expect(
		page.getByRole("heading", { name: "Make yourself at home." }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Close panel" })).toBeFocused();
	await press(13);
	await expect(page.getByLabel("Rendering quality")).toBeFocused();
	await press(14);
	await expect(page.getByLabel("Rendering quality")).toHaveValue("High");
	await press(1);
	await expect(page.locator(".modal")).toHaveCount(0);
	await page.evaluate(() => {
		window.testPad.connected = false;
	});
	await expect(
		page.getByRole("heading", { name: "Make yourself at home." }),
	).toBeVisible();
	await page.getByRole("button", { name: "Close panel" }).click();
	await page.evaluate(() => window.dispatchEvent(new Event("blur")));
	await expect(
		page.getByRole("heading", { name: "Make yourself at home." }),
	).toBeVisible();
});

test("a deferred original conversation remains resumable without trapping flight", async ({
	page,
}) => {
	await page.addInitScript(() =>
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", muted: true }),
		),
	);
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page.getByRole("button", { name: "Begin your voyage" }).click();
	await page.getByRole("button", { name: /^Begin voyage/ }).click();
	await page
		.getByRole("button", { name: "Local contacts", exact: true })
		.click();
	await page
		.locator('[data-action="sourceOffer"][data-id="Intro [0]"]')
		.click();
	await expect(
		page.locator('[data-action="sourceChoose"]').first(),
	).toBeVisible();
	await page.getByRole("button", { name: "Close panel" }).click();
	await expect(
		page.locator('[data-action="resumeConversation"]'),
	).toBeVisible();
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await expect(page.locator(".modal")).toHaveCount(0);
	await page.keyboard.press("j");
	await page.getByRole("button", { name: "Close panel" }).click();
	await expect(page.locator(".modal")).toHaveCount(0);
	expect(
		await page.evaluate(() => !!window.meridian.state.sourceQuests.dialogue),
	).toBe(true);
});
