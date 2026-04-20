export type AboutTeamMember = {
	readonly name: string;
	readonly role: string;
	readonly description: string;
	/** File under `public/headshots/` (URL-encoded when used). */
	readonly imageFilename: string;
};

/**
 * Order = left/right alternation on large screens (first row: photo left).
 * Swap entries to match each portrait; edit copy anytime.
 */
export const aboutTeamMembers: readonly AboutTeamMember[] = [
	{
		name: "Jordan Lee",
		role: "Full-stack engineering",
		description:
			"Ships the DocSeek client experience—search flows, saved physicians, and keeping the app fast for families comparing UPMC options around Pittsburgh.",
		imageFilename: "IMG_0360 2.JPG",
	},
	{
		name: "Sam Rivera",
		role: "Backend & data",
		description:
			"Connects physician directory data to the API, tightens query behavior, and helps the product stay trustworthy as listings change.",
		imageFilename: "1706579810047.JPEG",
	},
	{
		name: "Alex Kim",
		role: "Design & UX writing",
		description:
			"Shapes tone, layout, and onboarding so first-time visitors understand what DocSeek does—and what it does not—before they search.",
		imageFilename: "IMG_5983.JPEG",
	},
	{
		name: "Riley Chen",
		role: "Product & outreach",
		description:
			"Runs feedback sessions with neighbors and caregivers, then turns what we hear into clearer filters, copy, and next-step guidance.",
		imageFilename: "10.8.2025 CMU Media Day_0337.JPEG",
	},
];

export function publicHeadshotSrc(filename: string): string {
	return `/headshots/${encodeURIComponent(filename)}`;
}
