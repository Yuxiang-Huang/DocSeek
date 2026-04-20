export type AboutTeamMember = {
	readonly name: string;
	readonly role: string;
	readonly description: string;
	/** File under `public/headshots/` (URL-encoded when used). */
	readonly imageFilename: string;
	/** Optional `object-position` for circular `object-cover` crops (e.g. `"78% 45%"`). */
	readonly portraitObjectPosition?: string;
};

/**
 * Display order on About (top → bottom). Alternates photo left/right on `sm+`.
 */
export const aboutTeamMembers: readonly AboutTeamMember[] = [
	{
		name: "Yuxiang Huang",
		role: "Chief Technology Officer",
		description:
			"Hello, I'm an Information Systems and Computer Science major at Carnegie Mellon University.",
		imageFilename: "IMG_7382 2.PNG",
		portraitObjectPosition: "44% 68%",
	},
	{
		name: "Christine Truong",
		role: "Chief Operating Officer",
		description:
			"Hi! I'm currently a fourth-year student at Carnegie Mellon University majoring in Computer Science with a minor in Business.",
		imageFilename: "IMG_0360 2.JPG",
	},
	{
		name: "Alex Chen",
		role: "Chief Executive Officer",
		description:
			"I am an information systems major at CMU. ",
		imageFilename: "1706579810047.JPEG",
		
	},
	{
		name: "Wenna Zhang",
		role: "Chief Information Officer",
		description:
			"I am currently a CMU student majoring in Information Systems",
		imageFilename: "10.8.2025 CMU Media Day_0337.JPEG",
		portraitObjectPosition: "-15% 30%",
	},
	{
		name: "Andrew Xue",
		role: "Chief Financial Officer",
		description:
			"Hey there! I'm a student at Carnegie Mellon University, and I like to play Pokémon Go in my free time.",
		imageFilename: "IMG_5983.JPEG",
	},
];

export function publicHeadshotSrc(filename: string): string {
	return `/headshots/${encodeURIComponent(filename)}`;
}
