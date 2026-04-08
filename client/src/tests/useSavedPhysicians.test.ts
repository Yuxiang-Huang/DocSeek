// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import type { Doctor } from "../components/App";
import { useSavedPhysicians } from "../hooks/useSavedPhysicians";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "docseek-saved-physicians";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoctor(overrides: Partial<Doctor> = {}): Doctor {
	return {
		id: 1,
		full_name: "Dr. Test",
		primary_specialty: "General Medicine",
		accepting_new_patients: true,
		profile_url: "https://example.com/doctor/1",
		book_appointment_url: null,
		primary_location: "Pittsburgh, PA",
		primary_phone: "412-555-0001",
		match_score: null,
		matched_specialty: null,
		latitude: null,
		longitude: null,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// In-memory localStorage substitute
//
// jsdom 28 in this project configuration can receive `--localstorage-file`
// without a valid path, which disables its built-in Storage methods.
// Providing a reliable stub via vi.stubGlobal avoids that issue entirely.
// ---------------------------------------------------------------------------

function createStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string): string | null => store.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			store.set(key, value);
		},
		removeItem: (key: string): void => {
			store.delete(key);
		},
		clear: (): void => {
			store.clear();
		},
		get length(): number {
			return store.size;
		},
		key: (n: number): string | null => [...store.keys()][n] ?? null,
		_store: store,
	};
}

const storageMock = createStorageMock();

beforeAll(() => {
	vi.stubGlobal("localStorage", storageMock);
});

afterAll(() => {
	vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Reset storage between tests so state never bleeds across cases
// ---------------------------------------------------------------------------

beforeEach(() => {
	storageMock.clear();
});

afterEach(() => {
	storageMock.clear();
});

// ===========================================================================
// Initial state  (exercises loadSavedDoctors indirectly)
// ===========================================================================

describe("initial state", () => {
	test("savedDoctors is an empty array when localStorage is empty", () => {
		// precondition: nothing in storage
		// expected: savedDoctors === []
		const { result } = renderHook(() => useSavedPhysicians());
		expect(result.current.savedDoctors).toEqual([]);
	});

	test("savedDoctors is populated from a valid localStorage entry on mount", () => {
		// precondition: localStorage contains one doctor
		// expected: hook initialises with that doctor
		const doctor = makeDoctor({ id: 10, full_name: "Dr. Pre-loaded" });
		localStorage.setItem(STORAGE_KEY, JSON.stringify([doctor]));

		const { result } = renderHook(() => useSavedPhysicians());
		expect(result.current.savedDoctors).toHaveLength(1);
		expect(result.current.savedDoctors[0].full_name).toBe("Dr. Pre-loaded");
	});

	test("savedDoctors is empty when localStorage contains invalid JSON", () => {
		// precondition: storage has malformed JSON
		// expected: hook returns [] without throwing
		localStorage.setItem(STORAGE_KEY, "not-valid-json{{");

		const { result } = renderHook(() => useSavedPhysicians());
		expect(result.current.savedDoctors).toEqual([]);
	});

	test("savedDoctors is empty when localStorage value is a non-array JSON type (object)", () => {
		// precondition: storage has a JSON object, not an array
		// expected: hook treats it as empty and returns []
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1 }));

		const { result } = renderHook(() => useSavedPhysicians());
		expect(result.current.savedDoctors).toEqual([]);
	});

	test("savedDoctors is empty when localStorage value is a JSON number", () => {
		// precondition: storage has a JSON number
		// expected: hook returns []
		localStorage.setItem(STORAGE_KEY, "42");

		const { result } = renderHook(() => useSavedPhysicians());
		expect(result.current.savedDoctors).toEqual([]);
	});

	test("savedDoctors is empty when localStorage value is null (key present but null)", () => {
		// localStorage.getItem returns null when key is absent — same code path
		// expected: hook returns []
		localStorage.removeItem(STORAGE_KEY);

		const { result } = renderHook(() => useSavedPhysicians());
		expect(result.current.savedDoctors).toEqual([]);
	});

	test("loads multiple previously saved doctors in the stored order", () => {
		// precondition: two doctors in storage
		// expected: both returned in insertion order
		const doctors = [
			makeDoctor({ id: 1, full_name: "Dr. Alpha" }),
			makeDoctor({ id: 2, full_name: "Dr. Beta" }),
		];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));

		const { result } = renderHook(() => useSavedPhysicians());
		expect(result.current.savedDoctors.map((d) => d.full_name)).toEqual([
			"Dr. Alpha",
			"Dr. Beta",
		]);
	});
});

// ===========================================================================
// addSavedDoctor
// ===========================================================================

describe("addSavedDoctor", () => {
	test("adds a doctor to the savedDoctors list", () => {
		// input: add doctor id=1
		// expected: savedDoctors.length === 1
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1 }));
		});

		expect(result.current.savedDoctors).toHaveLength(1);
	});

	test("the added doctor's data is preserved exactly", () => {
		// input: add doctor with specific fields
		// expected: doctor object stored unchanged
		const doctor = makeDoctor({ id: 7, full_name: "Dr. Stored" });
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(doctor);
		});

		expect(result.current.savedDoctors[0]).toEqual(doctor);
	});

	test("persists the added doctor to localStorage", () => {
		// input: add doctor id=5
		// expected: localStorage has a JSON array containing that doctor
		const doctor = makeDoctor({ id: 5 });
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(doctor);
		});

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		expect(stored).toHaveLength(1);
		expect(stored[0].id).toBe(5);
	});

	test("does not add a duplicate when the same doctor id is added twice", () => {
		// input: addSavedDoctor called twice with the same id
		// expected: savedDoctors still has length 1
		const doctor = makeDoctor({ id: 3 });
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(doctor);
			result.current.addSavedDoctor(doctor);
		});

		expect(result.current.savedDoctors).toHaveLength(1);
	});

	test("does not store a duplicate in localStorage when the same id is added twice", () => {
		// input: same doctor added twice
		// expected: localStorage still contains only one entry
		const doctor = makeDoctor({ id: 3 });
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(doctor);
			result.current.addSavedDoctor(doctor);
		});

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		expect(stored).toHaveLength(1);
	});

	test("correctly adds multiple distinct doctors", () => {
		// input: add doctor id=1 then doctor id=2
		// expected: savedDoctors contains both in insertion order
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1, full_name: "Dr. A" }));
			result.current.addSavedDoctor(makeDoctor({ id: 2, full_name: "Dr. B" }));
		});

		expect(result.current.savedDoctors).toHaveLength(2);
		expect(result.current.savedDoctors[0].full_name).toBe("Dr. A");
		expect(result.current.savedDoctors[1].full_name).toBe("Dr. B");
	});

	test("persists all doctors to localStorage when several are added", () => {
		// input: add three doctors
		// expected: localStorage contains all three
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1 }));
			result.current.addSavedDoctor(makeDoctor({ id: 2 }));
			result.current.addSavedDoctor(makeDoctor({ id: 3 }));
		});

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		expect(stored).toHaveLength(3);
	});
});

// ===========================================================================
// removeSavedDoctor
// ===========================================================================

describe("removeSavedDoctor", () => {
	test("removes a doctor by id from savedDoctors", () => {
		// input: one doctor saved, then removed by its id
		// expected: savedDoctors is empty
		const doctor = makeDoctor({ id: 4 });
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(doctor);
		});
		act(() => {
			result.current.removeSavedDoctor(4);
		});

		expect(result.current.savedDoctors).toHaveLength(0);
	});

	test("persists the removal to localStorage", () => {
		// input: add then remove doctor id=4
		// expected: localStorage is now an empty array
		const doctor = makeDoctor({ id: 4 });
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(doctor);
		});
		act(() => {
			result.current.removeSavedDoctor(4);
		});

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
		expect(stored).toEqual([]);
	});

	test("does nothing when the given id is not in the list", () => {
		// input: one doctor saved with id=1, remove id=99
		// expected: savedDoctors still has the original doctor
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1 }));
		});
		act(() => {
			result.current.removeSavedDoctor(99);
		});

		expect(result.current.savedDoctors).toHaveLength(1);
	});

	test("removes only the matching doctor when multiple are saved", () => {
		// input: doctors id=1,2,3 saved; remove id=2
		// expected: savedDoctors contains id=1 and id=3, not id=2
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1, full_name: "Dr. A" }));
			result.current.addSavedDoctor(makeDoctor({ id: 2, full_name: "Dr. B" }));
			result.current.addSavedDoctor(makeDoctor({ id: 3, full_name: "Dr. C" }));
		});
		act(() => {
			result.current.removeSavedDoctor(2);
		});

		const ids = result.current.savedDoctors.map((d) => d.id);
		expect(ids).toEqual([1, 3]);
	});

	test("leaves the list empty when the only saved doctor is removed", () => {
		// input: add one doctor, remove it
		// expected: savedDoctors === []
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1 }));
		});
		act(() => {
			result.current.removeSavedDoctor(1);
		});

		expect(result.current.savedDoctors).toEqual([]);
	});

	test("calling remove on an already-empty list does not throw", () => {
		// input: no doctors saved, call removeSavedDoctor
		// expected: no error thrown, savedDoctors stays []
		const { result } = renderHook(() => useSavedPhysicians());

		expect(() => {
			act(() => {
				result.current.removeSavedDoctor(99);
			});
		}).not.toThrow();

		expect(result.current.savedDoctors).toEqual([]);
	});
});

// ===========================================================================
// isSaved
// ===========================================================================

describe("isSaved", () => {
	test("returns false when no doctors are saved", () => {
		// input: isSaved(1) on empty list
		// expected: false
		const { result } = renderHook(() => useSavedPhysicians());
		expect(result.current.isSaved(1)).toBe(false);
	});

	test("returns true for a doctor that has been saved", () => {
		// input: add doctor id=5, then isSaved(5)
		// expected: true
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 5 }));
		});

		expect(result.current.isSaved(5)).toBe(true);
	});

	test("returns false for a doctor id that was never saved", () => {
		// input: doctor id=5 saved, isSaved(99)
		// expected: false
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 5 }));
		});

		expect(result.current.isSaved(99)).toBe(false);
	});

	test("returns false for a doctor that was saved and then removed", () => {
		// input: add id=5, remove id=5, then isSaved(5)
		// expected: false
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 5 }));
		});
		act(() => {
			result.current.removeSavedDoctor(5);
		});

		expect(result.current.isSaved(5)).toBe(false);
	});

	test("returns true for each doctor in a multi-doctor list", () => {
		// input: three doctors saved
		// expected: isSaved returns true for all three ids
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1 }));
			result.current.addSavedDoctor(makeDoctor({ id: 2 }));
			result.current.addSavedDoctor(makeDoctor({ id: 3 }));
		});

		expect(result.current.isSaved(1)).toBe(true);
		expect(result.current.isSaved(2)).toBe(true);
		expect(result.current.isSaved(3)).toBe(true);
	});

	test("returns false for an id that was never added among multiple saved doctors", () => {
		// input: ids 1,2,3 saved, isSaved(4)
		// expected: false
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1 }));
			result.current.addSavedDoctor(makeDoctor({ id: 2 }));
			result.current.addSavedDoctor(makeDoctor({ id: 3 }));
		});

		expect(result.current.isSaved(4)).toBe(false);
	});
});

// ===========================================================================
// cross-tab sync via the storage event
// ===========================================================================

describe("cross-tab storage synchronisation", () => {
	test("updates savedDoctors when the same localStorage key is changed by another tab", () => {
		// simulate another browser tab writing to the same key via a StorageEvent
		const doctor = makeDoctor({ id: 42, full_name: "Dr. Remote" });
		const { result } = renderHook(() => useSavedPhysicians());

		// Confirm starting state is empty
		expect(result.current.savedDoctors).toHaveLength(0);

		// Write to localStorage as another tab would, then dispatch a storage event
		localStorage.setItem(STORAGE_KEY, JSON.stringify([doctor]));
		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: STORAGE_KEY,
					newValue: JSON.stringify([doctor]),
				}),
			);
		});

		expect(result.current.savedDoctors).toHaveLength(1);
		expect(result.current.savedDoctors[0].full_name).toBe("Dr. Remote");
	});

	test("ignores storage events for a different key", () => {
		// input: StorageEvent with key="some-other-app-key"
		// expected: savedDoctors stays empty
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "some-other-app-key",
					newValue: JSON.stringify([makeDoctor({ id: 1 })]),
				}),
			);
		});

		expect(result.current.savedDoctors).toHaveLength(0);
	});

	test("reflects the cleared list when another tab removes all saved doctors", () => {
		// precondition: doctor already saved locally
		// input: another tab clears the key
		// expected: savedDoctors becomes []
		const { result } = renderHook(() => useSavedPhysicians());

		act(() => {
			result.current.addSavedDoctor(makeDoctor({ id: 1 }));
		});
		expect(result.current.savedDoctors).toHaveLength(1);

		localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: STORAGE_KEY,
					newValue: JSON.stringify([]),
				}),
			);
		});

		expect(result.current.savedDoctors).toHaveLength(0);
	});

	test("reflects multiple doctors written by another tab", () => {
		// input: another tab writes two doctors to the key
		// expected: savedDoctors has both
		const doctors = [
			makeDoctor({ id: 10, full_name: "Dr. X" }),
			makeDoctor({ id: 11, full_name: "Dr. Y" }),
		];
		const { result } = renderHook(() => useSavedPhysicians());

		localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: STORAGE_KEY,
					newValue: JSON.stringify(doctors),
				}),
			);
		});

		expect(result.current.savedDoctors).toHaveLength(2);
		expect(result.current.savedDoctors.map((d) => d.id)).toEqual([10, 11]);
	});
});

// ===========================================================================
// localStorage persistence — round-trip fidelity
// ===========================================================================

describe("localStorage persistence", () => {
	test("a new hook instance reads the list saved by an earlier instance", () => {
		// simulate: one component saves a doctor, then unmounts;
		// a fresh component should find the data still in localStorage
		const doctor = makeDoctor({ id: 99, full_name: "Dr. Persist" });

		const { result: first, unmount } = renderHook(() =>
			useSavedPhysicians(),
		);
		act(() => {
			first.current.addSavedDoctor(doctor);
		});
		unmount();

		// Mount a brand-new hook instance
		const { result: second } = renderHook(() => useSavedPhysicians());
		expect(second.current.savedDoctors).toHaveLength(1);
		expect(second.current.savedDoctors[0].full_name).toBe("Dr. Persist");
	});

	test("all doctor fields survive the localStorage round-trip", () => {
		// input: doctor with every non-null field populated
		// expected: retrieved doctor is deeply equal to the original
		const doctor: Doctor = {
			id: 7,
			full_name: "Dr. Full Fields",
			primary_specialty: "Neurology",
			accepting_new_patients: true,
			profile_url: "https://example.com/doc/7",
			book_appointment_url: "https://example.com/book/7",
			primary_location: "Pittsburgh, PA 15213",
			primary_phone: "412-555-0007",
			match_score: 0.82,
			matched_specialty: "Neurology;Headache Medicine",
			latitude: 40.4406,
			longitude: -79.9959,
		};

		const { result } = renderHook(() => useSavedPhysicians());
		act(() => {
			result.current.addSavedDoctor(doctor);
		});

		expect(result.current.savedDoctors[0]).toEqual(doctor);
	});
});
