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
  return <button onClick={() => travel.open(to as never, label)}>go</button>;
}

function mount(ui = <Opener />) {
  return render(<AppTransitionProvider>{ui}</AppTransitionProvider>);
}

const sweeping = () => screen.queryByRole("status");

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
  it("asks the router to move, and says where it is going", () => {
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    expect(push).toHaveBeenCalledWith("/life");
    // Announced, not drawn: the screen itself shows the destination a quarter
    // of a second later, and a label painted over it would be a second answer
    // to the same question.
    expect(sweeping()).toHaveTextContent("Opening NN Life");
  });

  it("keeps sweeping while the route has not actually changed", () => {
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    // Well past the minimum. The destination still has not arrived, so the
    // sweep is still running — it reports real state, not a timer.
    act(() => void vi.advanceTimersByTime(2000));
    expect(sweeping()).toBeInTheDocument();
  });

  it("ends only once the route has changed and it has had its beat", () => {
    const { rerender } = mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    pathname = "/life";
    rerender(
      <AppTransitionProvider>
        <Opener />
      </AppTransitionProvider>,
    );

    // Arrived, but too soon to cut — that would read as a flicker.
    expect(sweeping()).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(300));
    expect(sweeping()).toBeNull();
  });

  it("lets go of a navigation that never lands rather than holding the screen", () => {
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    act(() => void vi.advanceTimersByTime(4100));
    expect(sweeping()).toBeNull();
  });

  it("is over before anyone would reach to skip it", () => {
    // The corridor it replaced ran for at least 620ms and carried a tap-to-
    // skip. A sweep that is gone in a quarter of a second does not need an
    // escape hatch, and offering one would be a control for a third of a
    // second of light.
    const { rerender } = mount();
    act(() => void fireEvent.click(screen.getByText("go")));
    pathname = "/life";
    rerender(
      <AppTransitionProvider>
        <Opener />
      </AppTransitionProvider>,
    );
    act(() => void vi.advanceTimersByTime(260));
    expect(sweeping()).toBeNull();
  });

  it("says where it is going out loud, rather than hiding the whole sweep", () => {
    // `aria-hidden` on the wrapper would take the live region with it, and
    // the announcement would never be made. Only the light is hidden.
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));
    const sweep = sweeping()?.parentElement;
    expect(sweep).not.toHaveAttribute("aria-hidden");
    expect(sweep?.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("sweeps nothing at all under reduced motion", () => {
    document.documentElement.dataset["motion"] = "reduced";
    mount();
    act(() => void fireEvent.click(screen.getByText("go")));

    expect(push).toHaveBeenCalledWith("/life");
    expect(sweeping()).toBeNull();
  });

  it("does not travel to the page it is already on", () => {
    mount(<Opener to="/home" label="NN Home" />);
    act(() => void fireEvent.click(screen.getByText("go")));

    expect(push).not.toHaveBeenCalled();
    expect(sweeping()).toBeNull();
  });

  it("still navigates when used outside the provider", () => {
    render(<Opener />);
    act(() => void fireEvent.click(screen.getByText("go")));
    expect(push).toHaveBeenCalledWith("/life");
  });
});
