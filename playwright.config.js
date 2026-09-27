import { defineConfig } from "@playwright/test";
export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 90000,
	expect: { timeout: 20000 },
	fullyParallel: false,
	workers: 1,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4174",
		viewport: { width: 1440, height: 900 },
		launchOptions: { args: ["--no-sandbox", "--enable-unsafe-swiftshader"] },
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
	},
	webServer: {
		command: "npm run preview -- --port 4174",
		port: 4174,
		reuseExistingServer: true,
	},
});
