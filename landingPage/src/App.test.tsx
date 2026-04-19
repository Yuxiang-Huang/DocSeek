// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderSite } from "./test/renderWithRoutes";

afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
});

describe("App", () => {
	test("renders brand in header banner", () => {
		renderSite("/");
		const banner = screen.getByRole("banner");
		expect(banner.textContent).toContain("DocSeek");
	});

	test("header links About the team to dedicated route", () => {
		renderSite("/");
		const about = screen.getByRole("link", { name: /About the team/i });
		expect(about.getAttribute("href")).toBe("/about-the-team");
	});

	test("hero headline includes UPMC physician messaging", () => {
		renderSite("/");
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /UPMC physician/i,
			}),
		).toBeTruthy();
	});

	test("quick demo section embeds YouTube player", () => {
		renderSite("/");
		expect(
			screen.getByRole("heading", { name: /See DocSeek in action/i }),
		).toBeTruthy();
		const iframe = screen.getByTestId("quick-demo-youtube");
		expect(iframe.getAttribute("title")).toBe("YouTube video player");
		expect(iframe.getAttribute("src")).toContain(
			"youtube.com/embed/LqcEq8dSqyk",
		);
	});

	test("primary CTA links to VITE_DOCSEEK_APP_URL with trailing slash", () => {
		vi.stubEnv("VITE_DOCSEEK_APP_URL", "https://app.example.com");
		renderSite("/");
		const cta = screen.getByTestId("cta-primary");
		expect(cta.getAttribute("href")).toBe("https://app.example.com/");
	});

	test("share email CTA uses mailto with current page URL in body", () => {
		renderSite("/");
		const share = screen.getByTestId("share-email-cta");
		const href = share.getAttribute("href") ?? "";
		expect(href.startsWith("mailto:?")).toBe(true);
		const params = new URL(href).searchParams;
		expect(params.get("subject")).toContain("Pittsburgh");
		expect(params.get("body")).toContain(window.location.href);
		expect(params.get("body")).toContain("UPMC physicians");
	});

	test("app preview clip matches client hero copy and links to app URL", () => {
		vi.stubEnv("VITE_DOCSEEK_APP_URL", "https://app.example.com");
		renderSite("/");
		expect(
			screen.getByRole("heading", {
				name: /How can we help you today\?/i,
			}),
		).toBeTruthy();
		const clip = screen.getByTestId("app-preview-clip");
		expect(clip.getAttribute("href")).toBe("https://app.example.com/");
	});
});
