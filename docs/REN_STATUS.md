# REN — evidence-based status register

Required by the founder's brief §20. One row per capability, and a row may
only say **VERIFIED** when the named tests have actually passed.

```
NOT STARTED   nothing exists
IN PROGRESS   being built
IMPLEMENTED   code exists, untested
TESTED        tests exist and pass
VERIFIED      tested, and checked in the place it will really run
BLOCKED       cannot proceed, with the reason named
```

Last updated 2026-11-17. Figures are from the run recorded in the commit of
the same date.

---

## 1. The two experiences (expansion §1)

| Capability | Status | Evidence |
|---|---|---|
| Full-screen REN is what opening REN gives you | **TESTED** | `RenConsole.test.tsx` — "is an operating surface, not a chat window"; `/ren` renders `RenConsole` |
| REN Chat is a separate, deliberate route | **TESTED** | `/ren/chat` renders `RenWorkspace`; "reaches the chat only because the founder asked for it" |
| One identity, one permission system under both | **IMPLEMENTED** | both go through `capabilities.ts` → `operator.ts`; no second code path exists |
| Moving between them without losing the task | **NOT STARTED** | needs the task engine persisted to Firestore (Phase 2) |
| Microphone status | **TESTED** | the control is disabled and says why when no engine exists |
| Listening / working / speaking states | **TESTED** | orb state comes from `state.ts`, which throws on illegal transitions |
| Current task and progress | **IMPLEMENTED** | `task.ts` drives the line; only `executing`/`verifying` animate |
| Approval requests | **TESTED** | "holds anything that writes until the founder approves it" |
| Stop control | **IMPLEMENTED** | cancels speech, microphone and the turn |
| Settings and permissions reachable | **IMPLEMENTED** | links to `/settings` |
| Previous activities | **NOT STARTED** | needs episodic memory (Phase 2) |

## 2. Voice (expansion §2)

| Capability | Status | Evidence |
|---|---|---|
| Speech recognition | **IMPLEMENTED** | `voice.ts` over the Web Speech API; needs a real device to verify |
| Streaming transcription | **IMPLEMENTED** | interim results render as REN hears them |
| Speech synthesis | **IMPLEMENTED** | `say()`, calm rate, cancels anything in flight |
| Interruptible speech | **IMPLEMENTED** | `silence()` on stop, on a new turn, and on unmount |
| Support detection, with the reason | **TESTED** | "says plainly that it has no microphone here" |
| Push-to-talk | **IMPLEMENTED** | one utterance per gesture; `continuous` is off everywhere |
| Never records, never listens unasked | **IMPLEMENTED** | no wake word; no audio stored or sent by NN |
| Noise suppression, wake word, hands-free | **NOT STARTED** | — |
| **Speaker verification** | **BLOCKED — and deliberately not faked** | needs a speaker-ID model and an inference host. A voice match is not authentication: it can be recorded and replayed. NN will not let one authorise anything, and does not pretend to have it |

**Honest limit:** on Chrome the Web Speech API sends audio to Google's
recogniser. That is the platform's behaviour, not NN's choice, and it is why
self-hosted speech-to-text is on the roadmap rather than optional. Until then
the surface should not be used to dictate anything private.

## 3–6. Building, design, games, applications (expansion §3–6)

| Capability | Status | Reason |
|---|---|---|
| Build and modify NN itself | **BLOCKED** | needs a coding model and a sandboxed execution host. Neither exists |
| Design intelligence | **BLOCKED** | same |
| Game development | **BLOCKED** | same, plus a build toolchain per engine |
| Application creation | **BLOCKED** | same |

All four need the same two things: a model that can write code, and an
isolated place to run it. The brief forbids using a proprietary assistant for
the first, and this machine cannot host an open-weight one (§5 of
`REN_ARCHITECTURE.md`). Nothing in this group will be claimed as working
until both exist.

## 7. Website and application verification (expansion §7)

| Capability | Status | Evidence |
|---|---|---|
| Browser automation | **VERIFIED** | Playwright drives system Chrome; used throughout this project to catch two shipped regressions |
| Multi-viewport checks | **VERIFIED** | run at 1440 and 390 in both themes on the live site |
| Screenshots and reproducible reports | **VERIFIED** | same |
| **REN** performing these itself | **BLOCKED** | the harness exists and is used by the developer, not by REN. REN needs tool execution (Phase 4) to drive it |

## 8. Tasks (expansion §8)

| Capability | Status | Evidence |
|---|---|---|
| Task states, legal transitions only | **TESTED** | `spine.test.ts`, 14 cases |
| `completed` only through `verifying` | **TESTED** | "cannot be completed without passing through verification" |
| Failure carries the real reason | **TESTED** | "cannot fail or be cancelled without a reason" |
| Survives a restart | **TESTED** | `Task.restore` round-trip |
| Background execution | **BLOCKED** | Vercel functions are short-lived; needs a worker host |
| Notifications | **NOT STARTED** | — |

## 9. Devices (expansion §9)

| Device | Status | Evidence |
|---|---|---|
| Laptop / desktop | **VERIFIED** | 1440×900, both themes, live |
| Phone | **VERIFIED** | 390×844, both themes, live |
| Tablet | **IN PROGRESS** | layout written, not yet checked at 768/1024 |
| Real iPhone / real Android hardware | **NOT STARTED** | no device access from here; emulated viewports are not the same claim |

The console is built for touch first: the microphone control is 56px high,
the text field is 16px so iOS does not zoom the page on focus, and the layout
sheds the explanatory copy before it sheds the controls on a short screen.

## 10. Visual identity (expansion §10)

| State | Status | Evidence |
|---|---|---|
| idle, listening, thinking, speaking | **TESTED** | driven by `state.ts` |
| waiting for approval | **IMPLEMENTED** | shown as a card and a status line, not an orb state |
| error | **IMPLEMENTED** | the status line turns and says what failed |
| No fake progress | **TESTED** | the task dot animates only in `executing` and `verifying` |
| Reduced motion respected | **IMPLEMENTED** | every animation has a `prefers-reduced-motion` and `data-motion` stop |

## 11. Security (expansion §11)

| Capability | Status | Evidence |
|---|---|---|
| Single-owner identity, passkey | **VERIFIED** | 10 real-browser e2e tests; live since 2026-11-16 |
| Recovery password | **TESTED** | 16 cases; scrypt, global lockout, 3 rules tests prove no client can read it |
| Permission tiers and sensitive-action floor | **TESTED** | `@nn/security`, 34 cases |
| Consequence declared per capability | **TESTED** | `capabilities.ts`; writes confirm, sensitive re-authenticates |
| Authorisation in the rules, not React | **VERIFIED** | 93 rules tests |
| Audit log written | **IN PROGRESS** | `recordSecurityEvent` writes auth events; REN's own actions are not yet logged |
| Emergency stop | **IMPLEMENTED** | the Stop control ends speech, microphone and turn. A system-wide kill is not built |
| Dependency scanning | **NOT STARTED** | — |

## 12. High-effort mode (expansion §12)

**BLOCKED.** Every step of it — analyse, research, compare implementations,
execute in stages, fix what it finds — is a model doing work. The task engine
that would carry it is built and tested; there is nothing to put in it.

## 13. Acceptance tests (expansion §13)

| | Test | Status |
|---|---|---|
| A | Full-screen REN opens, no chat | **PASSING** |
| B | Chat mode is separate and deliberate | **PASSING** |
| C | Voice identity | **BLOCKED** — not built, and will not be simulated |
| D | Application creation | **BLOCKED** |
| E | Design modification | **BLOCKED** |
| F | Feature removal | **BLOCKED** |
| G | Game generation | **BLOCKED** |
| H | Website verification by REN | **BLOCKED** — the harness is verified; REN cannot drive it yet |
| I | Multi-device quality | **PARTIAL** — laptop and phone verified live, tablet pending |
| J | Long-running task | **BLOCKED** — needs a worker host |

---

## What this register says in one line

REN's **spine** — identity, permissions, honesty, task lifecycle, the
operating surface, voice in and out, and the deterministic operations it can
already perform on NN — is built and tested.

REN's **mind** is not, and cannot be here. Every BLOCKED row above traces
back to the same two missing things: an inference host, and (for the building
work) an isolated place to run generated code.

The decision in `REN_ARCHITECTURE.md` §9 is still open and still the only
thing in the way.
