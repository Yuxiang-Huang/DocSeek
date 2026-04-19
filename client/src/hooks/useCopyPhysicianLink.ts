import { useCallback, useEffect, useRef, useState } from "react";
import { getPhysicianProfileUrl } from "../components/App";

type CopyStatus = "idle" | "success" | "error";

export function useCopyPhysicianLink(doctorId: number): {
	copyStatus: CopyStatus;
	handleCopyLink: () => Promise<void>;
} {
	const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	const handleCopyLink = useCallback(async () => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
		}
		const url = getPhysicianProfileUrl(doctorId);
		try {
			await navigator.clipboard.writeText(url);
			setCopyStatus("success");
			timerRef.current = setTimeout(() => setCopyStatus("idle"), 2500);
		} catch {
			setCopyStatus("error");
			timerRef.current = setTimeout(() => setCopyStatus("idle"), 5000);
		}
	}, [doctorId]);

	return { copyStatus, handleCopyLink };
}
