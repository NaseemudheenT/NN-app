# NN — Deployment Status

**Last checked:** 2026-11-09 (after CI merge)  
**Target:** Vercel project `nn-app` · GitHub repository `NaseemudheenT/NN-app`  
**Scope:** private single-owner NN application only. Never use the NERO NOREN repository `NaseemudheenT/NN`.

## Verified state

| Component | State | Evidence |
|---|---|---|
| GitHub source | `VERIFIED` | Public temporarily at the owner's direction; GitHub connector has repository access |
| Vercel project | `CREATED` | `nn-app`, project ID `prj_4gUTxoJoX8Ba5t4299ASLBBv8HWM`, team `clientflownn` |
| Framework | `CONFIGURED` | Next.js |
| Root directory | `CONFIGURED` | `apps/web` |
| Monorepo source files | `CONFIGURED` | Files outside root enabled |
| Install command | `CONFIGURED` | `pnpm install --frozen-lockfile` |
| Build command | `CONFIGURED` | `pnpm --filter @nn/web build` |
| Node | `CONFIGURED` | 24.x |
| Deployment protection | `ENABLED` | Vercel SSO for all deployment URLs except custom domains |
| Git integration | `BLOCKED` | Vercel Git namespace reports `isAccessRestricted: true`; create_git_project rejected the link because the Vercel GitHub integration is not installed with access to this repository |
| CI verification | `PASSED` | Main-branch GitHub Actions run 42570312929 passed dependency install, typecheck, lint, tests and Next.js build |\n| Deployment | `NOT CREATED` | No Vercel deployment exists; Git source integration is blocked |
| Custom domain | `NOT CONFIGURED` | No domain has been selected |
| Vercel environment variables | `NOT CONFIGURED` | Requires Firebase web config, production origin/RP ID and server-only credentials |
| Firebase production | `NOT TOUCHED` | Keep `nn-os-prod` untouched |
| Firebase billing | `NOT ENABLED` | No Blaze upgrade or paid provisioning authorised |

## Immediate unlock

The Vercel GitHub App must be installed/configured for the `NaseemudheenT` namespace and granted access to `NaseemudheenT/NN-app`. Public visibility did not remove the installation restriction. This is a user-side repository integration permission, not a code change. Do not grant access by selecting the unrelated `NaseemudheenT/NN` repository.

After the integration is installed and access is granted:

1. Re-read Vercel's Git deployment context and confirm `NN-app` is visible.
2. Connect the existing `nn-app` project to `NaseemudheenT/NN-app` (do not create a duplicate).
3. Configure only the required environment variables using values from the development Firebase project and newly generated deployment-specific secrets. Never commit secrets.
4. Set the exact Vercel origin as the WebAuthn RP ID/origin and add the domain to Firebase Authentication's authorised domains.
5. Deploy a protected preview first; inspect build logs and verify sign-in, owner guard, route handlers, PWA manifest and mobile layout.
6. Only then decide whether to promote the protected build to production.

## Security constraints

- Never add Firebase service-account JSON, bootstrap secrets, AI provider keys, API keys or user data to Git.\n- The repository is temporarily public; return it to private once Vercel has been linked and the temporary sharing need has ended.
- Never point the deployment at `nn-os-prod` without explicit approval.
- Never enable Blaze or attach billing without explicit approval.
- Keep Vercel deployment protection enabled. A private GitHub repository does not make a deployed URL private.
- Do not add a custom domain until its ownership and intended access policy are confirmed.
- Do not claim deployment, passkey sign-in or phone installation is working until verified against the deployed URL on a real device.
