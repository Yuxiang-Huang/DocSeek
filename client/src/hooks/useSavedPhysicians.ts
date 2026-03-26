import { useCallback, useEffect, useState } from "react";
import type { Doctor } from "../components/App";

const STORAGE_KEY = "docseek-saved-physicians";

function loadSavedDoctors(): Doctor[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveDoctors(doctors: Doctor[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
}

export function useSavedPhysicians() {
	const [savedDoctors, setSavedDoctors] = useState<Doctor[]>(() =>
		loadSavedDoctors(),
	);

	useEffect(() => {
		const handleStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) {
				setSavedDoctors(loadSavedDoctors());
			}
		};
		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	const addSavedDoctor = useCallback((doctor: Doctor) => {
		setSavedDoctors((prev) => {
			if (prev.some((d) => d.id === doctor.id)) return prev;
			const next = [...prev, doctor];
			saveDoctors(next);
			return next;
		});
	}, []);

	const removeSavedDoctor = useCallback((doctorId: number) => {
		setSavedDoctors((prev) => {
			const next = prev.filter((d) => d.id !== doctorId);
			saveDoctors(next);
			return next;
		});
	}, []);

	const isSaved = useCallback(
		(doctorId: number) => savedDoctors.some((d) => d.id === doctorId),
		[savedDoctors],
	);

	return {
		savedDoctors,
		addSavedDoctor,
		removeSavedDoctor,
		isSaved,
	};
}
