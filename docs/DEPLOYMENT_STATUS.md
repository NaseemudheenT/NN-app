# NN — Deployment Status

**Current verification snapshot:** 2026-11-21  
**Target project:** Vercel `nn-app` · `NaseemudheenT/NN-app`  
**Development branch:** `nn-nexus-interface`  
**This snapshot supersedes the older status below where they conflict.**

## Current verified state

| Component | State | Evidence |
|---|---|---|
| GitHub source | Linked | Vercel team lists `nn-app` connected to `NaseemudheenT/NN-app`. |
| Frontend branch | Active development | Latest verified code is on `nn-nexus-interface`; it has not been merged to `main`. |
| CI | PASSED | Run [44865855116](https://github.com/NaseemudheenT/NN-app/actions/runs/44865855116): type-check, lint, 282 tests and Next.js build all passed. |
| Existing production deployment | READY, older source | Deployment `dpl_C8z6gJxLuw7KDCHC11gyuQD4Rk7r`, built from commit `da48c9c8d71b2ac0b59e6c52053c0bd2cb01e90b`; it does not contain the current branch work. |
| Current branch preview | NOT DEPLOYED | No preview deployment exists for the latest development commit. |
| Vercel API deployment allowance | BLOCKED | Vercel returned HTTP 402: `api-deployments-free-per-day`, over 100 deployments; retry window reported as 86,400 seconds. |
| Additional Vercel project | MISCONFIGURED | Duplicate project `web` reports that it cannot detect a Next.js version / root directory mismatch. Do not use it as the NN target. |
| Existing project aliases | PRESENT | `getrenew.in`, `www.getrenew.in`, `nn-app-sooty.vercel.app`, `nn-app-clientflownn.vercel.app`. The official primary domain still needs founder confirmation. |
| Production promotion | NOT AUTHORISED / NOT DONE | Do not promote the current branch or replace the older production deployment until the preview and acceptance checks pass. |

## Next deployment steps

1. Wait until Vercel's reported deployment-API limit has reset, or resolve the account allowance through Vercel. Do not attempt to bypass its limit.
2. Use the existing `nn-app` project only; avoid the duplicate `web` project.
3. Create a protected preview for the exact latest approved branch commit.
4. Verify the preview build, page routes, passkey sign-in, owner guard, workspace interactions, error states and responsive layouts.
5. Confirm which existing alias is the official NN production domain before promotion.
6. Promote only after the founder's acceptance criteria and the integration checks are satisfied.

## Security and release constraints

- Keep production Firebase untouched unless explicitly approved.
- Never commit Firebase service-account JSON, bootstrap secrets, AI provider keys, API keys or user data.
- Keep deployment protection enabled for previews.
- Do not add or change custom domains until ownership and intended access policy are confirmed.
- Do not claim the current branch is live, deployed or production-ready until the deployed URL is tested.

---

