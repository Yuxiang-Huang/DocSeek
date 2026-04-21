import { ArrowRight, Search, Stethoscope } from "lucide-react";

type DocSeekAppPreviewClipProps = {
	appHomeHref: string;
};

/**
 * Static visual preview of the DocSeek app shell (search hero). Entire card is a link to the live app.
 */
export function DocSeekAppPreviewClip({
	appHomeHref,
}: DocSeekAppPreviewClipProps) {
	return (
		<a
			href={appHomeHref}
			data-testid="app-preview-clip"
			className="focus-ring group relative isolate block max-w-md lg:max-w-none lg:justify-self-end"
			aria-label="Open DocSeek app to try the search experience for Pittsburgh-area UPMC care"
		>
			<div
				className={[
					"relative overflow-hidden rounded-[1.75rem] border border-cyan-400/20",
					"bg-linear-to-br from-[#0a1022] via-[#0d1530] to-[#141028]",
					"px-8 pb-10 pt-12 sm:rounded-[2rem] sm:px-10 sm:pb-12 sm:pt-14",
					"shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_0_1px_rgba(34,211,238,0.08),0_0_80px_-24px_rgba(34,211,238,0.35)]",
					"transition duration-300 ease-out",
					"group-hover:border-cyan-400/35 group-hover:shadow-[0_28px_64px_rgba(0,0,0,0.58),0_0_0_1px_rgba(34,211,238,0.14),0_0_100px_-20px_rgba(34,211,238,0.45)]",
				].join(" ")}
			>
				<div
					className="pointer-events-none absolute inset-0 opacity-[0.45]"
					aria-hidden
					style={{
						background:
							"radial-gradient(ellipse 90% 70% at 50% -10%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(94,94,220,0.12), transparent 50%)",
					}}
				/>
				<div className="relative flex flex-col items-center text-center">
					<div className="mb-8 flex flex-col items-center gap-2">
						<span
							className="flex text-cyan-400 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]"
							aria-hidden
						>
							<Stethoscope
								className="h-10 w-10 sm:h-11 sm:w-11"
								strokeWidth={2}
							/>
						</span>
						<p className="text-xl font-bold tracking-tight text-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.4)] sm:text-2xl">
							DocSeek
						</p>
					</div>
					<h2 className="text-lg font-medium text-white sm:text-xl">
						How can we help you today?
					</h2>
					<p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55 sm:text-[0.9375rem]">
						Describe what you are feeling and DocSeek will surface the strongest
						doctor matches on a separate results page.
					</p>
					<div
						className="pointer-events-none mt-8 flex w-full max-w-[340px] items-center gap-3 rounded-full border border-white/10 bg-[#060a14]/90 py-1.5 pl-4 pr-1.5 shadow-inner shadow-black/40 sm:max-w-[380px]"
						aria-hidden
					>
						<Search
							className="h-5 w-5 shrink-0 text-cyan-400/90"
							strokeWidth={2}
						/>
						<span className="min-w-0 flex-1 truncate text-left text-sm text-white/45">
							I have chest pains
						</span>
						<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-[0_0_20px_-4px_rgba(34,211,238,0.7)]">
							<ArrowRight className="h-5 w-5" strokeWidth={2.5} aria-hidden />
						</span>
					</div>
					<p className="mt-5 text-xs font-medium text-cyan-300/70 opacity-80 transition group-hover:opacity-100">
						Click to open the real app
					</p>
				</div>
			</div>
		</a>
	);
}
