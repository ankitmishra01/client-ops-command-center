import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/lib/classify.ts";
import { ADVICE_PATTERNS, approver, draftReply, guardrails, routeOwner, templateFor, TEMPLATES } from "../src/lib/routing.ts";
import { generateInbox } from "../src/lib/generate.ts";

const inbox = generateInbox();

test("routing: escalations to the desk, P1 to the case lead, enquiries to intake", () => {
  const at = "2026-10-19T13:00:00Z";
  assert.equal(routeOwner(classify({ subject: "", body: "I want to speak to a manager about my citizenship application.", received_at: at })).owner, "Escalations desk");
  assert.equal(routeOwner(classify({ subject: "", body: "My work permit expires in 3 days.", received_at: at })).owner, "Work permit case lead");
  assert.equal(routeOwner(classify({ subject: "", body: "I am interested in Express Entry. Am I eligible?", received_at: at })).owner, "Intake team");
});

test("every generated draft passes the advice guardrail and uses an approved template", () => {
  for (const m of inbox) {
    const c = classify(m); const d = draftReply(m, c);
    for (const p of ADVICE_PATTERNS) assert.ok(!p.test(d), `${m.id} draft matches ${p}`);
    assert.ok(TEMPLATES[templateFor(c)], `${m.id} has no template`);
    assert.ok(d.startsWith(`Dear ${m.client.split(" ")[0]},`));
    assert.ok(guardrails(d, c).every((g) => !g.blocking || g.ok));
  }
});

test("advice phrases block approval", () => {
  const m = inbox[0]; const c = classify(m);
  const g = guardrails(draftReply(m, c) + "\nDon't worry, you will be approved.", c);
  const advice = g.find((x) => x.label.startsWith("No legal advice"))!;
  assert.equal(advice.ok, false); assert.equal(advice.blocking, true);
});

test("lawyer sign-off for deadlines, escalations, closed files and inadmissibility", () => {
  for (const m of inbox) {
    const c = classify(m); const a = approver(c);
    const needs = c.priority === "P1" || c.intent === "escalation" || c.root_cause === "file_closed" || c.area === "INA";
    assert.equal(a.role === "Lawyer", needs, m.id);
  }
});
