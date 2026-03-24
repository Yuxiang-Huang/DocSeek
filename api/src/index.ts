import { Hono } from "hono";
import { cors } from "hono/cors";
import type { DoctorSearchService } from "./search";

type AppDependencies = {
	port?: number;
	searchService?: DoctorSearchService;
	corsAllowedOrigins?: string[];
};

export function createApp({
	port = Number(process.env.PORT ?? 3000),
	searchService,
	corsAllowedOrigins = [],
}: AppDependencies = {}) {
	const app = new Hono();

	app.use(
		"*",
		cors({
			origin: corsAllowedOrigins,
		}),
	);

	app.get("/", (c) => {
		return c.json({
			name: "DocSeek API",
			status: "ok",
			port,
		});
	});

	app.post("/doctors/search", async (c) => {
		const body = await c.req.json().catch(() => null);
		const symptoms = typeof body?.symptoms === "string" ? body.symptoms.trim() : "";
		const limit = body?.limit;

		if (!symptoms) {
			return c.json(
				{
					error: "symptoms must be a non-empty string",
				},
				400,
			);
		}

		try {
			if (!searchService) {
				throw new Error("doctor search service is not configured");
			}

			const doctors = await searchService({
				symptoms,
				options: {
					limit,
				},
			});

			return c.json({
				doctors,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "doctor search failed";
			const status = message.includes("limit must be a positive integer") ? 400 : 500;

			return c.json(
				{
					error: message,
				},
				status,
			);
		}
	});

	return app;
}

const port = Number(process.env.PORT ?? 3000);

export const app = createApp({ port });

export default {
	port,
	fetch: app.fetch,
};
