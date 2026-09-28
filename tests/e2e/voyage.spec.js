import { expect, test } from "@playwright/test";

async function startCaptain(page) {
	await page.addInitScript(() =>
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", volume: 0, muted: true }),
		),
	);
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page.getByRole("button", { name: "Begin your voyage" }).click();
	await page.getByRole("button", { name: /Begin voyage/ }).click();
	await expect(
		page.getByRole("heading", { name: "New Boston Spaceport" }),
	).toBeVisible();
}

test("captain accepts a real mission, flies to its destination, docks, completes it and resumes saved progress", async ({
	page,
}) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await startCaptain(page);
	await page.getByRole("button", { name: /Accept transmission/ }).click();
	await expect(page.locator(".story-card")).toContainText("In progress");
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await expect(page.locator(".modal")).toHaveCount(0);
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
	).toBeVisible({ timeout: 60000 });
	await page
		.getByRole("button", { name: "Complete mission", exact: true })
		.click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.storyIndex))
		.toBe(1);
	const saved = await page.evaluate(() => window.meridian.state);
	await page.reload();
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page.getByRole("button", { name: "Continue your voyage" }).click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.storyIndex))
		.toBe(1);
	expect(await page.evaluate(() => window.meridian.state.credits)).toBe(
		saved.credits,
	);
	expect(await page.evaluate(() => window.meridian.state.systemId)).toBe(
		"arcturus",
	);
	expect(errors).toEqual([]);
});

test("port economy, ship equipment, settings, source archive, and malformed saves remain usable", async ({
	page,
}) => {
	await startCaptain(page);
	const before = await page.evaluate(() => window.meridian.state.credits);
	await page.getByRole("button", { name: "Trading post", exact: true }).click();
	await page.locator("#qty-food").fill("3");
	await page.locator('[data-action="buy"][data-id="food"]').click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.cargo.food))
		.toBe(3);
	await page.locator("#qty-food").fill("1");
	await page.locator('[data-action="sell"][data-id="food"]').click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.cargo.food))
		.toBe(2);
	expect(await page.evaluate(() => window.meridian.state.credits)).toBeLessThan(
		before,
	);
	await page.getByRole("button", { name: "Outfitter", exact: true }).click();
	await expect(page.locator(".item-card")).not.toHaveCount(0);
	const itemName = await page.locator(".item-card h3").first().innerText();
	await page.locator("#shop-search").fill(itemName);
	await expect(page.locator(".item-card").first()).toContainText(itemName);
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Options", exact: true }).click();
	await page.getByLabel("Rendering quality").selectOption("Balanced");
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.effectivePreset))
		.toBe("Balanced");
	await page.getByRole("button", { name: "Import save", exact: true }).click();
	await page.locator("#save-file").setInputFiles({
		name: "invalid.json",
		mimeType: "application/json",
		buffer: Buffer.from('{"invalid":true}'),
	});
	await expect(
		page.getByText("This file is not a valid Meridian Wake save."),
	).toBeVisible();
	await page
		.getByRole("button", { name: "About this voyage", exact: true })
		.click();
	await page
		.getByRole("button", { name: /Explore the source archive/ })
		.click();
	await expect(page.getByLabel("Search source archive")).toBeVisible();
	await page.getByLabel("Search source archive").fill("sparrow");
	await expect(page.locator("#catalog-results")).toContainText("Sparrow");
});

test("touch layout exposes every flight decision without horizontal overflow", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await startCaptain(page);
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Thrust", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Fire weapons", exact: true }),
	).toBeVisible();
	const thrust = await page
		.getByRole("button", { name: "Thrust", exact: true })
		.boundingBox();
	await page.mouse.move(
		thrust.x + thrust.width / 2,
		thrust.y + thrust.height / 2,
	);
	await page.mouse.down();
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.speed))
		.toBeGreaterThan(0.5);
	await page.mouse.up();
	await page.getByRole("button", { name: "Starmap", exact: true }).click();
	await expect(page.locator(".star-map")).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
});

test("original local conversation accepts James, reserves a berth and completes at the original destination", async ({
	page,
}) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await startCaptain(page);
	await page
		.getByRole("button", { name: "Local contacts", exact: true })
		.click();
	const intro = page.locator(
		'[data-action="sourceOffer"][data-id="Intro [0]"]',
	);
	await expect(intro).toBeVisible({ timeout: 30000 });
	await intro.click();
	for (let step = 0; step < 40; step++) {
		const choices = page.locator(".dialogue-choices button");
		if (!(await choices.count())) break;
		const texts = await choices.allTextContents();
		const index = Math.max(
			0,
			texts.findIndex(
				(text) => !/decline|no,|not interested|leave|refuse/i.test(text),
			),
		);
		await choices.nth(index).click();
	}
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.meridian.state.sourceQuests.active.some(
					(m) => m.id === "Intro [0]",
				),
			),
		)
		.toBe(true);
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await page.keyboard.press("m");
	await page.locator("#system-search").fill("Arcturus");
	await page.locator("#system-search").press("Tab");
	await page.getByRole("button", { name: /Jump to Arcturus/ }).click();
	await page.getByRole("button", { name: /^Land/ }).click();
	await expect(
		page.getByRole("heading", { name: "New Greenland Spaceport" }),
	).toBeVisible({ timeout: 45000 });
	await page
		.getByRole("button", { name: "Local contacts", exact: true })
		.click();
	await page
		.locator('[data-action="sourceComplete"][data-id="Intro [0]"]')
		.click();
	await expect
		.poll(() =>
			page.evaluate(
				() => window.meridian.state.sourceQuests.conditions["Intro [0]: done"],
			),
		)
		.toBe(1);
	expect(errors).toEqual([]);
});

test("earned epilogue checkpoint renders results and continues the sandbox", async ({
	page,
}) => {
	const { endingCheckpoint } = await import("./checkpoints.js");
	await page.addInitScript(() =>
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", muted: true }),
		),
	);
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page.getByRole("button", { name: "Options", exact: true }).click();
	await page.getByRole("button", { name: "Import save", exact: true }).click();
	await page.locator("#save-file").setInputFiles({
		name: "earned-epilogue.json",
		mimeType: "application/json",
		buffer: Buffer.from(endingCheckpoint()),
	});
	await expect(
		page.getByRole("heading", { name: "New Boston Spaceport" }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Complete mission", exact: true })
		.click();
	await expect(
		page.getByRole("heading", { name: "The end of one journey." }),
	).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.mode))
		.toBe("ending");
	await page.getByRole("button", { name: /Keep exploring/ }).click();
	await expect(
		page.getByRole("heading", { name: "New Boston Spaceport" }),
	).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.endingSeen))
		.toBe(true);
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.mode))
		.toBe("flight");
});

test("audio, fullscreen and exported saves use the actual browser interfaces", async ({
	page,
}) => {
	await startCaptain(page);
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Options", exact: true }).click();
	await page.locator('.modal [data-action="toggleMute"]').click();
	await page.getByLabel("Master volume").fill("0.35");
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.loaded))
		.toBe(10);
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.contextState))
		.toBe("running");
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.gain))
		.toBeCloseTo(0.35, 2);
	expect(await page.evaluate(() => window.meridian.audio.errors)).toEqual([]);
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.music))
		.toBe("port");
	await page.locator('.modal [data-action="toggleMute"]').click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.gain))
		.toBeLessThan(0.001);
	await page.locator('[data-action="fullscreen"]').click();
	await expect
		.poll(() => page.evaluate(() => !!document.fullscreenElement))
		.toBe(true);
	await page.locator('[data-action="fullscreen"]').click();
	await expect
		.poll(() => page.evaluate(() => !!document.fullscreenElement))
		.toBe(false);
	const downloaded = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export save", exact: true }).click();
	expect((await downloaded).suggestedFilename()).toMatch(
		/^meridian-wake-day-\d+\.json$/,
	);
	await page.getByRole("button", { name: "Close panel", exact: true }).click();
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await page.getByRole("button", { name: "Options", exact: true }).click();
	await page.locator('.modal [data-action="toggleMute"]').click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.loaded))
		.toBe(11);
	await expect
		.poll(() => page.evaluate(() => window.meridian.audio.music))
		.toBe("music");
	expect(await page.evaluate(() => window.meridian.audio.errors)).toEqual([]);
});

test("landscape touch supports simultaneous steering, thrust and firing, then releases every control", async ({
	browser,
}) => {
	const context = await browser.newContext({
		viewport: { width: 844, height: 390 },
		hasTouch: true,
		isMobile: true,
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	try {
		await startCaptain(page);
		await page.getByRole("button", { name: "Depart", exact: true }).click();
		for (const label of [
			"Thrust",
			"Turn left",
			"Turn right",
			"Brake",
			"Boost",
			"Fire weapons",
			"Fire secondary weapon",
			"Toggle cloak",
		]) {
			await expect(
				page.getByRole("button", { name: label, exact: true }),
			).toBeVisible();
		}
		const points = [];
		for (const [id, label] of [
			"Thrust",
			"Turn left",
			"Fire weapons",
		].entries()) {
			const rect = await page
				.getByRole("button", { name: label, exact: true })
				.boundingBox();
			const point = {
				x: rect.x + rect.width / 2,
				y: rect.y + rect.height / 2,
				id,
			};
			expect(
				await page.evaluate(
					({ x, y, label }) =>
						document
							.elementFromPoint(x, y)
							?.closest("button")
							?.getAttribute("aria-label") === label,
					{ ...point, label },
				),
			).toBe(true);
			points.push(point);
		}
		const cdp = await context.newCDPSession(page);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: points,
		});
		await expect(page.locator(".touch-controls button.active")).toHaveCount(3);
		await expect
			.poll(() => page.evaluate(() => window.meridian.telemetry.speed))
			.toBeGreaterThan(0.5);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [],
		});
		await expect(page.locator(".touch-controls button.active")).toHaveCount(0);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: points.slice(0, 1),
		});
		await expect(page.locator(".touch-controls button.active")).toHaveCount(1);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchCancel",
			touchPoints: [],
		});
		await expect(page.locator(".touch-controls button.active")).toHaveCount(0);
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
		await page.screenshot({ path: "artifacts/release-touch-landscape.png" });
		expect(errors).toEqual([]);
	} finally {
		await context.close();
	}
});

async function restoreEarnedFixture(page, file) {
	const { readFileSync } = await import("node:fs");
	await page.addInitScript(() =>
		localStorage.setItem(
			"meridian-wake-settings-v1",
			JSON.stringify({ quality: "Balanced", muted: true }),
		),
	);
	await page.goto("/");
	await expect(page.locator(".loading")).toHaveCount(0, { timeout: 60000 });
	await page.getByRole("button", { name: "Options", exact: true }).click();
	await page.locator("#save-file").setInputFiles({
		name: file,
		mimeType: "application/json",
		buffer: readFileSync(new URL(`../fixtures/${file}`, import.meta.url)),
	});
	await expect(
		page.getByRole("button", { name: "Begin your voyage" }),
	).toHaveCount(0);
}

test("earned Algenib operation drains a fitted cloak and reaches the actual stealth objective in flight", async ({
	page,
}) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await restoreEarnedFixture(page, "earned-stealth.json");
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.systemId))
		.toBe("algenib");
	const fuel = await page.evaluate(() => window.meridian.state.fuel);
	// Evade the opening volley: shots already in flight can break a cloak.
	await page.keyboard.down("w");
	await expect
		.poll(() => page.evaluate(() => window.meridian.telemetry.speed))
		.toBeGreaterThan(10);
	await page.getByRole("button", { name: "Toggle cloak", exact: true }).click();
	let observedCloak = false;
	await expect
		.poll(
			async () => {
				const snapshot = await page.evaluate(() => ({
					cloaked: window.meridian.telemetry.cloaked,
					cooldown: window.meridian.state.cloakCooldown,
					elapsed: window.meridian.state.activeStory.stealthElapsed,
				}));
				observedCloak ||= snapshot.cloaked;
				if (!snapshot.cloaked && snapshot.cooldown === 0)
					await page.keyboard.press("c");
				return snapshot.elapsed;
			},
			{ timeout: 60000 },
		)
		.toBeGreaterThanOrEqual(8);
	await page.keyboard.up("w");
	expect(observedCloak).toBe(true);
	expect(await page.evaluate(() => window.meridian.state.fuel)).toBeLessThan(
		fuel,
	);
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.enemies))
		.toBe(0);
	await page.keyboard.press("c");
	await page.getByRole("button", { name: /^Land/ }).click();
	await expect(
		page.getByRole("heading", { name: "Buccaneer Bay Spaceport" }),
	).toBeVisible({ timeout: 60000 });
	await page
		.getByRole("button", { name: "Complete mission", exact: true })
		.click();
	await expect
		.poll(() =>
			page.evaluate(() => window.meridian.state.flags["extremists-contained"]),
		)
		.toBe(true);
	expect(errors).toEqual([]);
});

test("six protected source ships survive the final convoy jump and physically arrive before completion", async ({
	page,
}) => {
	test.setTimeout(150000);
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await restoreEarnedFixture(page, "earned-convoy-approach.json");
	await page.getByRole("button", { name: "Depart", exact: true }).click();
	await expect
		.poll(() =>
			page.evaluate(() => window.meridian.telemetry.missionActors.length),
		)
		.toBe(6);
	const contact = page
		.locator(".actor-marker")
		.filter({ hasText: "F.S. Franklin" });
	await expect(contact).toBeVisible();
	await contact.evaluate((element) => {
		const audit = {
			trustedDown: false,
			captureAcquired: false,
			capturedUp: false,
			hudMutations: 0,
			releasedOnSameNode: false,
		};
		window.heldContactAudit = audit;
		const observer = new MutationObserver((records) => {
			audit.hudMutations += records.length;
		});
		element.addEventListener(
			"pointerdown",
			(event) => {
				audit.trustedDown =
					event.isTrusted && event.target.closest(".actor-marker") === element;
				observer.observe(element, {
					attributes: true,
					attributeFilter: ["class", "style"],
				});
			},
			{ once: true },
		);
		element.addEventListener(
			"gotpointercapture",
			(event) => {
				audit.captureAcquired =
					event.isTrusted && element.hasPointerCapture(event.pointerId);
			},
			{ once: true },
		);
		element.addEventListener(
			"pointerup",
			(event) => {
				audit.hudMutations += observer.takeRecords().length;
				observer.disconnect();
				audit.capturedUp = element.hasPointerCapture(event.pointerId);
				audit.releasedOnSameNode =
					element.isConnected &&
					event.target.closest(".actor-marker") === element;
			},
			{ once: true },
		);
	});
	// Let the locator hit-test the moving contact at press time, rather than
	// reusing a bounding box across several slow automation round trips. The
	// hold spans several 250 ms HUD refreshes even at slow software-GPU frame rates.
	await contact.click({ delay: 1200 });
	const heldClick = await page.evaluate(() => window.heldContactAudit);
	expect(heldClick.trustedDown).toBe(true);
	expect(heldClick.captureAcquired).toBe(true);
	expect(heldClick.capturedUp).toBe(true);
	expect(heldClick.releasedOnSameNode).toBe(true);
	expect(heldClick.hudMutations).toBeGreaterThan(0);
	await expect(contact).toHaveClass(/selected/);
	await page.keyboard.press("m");
	await page.locator("#system-search").fill("Tarazed");
	await page.locator("#system-search").press("Tab");
	await page.getByRole("button", { name: /Jump to Tarazed/ }).click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.systemId))
		.toBe("tarazed");
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.enemies), {
			timeout: 90000,
		})
		.toBe(0);
	await page.getByRole("button", { name: /^Land/ }).click();
	await expect(
		page.getByRole("heading", { name: "Wayfarer Spaceport" }),
	).toBeVisible({ timeout: 60000 });
	const members = await page.evaluate(() =>
		Object.values(window.meridian.state.activeStory.convoy.members),
	);
	expect(members).toHaveLength(6);
	expect(members.every((member) => member.hull > 0 && member.arrival)).toBe(
		true,
	);
	await page
		.getByRole("button", { name: "Complete mission", exact: true })
		.click();
	await expect
		.poll(() => page.evaluate(() => window.meridian.state.activeStory))
		.toBeNull();
	expect(errors).toEqual([]);
});
