import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	// Prerender (SPA shell) starts a preview server; loopback avoids ConnectionRefused in Docker builds.
	// See https://github.com/TanStack/router/issues/6275
	preview: {
		host: "127.0.0.1",
	},
	plugins: [
		devtools(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart({
			spa: {
				enabled: true,
			},
		}),
		viteReact(),
	],
	resolve: {
		dedupe: ["react", "react-dom"],
	},
});

export default config;
