import { Hono } from "hono";
import { cors } from "hono/cors";
import type { DoctorSearchService } from "./search";
import type { FeedbackService } from "./feedback";
import { validateRating } from "./feedback";
import type { SymptomValidationService } from "./validation";

type AppDependencies = {
	port?: number;
	searchService?: DoctorSearchService;
	feedbackService?: FeedbackService;
	symptomValidationService?: SymptomValidationService;
	corsAllowedOrigins?: string[];
};

export function createApp({
	port = Number(process.env.PORT ?? 3000),
	searchService,
	feedbackService,
	symptomValidationService,
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

	app.post("/doctors/:id/feedback", async (c) => {
		const doctorId = Number(c.req.param("id"));
		if (!Number.isInteger(doctorId) || doctorId < 1) {
			return c.json({ error: "invalid doctor id" }, 400);
		}

		const body = await c.req.json().catch(() => null);

		try {
			const rating = validateRating(body?.rating);
			const comment = typeof body?.comment === "string" ? body.comment.trim() || undefined : undefined;

			if (!feedbackService) {
				throw new Error("feedback service is not configured");
			}

			await feedbackService({ doctorId, rating, comment });
			return c.json({ success: true }, 201);
		} catch (error) {
			const message = error instanceof Error ? error.message : "failed to submit feedback";
			const status = message.includes("rating must be") ? 400 : 500;
			return c.json({ error: message }, status);
  
	app.post("/symptoms/validate", async (c) => {
		const body = await c.req.json().catch(() => null);
		const symptoms = typeof body?.symptoms === "string" ? body.symptoms.trim() : "";
		const history = Array.isArray(body?.history)
			? body.history.filter(
					(message): message is { role: "user" | "assistant"; content: string } =>
						(message?.role === "user" || message?.role === "assistant") &&
						typeof message?.content === "string",
				)
			: [];

		if (!symptoms) {
			return c.json(
				{
					error: "symptoms must be a non-empty string",
				},
				400,
			);
		}

		try {
			if (!symptomValidationService) {
				throw new Error("symptom validation service is not configured");
			}

			const assessment = await symptomValidationService({ symptoms, history });
			return c.json(assessment);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "symptom validation failed";

			return c.json(
				{
					error: message,
				},
				500,
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
