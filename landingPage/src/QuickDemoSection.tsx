import { QUICK_DEMO_YOUTUBE_EMBED_SRC } from "./quickDemoYoutube";

export function QuickDemoSection() {
	return (
		<section
			id="quick-demo"
			className="scroll-mt-24 border-y border-white/[0.06] bg-black/30 py-14 sm:py-16"
			aria-labelledby="quick-demo-heading"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6">
				<div className="mx-auto mb-8 max-w-2xl text-center">
					<p className="text-xs font-semibold uppercase tracking-widest text-teal-300/90">
						Quick demo
					</p>
					<h2
						id="quick-demo-heading"
						className="mt-2 text-3xl font-semibold text-white sm:text-4xl"
					>
						See DocSeek in action
					</h2>
					<p className="mt-3 text-sm text-doc-muted">
						See how DocSeek fits a typical Pittsburgh-area search — hosted on
						YouTube.
					</p>
				</div>
				<div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950/80 shadow-[0_24px_60px_-20px_rgba(34,211,238,0.25)] ring-1 ring-white/[0.06]">
					<div className="relative aspect-video w-full">
						<iframe
							data-testid="quick-demo-youtube"
							className="absolute inset-0 h-full w-full border-0"
							width={560}
							height={315}
							src={QUICK_DEMO_YOUTUBE_EMBED_SRC}
							title="YouTube video player"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerPolicy="strict-origin-when-cross-origin"
							allowFullScreen
							loading="lazy"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
