# Client Ops Command Center

> Prototype prepared by Ankit Mishra for the Head of Operations & Customer Success application. Synthetic data. Not affiliated with or endorsed by CanadaVisa or Cohen Immigration Law.

**Live demo:** https://client-ops-command-center.vercel.app (no sign-in; nothing you do is stored on a server).

A fast-growing immigration practice does not need more people answering "where is my file?" It needs fewer reasons for clients to ask. This repository is a working prototype of the operating system a Head of Operations & Customer Success would build first: one queue for every client message, a dashboard that ties satisfaction to root causes, a hiring pipeline for the scale-up, and a 90-day plan that puts systems before headcount, with the arithmetic.

## Pages

1. **Triage** (`/triage/`). 300 synthetic email and portal messages across five practice areas (Express Entry, work permits, family sponsorship, citizenship, criminal inadmissibility). Each one is labelled by practice area, intent, root cause, tone, stated deadline and escalation risk, and every label shows the rule and the phrase that produced it. SLA queues (breached, at risk, P1 deadline), owner routing with reassignment, and a suggested reply for a person to approve. A "try a message" box runs the rules live.
2. **CSAT & reviews** (`/csat/`). 26 weeks of synthetic history by practice area: the headline KPI (escalations per 100 open files), CSAT, Google rating and volume, silent files, speed to first contact, missed consultations, and root causes ranked by how much volume each system fix would remove.
3. **Hiring** (`/hiring/`). Scaling from 60 to about 100 staff: headcount plan by team, funnel and live requisitions, time to hire, interviewer load against a weekly limit, and an onboarding checklist that shows who is behind and which steps run themselves.
4. **90 days & business case** (`/plan/`). Baseline (days 1 to 30), build and pilot triage in one practice area (31 to 60), scale to all five (61 to 90), each with a checkpoint. A scorecard with baselines and targets. An editable model: messages avoided × handling time → hours saved → hires deferred, with every assumption labelled.
5. **About** (`/about/`). What is real and what is illustrative, how the data is made, limits, how it would connect to the practice management system, email and the client portal, privacy and privilege.

## Reply drafts and guardrails

Drafts follow three rules: client-facing copy comes only from lawyer-approved templates, there is no automated legal advice, and client data stays in approved systems.

- Each draft is assembled from a template with an id, version and approval date. Nothing is free-written.
- Bracketed facts (the file stage, a date, a fee) must be checked against the case file; sending stays blocked until they are filled.
- The edited draft is checked for advice and outcome-promise phrases ("you will be approved", "guarantee", "in our opinion"). Approval is disabled if one appears.
- A lawyer signs off anything with a legal deadline, an escalation, a closed file or a criminal inadmissibility matter. A client success lead approves routine replies.
- Nothing is ever sent. Approval records the decision in your browser.

## The rules

All in [`app/src/lib/classify.ts`](app/src/lib/classify.ts) and [`app/src/lib/routing.ts`](app/src/lib/routing.ts), and shown on the triage page.

- **Intent and root cause:** first matching rule wins, ordered from most to least severe, so an angry message about fees is an escalation first.
- **Practice area:** the rule with the most matching phrases wins. In a real rollout the matter record decides first and wording is the fallback.
- **Priority:** P1 when the message states a deadline within 14 days; P2 for a complaint, an escalation request, strongly negative tone or a third contact in 30 days; P3 otherwise. First-response targets 4, 24 and 48 hours.
- **Escalation risk (0 to 100):** intent, tone, repeat contacts, a near deadline, and mentions of reviews, refunds or a regulator.
- **Routing:** new enquiries to intake; escalations to the escalations desk; P1 to the practice area's case lead; portal issues to portal support; billing to billing; everything else to the practice area's client success pod.
- **Optional language model:** `POST /api/classify` returns the rules by default. With `LLM_CLASSIFIER=on` and `ANTHROPIC_API_KEY` set, a model labels area, intent and root cause from the same fixed label set; priority stays rule-based, and any failure or out-of-set answer falls back to the rules. It is off on the public demo.

## What is real and what is illustrative

- **Real:** the code, the rules, the calculations, the tests.
- **From public sources:** the five practice areas follow the operating units named in the firm's public job postings, and the complaint themes (unreturned calls and missed consultations, silence after payment, files closed without explanation, details lost in handoffs) follow recurring themes in public reviews. No review text is reproduced.
- **Synthetic:** every message, client name, matter number, staff name, requisition, metric and review. Generated by a seeded script and reproducible byte for byte.
- **Assumptions:** avoidable rates for each fix, handling time, costs and growth. They are labelled on the page and meant to be replaced by the 30-day baseline.

## How it is built

- Next.js 15, React 19, TypeScript. Static pages from committed JSON in `app/data/`, plus one optional API route. No database, no environment variables needed.
- Design: Ankit Mishra's house design language (ink, paper, violet; hairlines; 4px radius). Deliberately not any firm's branding.
- Tests: 23 Node tests covering the classifier, deadlines, SLA, routing, draft guardrails and lawyer sign-off, the business-case model, and data invariants (including that the committed JSON matches the generator exactly). CI runs typecheck, tests and build on every push.
- `noindex` on every page.
- Built with Claude Code, with the author deciding the scope, the rules, every threshold and every sentence.

## Run it locally

```bash
cd app
npm ci
npm run generate    # rewrites app/data/*.json (deterministic)
npm run typecheck
npm test
npm run build && npm start
```

Node 22.18 or later runs the TypeScript generator and tests directly.

## Structure

```
app/src/lib/taxonomy.ts   practice areas, intents, root causes, system fixes, SLA targets
app/src/lib/classify.ts   rules, deadline parsing, sentiment, priority, escalation risk, SLA
app/src/lib/routing.ts    owners, reply templates, template library, approver, guardrails
app/src/lib/generate.ts   synthetic inbox and 26-week history
app/src/lib/hiring.ts     synthetic requisitions, interviewers, onboarding checklist
app/src/lib/metrics.ts    dashboard aggregations, root-cause clusters, rule agreement
app/src/lib/model.ts      business-case model
app/src/app/              pages: /, /triage, /csat, /hiring, /plan, /about, /api/classify
app/tests/                Node tests
```

## Limits

- Keyword rules are transparent but brittle: paraphrase, sarcasm and other languages slip through. Agreement with the generator's own labels shows the rules are coherent, not that they are accurate; real accuracy is measured on hand-labelled real messages in the first 30 days.
- The SLA clock uses elapsed hours, not business hours.
- Every number on every page is synthetic. None describes any real firm.
