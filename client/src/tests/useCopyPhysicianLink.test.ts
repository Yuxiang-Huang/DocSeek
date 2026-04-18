// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useCopyPhysicianLink } from "../hooks/useCopyPhysicianLink";

describe("useCopyPhysicianLink", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	test("copies the physician URL and reports success", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("navigator", { clipboard: { writeText } });
		const { result } = renderHook(() => useCopyPhysicianLink(42));

		await act(async () => {
			await result.current.handleCopyLink();
		});

		expect(writeText).toHaveBeenCalledWith(
			`${window.location.origin}/physician/42`,
		);
		expect(result.current.copyStatus).toBe("success");

		act(() => {
			vi.advanceTimersByTime(2500);
		});
		expect(result.current.copyStatus).toBe("idle");
	});

	test("reports error when clipboard copy fails and then resets to idle", async () => {
		const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
		vi.stubGlobal("navigator", { clipboard: { writeText } });
		const { result } = renderHook(() => useCopyPhysicianLink(9));

		await act(async () => {
			await result.current.handleCopyLink();
		});

		expect(writeText).toHaveBeenCalledWith(
			`${window.location.origin}/physician/9`,
		);
		expect(result.current.copyStatus).toBe("error");

		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(result.current.copyStatus).toBe("idle");
	});
});
