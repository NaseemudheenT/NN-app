/**
 * Compiles every route the suite touches before any assertion runs.
 *
 * Playwright drives `next dev`, which compiles each route the first time it is
 * requested. On the founder's Intel MacBook Air that is 50s for the entrance
 * and 13s for sign-in — and the first test used to fail not because anything
 * was broken but because `/api/auth/status` was still compiling when the
 * 30-second assertion gave up. The page sat on "Checking this environment…"
 * and the failure looked like a logic bug.
 *
 * An assertion should never be waiting on a compiler. This moves that cost
 * here, where it is allowed to take as long as it takes.
 */

const PORT = 3210;
const ORIGIN = `http://localhost:${PORT}`;

/** Every route the suite reaches, including the ones it only reaches via the UI. */
const PAGES = ["/", "/sign-in", "/workspace", "/home"];
const ENDPOINTS = [
  "/api/auth/status",
  "/api/auth/signin/options",
  "/api/auth/register/options",
  "/api/auth/signin/verify",
  "/api/auth/register/verify",
  "/api/auth/signout",
];

async function warm(path: string, method: "GET" | "POST"): Promise<string> {
  const started = Date.now();
  try {
    const response = await fetch(`${ORIGIN}${path}`, {
      method,
      ...(method === "POST"
        ? { headers: { "content-type": "application/json" }, body: "{}" }
        : {}),
    });
    // The status does not matter — a 400 from an empty body means the route
    // compiled and ran, which is the whole point.
    return `${path} ${response.status} in ${Date.now() - started}ms`;
  } catch (error) {
    return `${path} FAILED in ${Date.now() - started}ms: ${(error as Error).message}`;
  }
}

export default async function globalSetup(): Promise<void> {
  process.stdout.write("warming routes so no assertion waits on the compiler\n");
  // Serially, not in parallel: this machine has 8 GB and compiling six routes
  // at once is how it starts swapping.
  for (const path of PAGES) process.stdout.write(`  ${await warm(path, "GET")}\n`);
  for (const path of ENDPOINTS) process.stdout.write(`  ${await warm(path, "POST")}\n`);
  process.stdout.write(`  ${await warm("/api/auth/status", "GET")}\n`);
}
