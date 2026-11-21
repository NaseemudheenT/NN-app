import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LifePreviewCanvas, type LifePreviewTab } from "./NNLife";

vi.mock("@/components/ui/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span aria-hidden="true">{name}</span>,
}));
vi.mock("@/components/ui/GlassPanel", () => ({
  GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(cleanup);

describe("NN Life design canvases", () => {
  it("renders a distinct, labelled screen composition for each preview module", () => {
    const modules: LifePreviewTab[] = ["habits", "routines", "focus", "reviews"];
    for (const module of modules) {
      const { unmount } = render(<LifePreviewCanvas module={module} />);
      expect(document.querySelector(`[data-preview="${module}"]`)).toBeInTheDocument();
      expect(screen.getByLabelText(new RegExp(module === "reviews" ? "Reflection review" : module, "i"))).toBeInTheDocument();
      unmount();
    }
  });

  it("does not fabricate completed check-ins, running sessions or review records", () => {
    const { rerender } = render(<LifePreviewCanvas module="habits" />);
    expect(screen.getByText("Check-in matrix")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-preview="habits"] .habitDay i')).toHaveLength(7);

    rerender(<LifePreviewCanvas module="focus" />);
    expect(screen.getByText("READY")).toBeInTheDocument();
    expect(screen.getByText("NO SESSION RUNNING")).toBeInTheDocument();

    rerender(<LifePreviewCanvas module="reviews" />);
    expect(screen.getByText("Wins")).toBeInTheDocument();
    expect(screen.getByText("Lessons")).toBeInTheDocument();
    expect(screen.getByText("Next move")).toBeInTheDocument();
  });
});
