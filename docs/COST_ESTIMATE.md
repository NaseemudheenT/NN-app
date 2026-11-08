# NN APP — Firebase Cost Estimate

**Status:** research only · prepared 2026-11-08 · **no billing enabled, no paid
resource created, no billing account attached.**
**Prices verified** against Google's published pages on 2026-11-08. Pricing
changes; re-verify before any billing decision.

---

## 1. The decision in one paragraph

NN **cannot run on the free Spark plan.** Cloud Functions, Cloud Storage and
App Hosting — all three required — are *not available at all* on Spark. Moving
to Blaze (pay-as-you-go) is therefore unavoidable, and it needs a card on file.
The good news: Blaze keeps every free allowance and only charges beyond it, and
for one user NN sits almost entirely inside those allowances. **My estimate is
US$0–3 per month in year one**, rising slowly as files accumulate. The real
risk is not normal usage — it is a software defect causing a runaway loop, so
the controls in §6 matter more than the arithmetic.

---

## 2. What Spark does not allow

| Product | Spark | NN needs it for |
|---|---|---|
| **Cloud Functions** | ❌ unavailable | ORIN orchestration, protected AI calls, scheduled jobs, notifications, backups, webhooks |
| **Cloud Storage** | ❌ unavailable | every PDF, photo, video, document and backup |
| **App Hosting** | ❌ unavailable | serving the Next.js application |
| Phone verification | ❌ unavailable | not required by NN |
| Firebase AI Logic | ❌ unavailable | optional; ORIN is provider-independent |

Available on Spark: Firestore, Authentication, Cloud Messaging, Firebase
Hosting (static only), Emulator Suite.

> **This means all local development can stay on Spark** using the Emulator
> Suite at zero cost. Blaze is only needed to *deploy*.

---

## 3. Published prices

### Free allowances retained on Blaze

| Resource | Free every month |
|---|---|
| Firestore reads | 50,000 / day (≈1.5 M / month) |
| Firestore writes | 20,000 / day (≈600 K / month) |
| Firestore deletes | 20,000 / day |
| Firestore storage | 1 GiB |
| Firestore egress | 10 GiB / month |
| Cloud Storage stored | 5 GB |
| Cloud Storage downloads | 1 GB / day |
| Cloud Storage upload ops | 20,000 / day |
| Cloud Storage download ops | 50,000 / day |
| Function invocations | 2,000,000 / month |
| Function GB-seconds | 400,000 / month |
| Function CPU-seconds | 200,000 / month |
| Function egress | 5 GB / month |
| App Hosting storage | 5 GB |
| App Hosting bandwidth | 10 GiB / month uncached |
| Authentication | 50,000 monthly active users |
| Cloud Messaging | unlimited, no cost |
| Cloud Scheduler | 3 jobs per **billing account** |
| Cloud Tasks | 1,000,000 operations / month |

### Prices beyond the free allowance

| Resource | Price |
|---|---|
| Firestore reads | $0.03 per 100,000 |
| Firestore writes | $0.09 per 100,000 |
| Firestore deletes | $0.01 per 100,000 |
| Firestore storage | $0.000205479 per GiB-hour ≈ **$0.15 per GiB-month** |
| Cloud Storage stored | $0.026 per GB-month |
| Cloud Storage download | $0.12 per GB |
| Cloud Storage upload ops | $0.05 per 10,000 |
| Cloud Storage download ops | $0.004 per 10,000 |
| Function invocations | $0.40 per million |
| Function egress | $0.12 per GB |
| App Hosting storage | $0.10 per GB |
| App Hosting bandwidth | $0.20 per GiB uncached · $0.15 per GiB cached |
| Firebase Hosting storage | $0.026 per GB |
| Firebase Hosting transfer | $0.15 per GB |
| Cloud Scheduler | $0.10 per job per 31 days |
| Cloud Tasks | $0.40 per million operations |

---

## 4. Expected usage — one person, heavy daily use

Assumptions: NN opened ~15 times a day across phone and laptop; a dashboard
load reads ~150 documents; ~1,500 writes a day across notes, tasks, events,
logs and audit records; ORIN used ~40 times a day once connected; 2 GB of
college PDFs, photos and documents uploaded a month.

| Resource | Estimated month | Free allowance | Billable |
|---|---|---|---|
| Firestore reads | ~70,000 / month | 1,500,000 | **$0** |
| Firestore writes | ~45,000 / month | 600,000 | **$0** |
| Firestore storage | ~0.2 GiB year one | 1 GiB | **$0** |
| Cloud Storage stored | ~24 GB after year one | 5 GB | ~19 GB × $0.026 = **$0.49** |
| Cloud Storage downloads | ~8 GB / month | 30 GB | **$0** |
| Function invocations | ~60,000 / month | 2,000,000 | **$0** |
| Function GB-seconds | ~45,000 | 400,000 | **$0** |
| App Hosting bandwidth | ~4 GiB / month | 10 GiB | **$0** |
| Cloud Scheduler | 6 jobs wanted | 3 free | 3 × $0.10 = **$0.30** |
| Cloud Tasks | ~30,000 ops | 1,000,000 | **$0** |
| **Total** | | | **≈ $0.80 / month** |

**Month 1–6: effectively $0.** **Year 1 average: under $1/month.**
**Year 3, with ~100 GB of files: roughly $2.50–3.00/month.**

Firestore is free at this scale by a very wide margin. Storage is the only line
that grows, and it grows slowly and predictably.

### Not Firebase — budget for this separately

AI provider usage is the largest real cost and is billed by Anthropic, OpenAI
or Google, not Firebase. As a rough order of magnitude, 40 ORIN conversations a
day on a mid-tier model is commonly in the **$5–25/month** range depending on
model and context length. This cannot be estimated properly until you choose a
provider. ORIN will track and display its own usage and cost.

---

## 5. How this could unexpectedly cost real money

Ranked by how likely they are to actually happen.

| Risk | Mechanism | Potential |
|---|---|---|
| **Recursive Function** | A Cloud Function triggered by a Firestore write that writes to the same collection re-triggers itself, forever | the classic Firebase bill shock — hundreds of dollars overnight |
| **Client read loop** | A React effect with a bad dependency re-subscribing to a collection every render | millions of reads in hours |
| **Unbounded query** | A listener on a whole collection with no `limit()` as data grows | reads scale with the collection, silently |
| **Retry storm** | A failing scheduled job retrying without a cap | invocations and egress multiply |
| **Large media** | Video upload with no size cap | storage and download charges climb |
| **Scheduler creep** | One Cloud Scheduler job per automation | $0.10 each, per month, forever |
| **AI runaway** | An agent loop calling the model repeatedly | provider cost, not Firebase — and uncapped by default |

---

## 6. Controls I will build before Blaze is enabled

**Billing alerts** — Google Cloud budget on each project with email alerts at
**$5, $10, $25 and $50**, plus a forecast alert. Alerts notify; they do not cap.

**Hard stop (documented, your decision)** — a Pub/Sub budget trigger can
disable billing automatically at a threshold. It is the only true cap, and it
takes NN offline when it fires. I recommend configuring it at a high threshold
(e.g. $50) as a last resort.

**In code, non-negotiable:**
- every Cloud Function declares `maxInstances` and a timeout
- any Firestore-triggered function carries a recursion guard and never writes to its own trigger path
- every query has `limit()`; no unbounded collection listeners
- Firestore offline persistence on, so repeat reads are served locally
- summary/aggregate documents instead of collection scans for dashboards
- **one** Cloud Scheduler dispatcher job that fans out internally — keeps NN inside the 3 free jobs permanently
- Cloud Storage: per-file size cap, allow-list of MIME types, lifecycle rules on trash
- ORIN: per-day token budget and a hard monthly ceiling, enforced server-side
- all development on the Emulator Suite — **zero cloud cost during development**

**Cost visibility** — NN Control Room shows real spend pulled from billing, not
an estimate.

---

## 7. Recommendation

Enable Blaze on **`nn-os-dev` only**, with a $5 budget alert, when Phase 2
needs Cloud Functions. Keep `nn-os-prod` on Spark until there is something to
deploy. Real expected cost for the whole of Phase 2: **$0**.

Enable Blaze on `nn-os-prod` only at first deployment, with the full alert
ladder in place beforehand.

**I will not enable billing, attach a billing account or create any paid
resource until you say so explicitly, per project.**

---

## Sources

- [Firebase Pricing](https://firebase.google.com/pricing)
- [Firestore pricing](https://cloud.google.com/firestore/pricing)
- [Cloud Scheduler pricing](https://cloud.google.com/scheduler/pricing)
- [Cloud Tasks pricing](https://cloud.google.com/tasks/pricing)
