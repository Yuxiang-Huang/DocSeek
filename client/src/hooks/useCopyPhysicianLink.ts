import { useState } from "react";
import { getPhysicianProfileUrl } from "../components/App";

type CopyStatus = "idle" | "success" | "error";

export function useCopyPhysicianLink(doctorId: number): {
	copyStatus: CopyStatus;
	handleCopyLink: () => Promise<void>;
} {
	const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

	async function handleCopyLink() {
		const url = getPhysicianProfileUrl(doctorId);
		try {
			await navigator.clipboard.writeText(url);
			setCopyStatus("success");
			setTimeout(() => setCopyStatus("idle"), 2500);
		} catch {
			setCopyStatus("error");
			setTimeout(() => setCopyStatus("idle"), 5000);
		}
	}

	return { copyStatus, handleCopyLink };
}
