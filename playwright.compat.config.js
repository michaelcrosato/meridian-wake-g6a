import { defineConfig } from "@playwright/test";
const chromiumArgs = ["--no-sandbox", "--enable-unsafe-swiftshader"];
const headed = process.env.COMPAT_HEADED === "1";
const executable = process.env.COMPAT_EXECUTABLE;
const browser = process.env.COMPAT_BROWSER || "chromium";
const browserName = ["chrome", "edge", "opera"].includes(browser)
	? "chromium"
	: browser;
const channel = !executable
	? { chrome: "chrome", edge: "msedge" }[browser]
	: undefined;
export default defineConfig({
	testDir: "./tests/compatibility",
	timeout: 180000,
	expect: { timeout: 30000 },
	workers: 1,
	fullyParallel: false,
	reporter: [
		["list"],
		["json", { outputFile: `artifacts/compatibility/${browser}/results.json` }],
	],
	outputDir: `artifacts/compatibility/${browser}/test-results`,
	use: {
		baseURL: process.env.COMPAT_URL || "http://127.0.0.1:4174",
		browserName,
		viewport: { width: 1366, height: 768 },
		headless: !headed,
		...(channel ? { channel } : {}),
		launchOptions: {
			...(executable ? { executablePath: executable } : {}),
			...(browserName === "chromium" ? { args: chromiumArgs } : {}),
			...(browserName === "firefox"
				? { firefoxUserPrefs: { "webgl.force-enabled": true } }
				: {}),
		},
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
	},
	webServer: {
		command: "npm run preview -- --port 4174",
		port: 4174,
		reuseExistingServer: true,
	},
});
