import { test } from "node:test";
import assert from "node:assert/strict";
import { runModel, DEFAULT_ASSUMPTIONS, type ModelInputs } from "../src/lib/model.ts";

const base: ModelInputs = { weekly_tickets: 1000, ...DEFAULT_ASSUMPTIONS, growth_multiple: 1, aht_minutes: 12, ai_draft_saving: 0, hours_per_fte_year: 1560, loaded_cost_per_fte: 70000, build_cost: 70000, run_cost_year: 0,
  levers: [{ key: "a", label: "A", share: 0.3, avoidable: 0.5, on: true }, { key: "b", label: "B", share: 0.2, avoidable: 0.5, on: false }] };

test("messages avoided × handling time → hours → hires deferred, by hand", () => {
  const o = runModel(base);
  assert.equal(o.tickets_avoided_week, 150); // 1000 × 0.3 × 0.5
  assert.equal(o.hours_saved_week_avoided, 30); // 150 × 12 min
  assert.equal(o.hours_saved_year, 1560);
  assert.equal(o.fte_equivalent, 1); assert.equal(o.hires_deferred, 1);
  assert.equal(o.gross_saving_year, 70000); assert.equal(o.payback_months, 12);
});

test("AI draft saving applies only to the messages that remain", () => {
  const o = runModel({ ...base, ai_draft_saving: 0.25 });
  assert.equal(o.hours_saved_week_drafts, (850 * 12 * 0.25) / 60);
});

test("growth scales hours; partial hires round down; no payback when run cost exceeds saving", () => {
  assert.equal(runModel({ ...base, growth_multiple: 1.9 }).hires_deferred, 1);
  assert.equal(runModel({ ...base, run_cost_year: 80000 }).payback_months, null);
  assert.equal(runModel({ ...base, levers: base.levers.map((l) => ({ ...l, on: false })) }).tickets_avoided_week, 0);
});

test("hiring plan and business case agree: client success roles not hired = hires deferred at defaults", async () => {
  const { generateWeekly } = await import("../src/lib/generate.ts");
  const { defaultModelInputs } = await import("../src/lib/metrics.ts");
  const { HEADCOUNT } = await import("../src/lib/hiring.ts");
  const cs = HEADCOUNT["Client success"];
  assert.equal(cs.target_without_systems! - cs.target, runModel(defaultModelInputs(generateWeekly())).hires_deferred);
});
