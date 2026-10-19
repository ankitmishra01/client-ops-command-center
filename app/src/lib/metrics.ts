import type { WeekRow } from "./generate.ts";
import { DEFAULT_ASSUMPTIONS, type ModelInputs } from "./model.ts";
import { classify } from "./classify.ts";
import { AREAS, INTENTS, ROOT_CAUSES, SYSTEM_FIX, type Area, type Message, type RootCause } from "./taxonomy.ts";

export type Totals = { tickets: number; complaints: number; escalations: number; csat_responses: number; csat_satisfied: number; reviews: number; review_stars: number; frh_weighted: number; weeks: number; open_files_sum: number; silent_files_sum: number; new_leads: number; fch_weighted: number; consults_booked: number; consults_missed: number };
const zero = (): Totals => ({ tickets: 0, complaints: 0, escalations: 0, csat_responses: 0, csat_satisfied: 0, reviews: 0, review_stars: 0, frh_weighted: 0, weeks: 0, open_files_sum: 0, silent_files_sum: 0, new_leads: 0, fch_weighted: 0, consults_booked: 0, consults_missed: 0 });
function add(t: Totals, r: WeekRow) {
  t.tickets += r.tickets; t.complaints += r.complaints; t.escalations += r.escalations; t.csat_responses += r.csat_responses;
  t.csat_satisfied += r.csat_satisfied; t.reviews += r.reviews; t.review_stars += r.review_stars; t.frh_weighted += r.first_response_hours * r.tickets;
  t.open_files_sum += r.open_files; t.silent_files_sum += r.silent_files; t.new_leads += r.new_leads; t.fch_weighted += r.first_contact_hours * r.new_leads;
  t.consults_booked += r.consults_booked; t.consults_missed += r.consults_missed_by_firm;
}
export const rates = (t: Totals) => ({
  csat: t.csat_responses ? t.csat_satisfied / t.csat_responses : 0,
  rating: t.reviews ? t.review_stars / t.reviews : 0,
  complaint_rate: t.tickets ? t.complaints / t.tickets : 0,
  escalation_rate: t.tickets ? t.escalations / t.tickets : 0,
  first_response_hours: t.tickets ? t.frh_weighted / t.tickets : 0,
  /** Headline KPI: escalations per 100 open client files, per 4 weeks (weekly rate × 4, so any window compares). */
  escalations_per_100_files: t.open_files_sum ? (t.escalations / t.open_files_sum) * 100 * 4 : 0,
  silent_file_rate: t.open_files_sum ? t.silent_files_sum / t.open_files_sum : 0,
  silent_files: t.weeks ? t.silent_files_sum / t.weeks : 0,
  open_files: t.weeks ? t.open_files_sum / t.weeks : 0,
  first_contact_hours: t.new_leads ? t.fch_weighted / t.new_leads : 0,
  consult_missed_rate: t.consults_booked ? t.consults_missed / t.consults_booked : 0,
});

export function weeks(rows: WeekRow[]) { return [...new Set(rows.map((r) => r.week))].sort(); }

/** Totals per week, for one area or all areas. */
export function series(rows: WeekRow[], area: Area | "ALL") {
  const ws = weeks(rows);
  return ws.map((w) => { const t = zero(); t.weeks = 1; rows.filter((r) => r.week === w && (area === "ALL" || r.area === area)).forEach((r) => add(t, r)); return { week: w, ...t, ...rates(t) }; });
}

export function windowTotals(rows: WeekRow[], area: Area | "ALL", lastN: number, offset = 0) {
  const ws = weeks(rows);
  const keep = new Set(ws.slice(ws.length - lastN - offset, ws.length - offset));
  const t = zero(); t.weeks = keep.size; rows.filter((r) => keep.has(r.week) && (area === "ALL" || r.area === area)).forEach((r) => add(t, r));
  return { ...t, ...rates(t) };
}

/** Root-cause shares over the last N weeks, with the "fix the system" lever and its estimated effect on total volume. */
export function rootCauseClusters(rows: WeekRow[], lastN = 8, area: Area | "ALL" = "ALL") {
  const ws = weeks(rows); const keep = new Set(ws.slice(-lastN));
  const counts = Object.fromEntries(ROOT_CAUSES.map((rc) => [rc, 0])) as Record<RootCause, number>;
  let total = 0;
  for (const r of rows) if (keep.has(r.week) && (area === "ALL" || r.area === area)) for (const rc of ROOT_CAUSES) { counts[rc] += r.by_root[rc]; total += r.by_root[rc]; }
  return ROOT_CAUSES.map((rc) => {
    const share = total ? counts[rc] / total : 0;
    const fix = rc === "none" ? null : SYSTEM_FIX[rc];
    return { root_cause: rc, tickets: counts[rc], share, per_week: counts[rc] / lastN, fix, removable_share: fix ? share * fix.avoidable : 0 };
  }).sort((a, b) => b.tickets - a.tickets);
}

/** How often the deterministic classifier agrees with the generator's labels. On synthetic data this measures
 *  whether the rules are coherent, not real-world accuracy; that needs a hand-labelled sample of real messages. */
export function agreement(msgs: Message[]) {
  let area = 0, intent = 0, root = 0, deadline = 0; let areaKnown = 0;
  const confusion: Record<string, Record<string, number>> = Object.fromEntries(INTENTS.map((i) => [i, Object.fromEntries(INTENTS.map((j) => [j, 0]))]));
  for (const m of msgs) {
    const c = classify(m);
    if (c.area) { areaKnown++; if (c.area === m.truth.area) area++; }
    if (c.intent === m.truth.intent) intent++;
    if (c.root_cause === m.truth.root_cause) root++;
    if ((c.deadline_days == null) === (m.truth.deadline_days == null)) deadline++;
    confusion[m.truth.intent][c.intent]++;
  }
  const n = msgs.length;
  return { n, area: area / Math.max(1, areaKnown), area_coverage: areaKnown / n, intent: intent / n, root_cause: root / n, deadline: deadline / n, confusion };
}

export const AREA_LIST = AREAS;

/** Business-case inputs at their defaults: volume from the last 4 weeks, root-cause shares from the last 8. */
export function defaultModelInputs(rows: WeekRow[]): ModelInputs {
  return {
    weekly_tickets: Math.round(windowTotals(rows, "ALL", 4).tickets / 4),
    ...DEFAULT_ASSUMPTIONS,
    levers: rootCauseClusters(rows, 8).filter((c) => c.fix).map((c) => ({ key: c.root_cause, label: c.fix!.fix, share: Math.round(c.share * 1000) / 1000, avoidable: c.fix!.avoidable, on: true })),
  };
}
