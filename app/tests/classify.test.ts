import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, extractDeadline, priorityOf, slaStatus } from "../src/lib/classify.ts";

const at = "2026-10-19T13:00:00Z";
const c = (body: string, prior = 0) => classify({ subject: "", body, received_at: at, prior_contacts_30d: prior });

test("a procedural fairness letter with a 6-day deadline is P1 family sponsorship", () => {
  const r = c("IRCC sent a procedural fairness letter on my spousal sponsorship and we must respond within 6 days.");
  assert.equal(r.area, "FAM"); assert.equal(r.deadline_days, 6); assert.equal(r.priority, "P1");
});

test("a deadline 20 days out is not P1", () => {
  const r = c("My work permit expires in 20 days, can you confirm the extension status?");
  assert.equal(r.area, "WP"); assert.equal(r.deadline_days, 20); assert.notEqual(r.priority, "P1");
});

test("absolute dates are converted to days from receipt", () => {
  assert.equal(extractDeadline("My permit expires on October 28.", new Date(at)).days, 9);
  assert.equal(extractDeadline("Nothing urgent here.", new Date(at)).days, null);
});

test("severity ordering: an angry fee message is an escalation, not a billing question", () => {
  const r = c("I want a refund. I was charged twice and nobody explains the fees. I will leave a Google review.");
  assert.equal(r.intent, "escalation"); assert.equal(r.root_cause, "fee_billing"); assert.equal(r.priority, "P2");
  assert.ok(r.escalation_risk >= 60, `risk ${r.escalation_risk}`);
});

test("review themes map to their root causes", () => {
  assert.equal(c("I got an email that you are closing my file without any explanation.").root_cause, "file_closed");
  assert.equal(c("I booked a consultation and nobody answered the phone. No call back either.").root_cause, "callback");
  assert.equal(c("My consultant changed and the new person asked me to explain everything again.").root_cause, "handoff");
  assert.equal(c("We paid in July and have heard nothing since. What is the status?").root_cause, "status_silence");
});

test("criminal inadmissibility wording is recognised", () => {
  assert.equal(c("Question about my criminal rehabilitation application for an old DUI.").area, "INA");
});

test("new enquiries and praise carry no root cause", () => {
  assert.equal(c("Hello, I am interested in Express Entry. Am I eligible, and how much would you charge?").intent, "new_enquiry");
  assert.equal(c("Hello, I am interested in Express Entry. Am I eligible?").root_cause, "none");
  const p = c("We got it! Approved this morning. Thank you so much.");
  assert.equal(p.intent, "praise"); assert.equal(p.sentiment, "positive"); assert.equal(p.root_cause, "none");
});

test("every label carries evidence", () => {
  const r = c("Any update on my citizenship application? Still waiting.");
  assert.equal(r.evidence.length, 5);
  assert.ok(r.evidence.find((e) => e.field === "Intent")!.matches.length > 0);
});

test("priority rule: a third contact in 30 days is P2 even when polite", () => {
  assert.equal(priorityOf("status_request", null, 0, 3), "P2");
  assert.equal(priorityOf("status_request", null, 0, 1), "P3");
});

test("SLA states: ok, at risk under a quarter left, breached", () => {
  assert.equal(slaStatus("P1", "2026-10-19T12:00:00Z", at).state, "ok");
  assert.equal(slaStatus("P1", "2026-10-19T09:30:00Z", at).state, "at_risk");
  assert.equal(slaStatus("P1", "2026-10-19T08:00:00Z", at).state, "breached");
  assert.equal(slaStatus("P3", "2026-10-18T13:00:00Z", at).hours_left, 24);
});

test("a past date is history, not a deadline", () => {
  assert.equal(extractDeadline("We paid in full on October 7 and have heard nothing.", new Date(at)).days, null);
});

test("the worked example: paid, 12 days of silence, one-star review → escalation, lawyer sign-off, SLA at risk", async () => {
  const { FEATURED } = await import("../src/lib/generate.ts");
  const { approver, routeOwner } = await import("../src/lib/routing.ts");
  const r = classify(FEATURED);
  assert.equal(r.area, "FAM"); assert.equal(r.intent, "escalation"); assert.equal(r.root_cause, "status_silence");
  assert.equal(r.priority, "P2"); assert.equal(slaStatus(r.priority, FEATURED.received_at, at).state, "at_risk");
  assert.equal(routeOwner(r).owner, "Escalations desk"); assert.equal(approver(r).role, "Lawyer");
});
