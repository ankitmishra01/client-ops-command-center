import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, DEFAULT_COSTS, exampleWorkloads, hiresFor, LEVERS, type Workload } from "../src/lib/decide.ts";
import { caseManagerPlan, conversions, firstNinetyDays, reversePlan, weeksToFull } from "../src/lib/funnel.ts";
import { HEADCOUNT, generateHiring } from "../src/lib/hiring.ts";
import { bands, compaRatio, FAMILIES, MAX_POSTED_RANGE, progression } from "../src/lib/peopleops.ts";

const costs = { hours_per_fte_year: 1560, loaded_cost_per_fte: 70000, recruiting_cost_per_hire: 10000 };
const none = { fix: 0, ownership: 0, training: 0, automation: 0, tooling: 0 };
const base: Workload = { key: "t", name: "Test", unit: "items", note: "", volume_week: 600, minutes: 6, growth: 2, team_fte: 1, shares: { ...none }, one_time_cost: 35000, run_cost_year: 0 };

test("decision tool: hours and people, by hand", () => {
  const d = decide(base, costs);
  assert.equal(d.hours_week_today, 60); // 600 × 6 min
  assert.equal(d.hours_week_grown, 120); // × 2
  assert.equal(d.fte_need_without, 4); // 120 h × 52 ÷ 1560
  assert.equal(d.hires_without, 3); assert.equal(d.hires_with, 3);
  assert.equal(d.primary, "New hire");
  assert.equal(d.cost_year1_hire, 3 * 80000);
});

test("decision tool: levers apply in order, each to what the one before left", () => {
  const d = decide({ ...base, shares: { ...none, fix: 0.5, automation: 0.5 } }, costs);
  assert.equal(d.saved.find((s) => s.key === "fix")!.hours_week, 60); // half of 120
  assert.equal(d.saved.find((s) => s.key === "automation")!.hours_week, 30); // half of the 60 left
  assert.equal(d.hours_week_after, 30);
  assert.equal(d.fte_need_with, 1);
  assert.equal(d.hires_with, 0); assert.equal(d.hires_avoided, 3);
  assert.equal(d.primary, "Process fix");
  assert.equal(d.payback_months, 2); // 35,000 ÷ (3 × 70,000) × 12
  assert.deepEqual(d.saved.map((s) => s.key), [...LEVERS]);
});

test("decision tool: partial hires round up, but floating-point noise does not add a person", () => {
  assert.equal(hiresFor(2.0000001, 0), 2);
  assert.equal(hiresFor(2.3, 1), 2);
  assert.equal(hiresFor(0.8, 1), 0);
});

test("decision tool: mixed answer, and no hire when growth is covered", () => {
  const mixed = decide({ ...base, shares: { ...none, automation: 0.5 } }, costs); // 4 FTE → 2 FTE needed
  assert.equal(mixed.hires_without, 3); assert.equal(mixed.hires_with, 1);
  assert.match(mixed.verdict, /^Automation first, then hire 1 instead of 3/);
  const small = decide({ ...base, growth: 1, team_fte: 3 }, costs);
  assert.equal(small.hires_without, 0); assert.equal(small.primary, "No change");
});

test("the four worked examples give four different kinds of answer", () => {
  const ex = exampleWorkloads({ status_messages_week: 318, new_enquiries_week: 726 }).map((w) => decide(w, DEFAULT_COSTS));
  assert.deepEqual(ex.map((d) => d.primary), ["Process fix", "Automation", "Automation", "New hire"]);
  assert.equal(ex[0].hires_with, 0); assert.equal(ex[1].hires_with, 0);
  assert.ok(ex[2].hires_with > 0 && ex[2].hires_with < ex[2].hires_without, "intake: fix first, then hire fewer");
  assert.equal(ex[3].hires_with, ex[3].hires_without);
  for (const w of exampleWorkloads({ status_messages_week: 318, new_enquiries_week: 726 })) assert.ok((w.volume_week * w.minutes) / 60 / (DEFAULT_COSTS.hours_per_fte_year / 52) <= w.team_fte + 0.05, `${w.name}: today's team covers today's work`);
});

test("funnel: conversions and the reverse plan round up at every stage", () => {
  assert.deepEqual(conversions([100, 25, 10]), [1, 0.25, 0.4]);
  assert.deepEqual(reversePlan(4, [1, 0.25, 0.4, 0.5, 0.8]), [100, 25, 10, 5, 4]);
  assert.deepEqual(reversePlan(3, [1, 0.5, 0.8]), [8, 4, 3]);
});

test("ramp: full caseload from week 11; about 58% of a caseload over the first 90 days", () => {
  assert.equal(weeksToFull(), 11);
  assert.equal(Math.round(firstNinetyDays() * 1000) / 1000, 0.577);
});

test("case-manager plan uses the live requisition and the firm-wide acceptance rate", () => {
  const h = generateHiring();
  const cm = h.reqs.find((r) => r.title === "Case manager")!;
  const p = caseManagerPlan(cm.funnel, h.offers_120d.accepted / h.offers_120d.made, 4);
  assert.equal(p.stages[0].live, cm.funnel[0]);
  assert.equal(p.stages[5].need, 4);
  assert.ok(p.stages.every((s, i) => i === 0 || s.need <= p.stages[i - 1].need), "each stage needs no more than the one before");
  assert.ok(p.days_target < p.days_today && p.days_target <= cm.target_days, "target process fits the requisition's target days");
  const cmHires = h.hires.filter((x) => x.team === "Case management").map((x) => x.days_to_hire).sort((a, b) => a - b);
  assert.equal(p.days_today, cmHires[Math.floor(cmHires.length / 2)], "today's stage days add up to the median case-management hire");
  assert.ok(HEADCOUNT["Case management"].target - HEADCOUNT["Case management"].now >= 4);
});

test("pay bands: ordered, overlapping, at least 10% between levels, and postable in Ontario", () => {
  for (const f of FAMILIES) {
    const b = bands(f);
    for (const x of b) { assert.ok(x.min < x.mid && x.mid < x.max); assert.ok(x.max - x.min <= MAX_POSTED_RANGE, `${f.family} range too wide`); }
    for (let i = 1; i < b.length; i++) assert.ok(b[i].min < b[i - 1].max, `${f.family}: level ${i + 1} should overlap the level below`);
    for (const p of progression(f)) assert.ok(p >= 0.1 && p <= 0.4, `${f.family}: step ${p}`);
  }
  assert.equal(compaRatio(54000, 60000), 0.9);
});
