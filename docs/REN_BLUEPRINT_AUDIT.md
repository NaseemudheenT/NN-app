# REN blueprint — environment audit

**Audited 2026-11-20 on the founder's machine, by measurement, not assumption.**
This is the deliverable the blueprint asks for first: *"Do not begin with a
fake visual demonstration. First inspect the actual environment and
repository."*

It exists so that no one spends a month building toward something this
hardware cannot run.

---

## 1. The machine, measured

| | |
|---|---|
| OS | macOS 12.7.6 (Monterey), x86_64 |
| CPU | Intel Core i5-5350U @ 1.80 GHz — 2 cores, 4 threads, 2015 ultrabook part |
| RAM | 8 GB |
| GPU | Intel HD Graphics 6000, 1536 MB *shared* VRAM, Metal GPUFamily macOS 1 |
| **Free disk** | **2.7 GB of 113 GB** |
| Repository | 1.6 GB |

Installed: `node 24.15`, `python 3.14.7`, `pnpm 11.17`, `npm 11.12`,
`java 21.0.13`.

Not installed: `docker`, `ffmpeg`, `psql`, `redis-server`, `rustc`, `cargo`,
`ollama`, `vllm`, Unity, Unreal Engine, Godot.

**The free-disk figure is the binding constraint on most of this blueprint,
and it is not close.**

---

## 2. The blueprint against the hardware

The blueprint asks for a local, independent intelligence stack. Taking its
own numbers and the measurements above:

| Blueprint item | Verdict on this machine | Why |
|---|---|---|
| Local LLM via Ollama / vLLM | **Not possible** | A 7B model at 4-bit is ~4–5 GB on disk. There is 2.7 GB free. Even with disk freed, a 2-core 1.8 GHz CPU with no usable GPU offload gives roughly 1–3 tokens/second — minutes per reply |
| Fine-tuning an open model (level C) | **Not possible** | Needs the base model resident plus optimiser state; multiples of 8 GB RAM |
| Training a foundation model (level D) | **Not possible** | The blueprint's own estimate: $0.6M–$15M of GPU compute |
| Stable Diffusion (images) | **Not possible here** | 4–7 GB of weights; Intel HD 6000 has no practical acceleration path |
| Stable Video Diffusion | **Not possible here** | The blueprint itself notes 100+ seconds per 14-frame clip *on an A100* |
| PostgreSQL + pgvector + Redis | Blocked on disk | ~500 MB installed, but there is no headroom |
| Docker | Blocked on disk | Docker Desktop is ~2 GB before any image |
| FFmpeg | **Feasible** | ~100 MB |
| Godot | **Feasible** | ~130 MB |
| Unity | **Not possible** | 10+ GB with one editor version |
| Unreal Engine | **Not possible** | 100+ GB |
| Tauri desktop app | **Not possible** | Needs Rust (absent) and a modern Xcode; macOS 12 cannot run one |
| React Native (iOS) | **Not possible** | Same Xcode constraint |
| FastAPI backend | Possible, but see §3 | |

### The thing that reframes all of it

**Almost none of this needs to run on this laptop.** NN is a web application
deployed on Vercel and used from a phone. The laptop is where code is
written, not where REN lives.

So the real constraints are not the laptop's. They are:

1. **Vercel has no GPU, no persistent processes, and a function timeout.**
   Models cannot be hosted there, FFmpeg jobs of any real length cannot
   finish there, and game engines cannot run there at all.
2. **The founder has stated, repeatedly, that there is no money.** Every
   hosted model API costs money — with one documented exception (§4).

A second machine, a rented GPU, or a paid API changes this analysis
completely. Nothing here is a permanent verdict on REN; it is a verdict on
what can be built *today, free, on this hardware*.

---

## 3. What "independent" can honestly mean right now

The founder's non-negotiable is that REN must not be a thin wrapper around
someone else's model. Taking the blueprint's own independence ladder:

- **(A) Orchestrating commercial APIs** — rejected by the founder.
- **(B) Self-hosting open weights** — requires hardware NN does not have.
- **(C) Fine-tuning open weights** — same.
- **(D) Training from scratch** — $0.6M–$15M.

What *is* achievable today, and is genuinely meaningful:

**Architectural independence.** REN owns its identity, personality,
capability registry, model router, tool protocol, permission model, memory
and verification loop. A model provider is a replaceable part behind a
registry entry — not the thing REN is. Swapping Gemini for a self-hosted
Qwen when hardware allows is a registry change, not a rewrite.

That is the honest claim, and it is the one NN's code now actually supports:

- `lib/ren/registry.ts` — every model declared with licence, provenance,
  capabilities, context, quantisation, VRAM and measured evaluations. It
  refuses a model marked `deployed` with nothing serving it, and refuses an
  evaluation with no scale.
- `lib/ren/router.ts` — the blueprint's §5 objective, implemented. Eliminate
  on capability, deployment, health, context and **measured hardware**;
  then score on quality, reliability, cost and latency; refuse rather than
  return the least-bad option; keep a reason for every rejection.

`canHost()` is checked against the numbers in §1. A test asserts that this
machine cannot host a 7B model and says so in a sentence — the audit is
enforced by the test suite, not just written down here.

---

## 4. The one free path to real intelligence

Google AI Studio issues a **Gemini API key on a free tier with no payment
card**. That is the only route found that gives REN genuine frontier-model
reasoning at zero cost.

NN's gateway already supports it and accepts the key under
`GOOGLE_API_KEY`, `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` — all three,
because the first version accepted only one and a key pasted into either of
the others did nothing and said nothing.

Free-tier quotas are set by Google and change; they are adequate for one
person's assistant and are not adequate for a product with users.

---

## 5. What REN does today, verified

Not planned — exercised in Chrome against real Firestore and Auth emulators
on 2026-11-20:

| Capability | Evidence |
|---|---|
| Open an application | navigation verified by arrival, not by request |
| Add a record | *"add a task to call the bank"* → a real Firestore document |
| Mark one done | *"mark the bank task as done"* → `done: true` with a timestamp |
| Delete one | soft delete, behind device re-authentication |
| Search records | live query |
| Report state | counts read, never guessed |
| Change appearance | theme applied and read back |

Every write passes an approval gate; every delete passes a biometric gate.
REN reports the resolved record's own title, not the phrase it was given.

**Not built, and not claimed:** conversation, image generation, video
generation, code execution, game engines, browser automation, desktop
control, document ingestion, multilingual voice. Of these, conversation is
one free API key away. The rest need hardware, money, or both.

---

## 6. Honest sequence from here

Ordered by value per unit of what is actually available.

1. **Connect a Gemini key.** Unlocks conversation, reasoning, and model-driven
   use of all seven existing capabilities. Cost: nothing. Time: minutes.
2. **Voice, in the browser.** Web Speech API — free, no server, works on the
   founder's phone. `lib/ren/voice.ts` exists; it needs verification on a
   real device.
3. **Memory on Firestore**, not PostgreSQL + pgvector. NN already has
   Firestore, owner-scoped rules and a record layer. Adding Postgres and
   Redis buys nothing here and costs disk NN does not have.
4. **Image generation via Gemini's image API** — on the same free key.
5. **Free 2.7 GB → something workable** before any local tooling is attempted.
6. **Godot**, if local game work is wanted. It is the only one of the three
   engines that fits.

Deliberately deferred: FastAPI (NN already has a backend — a second one is a
second thing to secure), Tauri and React Native (blocked by Xcode), local
model hosting (blocked by hardware), video generation (blocked by cost).

---

## 7. What this audit refuses to say

- That REN is more capable than GPT-4, Claude or Gemini. No evidence exists
  and none has been gathered.
- That any model is "installed" when nothing is serving it.
- That a documented API is an available one. A documented capability is not
  an API key, a quota, or a paid account.
- That any part of this is finished because it compiles.

The blueprint's own instruction: *"The first task for Claude should be the
audit — not a claim that all 20 acceptance criteria have already been
completed."* None of the 20 are complete. Seven capabilities work and are
verified; the rest are honestly accounted for above.
