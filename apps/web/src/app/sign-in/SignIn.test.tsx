import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";

const supported = vi.hoisted(() => ({ value: true }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ phase: "anonymous", endedReason: null }),
  // `configured` matters: without server credentials SignIn returns early
  // with "Sign-in is not available here", which is a different page entirely.
  fetchAuthStatus: vi.fn(async () => ({ claimed: true, bootstrapReady: true, configured: true })),
  registerPasskey: vi.fn(),
  signInWithPasskey: vi.fn(),
  passkeysSupported: () => supported.value,
}));

const { SignIn } = await import("./SignIn");

afterEach(cleanup);

describe("the door to NN", () => {
  it("never ships a claim about the browser the server has not met", () => {
    // What the server actually does: there is no `window`, so asking whether
    // passkeys are supported answers false. Rendering that answer put "This
    // browser does not support passkeys" into the HTML of every visitor's
    // sign-in page, and React threw the page away on hydration when the real
    // browser disagreed.
    supported.value = false;
    const html = renderToString(<SignIn />);
    expect(html).not.toContain("does not support passkeys");
  });

  it("says so once it has actually asked", async () => {
    supported.value = false;
    render(<SignIn />);
    expect(await screen.findByTestId("signin-unsupported")).toBeInTheDocument();
  });

  it("says nothing of the kind when the browser does support them", async () => {
    supported.value = true;
    render(<SignIn />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("signin-unsupported")).toBeNull();
  });
});
