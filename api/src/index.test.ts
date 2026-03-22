import { describe, expect, test } from "bun:test";
import { app } from "./index";

describe("DocSeek API", () => {
	test("returns the status payload", async () => {
		const response = await app.request("http://localhost/");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			name: "DocSeek API",
			status: "ok",
			port: 3000,
		});
	});
});
