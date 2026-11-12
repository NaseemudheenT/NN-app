import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppTransitionProvider, useAppTransition } from "./AppTransition";

const push = vi.fn();
let pathname = "/home";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

/** A button that asks to travel somewhere, so the hook can be exercised. */
function Opener({ to = "/life", label = "NN Life" }: { to?: string; label?: string }) {
  const travel = useAppTransition();
  return (
    <button onClick={() => travel.open(to as never, label)}>go</button>
  );
}

function mount(ui = <Opener />) {
  return render(<AppTransitionProvider>{ui}</AppTransitionProvider>);
}

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
  pathname = "/home";
  delete document.documentElement.dataset["motion"];
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AppTransition", () => {
  it("asks the router to move, and shows where it is going", () => {
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    expect(push).toHaveBeenCalledWith("/life");
    expect(screen.getByText("NN Life")).toBeInTheDocument();
  });

  it("stays in the corridor while the route has not actually changed", () => {
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    // Well past the minimum flight. The destination still has not arrived,
    // so the corridor is still flying — it reports real state, not a timer.
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByText("NN Life")).toBeInTheDocument();
  });

  it("lands only once the route has changed and the flight has had its beat", () => {
    const { rerender } = mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    pathname = "/life";
    rerender(
      <AppTransitionProvider>
        <Opener />
      </AppTransitionProvider>,
    );

    // Arrived, but too soon to cut — that would read as a flicker.
    expect(screen.getByText("NN Life")).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(700));
    expect(screen.queryByText("NN Life")).toBeNull();
  });

  it("lets go of a navigation that never lands rather than stranding the founder", () => {
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    act(() => void vi.advanceTimersByTime(6100));
    expect(screen.queryByText("NN Life")).toBeNull();
  });

  it("can be skipped with a tap", () => {
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));
    act(() => void fireEvent.pointerDown(screen.getByRole("status")));
    expect(screen.queryByText("NN Life")).toBeNull();
  });

  it("can be skipped with Escape", () => {
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));
    act(() => void fireEvent.keyDown(document, { key: "Escape" }));
    expect(screen.queryByText("NN Life")).toBeNull();
  });

  it("builds no corridor at all under reduced motion", () => {
    document.documentElement.dataset["motion"] = "reduced";
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    expect(push).toHaveBeenCalledWith("/life");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not travel to the page it is already on", () => {
    mount(<Opener to="/home" label="NN Home" />);
    act(() => void fireEvent.click(screen.getByText("go")));

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("still navigates when used outside the provider", () => {
    render(<Opener />);
    act(() => void fireEvent.click(screen.getByText("go")));
    expect(push).toHaveBeenCalledWith("/life");
  });
});
