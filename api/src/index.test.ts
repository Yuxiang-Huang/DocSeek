import { describe, expect, test } from "bun:test";
import { createApp } from "./index";

describe("DocSeek API", () => {
	test("returns the status payload", async () => {
		const app = createApp({ port: 3000 });
		const response = await app.request("http://localhost/");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			name: "DocSeek API",
			status: "ok",
			port: 3000,
		});
	});

	test("rejects doctor search requests without symptoms", async () => {
		const app = createApp({
			searchService: async () => {
				throw new Error("search service should not be called");
			},
		});

		const response = await app.request("http://localhost/doctors/search", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				symptoms: "   ",
			}),
		});
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({
			error: "symptoms must be a non-empty string",
		});
	});

	test("returns doctor rows from the search service", async () => {
		const doctor = {
			id: 1,
			source_provider_id: 1001,
			npi: "1234567890",
			full_name: "Dr. Jane Doe",
			first_name: "Jane",
			middle_name: null,
			last_name: "Doe",
			suffix: null,
			primary_specialty: "Neurology",
			accepting_new_patients: true,
			profile_url: "https://example.com/doctors/jane-doe",
			ratings_url: null,
			book_appointment_url: null,
			primary_location: "Pittsburgh, PA",
			primary_phone: "412-555-0100",
			created_at: "2026-03-23T00:00:00.000Z",
		};

		const app = createApp({
			searchService: async ({ symptoms, options }) => {
				expect(symptoms).toBe("persistent headaches and migraines");
				expect(options).toEqual({ limit: 5 });
				return [doctor];
			},
		});

		const response = await app.request("http://localhost/doctors/search", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				symptoms: "persistent headaches and migraines",
				limit: 5,
			}),
		});
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			doctors: [doctor],
		});
	});

	test("returns a bad request for an invalid limit", async () => {
		const app = createApp({
			searchService: async () => {
				throw new Error("limit must be a positive integer");
			},
		});

		const response = await app.request("http://localhost/doctors/search", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				symptoms: "shortness of breath",
				limit: 0,
			}),
		});
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({
			error: "limit must be a positive integer",
		});
	});
});
