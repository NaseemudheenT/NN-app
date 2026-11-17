# REN — Phase 0: discovery, feasibility and architecture

**Status:** Phase 0 complete. Awaiting founder approval before Phase 1 continues.
**Date:** 2026-11-17 · **Author:** Claude (principal architect, REN)
**Scope:** the seventeen deliverables required by the founder's build brief, §23.

Everything in this document was measured on the actual machine and read out of
the actual repository. Where a number is an estimate it says so. Where
something cannot be done it says that instead of proposing a workaround.

---

## 0. The three findings that decide everything else

1. **REN's operating layer is real and already built.** Capabilities,
   consequence declaration, the state machine, the tool plan checker, the
   permission tiers and the Firestore boundary all exist and are tested. This
   is the hard half of the brief and it is done.
2. **REN's intelligence layer is built the way the brief forbids.** The
   current gateway calls Anthropic, OpenAI and Google. The brief says REN must
   not depend on a proprietary assistant as its runtime intelligence. That
   code has to be replaced, not keyed.
3. **No open-weight model can run on this machine.** Not slowly — at all. See
   §5. REN's intelligence is blocked on hardware that does not yet exist, and
   no amount of engineering here changes that.

---

## 1. Current NN architecture report

| Layer | What is there |
|---|---|
| Application | Next.js 15.5 App Router, React 19, TypeScript strict, pnpm workspace |
| Hosting | Vercel (project `nn-app`, Node 24.x), domain `getrenew.in` |
| Data | Firebase `nn-os-dev`, Firestore, **Spark plan** |
| Identity | Self-implemented WebAuthn → Admin SDK custom token → Firebase session |
| Packages | `@nn/firebase`, `@nn/security`, `@nn/auth`, `@nn/app-registry` |
| Empty | `packages/core`, `packages/ui`, `packages/orin` (renamed, unused), `functions/` |
| Tests | 407 web + 90 rules + 72 package = 569, plus 10 real-browser passkey e2e |

Serverless matters here: a Vercel route handler is a short-lived function with
no GPU, no persistent process and no long-running worker. **Nothing that needs
to stay resident — a model, a job queue, a WebSocket hub — can live in it.**

## 2. Existing frontend and backend inventory

**REN, as it stands (2,900 lines):**

| File | Lines | What it is | Verdict |
|---|---|---|---|
| `lib/ren/capabilities.ts` | 301 | Every action REN may take, each declaring its consequence (`none`/`writes`/`sensitive`) | **Keep.** This is §13 and §14 of the brief, built. |
| `lib/ren/state.ts` | 172 | Six-state machine; illegal transitions throw | **Keep.** Extend for task states (§5). |
| `lib/ren/tools.ts` | 171 | `planFromToolCall` refuses anything not in the registry | **Keep.** This is the tool-registry boundary. |
| `lib/ren/operator.ts` | 205 | Runs plans with the founder's own session; confirmation gates | **Keep.** |
| `lib/ren/understand.ts` | 178 | Deterministic intent matching | **Keep.** Brief §5: use deterministic logic where it is more reliable. |
| `lib/ren/markdown.ts` | 171 | Model output → tree, never HTML | **Keep.** Prompt-injection surface, correctly closed. |
| `lib/ren/conversation.ts` | 414 | Turn management, streaming | Keep, refactor onto the task engine. |
| `server/ren/providers.ts` | 456 | **Anthropic / OpenAI / Google adapters** | **Replace.** Forbidden by the brief. |
| `server/ren/prompt.ts` | 124 | System prompt | Rewrite for a self-hosted model. |
| `app/api/ren/chat/route.ts` | 187 | SSE endpoint, owner-gated | Keep the shape, change the backend. |
| `components/ren/*` | ~1,300 | Full-page surface, orb, launcher | **Keep.** |

**Already satisfying the brief:** §5 deterministic logic, §13 permissioned
operations, §14 least privilege, part of §15 (capabilities report what they
actually observed).

**Not built at all:** memory (§6), research and citation (§7), coding
workspace (§8), image (§9), video (§10), voice (§11), browser automation
(§12), the model registry (§4C), the epistemic ledger (§15), evaluations (§20).

## 3. Infrastructure and integration report

| Need | Status |
|---|---|
| Inference host | **None.** No GPU anywhere in the estate. |
| Relational DB / pgvector | **None.** No PostgreSQL provisioned. |
| Object storage | **None.** Cloud Storage requires Blaze; Spark forbids it. |
| Job queue / workers | **None.** Requires a host that is not Vercel. |
| WebSockets | Not available on Vercel functions. SSE works and is in use. |
| Firestore | Live, owner-scoped, 90 rules tests passing. |
| Cloud Functions | **Blocked on Spark.** Deliberately avoided so far. |

## 4. Security and authentication assessment

Strong, and the strongest part of the system.

- WebAuthn implemented in NN itself; Firebase has no released passkey support.
- Production verifies passkeys as of 2026-11-17. Ten real-browser tests pass
  against a CDP virtual authenticator and real emulators — not mocks.
- Authorisation is in the Firestore rules, never in React. One ownership check
  covers all 34 applications, proven by test.
- `@nn/security` already implements the brief's permission model: five tiers,
  13 always-confirm sensitive actions, fails closed on unknown/revoked/expired
  grants. **The brief's Levels 0–3 map onto this; they do not need inventing.**
- Credential-shaped fields are refused in every Firestore collection.

**Gaps against the brief §14:** no audit log is written yet (the collection
exists and rejects client writes, which is correct, but nothing populates it);
no emergency stop; no dependency scanning in CI.

## 5. Available hardware assessment — *the blocking constraint*

Measured, not assumed:

```
CPU   Intel Core i5-5350U @ 1.80GHz — 2 physical cores, 4 threads (Broadwell, 2015)
RAM   8 GB total, shared with macOS and the dev server
GPU   Intel HD Graphics 6000, 1536 MB shared — no CUDA, no ROCm
OS    macOS 12.7.6, x86_64
Disk  121 GB volume, 97% full — 3.0 GB free
```

What this rules out, with reasons:

- **vLLM: impossible.** It requires CUDA or ROCm. There is no such GPU, and
  vLLM does not target macOS on Intel integrated graphics.
- **Apple MLX: impossible.** Apple Silicon only. This is x86_64.
- **llama.cpp on Metal: not viable.** HD 6000 reports Metal GPUFamily macOS 1,
  the oldest tier. CPU inference on two Broadwell cores is the realistic
  ceiling, which is single-digit tokens per second for a 7B model.
- **Disk: decisive on its own.** A 4-bit quantised 7B GGUF is ≈4.4 GB. **There
  are 3.0 GB free.** The smallest useful model does not fit on the disk.
- Nothing is installed: no PyTorch, no Ollama, no llama.cpp.

**Conclusion: REN's intelligence cannot be *server-hosted* on this machine.**
A server-side model is a hard stop here.

### But the browser can — measured 2026-11-17

I was wrong to stop at "no free path". Probing Chrome on this machine, on
the live site, reports:

```
WebGPU API          present
WebGPU adapter      granted (Intel HD 6000, via Metal)
maxBufferSize       2,147 MB
maxStorageBuffer    2,147 MB
WASM SIMD           yes
WASM threads        no  — the site is not cross-origin isolated
hardwareConcurrency 2
deviceMemory        8 GB
storage quota       2.1 GB
```

That is enough to run a small open-weight model **in the founder's own
browser**, with no server, no GPU rental and no cost. It is also the most
private host that exists: the weights are fetched once, cached, and every
token is generated on the device. Nothing is sent anywhere.

What fits the 2.1 GB storage quota, 4-bit:

| Model | On disk | Realistic here |
|---|---|---|
| Qwen2.5-0.5B-Instruct | ~0.4 GB | comfortable; short answers at usable speed |
| Qwen2.5-1.5B-Instruct | ~1.0 GB | fits; slower, noticeably more capable |
| Qwen2.5-3B-Instruct | ~2.0 GB | borderline against the quota |

**Honest about what this is.** A 0.5–1.5B model is not Claude, ChatGPT or
Gemini and will not be mistaken for one. It is real language, real reasoning
on short problems, and real tool selection — which is what REN actually needs,
because the capability registry is the authority on what may be done and the
model's job is to choose from it. It will be slow on two Broadwell cores.

Two free improvements worth taking: send COOP/COEP headers so
`crossOriginIsolated` becomes true and WASM threads work (a large CPU-path
speedup), and prefer the founder's phone when it is newer than this laptop —
a recent iPhone or Android will outrun an HD 6000 by a wide margin.

**Revised recommendation: build the in-browser backend first.** It costs
nothing, it is the most private option available, it proves the whole
architecture — registry, adapter, orchestration, honesty engine — against a
real model, and renting a GPU later becomes a configuration change rather
than a rewrite.

## 6–8. Model shortlists

I am not naming a winner. The brief (§4A) requires selection on measured
evaluation against the hardware actually bought, and that hardware does not
exist yet — a recommendation made now would be exactly the marketing-claim
selection the brief forbids. What I can fix now is the *shape*: a registry
that records licence, VRAM, context, tool-calling reliability and evaluation
results, so the choice is made on evidence when there is hardware to measure on.

Families to evaluate at that point, all genuinely open-weight and
commercially usable: **Qwen**, **DeepSeek**, **GLM**, **Mistral**, **Gemma**,
**Llama**. Licences differ materially — some are Apache-2.0, some carry
community-licence restrictions — and the registry has a field for it because
it must be checked per model and per version, at the time, against the model
card.

The same applies to coding, vision, speech, image and video models. The one
engineering commitment worth making now is the interface, not the weights:
**every backend speaks an OpenAI-compatible HTTP API.** vLLM, llama.cpp's
server, Ollama, LM Studio and SGLang all expose one, so the model becomes a
configuration value and swapping it never touches REN.

## 9. Inference infrastructure recommendation

Four options, honestly costed. These are list prices at the time of writing
and must be re-checked before anything is bought.

| Option | What it buys | Rough cost |
|---|---|---|
| **A. This machine** | Nothing. Will not run a model. | — |
| **B. Rented cloud GPU, on demand** | One 24 GB GPU (A10G/L4 class) while in use. Good enough for a 7–14B model with long context. | ~$0.50–1.20/hr; ~$40–90/mo at 2 h/day |
| **C. Rented cloud GPU, always on** | REN answers instantly, any time | ~$350–800/mo |
| **D. Own hardware** | A single 24 GB consumer GPU box under NN's control | ~$1,500–2,500 once, plus power |

**Revised recommendation: option E first — the founder's own browser.**
Measured as viable in §5. It costs nothing, sends nothing anywhere, and
exercises the entire architecture against a real model. B or D become worth
paying for only when the founder wants speed or a larger model, and by then
they are a change of endpoint rather than a change of design.

Image generation needs the same GPU. **Video generation does not fit any of
these cheaply** — open-weight video models typically want 24–80 GB of VRAM for
a few seconds of output and take minutes per clip. It belongs in Phase 7, as
an asynchronous job on rented capacity, and should not be promised before then.

## 10. Memory architecture (§6)

Six stores, one interface, provenance on every record.

```
profile     who the founder is, explicit preferences      Firestore (owner-scoped)
working     this conversation, this task                  in-process, never persisted
episodic    decisions, completed tasks, errors            Firestore + embeddings
semantic    facts, documents, references                  Firestore + embeddings
project     NN's own architecture and history             Firestore + embeddings
procedural  approved workflows and limits                 Firestore (owner-scoped)
```

Every record carries `source` (founder / retrieved / inferred), `confidence`,
`observedAt` and `supersedes`. **An unverified model statement is never stored
as a fact** — it is stored as `inferred` and reads back that way.

Vectors: Firestore has no vector search. Two routes — Firestore for documents
plus a small embedding index alongside the inference host, or PostgreSQL with
pgvector when option B/D exists. **Decide when the GPU host is chosen**, since
the embedding model runs there anyway. Do not provision PostgreSQL before then.

## 11. Research and verification architecture (§7, §15)

The epistemic contract, which is the heart of the brief:

```
known     the model's own weights          — never presented as current
retrieved fetched from a named source      — carries URL, title, published date
verified  checked against a second source, or actually executed and observed
estimated reasoned, with the uncertainty stated
unknown   insufficient evidence — REN says so
failed    an operation was attempted and did not succeed
```

Every claim REN makes carries one of these. A claim without evidence cannot be
rendered as `verified`; the type system refuses it.

Research pipeline: search → fetch → extract → date → cross-check → cite →
contradiction check. Robots.txt and terms respected; no paywall or auth
bypass. **No invented sources, ever** — a citation must resolve to a document
REN actually fetched, and the fetch is recorded.

## 12. Agent and permission architecture (§5, §14)

Task lifecycle, durable, with illegal transitions refused:

```
CREATED → UNDERSTANDING → PLANNING → WAITING_FOR_APPROVAL → EXECUTING
        → VERIFYING → COMPLETED | FAILED | CANCELLED
```

Permission levels map onto `@nn/security`, which already exists:

| Brief | NN today |
|---|---|
| L0 Read | tier `read`, approval `none` |
| L1 Prepare | tier `create`, drafts only, nothing written |
| L2 Confirm | tiers `modify`/`external`/`security`, approval `confirm`/`reauthenticate` |
| L3 Pre-approved | a bounded grant with an explicit limit and an expiry |

Orchestration: **an explicit state machine in TypeScript, not LangGraph.**
LangGraph is Python and would mean standing up a second runtime and a second
deployment for logic that is a few hundred lines of pure functions. When
Python is introduced for model serving (option B/D), reconsider — not before.

## 13. Database and storage architecture

Keep Firestore for everything owner-scoped; it is live, tested and free.
Object storage for media is **blocked on Spark** and must not be worked around
by putting bytes in Firestore. PostgreSQL only if and when the retrieval
workload justifies it.

## 14. Cost and hardware estimates

| Item | Monthly |
|---|---|
| Vercel | $0 (current plan) |
| Firebase Spark | $0 |
| Firebase Blaze, if enabled | ~$0–5 at this scale, plus a card on file |
| GPU option B | ~$40–90 |
| GPU option C | ~$350–800 |
| Search API for research | ~$0–30 |

**The minimum to give REN language: roughly $40–90/month**, or a one-off
purchase of ~$1,500–2,500. There is no free path, and the brief's own §17
requires this to be stated rather than engineered around.

## 15. Risks and limitations

1. **Hardware is the critical path.** Everything in §4A of the brief waits on it.
2. **Quality gap.** A well-chosen 7–14B open model is genuinely useful and is
   not equal to a frontier proprietary model. The brief accepts this; it should
   stay accepted out loud rather than quietly disappointing later.
3. **Video generation is the most expensive item in the brief** and the least
   likely to be affordable soon.
4. **Disk.** 3 GB free blocks local work of any size, including a build cache.
   This needs attention regardless of REN.
5. **Spark plan** blocks object storage, Cloud Functions and background workers.
6. **Prompt injection** is the live security risk once research is built. The
   markdown parser already refuses HTML; tool plans are already allow-listed.

## 16. Phased implementation plan

Phases 0–9 are the founder's own, unchanged. What changes is the ordering
constraint: **phases 1–5 split into what needs a model and what does not**, and
everything that does not is built now.

| Can be built today (no GPU) | Blocked on an inference host |
|---|---|
| Model registry and health | Actually serving a model |
| Backend adapter (OpenAI-compatible HTTP) | Any generated token |
| Task engine and durable states | — |
| Epistemic ledger and evidence types | — |
| Permission levels 0–3 and audit log | — |
| Memory schema, provenance, correction | Embeddings and semantic search |
| Research fetch/extract/cite/contradiction | Summarising what was fetched |
| Evaluation harness and status register | Scores to put in it |

## 17. First implementation milestone, with acceptance tests

**Milestone 1 — REN's spine.** Three pieces, all deterministic, all testable
without a GPU, all required by every later phase:

1. **Model registry** (`lib/ren/registry.ts`) — identifier, family, version,
   licence, capabilities, context length, quantisation, VRAM requirement,
   evaluation slot, deployment and health status. Typed so a model cannot be
   registered without declaring its licence and hardware cost.
2. **Epistemic ledger** (`lib/ren/evidence.ts`) — the six claim kinds above,
   with construction rules that make a false claim unrepresentable.
3. **Task engine** (`lib/ren/task.ts`) — the nine states, legal transitions
   only, cancellation, failure with a real reason, and an append-only record.

**Acceptance:** a model cannot be registered without a licence or a VRAM
figure; a `verified` claim cannot be built without evidence; a task cannot
reach `COMPLETED` without passing through `VERIFYING`; every illegal
transition throws rather than being ignored; `FAILED` carries the actual
error. All under `pnpm -r test`, with no network and no model.

---

## What is being asked of the founder

One decision, and it is the only thing standing between REN and language:

**Which inference option — B (rent a GPU by the hour, ~$40–90/month), C
(always on, ~$350–800/month), or D (buy a box, ~$1,500–2,500 once)?**

Nothing else is blocked. Milestone 1 starts now either way.
