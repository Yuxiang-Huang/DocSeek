import { useCallback, useEffect, useState } from "react";
import type { Doctor } from "../components/App";

const STORAGE_KEY = "docseek-blocked-physicians";

function loadBlockedDoctors(): Doctor[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveBlockedDoctors(doctors: Doctor[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
}

export function useBlockedPhysicians() {
	const [blockedDoctors, setBlockedDoctors] = useState<Doctor[]>(() =>
		loadBlockedDoctors(),
	);

	useEffect(() => {
		const handleStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) {
				setBlockedDoctors(loadBlockedDoctors());
			}
		};
		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	const blockDoctor = useCallback((doctor: Doctor) => {
		setBlockedDoctors((prev) => {
			if (prev.some((d) => d.id === doctor.id)) return prev;
			const next = [...prev, doctor];
			saveBlockedDoctors(next);
			return next;
		});
	}, []);

	const unblockDoctor = useCallback((doctorId: number) => {
		setBlockedDoctors((prev) => {
			const next = prev.filter((d) => d.id !== doctorId);
			saveBlockedDoctors(next);
			return next;
		});
	}, []);

	const isBlocked = useCallback(
		(doctorId: number) => blockedDoctors.some((d) => d.id === doctorId),
		[blockedDoctors],
	);

	return {
		blockedDoctors,
		blockDoctor,
		unblockDoctor,
		isBlocked,
	};
}
