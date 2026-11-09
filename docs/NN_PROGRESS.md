## 2026-11-09 · CI foundation merged and main verified

**Merged:** PR #1 (CI: add automated typecheck, lint, test and build gate) into
main, squash commit 92c05b8a08eaa1c0b83776bb3d092c912c402c44.

**GitHub Actions:** main-branch run
[42570312929](https://github.com/NaseemudheenT/NN-app/actions/runs/42570312929)
completed successfully. Dependency installation, typecheck, lint, unit/rules
tests and the Next.js production build all passed.

**Vercel:** existing nn-app project retains its Next.js monorepo settings,
but the GitHub namespace is still access-restricted. A direct Git project
connection was rejected because the Vercel GitHub integration is not installed
with access to this repository. No deployment was created.

**Repository visibility:** the owner temporarily changed NN-app to public.
A preliminary path and common-token-pattern review found no obvious committed
credential file or matching key pattern. This is not a complete secret-history
audit. Keep all actual credentials and personal data out of Git; return the
repository to private after the Vercel integration is configured.

**Not verified:** deployed sign-in, cross-device sync, mobile installation,
live AI/REN, production data persistence or backup restoration.
These must be tested on the deployed application before calling NN ready.

---

# NN — Progress Log

Append-only. Newest first. Every entry records what was actually run.

---

## 2026-11-08 · Phase 3 verified in a real browser

**Inspected:** repo state (clean, in sync, `nn-os-dev` active), all 15 reported
Phase 3 files present, the authentication implementation line by line.

**Four defects found and fixed** — see `docs/AUTHENTICATION.md` §7. The two
that mattered most: the idle timeout was silently dead because Firebase's
hourly token refresh counted as user activity, and sign-in read every
credential document on every attempt.

**Added:** Firestore-backed rate limiting on all six auth routes; an O(1)
credential index; Playwright end-to-end tests driving real Chrome.

**Verified by running it:**

| Gate | Result |
|---|---|
| `pnpm -r typecheck` | 5/5 packages clean |
| `eslint --max-warnings 0` | clean |
| `pnpm -r test` | **216 passing** (88 rules · 53 web · 34 security · 30 auth · 11 firebase) |
| `pnpm --filter @nn/web test:e2e` | **10 passing** in Chrome 150 |
| `next build` | succeeds |

**Tooling resolved:** Playwright works on Intel macOS 12 by driving the system
Chrome (`channel: "chrome"`); it can no longer download its own Chromium for
this platform. Temurin 21.0.13 x86_64 runs the emulators.

**Remaining:** Safari, Firefox and mobile browsers untested — their engines
cannot be installed on this host. `NN_BOOTSTRAP_SECRET` must be set by the
founder before NN can be claimed.

---

## 2026-11-08 · Phase 2 — Firebase infrastructure and security

Firestore data model for all 34 applications, owner-scoped security rules,
Storage rules, emulator suite, `@nn/firebase`, `@nn/security`.

**A real security hole was found by test:** Storage rules are a permissive
union, so a deny on `users/{uid}/_derived/` was overridden by the owner's
general write rule — a client could have forged server-generated files.
Derived output and backups moved outside `users/`.

88 security-rules tests against real emulators.

---

## 2026-11-08 · Phase 1 — design system and brand

Concept A logo locked (revised to a 6-unit gap at the founder's direction),
design tokens with WCAG AA enforced by test, 13 components, 3D holographic
layer, light and dark themes.
