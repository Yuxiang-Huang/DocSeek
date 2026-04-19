import { Mail } from "lucide-react";
import { useMemo } from "react";

export function buildDocSeekShareMailto(pageUrl: string): string {
	const subject = "DocSeek — UPMC search for Pittsburgh";
	const body = `I thought you might find DocSeek useful — it’s built for the Pittsburgh community to find UPMC physicians from how you describe what you need (great for neighbors, coworkers, and family here).\n\n${pageUrl}`;
	return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function ShareDocSeekEmailCta() {
	const mailtoHref = useMemo(() => {
		if (typeof window === "undefined") {
			return "mailto:";
		}
		return buildDocSeekShareMailto(window.location.href);
	}, []);

	return (
		<a
			data-testid="share-email-cta"
			href={mailtoHref}
			className="focus-ring inline-flex w-full max-w-lg items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-teal-400/35 hover:bg-white/[0.1] sm:text-base"
		>
			<Mail className="h-4 w-4 shrink-0 text-teal-300" aria-hidden />
			Share DocSeek with Your Friends Now
		</a>
	);
}
