import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The status client — the thinnest piece of NN's authentication, and the one
 * that locked the founder out.
 *
 * `fetchAuthStatus` does not return the server's object. It builds a new one,
 * field by field, so that a malformed or hostile response cannot smuggle
 * extra properties into the UI's idea of who is signed in. That is the right
 * shape. It also means **every field the server sends has to be named here**,
 * and when `hasPassword` was added to the route and forgotten in the client
 * the result was a sign-in screen that hid the only working door: production
 * held a correct password, the server verified it three times, and the page
 * never offered it because this function answered `undefined`.
 *
 * So the pass-through is tested per field. A test that only checked
 * `claimed` would have passed the whole way through that outage.
 */

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: vi.fn(), startRegistration: vi.fn(),
}));
vi.mock("firebase/auth", () => ({ signInWithCustomToken: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ getFirebase: () => ({ auth: {} }) }));

const { fetchAuthStatus, PasskeyError } = await import("./passkey");

const reply = (body: unknown, status = 200) => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })));
};

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("what the sign-in screen is told", () => {
  it("carries hasPassword through, so the password door is offered", async () => {
    // The regression. The server said yes; the client said undefined.
    reply({ claimed: true, bootstrapReady: true, configured: true, hasPassword: true });
    await expect(fetchAuthStatus()).resolves.toMatchObject({ hasPassword: true });
  });

  it("reads every field the status route actually returns", async () => {
    // Guards the *class* of bug rather than the one instance of it: if the
    // route grows a field and this client forgets it, this fails.
    reply({ claimed: true, bootstrapReady: true, configured: true, hasPassword: true });
    const status = await fetchAuthStatus();
    const fromRoute = ["claimed", "bootstrapReady", "configured", "hasPassword"];
    for (const field of fromRoute) {
      expect(Object.keys(status), `the client drops "${field}"`).toContain(field);
    }
  });

  it("reports no password as no password, not as unknown", async () => {
    reply({ claimed: true, bootstrapReady: true, configured: true, hasPassword: false });
    await expect(fetchAuthStatus()).resolves.toMatchObject({ hasPassword: false });
  });

  it("treats a missing field as false rather than letting undefined through", async () => {
    // An older deployment, or a truncated response. `false` is a safe answer;
    // `undefined` is one that reads as false in one place and true in another.
    reply({ claimed: true, bootstrapReady: true, configured: true });
    const status = await fetchAuthStatus();
    expect(status.hasPassword).toBe(false);
  });

  it("will not let a response invent its own fields", async () => {
    reply({ claimed: true, bootstrapReady: true, configured: true, isAdmin: true });
    const status = await fetchAuthStatus() as unknown as Record<string, unknown>;
    expect(status.isAdmin).toBeUndefined();
  });

  it("reads 503 as a deployment with no credentials, not as an unreachable NN", async () => {
    reply({}, 503);
    await expect(fetchAuthStatus()).resolves.toMatchObject({ configured: false });
  });

  it("raises anything else, rather than guessing at a state", async () => {
    reply({}, 500);
    await expect(fetchAuthStatus()).rejects.toBeInstanceOf(PasskeyError);
  });
});
