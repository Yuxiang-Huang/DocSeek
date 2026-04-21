import {
	Activity,
	ChevronRight,
	MapPin,
	Shield,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";
import { docseekAppHomeHref } from "./appUrl";
import { DocSeekAppPreviewClip } from "./DocSeekAppPreviewClip";
import { QuickDemoSection } from "./QuickDemoSection";
import { ShareDocSeekEmailCta } from "./ShareDocSeekEmailCta";

export function App() {
	const appHome = docseekAppHomeHref();

	return (
		<div className="relative isolate min-h-screen">
			<div className="doc-grid-bg-layer" aria-hidden />
			<div className="relative z-10 flex flex-col">
				<header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#050816]/55 backdrop-blur-sm">
					<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
						<a
							href="#top"
							className="focus-ring flex items-center gap-2 rounded-lg text-lg font-semibold tracking-tight text-white"
						>
							<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-teal-400/30 to-violet-500/25 ring-1 ring-teal-400/30">
								<Stethoscope className="h-4 w-4 text-teal-300" aria-hidden />
							</span>
							DocSeek
						</a>
						<nav aria-label="Page">
							<Link
								to="/about-the-team"
								className="focus-ring rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/90 transition hover:border-teal-400/30 hover:bg-white/[0.07] hover:text-white"
							>
								About the team
							</Link>
						</nav>
					</div>
				</header>

				<main id="top">
					<section
						id="overview"
						className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-12 pt-10 sm:px-6 sm:pt-14"
						aria-labelledby="overview-heading"
					>
						<div className="mx-auto max-w-3xl text-center">
							<p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/95">
								Pittsburgh &amp; Western Pennsylvania
							</p>
							<h1
								id="overview-heading"
								className="font-semibold text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl"
							>
								Find{" "}
								<span className="bg-linear-to-r from-teal-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
									UPMC physicians
								</span>{" "}
								from what you describe
							</h1>
							<p className="mx-auto mt-6 max-w-2xl text-lg text-doc-muted sm:text-xl">
								DocSeek is aimed at{" "}
								<span className="font-medium text-white/85">
									Pittsburgh patients, families, and caregivers
								</span>{" "}
								who navigate UPMC care locally. It maps what you describe to
								doctor profiles so you can compare specialty, neighborhood or
								commute distance, and whether someone may be accepting new
								patients.
							</p>
							<div className="mt-10 flex justify-center">
								<a
									href={appHome}
									data-testid="cta-primary"
									className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-violet-500 to-teal-400 px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_32px_-6px_rgba(139,92,246,0.6)] transition hover:brightness-110 sm:w-auto"
								>
									Open DocSeek search
									<Sparkles className="h-4 w-4 opacity-90" aria-hidden />
								</a>
							</div>
						</div>
					</section>

					<section
						id="how-it-works"
						className="scroll-mt-24 border-t border-white/[0.06] bg-black/15 py-14 sm:py-16"
						aria-labelledby="how-heading"
					>
						<div className="mx-auto max-w-6xl px-4 sm:px-6">
							<div className="mx-auto mb-10 max-w-2xl text-center">
								<h2
									id="how-heading"
									className="text-3xl font-semibold text-white sm:text-4xl"
								>
									How it works
								</h2>
								<p className="mt-3 text-doc-muted">
									Built around how people in{" "}
									<span className="font-medium text-white/85">Pittsburgh</span>{" "}
									search for care: you type what you need, DocSeek returns
									ranked UPMC matches, and you open official booking or profile
									links from there.
								</p>
							</div>
							<div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
								<div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
									<ol className="list-decimal space-y-4 pl-5 text-sm text-white/90 sm:text-base">
										<li>
											Describe symptoms or the kind of care you need in plain
											language.
										</li>
										<li>
											Review suggested specialties and physician results across
											the UPMC network serving the Pittsburgh region.
										</li>
										<li>
											Optional filters: add a neighborhood, ZIP, or side of town
											(East End, South Hills, North Hills, etc.) plus
											accepting-new patients when that data is available.
										</li>
										<li>
											Use official profile or scheduling links on each result to
											next steps.
										</li>
									</ol>
									<a
										href={appHome}
										className="focus-ring mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200"
									>
										Start in the app
										<ChevronRight className="h-4 w-4" aria-hidden />
									</a>
								</div>
								<DocSeekAppPreviewClip appHomeHref={appHome} />
							</div>
							<div className="mt-10 flex justify-center">
								<ShareDocSeekEmailCta />
							</div>
						</div>
					</section>

					<QuickDemoSection />

					<section
						id="search-features"
						className="scroll-mt-24 border-t border-white/[0.06] bg-black/20 py-14 sm:py-16"
						aria-labelledby="features-heading"
					>
						<div className="mx-auto max-w-6xl px-4 sm:px-6">
							<div className="mx-auto mb-10 max-w-2xl text-center">
								<h2
									id="features-heading"
									className="text-3xl font-semibold text-white sm:text-4xl"
								>
									What the search uses
								</h2>
								<p className="mt-3 text-doc-muted">
									Three inputs DocSeek combines when ranking UPMC physician
									results—especially when you are choosing among clinics and
									campuses around Pittsburgh.
								</p>
							</div>
							<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
								{[
									{
										icon: Stethoscope,
										title: "Your description",
										body: "Symptoms or goals you enter drive specialty matching and result order.",
									},
									{
										icon: MapPin,
										title: "Location",
										body: "Optional location text prioritizes providers you can realistically reach from Pittsburgh neighborhoods or nearby suburbs.",
									},
									{
										icon: Activity,
										title: "Accepting patients",
										body: "Optional filter when directory data includes an accepting-new-patients flag.",
									},
								].map(({ icon: Icon, title, body }) => (
									<div
										key={title}
										className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
									>
										<div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300">
											<Icon className="h-5 w-5" aria-hidden />
										</div>
										<h3 className="text-lg font-semibold text-white">
											{title}
										</h3>
										<p className="mt-2 text-sm text-doc-muted">{body}</p>
									</div>
								))}
							</div>
						</div>
					</section>

					<section
						id="limits"
						className="scroll-mt-24 py-14 sm:py-16"
						aria-labelledby="limits-heading"
					>
						<div className="mx-auto max-w-3xl px-4 sm:px-6">
							<h2
								id="limits-heading"
								className="text-center text-3xl font-semibold text-white sm:text-4xl"
							>
								What DocSeek is not
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-center text-doc-muted">
								Use the tool only for non-urgent discovery. Confirm every detail
								on official sites before you book or rely on coverage—whether
								you see doctors in Oakland, Shadyside, the suburbs, or elsewhere
								in the region.
							</p>
							<ul className="mt-10 space-y-4">
								{[
									"Not emergency care — for urgent or life-threatening symptoms, call your local emergency number.",
									"Not medical advice — DocSeek does not diagnose or recommend treatment.",
									"Not a substitute for UPMC — information comes from public physician data; DocSeek is independent and not endorsed by UPMC.",
								].map((item) => (
									<li
										key={item}
										className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/90"
									>
										<Shield
											className="mt-0.5 h-4 w-4 shrink-0 text-teal-400"
											aria-hidden
										/>
										{item}
									</li>
								))}
							</ul>
							<div className="mt-10 flex justify-center">
								<a
									href={appHome}
									className="focus-ring inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
								>
									Open DocSeek search
								</a>
							</div>
						</div>
					</section>

					<section
						id="faq"
						className="scroll-mt-24 border-t border-white/[0.06] bg-black/25 py-14 sm:py-16"
						aria-labelledby="faq-heading"
					>
						<div className="mx-auto max-w-3xl px-4 sm:px-6">
							<h2
								id="faq-heading"
								className="text-center text-3xl font-semibold text-white"
							>
								Common questions
							</h2>
							<dl className="mt-10 space-y-6">
								{[
									{
										q: "Is DocSeek only for Pittsburgh?",
										a: "It is designed first for people in Pittsburgh and Western PA who use UPMC, because that is where directory navigation is hardest. Anyone searching UPMC physicians can still use the same search.",
									},
									{
										q: "Is DocSeek run by UPMC?",
										a: "No. DocSeek is a separate app that searches public UPMC physician directory information. It is not an official UPMC product unless stated elsewhere by the publisher.",
									},
									{
										q: "Will DocSeek book an appointment for me?",
										a: "No. It helps you find and compare physicians. Scheduling happens through the clinic or links on official profiles.",
									},
									{
										q: "Where should I verify doctor details?",
										a: "Use each physician’s official UPMC profile or your insurer’s directory before you make decisions about care or coverage.",
									},
								].map(({ q, a }) => (
									<div
										key={q}
										className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
									>
										<dt className="font-semibold text-white">{q}</dt>
										<dd className="mt-2 text-sm text-doc-muted">{a}</dd>
									</div>
								))}
							</dl>
						</div>
					</section>
				</main>

				<footer className="border-t border-white/[0.06] py-10">
					<div className="mx-auto max-w-6xl px-4 text-center text-xs text-doc-muted sm:px-6">
						<p>
							DocSeek is for finding physicians, not emergencies. If you need
							urgent help, call your local emergency number.
						</p>
						<p className="mt-3">
							&copy; {new Date().getFullYear()} DocSeek — focused on the
							Pittsburgh community and Western Pennsylvania. &quot;UPMC&quot;
							refers to the health system’s public physician listings; DocSeek
							is not affiliated with or endorsed by UPMC unless stated in
							writing.
						</p>
					</div>
				</footer>
			</div>
		</div>
	);
}
