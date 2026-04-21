import { Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import {
	type AboutTeamMember,
	aboutTeamMembers,
	publicHeadshotSrc,
} from "./aboutTeamMembers";

function TeamMemberBlock({
	member,
	reversed,
}: {
	member: AboutTeamMember;
	reversed: boolean;
}) {
	const src = publicHeadshotSrc(member.imageFilename);
	return (
		<article
			className={[
				"flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-12",
				reversed ? "sm:flex-row-reverse" : "",
			].join(" ")}
		>
			<div className="shrink-0">
				<img
					src={src}
					alt={`Portrait of ${member.name}`}
					width={192}
					height={192}
					loading="lazy"
					decoding="async"
					style={
						member.portraitObjectPosition
							? { objectPosition: member.portraitObjectPosition }
							: undefined
					}
					className="h-40 w-40 rounded-full object-cover object-center shadow-[0_12px_40px_-12px_rgba(46,230,214,0.35)] ring-2 ring-teal-400/35 ring-offset-4 ring-offset-[#050816] sm:h-48 sm:w-48"
				/>
			</div>
			<div
				className={[
					"max-w-xl flex-1 space-y-2 text-center",
					reversed ? "sm:text-right" : "sm:text-left",
				].join(" ")}
			>
				<h2 className="text-xl font-semibold text-white sm:text-2xl">
					{member.name}
				</h2>
				<p className="text-sm font-medium uppercase tracking-wide text-teal-300/95">
					{member.role}
				</p>
				<p className="text-sm leading-relaxed text-doc-muted sm:text-base">
					{member.description}
				</p>
			</div>
		</article>
	);
}

export function AboutTheTeamPage() {
	return (
		<div className="relative isolate min-h-screen">
			<div className="doc-grid-bg-layer" aria-hidden />
			<div className="relative z-10 flex flex-col">
				<header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#050816]/55 backdrop-blur-sm">
					<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
						<Link
							to="/"
							className="focus-ring flex items-center gap-2 rounded-lg text-lg font-semibold tracking-tight text-white"
						>
							<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-teal-400/30 to-violet-500/25 ring-1 ring-teal-400/30">
								<Stethoscope className="h-4 w-4 text-teal-300" aria-hidden />
							</span>
							DocSeek
						</Link>
						<nav aria-label="Page">
							<Link
								to="/"
								className="focus-ring rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/90 transition hover:border-teal-400/30 hover:bg-white/[0.07] hover:text-white"
							>
								Home
							</Link>
						</nav>
					</div>
				</header>

				<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6">
					<h1 className="text-3xl font-semibold text-white sm:text-4xl">
						About the team
					</h1>
					<div className="mt-8 max-w-3xl space-y-4 text-doc-muted sm:text-base">
						<p>
							We are a small group focused on{" "}
							<span className="font-medium text-white/85">
								Pittsburgh and Western Pennsylvania
							</span>
							: making UPMC physician discovery simpler—fewer dead ends, clearer
							next steps, and respect for what neighbors actually type when they
							need care.
						</p>
						<p>
							If you want to reach us about DocSeek, use the contact path your
							deployment provides (for example a site footer link or support
							email from your organization).
						</p>
					</div>

					<section
						className="mt-16 border-t border-white/[0.08] pt-16"
						aria-labelledby="team-roster-heading"
					>
						<h2
							id="team-roster-heading"
							className="text-center text-2xl font-semibold text-white sm:text-3xl"
						>
							Our Leadership Team
						</h2>
						<p className="mx-auto mt-3 max-w-2xl text-center text-sm text-doc-muted sm:text-base">
							The people behind DocSeek
						</p>
						<div className="mx-auto mt-14 flex max-w-4xl flex-col gap-16 sm:gap-20">
							{aboutTeamMembers.map((member, index) => (
								<TeamMemberBlock
									key={member.imageFilename}
									member={member}
									reversed={index % 2 === 1}
								/>
							))}
						</div>
					</section>
				</main>

				<footer className="mt-auto border-t border-white/[0.06] py-8">
					<div className="mx-auto max-w-6xl px-4 text-center text-xs text-doc-muted sm:px-6">
						<Link
							to="/"
							className="text-teal-300/90 underline-offset-2 hover:underline"
						>
							Back to landing page
						</Link>
					</div>
				</footer>
			</div>
		</div>
	);
}
