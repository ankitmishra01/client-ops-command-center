import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { generateInbox, generateWeekly } from "../src/lib/generate.ts";
import { generateHiring, HEADCOUNT, TEAMS } from "../src/lib/hiring.ts";
import { agreement, rootCauseClusters, windowTotals } from "../src/lib/metrics.ts";
import { AREAS, INBOX_NOW } from "../src/lib/taxonomy.ts";

const data = (f: string) => readFileSync(path.join(import.meta.dirname, "..", "data", f), "utf8");

test("committed data is exactly what the generator produces (deterministic)", () => {
  assert.equal(data("inbox.json"), JSON.stringify(generateInbox(), null, 1) + "\n");
  assert.equal(data("weekly.json"), JSON.stringify(generateWeekly(), null, 1) + "\n");
  assert.equal(data("hiring.json"), JSON.stringify(generateHiring(), null, 1) + "\n");
});

test("inbox: 300 messages, all five areas, both channels, received before the fixed clock, unique ids", () => {
  const inbox = generateInbox();
  assert.equal(inbox.length, 300);
  for (const a of AREAS) assert.ok(inbox.some((m) => m.truth.area === a), a);
  assert.ok(inbox.some((m) => m.channel === "email") && inbox.some((m) => m.channel === "portal"));
  assert.ok(inbox.every((m) => m.received_at < INBOX_NOW));
  assert.equal(new Set(inbox.map((m) => m.id)).size, 300);
  assert.ok(inbox.every((m) => !/@|\d{3}[- ]\d{3}[- ]\d{4}/.test(m.body)), "no emails or phone numbers in synthetic text");
});

test("rules agree with the generator labels well enough to be coherent", () => {
  const a = agreement(generateInbox());
  assert.ok(a.intent > 0.9, `intent ${a.intent}`); assert.ok(a.root_cause > 0.85, `root ${a.root_cause}`);
});

test("weekly: 26 weeks × 5 areas; volume grows about 5x; headline KPI worsens before the fixes", () => {
  const w = generateWeekly();
  assert.equal(w.length, 130);
  const first = windowTotals(w, "ALL", 4, 22), last = windowTotals(w, "ALL", 4);
  const growth = last.tickets / first.tickets;
  assert.ok(growth > 3.5 && growth < 6, `growth ${growth}`);
  assert.ok(last.escalations_per_100_files > first.escalations_per_100_files);
  assert.ok(w.every((r) => r.silent_files <= r.open_files && r.csat_satisfied <= r.csat_responses && r.consults_missed_by_firm <= r.consults_booked));
  const shares = rootCauseClusters(w).reduce((s, c) => s + c.share, 0);
  assert.ok(Math.abs(shares - 1) < 1e-9);
});

test("hiring: headcount plan goes from 60 to about 100; funnels never widen", () => {
  assert.equal(TEAMS.reduce((s, t) => s + HEADCOUNT[t].now, 0), 60);
  const target = TEAMS.reduce((s, t) => s + HEADCOUNT[t].target, 0);
  assert.ok(target >= 95 && target <= 110);
  for (const r of generateHiring().reqs) for (let i = 1; i < r.funnel.length; i++) assert.ok(r.funnel[i] <= r.funnel[i - 1], r.id);
});
