/** "Systems before headcount" model: tickets avoided × handling time → hours saved → hires deferred.
 *  Every input is an assumption the reader can change; the defaults are labelled as such on the page. */

export type Lever = { key: string; label: string; share: number; avoidable: number; on: boolean };
export type ModelInputs = {
  weekly_tickets: number; // current inbound messages per week
  growth_multiple: number; // expected volume multiple over the next 12 months
  aht_minutes: number; // average handling time per ticket
  ai_draft_saving: number; // share of handling time saved by an approved AI draft on the tickets that remain
  hours_per_fte_year: number; // productive hours per client success FTE per year
  loaded_cost_per_fte: number; // CAD per year
  build_cost: number; // one-time CAD: tooling, integration time, training
  run_cost_year: number; // CAD per year: licences and model usage
  levers: Lever[];
};

export type ModelOutputs = {
  tickets_avoided_week: number;
  share_avoided: number;
  hours_saved_week_avoided: number;
  hours_saved_week_drafts: number;
  hours_saved_year: number; // at today's volume
  hours_saved_year_grown: number; // at the grown volume
  fte_equivalent: number; // at the grown volume
  hires_deferred: number;
  gross_saving_year: number;
  net_saving_year: number;
  payback_months: number | null;
};

export function runModel(i: ModelInputs): ModelOutputs {
  const avoidedShare = i.levers.filter((l) => l.on).reduce((s, l) => s + l.share * l.avoidable, 0);
  const tickets_avoided_week = i.weekly_tickets * avoidedShare;
  const remaining = i.weekly_tickets - tickets_avoided_week;
  const hours_saved_week_avoided = (tickets_avoided_week * i.aht_minutes) / 60;
  const hours_saved_week_drafts = (remaining * i.aht_minutes * i.ai_draft_saving) / 60;
  const hours_saved_year = (hours_saved_week_avoided + hours_saved_week_drafts) * 52;
  const hours_saved_year_grown = hours_saved_year * i.growth_multiple;
  const fte_equivalent = hours_saved_year_grown / i.hours_per_fte_year;
  const hires_deferred = Math.floor(fte_equivalent);
  const gross_saving_year = hires_deferred * i.loaded_cost_per_fte;
  const net_saving_year = gross_saving_year - i.run_cost_year;
  const payback_months = net_saving_year > 0 ? Math.round((i.build_cost / net_saving_year) * 12 * 10) / 10 : null;
  return { tickets_avoided_week, share_avoided: avoidedShare, hours_saved_week_avoided, hours_saved_week_drafts, hours_saved_year, hours_saved_year_grown, fte_equivalent, hires_deferred, gross_saving_year, net_saving_year, payback_months };
}

/** Default assumptions. Shares come from the synthetic root-cause data; everything else is a stated assumption. */
export const DEFAULT_ASSUMPTIONS = {
  growth_multiple: 1.5,
  aht_minutes: 9,
  ai_draft_saving: 0.25,
  hours_per_fte_year: 1500,
  loaded_cost_per_fte: 72000,
  build_cost: 120000,
  run_cost_year: 30000,
};
