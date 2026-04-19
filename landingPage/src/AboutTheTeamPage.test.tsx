// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test } from "vitest";
import { AboutTheTeamPage } from "./AboutTheTeamPage";
import { renderSite } from "./test/renderWithRoutes";

afterEach(cleanup);

describe("AboutTheTeamPage", () => {
	test("renders heading and link back to home", () => {
		renderSite("/about-the-team");
		expect(
			screen.getByRole("heading", { name: /About the team/i, level: 1 }),
		).toBeTruthy();
		const home = screen.getByRole("link", { name: /^Home$/i });
		expect(home.getAttribute("href")).toBe("/");
	});

	test("logo links to landing page", () => {
		render(
			<MemoryRouter initialEntries={["/about-the-team"]}>
				<AboutTheTeamPage />
			</MemoryRouter>,
		);
		const logo = screen.getByRole("link", { name: /DocSeek/i });
		expect(logo.getAttribute("href")).toBe("/");
	});
});
