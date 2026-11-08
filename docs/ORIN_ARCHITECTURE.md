# ORIN — Architecture

**Status:** `NOT IMPLEMENTED`. The visual identity and state machine exist
(`OrinWave`, `OrinCommand`); the intelligence does not. Nothing in NN pretends
otherwise.

---

## What ORIN is

The intelligence layer **of** NN, not an application **in** NN. It understands
the founder's authorised context, operates NN's applications through
permission-controlled tools, researches, teaches, plans and executes — and is
honest when it cannot.

The founder's stated benchmark is JARVIS, not a chatbot. The distinction that
matters: a chatbot is a destination; ORIN is present.

## Presence, not a panel

Four forms, one identity, one state machine
(`idle · listening · thinking · speaking`) expressed through the waveform's
amplitude and tempo:

| Form | Where | For |
|---|---|---|
| **Ambient line** | workspace centre | the default — type or speak |
| **Orb** | corner of any application | reachable without leaving your work |
| **Floating pane** | over the workspace | a conversation that does not take the room |
| **Full workspace** | its own surface | research with sources, document analysis, long tasks |

**Agent transparency is part of the design.** During a multi-step task the
founder sees the plan, the tool in use, progress, and any approval request —
as a compact timeline inside the pane. ORIN never reports success it has not
verified.

## Intelligence architecture

Provider-independent by construction: OpenAI, Anthropic, Google and
open-weight models behind one gateway, routed on quality, cost, latency and
privacy. Never hardcode a vendor. Never call every provider for every message.
Cross-model review only where the cost is justified.

**Planned skills**, each with its own instructions, tools, knowledge, tests
and permissions, selected automatically: software-engineer ·
business-strategist · financial-analyst · research-specialist · teacher ·
mathematician · designer · writer · content-creator · project-manager ·
data-analyst · personal-assistant · security-analyst · automation-specialist ·
travel-planner.

Memory in Firestore with embedding retrieval; RAG over authorised documents;
voice via speech recognition and synthesis; vision through multimodal models;
durable background workflows.

## Limits that are code, not prompt

Implemented in `@nn/security`, tested:

- unknown, revoked and expired grants **all fail closed**
- routine authorised work runs without re-asking — re-confirming approved work
  is friction, not safety
- **a sensitive action escalates even under a broad grant.** A wide `modify`
  permission can never become a licence to send email
- thirteen actions always stop and ask, and the list is a floor configuration
  cannot lower
- an automation cannot chain around an approval gate
- ORIN may never change a security setting itself

Execution cycle: `LISTEN → UNDERSTAND → PLAN → CHECK PERMISSIONS →
CONFIRM IF REQUIRED → EXECUTE → VERIFY → REPORT`.

## Honesty requirements

Say "I don't know." Never invent a source, a result or a completed action.
Never claim a device or account was reached without authorisation. Never claim
supernatural knowledge or speak for God. Distinguish verified fact from
estimate, hypothesis, opinion and prediction.

## Built today

`OrinWave` — a deterministic double-hump envelope across 29 nested curves,
amplitude and tempo driven by real state, identical on server and client.
`OrinCommand` — controlled, performs no speech, makes no network call, and
says plainly that nothing is wired.

## Not built

The gateway, routing, skills, memory, RAG, tools, voice, vision, background
work, proactive assistance, evaluations. Phase 6 onward — and blocked on an
AI provider credential, which the founder has not yet supplied.
