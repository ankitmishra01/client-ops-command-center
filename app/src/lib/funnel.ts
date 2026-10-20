/** High-volume case-manager hiring: stage conversion from the live requisition, a reverse plan (hires → applicants needed),
 *  stage timing and the ramp to a full caseload. Conversions come from the synthetic data; days and ramp are assumptions. */
import { INTERVIEW_HOURS, STAGES } from "./hiring.ts";

/** What happens at each stage of the case-manager funnel, in the order of STAGES. */
export const CM_STAGE_NOTE: string[] = [
  "Careers page, job boards and referrals. Every posting shows the pay band.",
  "Knock-out questions (work authorisation, French for bilingual roles) and a short form, scored before a person reads a CV.",
  "45-minute structured video interview, self-scheduled against the panel's calendars.",
  "Recorded work sample: write a client status update from a file summary and spot what is missing from a document list.",
  "Panel debrief within two business days, references, offer at the band.",
  "Accepted offer creates the employee record and starts onboarding.",
];

/** Days spent reaching each stage from the one before (index 0 unused). Today: roughly the 39-day median for case
 *  management hires. Target: what a structured process with self-scheduling and a 48-hour debrief should hold. */
export const CM_DAYS = { today: [0, 7, 10, 9, 8, 5], target: [0, 4, 6, 6, 5, 3] };
export const NOTICE_DAYS = 14; // typical notice before a start date, an assumption

/** Share of a full caseload carried in each of the first 13 weeks (90 days), an assumption tied to the onboarding
 *  checklist: training and shadowing, a supervised queue from week 3, a full caseload from week 11. */
export const RAMP = [0, 0, 0.25, 0.25, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1, 1];

/** Conversion from each stage to the next: funnel[i] / funnel[i - 1]. Index 0 is 1. */
export function conversions(funnel: number[]) {
  return funnel.map((n, i) => (i === 0 ? 1 : n / Math.max(1, funnel[i - 1])));
}

/** Working backwards from hires: how many people each stage needs, rounding up at every step. */
export function reversePlan(hires: number, conv: number[]): number[] {
  const need = new Array(conv.length).fill(0);
  need[conv.length - 1] = hires;
  for (let i = conv.length - 1; i > 0; i--) need[i - 1] = Math.ceil(need[i] / conv[i]);
  return need;
}

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
/** Weeks until the first week at a full caseload (1-based). */
export const weeksToFull = (ramp = RAMP) => ramp.findIndex((x) => x >= 1) + 1;
/** Average share of a full caseload over the first 90 days. */
export const firstNinetyDays = (ramp = RAMP) => sum(ramp) / ramp.length;

/** The case-manager plan used on the hiring page: live funnel with the firm-wide offer acceptance rate swapped in at
 *  the last stage, because the requisition's own accepted count only shows offers closed so far. */
export function caseManagerPlan(funnel: number[], acceptance: number, hires: number) {
  const conv = conversions(funnel);
  conv[conv.length - 1] = acceptance;
  const need = reversePlan(hires, conv);
  const interviewer_hours = need[2] * INTERVIEW_HOURS.first + need[3] * INTERVIEW_HOURS.case;
  const days_today = sum(CM_DAYS.today), days_target = sum(CM_DAYS.target);
  const ramp_days = (weeksToFull() - 1) * 7;
  return {
    stages: STAGES.map((s, i) => ({ stage: s, live: funnel[i], conv: conv[i], need: need[i], days_today: CM_DAYS.today[i], days_target: CM_DAYS.target[i], note: CM_STAGE_NOTE[i] })),
    applicants_per_hire: need[0] / hires, interviewer_hours, interviewer_hours_per_hire: interviewer_hours / hires,
    days_today, days_target, ramp_days,
    to_full_today: days_today + NOTICE_DAYS + ramp_days, to_full_target: days_target + NOTICE_DAYS + ramp_days,
  };
}
