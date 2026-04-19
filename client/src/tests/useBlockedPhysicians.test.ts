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
import { useBlockedPhysicians } from "../hooks/useBlockedPhysicians";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "docseek-blocked-physicians";

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

beforeEach(() => {
	storageMock.clear();
});

afterEach(() => {
	storageMock.clear();
});

// ===========================================================================
// Initial state  (exercises loadBlockedDoctors indirectly)
// ===========================================================================

describe("initial state", () => {
	test("blockedDoctors is an empty array when localStorage is empty", () => {
		// precondition: nothing in storage
		// expected: blockedDoctors === []
		const { result } = renderHook(() => useBlockedPhysicians());
		expect(result.current.blockedDoctors).toEqual([]);
	});

	test("blockedDoctors is populated from a valid localStorage entry on mount", () => {
		// precondition: localStorage contains one doctor
		// expected: hook initialises with that doctor
		const doctor = makeDoctor({ id: 10, full_name: "Dr. Pre-loaded" });
		localStorage.setItem(STORAGE_KEY, JSON.stringify([doctor]));

		const { result } = renderHook(() => useBlockedPhysicians());
		expect(result.current.blockedDoctors).toHaveLength(1);
		expect(result.current.blockedDoctors[0].full_name).toBe("Dr. Pre-loaded");
	});

	test("blockedDoctors is empty when localStorage contains invalid JSON", () => {
		// precondition: storage has malformed JSON
		// expected: hook returns [] without throwing
		localStorage.setItem(STORAGE_KEY, "not-valid-json{{");

		const { result } = renderHook(() => useBlockedPhysicians());
		expect(result.current.blockedDoctors).toEqual([]);
	});

	test("blockedDoctors is empty when localStorage value is a non-array JSON type (object)", () => {
		// precondition: storage has a JSON object, not an array
		// expected: hook treats it as empty and returns []
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1 }));

		const { result } = renderHook(() => useBlockedPhysicians());
		expect(result.current.blockedDoctors).toEqual([]);
	});

	test("blockedDoctors is empty when localStorage value is a JSON number", () => {
		// precondition: storage has a JSON number
		// expected: hook returns []
		localStorage.setItem(STORAGE_KEY, "42");

		const { result } = renderHook(() => useBlockedPhysicians());
		expect(result.current.blockedDoctors).toEqual([]);
	});

	test("blockedDoctors is empty when localStorage key is absent", () => {
		// localStorage.getItem returns null when key is absent
		// expected: hook returns []
		localStorage.removeItem(STORAGE_KEY);

		const { result } = renderHook(() => useBlockedPhysicians());
		expect(result.current.blockedDoctors).toEqual([]);
	});

	test("loads multiple previously blocked doctors in the stored order", () => {
		// precondition: two doctors in storage
		// expected: both returned in insertion order
		const doctors = [
			makeDoctor({ id: 1, full_name: "Dr. Alpha" }),
			makeDoctor({ id: 2, full_name: "Dr. Beta" }),
		];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));

		const { result } = renderHook(() => useBlockedPhysicians());
		expect(result.current.blockedDoctors.map((d) => d.full_name)).toEqual([
			"Dr. Alpha",
			"Dr. Beta",
		]);
	});
});

// ===========================================================================
// blockDoctor
// ===========================================================================

describe("blockDoctor", () => {
	test("adds a doctor to the blockedDoctors list", () => {
		// input: block doctor id=1
		// expected: blockedDoctors.length === 1
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1 }));
		});

		expect(result.current.blockedDoctors).toHaveLength(1);
	});

	test("the blocked doctor's data is preserved exactly", () => {
		// input: block doctor with specific fields
		// expected: doctor object stored unchanged
		const doctor = makeDoctor({ id: 7, full_name: "Dr. Blocked" });
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(doctor);
		});

		expect(result.current.blockedDoctors[0]).toEqual(doctor);
	});

	test("persists the blocked doctor to localStorage", () => {
		// input: block doctor id=5
		// expected: localStorage has a JSON array containing that doctor
		const doctor = makeDoctor({ id: 5 });
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(doctor);
		});

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		expect(stored).toHaveLength(1);
		expect(stored[0].id).toBe(5);
	});

	test("does not add a duplicate when the same doctor id is blocked twice", () => {
		// input: blockDoctor called twice with the same id
		// expected: blockedDoctors still has length 1
		const doctor = makeDoctor({ id: 3 });
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(doctor);
			result.current.blockDoctor(doctor);
		});

		expect(result.current.blockedDoctors).toHaveLength(1);
	});

	test("does not store a duplicate in localStorage when the same id is blocked twice", () => {
		// input: same doctor blocked twice
		// expected: localStorage still contains only one entry
		const doctor = makeDoctor({ id: 3 });
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(doctor);
			result.current.blockDoctor(doctor);
		});

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		expect(stored).toHaveLength(1);
	});

	test("correctly blocks multiple distinct doctors", () => {
		// input: block doctor id=1 then doctor id=2
		// expected: blockedDoctors contains both in insertion order
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1, full_name: "Dr. A" }));
			result.current.blockDoctor(makeDoctor({ id: 2, full_name: "Dr. B" }));
		});

		expect(result.current.blockedDoctors).toHaveLength(2);
		expect(result.current.blockedDoctors[0].full_name).toBe("Dr. A");
		expect(result.current.blockedDoctors[1].full_name).toBe("Dr. B");
	});

	test("persists all blocked doctors to localStorage when several are blocked", () => {
		// input: block three doctors
		// expected: localStorage contains all three
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1 }));
			result.current.blockDoctor(makeDoctor({ id: 2 }));
			result.current.blockDoctor(makeDoctor({ id: 3 }));
		});

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		expect(stored).toHaveLength(3);
	});
});

// ===========================================================================
// unblockDoctor
// ===========================================================================

describe("unblockDoctor", () => {
	test("removes a doctor by id from blockedDoctors", () => {
		// input: one doctor blocked, then unblocked by its id
		// expected: blockedDoctors is empty
		const doctor = makeDoctor({ id: 4 });
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(doctor);
		});
		act(() => {
			result.current.unblockDoctor(4);
		});

		expect(result.current.blockedDoctors).toHaveLength(0);
	});

	test("persists the unblock to localStorage", () => {
		// input: block then unblock doctor id=4
		// expected: localStorage is now an empty array
		const doctor = makeDoctor({ id: 4 });
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(doctor);
		});
		act(() => {
			result.current.unblockDoctor(4);
		});

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
		expect(stored).toEqual([]);
	});

	test("does nothing when the given id is not in the blocked list", () => {
		// input: one doctor blocked with id=1, unblock id=99
		// expected: blockedDoctors still has the original doctor
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1 }));
		});
		act(() => {
			result.current.unblockDoctor(99);
		});

		expect(result.current.blockedDoctors).toHaveLength(1);
	});

	test("removes only the matching doctor when multiple are blocked", () => {
		// input: doctors id=1,2,3 blocked; unblock id=2
		// expected: blockedDoctors contains id=1 and id=3, not id=2
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1, full_name: "Dr. A" }));
			result.current.blockDoctor(makeDoctor({ id: 2, full_name: "Dr. B" }));
			result.current.blockDoctor(makeDoctor({ id: 3, full_name: "Dr. C" }));
		});
		act(() => {
			result.current.unblockDoctor(2);
		});

		const ids = result.current.blockedDoctors.map((d) => d.id);
		expect(ids).toEqual([1, 3]);
	});

	test("leaves the list empty when the only blocked doctor is unblocked", () => {
		// input: block one doctor, unblock it
		// expected: blockedDoctors === []
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1 }));
		});
		act(() => {
			result.current.unblockDoctor(1);
		});

		expect(result.current.blockedDoctors).toEqual([]);
	});

	test("calling unblock on an already-empty list does not throw", () => {
		// input: no doctors blocked, call unblockDoctor
		// expected: no error thrown, blockedDoctors stays []
		const { result } = renderHook(() => useBlockedPhysicians());

		expect(() => {
			act(() => {
				result.current.unblockDoctor(99);
			});
		}).not.toThrow();

		expect(result.current.blockedDoctors).toEqual([]);
	});
});

// ===========================================================================
// isBlocked
// ===========================================================================

describe("isBlocked", () => {
	test("returns false when no doctors are blocked", () => {
		// input: isBlocked(1) on empty list
		// expected: false
		const { result } = renderHook(() => useBlockedPhysicians());
		expect(result.current.isBlocked(1)).toBe(false);
	});

	test("returns true for a doctor that has been blocked", () => {
		// input: block doctor id=5, then isBlocked(5)
		// expected: true
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 5 }));
		});

		expect(result.current.isBlocked(5)).toBe(true);
	});

	test("returns false for a doctor id that was never blocked", () => {
		// input: doctor id=5 blocked, isBlocked(99)
		// expected: false
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 5 }));
		});

		expect(result.current.isBlocked(99)).toBe(false);
	});

	test("returns false for a doctor that was blocked and then unblocked", () => {
		// input: block id=5, unblock id=5, then isBlocked(5)
		// expected: false
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 5 }));
		});
		act(() => {
			result.current.unblockDoctor(5);
		});

		expect(result.current.isBlocked(5)).toBe(false);
	});

	test("returns true for each doctor in a multi-doctor blocked list", () => {
		// input: three doctors blocked
		// expected: isBlocked returns true for all three ids
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1 }));
			result.current.blockDoctor(makeDoctor({ id: 2 }));
			result.current.blockDoctor(makeDoctor({ id: 3 }));
		});

		expect(result.current.isBlocked(1)).toBe(true);
		expect(result.current.isBlocked(2)).toBe(true);
		expect(result.current.isBlocked(3)).toBe(true);
	});

	test("returns false for an id that was never blocked among multiple blocked doctors", () => {
		// input: ids 1,2,3 blocked, isBlocked(4)
		// expected: false
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1 }));
			result.current.blockDoctor(makeDoctor({ id: 2 }));
			result.current.blockDoctor(makeDoctor({ id: 3 }));
		});

		expect(result.current.isBlocked(4)).toBe(false);
	});
});

// ===========================================================================
// cross-tab sync via the storage event
// ===========================================================================

describe("cross-tab storage synchronisation", () => {
	test("updates blockedDoctors when the same localStorage key is changed by another tab", () => {
		// simulate another browser tab writing to the same key via a StorageEvent
		const doctor = makeDoctor({ id: 42, full_name: "Dr. Remote" });
		const { result } = renderHook(() => useBlockedPhysicians());

		// Confirm starting state is empty
		expect(result.current.blockedDoctors).toHaveLength(0);

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

		expect(result.current.blockedDoctors).toHaveLength(1);
		expect(result.current.blockedDoctors[0].full_name).toBe("Dr. Remote");
	});

	test("ignores storage events for a different key", () => {
		// input: StorageEvent with key="some-other-app-key"
		// expected: blockedDoctors stays empty
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "some-other-app-key",
					newValue: JSON.stringify([makeDoctor({ id: 1 })]),
				}),
			);
		});

		expect(result.current.blockedDoctors).toHaveLength(0);
	});

	test("reflects the cleared list when another tab removes all blocked doctors", () => {
		// precondition: doctor already blocked locally
		// input: another tab clears the key
		// expected: blockedDoctors becomes []
		const { result } = renderHook(() => useBlockedPhysicians());

		act(() => {
			result.current.blockDoctor(makeDoctor({ id: 1 }));
		});
		expect(result.current.blockedDoctors).toHaveLength(1);

		localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: STORAGE_KEY,
					newValue: JSON.stringify([]),
				}),
			);
		});

		expect(result.current.blockedDoctors).toHaveLength(0);
	});

	test("reflects multiple doctors written by another tab", () => {
		// input: another tab writes two doctors to the key
		// expected: blockedDoctors has both
		const doctors = [
			makeDoctor({ id: 10, full_name: "Dr. X" }),
			makeDoctor({ id: 11, full_name: "Dr. Y" }),
		];
		const { result } = renderHook(() => useBlockedPhysicians());

		localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: STORAGE_KEY,
					newValue: JSON.stringify(doctors),
				}),
			);
		});

		expect(result.current.blockedDoctors).toHaveLength(2);
		expect(result.current.blockedDoctors.map((d) => d.id)).toEqual([10, 11]);
	});
});

// ===========================================================================
// localStorage persistence — round-trip fidelity
// ===========================================================================

describe("localStorage persistence", () => {
	test("a new hook instance reads the list saved by an earlier instance", () => {
		// simulate: one component blocks a doctor, then unmounts;
		// a fresh component should find the data still in localStorage
		const doctor = makeDoctor({ id: 99, full_name: "Dr. Persist" });

		const { result: first, unmount } = renderHook(() =>
			useBlockedPhysicians(),
		);
		act(() => {
			first.current.blockDoctor(doctor);
		});
		unmount();

		// Mount a brand-new hook instance
		const { result: second } = renderHook(() => useBlockedPhysicians());
		expect(second.current.blockedDoctors).toHaveLength(1);
		expect(second.current.blockedDoctors[0].full_name).toBe("Dr. Persist");
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

		const { result } = renderHook(() => useBlockedPhysicians());
		act(() => {
			result.current.blockDoctor(doctor);
		});

		expect(result.current.blockedDoctors[0]).toEqual(doctor);
	});
});
