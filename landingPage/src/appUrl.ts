const DEFAULT_DOCSEEK_APP_ORIGIN = "https://docseek.up.railway.app";

/** Resolves the DocSeek app origin for CTAs (trimmed, no trailing slash). */
export function docseekAppOrigin(): string {
	const raw = import.meta.env.VITE_DOCSEEK_APP_URL;
	if (raw === undefined || raw === "") {
		return DEFAULT_DOCSEEK_APP_ORIGIN;
	}
	return raw.replace(/\/$/, "");
}

export function docseekAppHomeHref(): string {
	return `${docseekAppOrigin()}/`;
}
