/** "Fix, automate or hire": for one workload, how many hours each lever removes at next year's volume, in a fixed
 *  order (remove the work, then make the rest cheaper), and whether a hire is still needed. Pure, so it is tested by hand. */
import { DEFAULT_ASSUMPTIONS } from "./model.ts";

export const LEVERS = ["fix", "ownership", "training", "automation", "tooling"] as const;
export type LeverKey = (typeof LEVERS)[number];
export const LEVER_LABEL: Record<LeverKey, string> = {
  fix: "Process fix",
  ownership: "Clearer ownership",
  training: "Training",
  automation: "Automation",
  tooling: "Better tooling",
};
export const LEVER_HELP: Record<LeverKey, string> = {
  fix: "Share of items that should not exist at all once the process changes (for example, a status update sent before the client asks).",
  ownership: "Share of the remaining time lost to items that bounce between people or are handled twice because nobody owns them.",
  training: "Share of the remaining time spent redoing work that a trained person gets right the first time.",
  automation: "Share of the remaining items a rule or an approved template can complete, with a person approving where needed.",
  tooling: "Share of handling time saved on the items people still do (prefilled fields, templates, one screen instead of three).",
};

export type Workload = {
  key: string; name: string; unit: string; note: string;
  volume_week: number; // items per week today
  minutes: number; // handling minutes per item today
  growth: number; // volume multiple over the next 12 months
  team_fte: number; // full-time people on this work today
  shares: Record<LeverKey, number>; // 0..1 each, applied in LEVERS order
  one_time_cost: number; // CAD to build the fixes, automation and training
  run_cost_year: number; // CAD per year: licences, model usage, upkeep
  volume_from_data?: boolean;
};

export type Costs = { hours_per_fte_year: number; loaded_cost_per_fte: number; recruiting_cost_per_hire: number };
export const DEFAULT_COSTS: Costs = {
  hours_per_fte_year: DEFAULT_ASSUMPTIONS.hours_per_fte_year,
  loaded_cost_per_fte: DEFAULT_ASSUMPTIONS.loaded_cost_per_fte,
  recruiting_cost_per_hire: 9000, // sourcing, interviewer time and onboarding, an assumption
};

export type Recommendation = "Process fix" | "Clearer ownership" | "Training" | "Automation" | "Better tooling" | "New hire" | "No change";
export type Decision = {
  hours_week_today: number; // at today's volume, before any lever
  hours_week_grown: number; // at next year's volume, before any lever
  saved: { key: LeverKey; label: string; hours_week: number; fte: number }[];
  hours_week_after: number; // at next year's volume, after every lever
  fte_need_without: number; fte_need_with: number;
  hires_without: number; hires_with: number; hires_avoided: number;
  spare_fte: number; // people freed for other work when the levers more than cover growth
  cost_year1_hire: number; // hiring to volume with no changes
  cost_year1_levers: number; // the levers, plus any hires still needed
  payback_months: number | null;
  primary: Recommendation; verdict: string;
};

const r2 = (x: number) => Math.round(x * 100) / 100;
/** Whole hires needed to cover a full-time-equivalent gap. Rounded to 0.01 first so 2.0000001 is two people, not three. */
export const hiresFor = (need: number, team: number) => Math.max(0, Math.ceil(r2(need - team)));
/** A lever is worth leading with when it removes at least a quarter of a person's time. */
export const MATERIAL_FTE = 0.25;

export function decide(w: Workload, c: Costs = DEFAULT_COSTS): Decision {
  const fte = (h: number) => (h * 52) / c.hours_per_fte_year;
  const hours_week_today = (w.volume_week * w.minutes) / 60;
  const hours_week_grown = hours_week_today * w.growth;
  let h = hours_week_grown;
  const saved = LEVERS.map((key) => { const s = h * w.shares[key]; h -= s; return { key, label: LEVER_LABEL[key], hours_week: s, fte: fte(s) }; });
  const fte_need_without = fte(hours_week_grown), fte_need_with = fte(h);
  const hires_without = hiresFor(fte_need_without, w.team_fte), hires_with = hiresFor(fte_need_with, w.team_fte);
  const hires_avoided = hires_without - hires_with;
  const spare_fte = Math.max(0, Math.floor(r2(w.team_fte - fte_need_with) * 2) / 2);
  const perHire = c.loaded_cost_per_fte + c.recruiting_cost_per_hire;
  const cost_year1_hire = hires_without * perHire;
  const cost_year1_levers = w.one_time_cost + w.run_cost_year + hires_with * perHire;
  const net_year = hires_avoided * c.loaded_cost_per_fte - w.run_cost_year;
  const payback_months = hires_avoided > 0 && net_year > 0 ? Math.round((w.one_time_cost / net_year) * 12 * 10) / 10 : null;
  const best = [...saved].sort((a, b) => b.hours_week - a.hours_week)[0];
  const material = best.fte >= MATERIAL_FTE;
  let primary: Recommendation, verdict: string;
  if (hires_without === 0) {
    primary = material ? best.label as Recommendation : "No change";
    verdict = material ? `No hire needed for growth. ${best.label} still frees ${best.fte.toFixed(1)} people's time for other work.` : "No hire needed and no lever is worth the effort yet. Revisit when volume changes.";
  } else if (hires_with === 0) {
    primary = best.label as Recommendation;
    verdict = `No hire needed. Lead with ${best.label.toLowerCase()}; together the levers absorb growth that would otherwise take ${hires_without === 1 ? "one hire" : `${hires_without} hires`}.`;
  } else if (hires_avoided > 0) {
    primary = best.label as Recommendation;
    verdict = `${best.label} first, then hire ${hires_with} instead of ${hires_without}.`;
  } else {
    primary = "New hire";
    verdict = `Hire ${hires_with}. The levers remove too little of this work to change the headcount needed${material ? `, though ${best.label.toLowerCase()} is still worth doing` : ""}.`;
  }
  return { hours_week_today, hours_week_grown, saved, hours_week_after: h, fte_need_without, fte_need_with, hires_without, hires_with, hires_avoided, spare_fte, cost_year1_hire, cost_year1_levers, payback_months, primary, verdict };
}

/** Four worked examples. Volumes marked from data come from the last four weeks of the synthetic history; every share and cost is an assumption. */
export function exampleWorkloads(fromData: { status_messages_week: number; new_enquiries_week: number }): Workload[] {
  return [
    { key: "status", name: "Status-update emails", unit: "client messages asking for an update", volume_from_data: true,
      note: "Clients writing in because they have not heard anything. Proactive updates at each matter stage remove most of them; the rest get an approved template.",
      volume_week: Math.round(fromData.status_messages_week), minutes: 9, growth: 1.5, team_fte: 2,
      shares: { fix: 0.6, ownership: 0.05, training: 0, automation: 0.3, tooling: 0.1 }, one_time_cost: 45000, run_cost_year: 12000 },
    { key: "docs", name: "Document chasing", unit: "document requests and follow-ups sent by case managers",
      note: "Case managers asking clients for missing or wrong documents, often more than once. One checklist per matter type and upload checks stop the wrong file arriving; reminders can send themselves.",
      volume_week: 520, minutes: 8, growth: 1.5, team_fte: 2.5,
      shares: { fix: 0.2, ownership: 0.05, training: 0.1, automation: 0.45, tooling: 0.1 }, one_time_cost: 40000, run_cost_year: 8000 },
    { key: "intake", name: "Intake triage", unit: "new enquiries and consultation requests", volume_from_data: true,
      note: "Reading each new enquiry, picking the practice area and urgency, and passing it on. Many bounce between areas today. Rules can label most of them for a person to confirm.",
      volume_week: Math.round(fromData.new_enquiries_week), minutes: 6, growth: 2.2, team_fte: 2.5,
      shares: { fix: 0.1, ownership: 0.15, training: 0.03, automation: 0.3, tooling: 0.1 }, one_time_cost: 35000, run_cost_year: 10000 },
    { key: "review", name: "Pre-submission file review", unit: "applications reviewed by a licensed professional before filing",
      note: "Checking a complete application before it goes to the government. This is professional judgment: it cannot be automated, and a checklist only shortens it a little.",
      volume_week: 130, minutes: 40, growth: 1.5, team_fte: 3,
      shares: { fix: 0, ownership: 0, training: 0.03, automation: 0, tooling: 0.04 }, one_time_cost: 8000, run_cost_year: 0 },
  ];
}
