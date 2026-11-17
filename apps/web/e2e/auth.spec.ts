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
/* The claim sets both credentials in one ceremony now. */
const RECOVERY = "harbour-lantern-thistle-49!";

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
    // The door is the mark and one button now, so the state it is in is
    // read off the control rather than a headline.
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: /Claim NN/ })).toBeVisible();
    await expect(page.getByLabel("Bootstrap secret")).toBeVisible();
  });

  test("refuses a wrong bootstrap secret", async ({ page }) => {
    await attachAuthenticator(page);
    await page.goto("/sign-in");
    await page.getByLabel("Bootstrap secret").fill("definitely-the-wrong-secret-value");
    await page.getByLabel("Recovery password").fill(RECOVERY);
    await page.getByRole("button", { name: /Claim NN/ }).click();
    await expect(page.getByTestId("signin-error")).toContainText(/Invalid bootstrap secret/i);
    // Still unclaimed.
    await page.reload();
    await expect(page.getByRole("button", { name: /Claim NN/ })).toBeVisible();
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
    await page.getByLabel("Recovery password").fill(RECOVERY);
    await page.getByRole("button", { name: /Claim NN/ }).click();

    // The browser performs a genuine WebAuthn create() against the virtual
    // authenticator, then NN exchanges the assertion for a Firebase session.
    // It lands on the dashboard: that is where NN opens now.
    // `commit` rather than `load`: the dashboard keeps WebGL surfaces
    // painting, so "load" can outlast the navigation it is waiting for.
    await page.waitForURL("**/home", { timeout: 60_000, waitUntil: "commit" });

    /* Arriving already means the ceremony completed. What is asserted here is
       that a *real* session exists rather than the preview — the preview says
       so on every surface it is on, and the owner's own controls only appear
       when there is an owner. */
    await expect(page.getByText(/Exploring NN/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /profile and settings/ })).toBeVisible();
    await expect(page.getByText(/Welcome back, /)).toBeVisible();

    /* ---- REN's console, on the session that now exists ------------------
     *
     * The expansion brief's TEST A and TEST I. They run here, inside the
     * claim, rather than in a file of their own for a plain reason: a
     * virtual authenticator belongs to one page, so a second spec gets a
     * fresh one with no credential and cannot sign in to a claimed NN. This
     * is the only place a real owner session exists.
     */
    await page.goto("/ren");

    // TEST A — an operating surface, not a chat.
    await expect(page.getByRole("button", { name: /speak|microphone/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Chat/ })).toBeVisible();
    await expect(page.getByLabel("Type to REN")).toBeVisible();
    // REN says what it cannot do rather than implying a mind that is absent.
    await expect(page.getByText(/No language model is connected/)).toBeVisible();

    // TEST B — the chat is reached only because the founder asked.
    await page.getByRole("button", { name: /Chat/ }).click();
    await page.waitForURL("**/ren/chat", { timeout: 20_000 });

    // TEST I — every size the founder actually uses.
    for (const size of [
      { name: "iPhone SE", width: 375, height: 667 },
      { name: "iPhone 15", width: 393, height: 852 },
      { name: "Android", width: 412, height: 915 },
      { name: "iPad", width: 768, height: 1024 },
      { name: "iPad landscape", width: 1024, height: 768 },
      { name: "laptop", width: 1440, height: 900 },
      { name: "desktop", width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto("/ren");
      await page.waitForTimeout(900);

      // A horizontal scrollbar on a phone is the commonest way a responsive
      // layout is actually broken, and the easiest to miss by eye.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${size.name} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);

      const controls = await page.evaluate(() => {
        const out: { label: string; h: number; right: number }[] = [];
        for (const element of document.querySelectorAll("button, input")) {
          const box = element.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          out.push({
            label: (element.getAttribute("aria-label") ?? element.textContent ?? "")
              .trim().slice(0, 30),
            h: Math.round(box.height),
            right: Math.round(box.right),
          });
        }
        return out;
      });

      expect(controls.length, `${size.name} lost its controls`).toBeGreaterThan(2);
      for (const control of controls) {
        expect(control.h, `"${control.label}" is ${control.h}px tall on ${size.name}`)
          .toBeGreaterThanOrEqual(32);
        expect(control.right, `"${control.label}" runs past the right edge on ${size.name}`)
          .toBeLessThanOrEqual(size.width + 1);
      }
      await page.screenshot({ path: `test-results/ren-${size.width}x${size.height}.png` });
    }
    /* ---- the phone, everywhere ------------------------------------------
     * Screenshots of every surface at 393x852, kept, so the phone experience
     * is looked at rather than inferred from "nothing overflows".
     */
    await page.setViewportSize({ width: 393, height: 852 });
    for (const [name, url] of [
      ["today", "/home"], ["ren", "/ren"], ["settings", "/settings"],
    ] as const) {
      await page.goto(url);
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `test-results/phone-${name}.png`, fullPage: false });
    }
    await page.goto("/home");
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /^Applications/ }).first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/phone-apps.png" });

    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("NN is now claimed, so the sign-in screen changes", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: "Sign in with passkey" })).toBeVisible();
    await expect(page.getByLabel("Bootstrap secret")).toBeHidden();
    // And the public door closes with it: a preview grants no session, but a
    // way into the founder's own surfaces should not outlive the claim.
    await expect(page.getByRole("button", { name: /Explore NN/ })).toHaveCount(0);
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
