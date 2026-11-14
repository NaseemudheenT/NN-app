import { expect, test, type CDPSession, type Page } from "@playwright/test";

/**
 * Real-browser passkey verification.
 *
 * These are not mocks. Chrome's own WebAuthn implementation runs the full
 * ceremony against a CDP virtual authenticator, hitting NN's real route
 * handlers backed by real Firestore and Auth emulators. If these pass,
 * passkey sign-in genuinely works in a browser.
 */

const BOOTSTRAP = "e2e-only-bootstrap-secret-not-a-real-one";

/** Attaches a platform authenticator that reports successful user verification. */
async function attachAuthenticator(page: Page): Promise<{ client: CDPSession; id: string }> {
  const client = await page.context().newCDPSession(page);
  await client.send("WebAuthn.enable");
  const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,        // discoverable, as NN requires
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { client, id: authenticatorId };
}

test.describe.configure({ mode: "serial" });

test.describe("passkey authentication", () => {
  test("an unclaimed NN offers to be claimed, not signed into", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Claim NN" })).toBeVisible();
    await expect(page.getByLabel("Bootstrap secret")).toBeVisible();
  });

  test("refuses a wrong bootstrap secret", async ({ page }) => {
    await attachAuthenticator(page);
    await page.goto("/sign-in");
    await page.getByLabel("Bootstrap secret").fill("definitely-the-wrong-secret-value");
    await page.getByRole("button", { name: /Claim NN/ }).click();
    await expect(page.getByTestId("signin-error")).toContainText(/Invalid bootstrap secret/i);
    // Still unclaimed.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Claim NN" })).toBeVisible();
  });

  test("an unauthenticated visitor cannot reach the workspace", async ({ page }) => {
    await page.goto("/workspace");
    await page.waitForURL("**/sign-in", { timeout: 15_000 });
    expect(page.url()).toContain("/sign-in");
  });

  test("claims NN with a real passkey and signs in", async ({ page }) => {
    await attachAuthenticator(page);
    await page.goto("/sign-in");
    await page.getByLabel("Bootstrap secret").fill(BOOTSTRAP);
    await page.getByRole("button", { name: /Claim NN/ }).click();

    // The browser performs a genuine WebAuthn create() against the virtual
    // authenticator, then NN exchanges the assertion for a Firebase session.
    await page.waitForURL("**/workspace", { timeout: 30_000 });

    /* Arriving at /workspace already means the ceremony completed. What is
       asserted here is that a *real* session exists, not the guest preview:
       the workspace prints the owner's Firebase uid only when it has one, and
       drops the guest notice. Asserting the uid is stronger than asserting a
       heading, which is what this used to do before /workspace became the
       actual work surface. */
    await expect(page.getByText(/owner · \S+/)).toBeVisible();
    await expect(page.getByText(/TEMPORARY GUEST PREVIEW/)).toHaveCount(0);
    await expect(page.getByText("Good evening, Founder.")
      .or(page.getByText(/Good (morning|afternoon), Founder\./))).toBeVisible();
  });

  test("NN is now claimed, so the sign-in screen changes", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Welcome back, Founder." })).toBeVisible();
    await expect(page.getByLabel("Bootstrap secret")).toBeHidden();
  });

  test("the bootstrap secret stops working once NN is claimed", async ({ request }) => {
    const res = await request.post("/api/auth/register/options", {
      data: { bootstrapSecret: BOOTSTRAP },
    });
    // 401 — not a back door, even with the correct secret.
    expect(res.status()).toBe(401);
  });

  test("a challenge cannot be replayed", async ({ request }) => {
    const first = await request.post("/api/auth/signin/options", { data: {} });
    expect(first.ok()).toBeTruthy();
    const { ticket } = (await first.json()) as { ticket: string };

    // Reusing the ticket with a junk assertion must fail on the consumed
    // challenge, proving consumption happened, not on the signature.
    const replay = await request.post("/api/auth/signin/verify", {
      data: { ticket, response: { id: "nope", rawId: "nope", type: "public-key", response: {} } },
    });
    expect(replay.status()).toBeGreaterThanOrEqual(400);

    const second = await request.post("/api/auth/signin/verify", {
      data: { ticket, response: { id: "nope", rawId: "nope", type: "public-key", response: {} } },
    });
    const body = (await second.json()) as { error?: string };
    expect(body.error).toMatch(/expired/i);
  });

  test("an unknown credential is refused without revealing anything", async ({ request }) => {
    const opts = await request.post("/api/auth/signin/options", { data: {} });
    const { ticket } = (await opts.json()) as { ticket: string };
    const res = await request.post("/api/auth/signin/verify", {
      data: {
        ticket,
        response: { id: "unknown-credential-id", rawId: "x", type: "public-key", response: {} },
      },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe("Sign-in failed.");
  });

  test("malformed input is rejected cleanly", async ({ request }) => {
    for (const data of [{}, { ticket: 123 }, { ticket: "x" }, { ticket: "x", response: "no" }]) {
      const res = await request.post("/api/auth/signin/verify", { data });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
  });

  test("rate limiting actually engages on the tightest endpoint", async ({ request }) => {
    // register-options allows 5 a minute. The earlier tests already consumed
    // some of the window, so a short burst must trip it.
    let sawLimit = false;
    for (let i = 0; i < 10; i += 1) {
      const res = await request.post("/api/auth/register/options", { data: { bootstrapSecret: "x" } });
      if (res.status() === 429) {
        sawLimit = true;
        expect(res.headers()["retry-after"]).toBeDefined();
        break;
      }
    }
    expect(sawLimit, "expected a 429 within 10 rapid attempts").toBeTruthy();
  });
});
