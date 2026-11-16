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

  it("is the mark and one button, and nothing else", async () => {
    // The founder asked for exactly this. Every sentence that used to be on
    // this screen explained a mechanism — that the device does the check,
    // that biometrics never leave it — which is true, worth saying once in
    // the documentation, and not worth saying on the door every time.
    supported.value = true;
    const { container } = render(<SignIn />);
    await screen.findByRole("button", { name: "Sign in with passkey" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(container.textContent).not.toMatch(/biometric/i);
    expect(container.textContent).not.toMatch(/Welcome back/i);
  });

  it("keeps a heading for anything that reads rather than looks", async () => {
    supported.value = true;
    render(<SignIn />);
    expect(await screen.findByRole("heading", { level: 1, name: "NN" })).toBeInTheDocument();
  });

  it("closes the public door once the environment has an owner", async () => {
    // A preview grants no session and can read nothing, but a public way
    // into the founder's own surfaces should not outlive the moment it was
    // for: looking around before claiming.
    supported.value = true;
    render(<SignIn />);
    await screen.findByRole("button", { name: "Sign in with passkey" });
    expect(screen.queryByRole("button", { name: /Explore NN/ })).toBeNull();
  });
});
