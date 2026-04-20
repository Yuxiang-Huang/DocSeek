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

	test("renders five team portraits with bios", () => {
		renderSite("/about-the-team");
		expect(
			screen.getByRole("heading", { name: /Our Leadership Team/i }),
		).toBeTruthy();
		expect(screen.getByText(/The people behind DocSeek/i)).toBeTruthy();
		const portraits = screen.getAllByRole("img", { name: /^Portrait of /i });
		expect(portraits).toHaveLength(5);
		expect(portraits[0].getAttribute("src")).toContain("/headshots/");
	});
});
