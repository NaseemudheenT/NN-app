import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackState } from "./FeedbackState";

afterEach(cleanup);

describe("FeedbackState", () => {
  it("announces loading as a busy status", () => {
    render(<FeedbackState kind="loading" title="Syncing" description="Your changes are being saved." />);
    const state = screen.getByRole("status", { name: /Syncing/ });
    expect(state).toHaveAttribute("aria-busy", "true");
    expect(state).toHaveAttribute("data-kind", "loading");
  });

  it("announces errors assertively and offers a recovery action", async () => {
    const onAction = vi.fn();
    render(<FeedbackState kind="error" title="Could not load" description="Check your connection." actionLabel="Retry" onAction={onAction} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("labels empty and permission groups without pretending they are live alerts", () => {
    const { rerender } = render(<FeedbackState kind="empty" title="No notes yet" />);
    expect(screen.getByRole("group", { name: "No notes yet" })).toBeInTheDocument();
    rerender(<FeedbackState kind="permission" title="Permission required" description="Allow access to continue." />);
    expect(screen.getByRole("group", { name: "Permission required" })).toHaveAttribute("data-kind", "permission");
  });

  it("announces success as a polite status", () => {
    render(<FeedbackState kind="success" title="Changes saved" />);
    expect(screen.getByRole("status", { name: "Changes saved" })).toHaveAttribute("data-kind", "success");
  });

  it("never renders an inert action when its callback is absent", () => {
    render(<FeedbackState kind="empty" title="Nothing here" actionLabel="Create" />);
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
  });
});
