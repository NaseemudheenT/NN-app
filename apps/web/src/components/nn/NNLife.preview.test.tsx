import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LifePreviewCanvas, focusRemainingSeconds, parseRoutineSteps, type LifePreviewTab } from "./NNLife";

vi.mock("@/components/ui/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span aria-hidden="true">{name}</span>,
}));
vi.mock("@/components/ui/GlassPanel", () => ({
  GlassPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

afterEach(cleanup);

describe("NN Life design canvases", () => {
  it("renders a distinct, labelled screen composition for each preview module", () => {
    const modules: LifePreviewTab[] = ["habits", "routines", "focus", "reviews"];
    for (const moduleId of modules) {
      const { unmount } = render(<LifePreviewCanvas module={moduleId} />);
      expect(document.querySelector(`[data-preview="${moduleId}"]`)).toBeInTheDocument();
      expect(document.querySelector(`[data-preview="${moduleId}"]`)?.getAttribute("aria-label")).toBeTruthy();
      unmount();
    }
  });

  it("keeps all four previously preview-only modules distinct while real workflows are added", () => {
    const { rerender } = render(<LifePreviewCanvas module="habits" />);
    expect(screen.getByText("Check-in matrix")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-preview="habits"] [data-habit-day] i')).toHaveLength(7);

    rerender(<LifePreviewCanvas module="focus" />);
    expect(screen.getByText("READY")).toBeInTheDocument();
    expect(screen.getByText("NO SESSION RUNNING")).toBeInTheDocument();

    rerender(<LifePreviewCanvas module="reviews" />);
    expect(screen.getByText("Wins")).toBeInTheDocument();
    expect(screen.getByText("Lessons")).toBeInTheDocument();
    expect(screen.getByText("Next move")).toBeInTheDocument();
  });
});


describe("NN Life workflow helpers", () => {
  it("parses routine steps from real line breaks and caps the list", () => {
    expect(parseRoutineSteps(" Prepare \\n\\nExecute\\nReview ")).toEqual(["Prepare", "Execute", "Review"]);
    expect(parseRoutineSteps(Array.from({ length: 25 }, (_, index) => String(index)).join("\\n"))).toHaveLength(20);
  });
  it("calculates focus time without returning negative values", () => {
    const end = new Date("2026-11-21T10:25:00.000Z");
    expect(focusRemainingSeconds(end, new Date("2026-11-21T10:24:10.000Z").getTime())).toBe(50);
    expect(focusRemainingSeconds(end, new Date("2026-11-21T10:26:00.000Z").getTime())).toBe(0);
  });
});
