import { defineConfig } from "vite";

export default defineConfig({
	build: {
		license: { fileName: "dependency-licenses.md" },
		rolldownOptions: {
			output: {
				codeSplitting: {
					includeDependenciesRecursively: false,
					groups: [
						{
							name: "render-engine",
							test: /node_modules[\\/]three[\\/]/,
							priority: 30,
						},
						{
							name: "physics-engine",
							test: /node_modules[\\/]@dimforge[\\/]/,
							priority: 30,
						},
						{ name: "universe", test: /src[\\/]universe\.js$/, priority: 20 },
						{
							name: "source-archive",
							test: /src[\\/]source-data\.js$/,
							priority: 20,
						},
					],
				},
			},
		},
	},
});
