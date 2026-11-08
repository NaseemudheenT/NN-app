# Phase 0 — Repository and Environment Audit

**Date:** 2026-11-08 · **Auditor:** Claude (principal engineer) · **Status:** complete

Everything below was verified by direct inspection. Nothing is assumed.

---

## 1. Local workspace

**Final workspace: `/Users/thajudeen/NN-app-workspace`** — a clean clone of
`NaseemudheenT/NN-app` created by the founder on 2026-11-08. Correct remote, correct git
identity, `main` branch, one upstream commit.

An earlier scratch folder at `/Users/thajudeen/NN app` was inspected first and found **empty** —
zero files, zero bytes, no git repository. Phase 0 work was drafted there and has since been
migrated into the workspace above with no loss. That folder is now obsolete.

**Conclusion: greenfield.** There is no existing NN APP code, data or configuration to preserve.
The instruction "preserve existing working code" has nothing to act on.

> **Resolved:** the earlier scratch path contained a space, a known hazard for the Java-based
> Firebase emulators. `NN-app-workspace` has no space, so that risk is gone.

## 2. GitHub

| Check | Result |
|---|---|
| Repository | `NaseemudheenT/NN-app` |
| Created | 2026-11-08 03:36 UTC |
| Contents | one file — `README.md` |
| Commits | one — "Initial commit" |
| Branches | `main` only |
| Size | 0 KB |
| **Visibility** | **PRIVATE** — resolved 2026-11-08, verified `isPrivate: true` |
| Secret scanning | not enabled |

Verified private on 2026-11-08 and confirmed still readable by the owner account. No NN code was
ever pushed while it was public, so nothing leaked.

**`NaseemudheenT/NN` is a different product** — a Next.js fashion e-commerce site with Razorpay
checkout, a stylist API and an owner dashboard. Presumed NERO NOREN. **It has not been touched
and will not be.**

### Security item — RESOLVED

The repository was public at first inspection. Every part of the specification requires it to be private. No NN code
has been pushed yet, so **nothing has leaked** — but this must be resolved before the first push.
Making a repository private does not affect commits, branches, pushes, CI or deployment in any
way; there is no functional reason to keep it public.

Note also that private-after-public does not retract copies already taken while public. Since the
repository only ever contained a stub README, that risk is currently zero.

### GitHub account

Two accounts are authenticated in `gh`. The active account was `trustlensaiofficial`.
**RESOLVED** — switched to `NaseemudheenT` on 2026-11-08 and verified via `gh api user`.
Repository remote confirmed as `https://github.com/NaseemudheenT/NN-app.git`.

## 3. Toolchain

| Tool | Version | Verdict |
|---|---|---|
| node | 24.15.0 | ✅ |
| pnpm | 11.17.0 | ✅ |
| npm | 11.12.1 | ✅ |
| git | 2.37.1 | ✅ |
| gh | 2.97.0 | ✅ authenticated |
| firebase-tools | 15.27.0 | ✅ authenticated |
| python3 | 3.14.7 | ✅ |
| Homebrew | 7.0.11 | ✅ |
| **java** | **absent** | ❌ required by the Firestore and Storage emulators |
| gcloud | absent | ⚠️ needed later for Cloud Tasks / Scheduler / budget alerts |
| Docker | absent | not required by the Firebase architecture |

**Host:** macOS 12.7.6 Monterey, Intel x86_64. Fine for web and Firebase work. It caps the usable
Xcode version, which is why NN ships first as an installable PWA rather than a native iOS build.

Java can be installed without an administrator password via `brew install openjdk`. This is a
Phase 2 task, not needed yet.

## 4. Firebase

Signed in as **t.naseemudheen@gmail.com**. One project exists on the account:

| Display name | Project ID | Relevance |
|---|---|---|
| Renew | `the-zap-e7583` | unrelated (getrenew.in) — will not be used |

**There is no Firebase project for NN.** Two will be needed — `nn-dev` and `nn-prod` — so that
development never touches production personal data.

### Billing reality — needs a founder decision in Phase 2

The Spark (free) plan covers Authentication and Firestore within daily quotas that a single user
will not come close to exceeding. However, **Cloud Functions, Firebase App Hosting, and Cloud
Storage on newly created projects require the Blaze pay-as-you-go plan**, which requires a card
on file. NN needs all three.

Blaze retains the same free monthly allowances and only bills beyond them. For one user the
realistic monthly cost is very low — but it is *usage-based*, so a runaway loop or a misconfigured
scheduled function could spike it. Before enabling Blaze I will produce `docs/COST_ESTIMATE.md`
with current verified pricing, set a Google Cloud budget alert, and cap every scheduled function.

No paid service will be enabled without explicit approval.

## 5. Credentials

No AI provider credentials have been supplied and none are assumed. REN will be built
provider-independent and will report `NEEDS CONFIGURATION` until a real key is present and a real
call succeeds. **NN must remain fully usable with no AI provider connected** — calendar, notes,
tasks, files, college and finance do not depend on a model.

No Hostinger VPS or domain has been confirmed to exist, so none is assumed.

## 6. Corrected build order

Part 4 placed infrastructure at Stage 7, after the application screens. That ordering forces a
rewrite, because the same specification forbids placeholder data — a real dashboard cannot be
built before the database it reads from. Sequence used instead, matching the founder's final
Section 20:

```
0  Audit ...................................... complete
1  Brand + design system ...................... in progress
2  Firebase infrastructure + security rules
3  NN OS shell (launch, auth, dashboard, launcher, windows, settings)
4  Productivity core (calendar, tasks, reminders, notes, files)
5  REN foundation
6  REN personal intelligence
7  Connectors
8  Automation + notifications
9  Backup and restore
10 Remaining applications
11 App Factory
12 Devices and smart home
13 Hardening and production
```

## 7. Blockers carried into Phase 1 / 2

| # | Blocker | Needs |
|---|---|---|
| 1 | ~~Repository is public~~ | ✅ **RESOLVED** — now private, verified |
| 2 | ~~Wrong `gh` account active~~ | ✅ **RESOLVED** — now `NaseemudheenT`, verified |
| 3 | ~~Logo not chosen~~ | ✅ **RESOLVED** — Concept A (Interlock) approved by founder |
| 4 | No Firebase project | Founder approved creation of `nn-dev` / `nn-prod`, no billing |
| 5 | No Java runtime | `brew install openjdk` — Phase 2, no password required |
| 6 | Blaze plan not approved | `COST_ESTIMATE.md` required before any billing request |
