import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";

const supported = vi.hoisted(() => ({ value: true }));
const claimed = vi.hoisted(() => ({ value: true }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ phase: "anonymous", endedReason: null }),
  // `configured` matters: without server credentials SignIn returns early
  // with "Sign-in is not available here", which is a different page entirely.
  fetchAuthStatus: vi.fn(async () => ({ claimed: claimed.value, bootstrapReady: true, configured: true })),
  registerPasskey: vi.fn(),
  signInWithPasskey: vi.fn(),
  passkeysSupported: () => supported.value,
  signInWithRecoveryPassword: vi.fn(async () => "Add a passkey on this device now."),
  setRecoveryPassword: vi.fn(async () => 84),
}));

const { signInWithRecoveryPassword } = await import("@/lib/auth");
const { SignIn } = await import("./SignIn");

afterEach(cleanup);
// Reset between tests: a leaked `claimed` would silently change which door
// the next test is looking at.
beforeEach(() => { claimed.value = true; supported.value = true; });

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

  it("offers no recovery path until the passkey has actually failed", async () => {
    // A recovery password shown before anything has gone wrong is an
    // invitation to use the weaker credential by default, which is how a
    // passkey environment quietly becomes a password one.
    supported.value = true;
    render(<SignIn />);
    await screen.findByRole("button", { name: "Sign in with passkey" });
    expect(screen.queryByRole("button", { name: /recovery password/i })).toBeNull();
  });

  it("offers it once the browser cannot do passkeys at all", async () => {
    supported.value = false;
    render(<SignIn />);
    expect(await screen.findByTestId("signin-unsupported")).toBeInTheDocument();
    const offer = await screen.findByRole("button", { name: /Use my recovery password/ });
    await userEvent.click(offer);
    expect(screen.getByLabelText("Recovery password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock NN" })).toBeDisabled();
  });

  it("unlocks with the recovery password, and can go back to the passkey", async () => {
    supported.value = false;
    render(<SignIn />);
    await userEvent.click(await screen.findByRole("button", { name: /Use my recovery password/ }));
    await userEvent.type(screen.getByLabelText("Recovery password"), "harbour-lantern-thistle-49!");
    const unlock = screen.getByRole("button", { name: "Unlock NN" });
    expect(unlock).toBeEnabled();
    await userEvent.click(unlock);
    expect(signInWithRecoveryPassword).toHaveBeenCalledWith("harbour-lantern-thistle-49!");

    await userEvent.click(screen.getByRole("button", { name: /Back to the passkey/ }));
    expect(screen.queryByLabelText("Recovery password")).toBeNull();
  });

  it("will not claim NN without a way back in", async () => {
    // The trap this closes: the recovery password used to be settable only
    // from Settings, which needs a session — so a founder whose passkey would
    // not work could not set the thing that exists for exactly that case.
    // Both credentials are made in one ceremony now.
    claimed.value = false;
    supported.value = true;
    render(<SignIn />);
    const claim = await screen.findByRole("button", { name: /Claim NN/ });
    await userEvent.type(screen.getByLabelText("Bootstrap secret"), "a-long-enough-bootstrap-secret-value");
    expect(claim).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Recovery password"), "short");
    expect(claim).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Recovery password"));
    await userEvent.type(screen.getByLabelText("Recovery password"), "harbour-lantern-thistle-49!");
    expect(claim).toBeEnabled();
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
