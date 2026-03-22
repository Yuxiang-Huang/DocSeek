/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { App } from "../components/App";

describe("App", () => {
	test("renders the DocSeek landing content", () => {
		render(<App />);

		const heading = screen.getByRole("heading", {
			name: "Find the best UPMC doctors for your specific needs.",
		});
		const clientPort = screen.getByText("Client on port 5173");
		const apiLink = screen.getByRole("link", { name: "API on port 3000" });

		expect(heading).toBeTruthy();
		expect(clientPort).toBeTruthy();
		expect(apiLink.getAttribute("href")).toBe("http://localhost:3000");
	});
});
