import { intBetween, mulberry32 } from "./rng.ts";

/** Synthetic people-ops data for a firm scaling from 60 to about 100 staff in six months. Teams, roles and
 *  interviewers are invented; first names are fictional staff, not real employees. */

export const TEAMS = ["Legal", "Case processing", "Client success", "Intake", "Operations & people", "Technology & AI"] as const;
export type Team = (typeof TEAMS)[number];

/** Headcount today and at the end of the plan. Client success shows both plans: hiring to volume, and hiring after the systems work. */
export const HEADCOUNT: Record<Team, { now: number; target: number; target_without_systems?: number }> = {
  Legal: { now: 14, target: 22 },
  "Case processing": { now: 18, target: 30 },
  "Client success": { now: 10, target: 15, target_without_systems: 19 }, // the gap equals hires deferred in the business case at default assumptions (tested)
  Intake: { now: 8, target: 14 },
  "Operations & people": { now: 5, target: 8 },
  "Technology & AI": { now: 5, target: 9 },
};

export const STAGES = ["Applied", "Screened", "First interview", "Case or skills exercise", "Offer", "Accepted"] as const;
export type Stage = (typeof STAGES)[number];

export type Req = { id: string; title: string; team: Team; openings: number; days_open: number; manager: string; interviewers: string[]; funnel: number[]; target_days: number };

const ROLES: { title: string; team: Team; openings: number; volume: number; pass: number[]; manager: string; interviewers: string[]; target_days: number }[] = [
  { title: "Immigration lawyer", team: "Legal", openings: 3, volume: 70, pass: [0.35, 0.45, 0.55, 0.5, 0.85], manager: "Managing lawyer", interviewers: ["Nadia (Senior lawyer)", "Omar (Senior lawyer)"], target_days: 45 },
  { title: "Regulated immigration consultant (RCIC)", team: "Legal", openings: 5, volume: 140, pass: [0.3, 0.45, 0.55, 0.55, 0.85], manager: "Managing lawyer", interviewers: ["Nadia (Senior lawyer)", "Grace (Senior RCIC)"], target_days: 40 },
  { title: "Case processing associate", team: "Case processing", openings: 8, volume: 420, pass: [0.25, 0.4, 0.6, 0.6, 0.9], manager: "Case processing manager", interviewers: ["Ravi (Senior case processor)", "Grace (Senior RCIC)", "Ines (Case processing manager)"], target_days: 28 },
  { title: "Senior case processor", team: "Case processing", openings: 2, volume: 90, pass: [0.3, 0.45, 0.55, 0.55, 0.85], manager: "Case processing manager", interviewers: ["Ines (Case processing manager)", "Ravi (Senior case processor)"], target_days: 35 },
  { title: "Client success specialist", team: "Client success", openings: 4, volume: 310, pass: [0.25, 0.4, 0.6, 0.6, 0.9], manager: "Head of Operations & Customer Success", interviewers: ["Chloe (CS team lead)", "Marcus (CS team lead)"], target_days: 25 },
  { title: "Client success team lead", team: "Client success", openings: 1, volume: 85, pass: [0.3, 0.4, 0.5, 0.5, 0.85], manager: "Head of Operations & Customer Success", interviewers: ["Chloe (CS team lead)", "Ines (Case processing manager)"], target_days: 35 },
  { title: "Intake consultant", team: "Intake", openings: 4, volume: 260, pass: [0.28, 0.42, 0.6, 0.6, 0.88], manager: "Intake manager", interviewers: ["Sami (Intake manager)", "Marcus (CS team lead)"], target_days: 25 },
  { title: "Bilingual intake consultant (FR/EN)", team: "Intake", openings: 2, volume: 75, pass: [0.3, 0.45, 0.6, 0.55, 0.85], manager: "Intake manager", interviewers: ["Sami (Intake manager)", "Elise (Bilingual intake lead)"], target_days: 35 },
  { title: "People operations generalist", team: "Operations & people", openings: 1, volume: 160, pass: [0.2, 0.4, 0.5, 0.5, 0.85], manager: "Head of Operations & Customer Success", interviewers: ["Tara (Recruiting coordinator)", "Ines (Case processing manager)"], target_days: 35 },
  { title: "Recruiting coordinator", team: "Operations & people", openings: 1, volume: 120, pass: [0.22, 0.4, 0.55, 0.5, 0.85], manager: "Head of Operations & Customer Success", interviewers: ["Tara (Recruiting coordinator)", "Chloe (CS team lead)"], target_days: 30 },
  { title: "Operations analyst", team: "Operations & people", openings: 1, volume: 140, pass: [0.25, 0.4, 0.55, 0.5, 0.85], manager: "Head of Operations & Customer Success", interviewers: ["Dev (Automation engineer)", "Tara (Recruiting coordinator)"], target_days: 35 },
  { title: "Automation engineer", team: "Technology & AI", openings: 2, volume: 180, pass: [0.2, 0.4, 0.5, 0.45, 0.8], manager: "Head of Technology", interviewers: ["Dev (Automation engineer)", "Kai (Head of Technology)"], target_days: 45 },
  { title: "Data analyst", team: "Technology & AI", openings: 1, volume: 150, pass: [0.22, 0.4, 0.5, 0.5, 0.85], manager: "Head of Technology", interviewers: ["Kai (Head of Technology)", "Dev (Automation engineer)"], target_days: 40 },
  { title: "Practice management (Clio) administrator", team: "Technology & AI", openings: 1, volume: 60, pass: [0.3, 0.45, 0.55, 0.5, 0.85], manager: "Head of Technology", interviewers: ["Kai (Head of Technology)", "Ines (Case processing manager)"], target_days: 35 },
];

/** Interview length in hours by stage (first interview, case or skills exercise review). */
export const INTERVIEW_HOURS = { first: 0.75, case: 1.25 };
export const LOAD_LIMIT_HOURS = 5;

export function generateHiring(seed = 20261020) {
  const r = mulberry32(seed);
  const reqs: Req[] = ROLES.map((role, i) => {
    const applied = Math.round(role.volume * (0.85 + 0.3 * r()));
    const funnel = [applied];
    for (const p of role.pass) funnel.push(Math.round(funnel[funnel.length - 1] * p * (0.85 + 0.3 * r())));
    funnel[5] = Math.min(funnel[5], Math.floor(role.openings * 0.5)); // offers accepted so far; the rest of the openings are still to fill
    return { id: `REQ-${String(101 + i)}`, title: role.title, team: role.team, openings: role.openings, days_open: intBetween(r, 8, 52), manager: role.manager, interviewers: role.interviewers, funnel, target_days: role.target_days };
  });
  // Hires made in the last 120 days, with days from requisition opening to accepted offer.
  const hires = Array.from({ length: 22 }, (_, i) => {
    const role = ROLES[intBetween(r, 0, ROLES.length - 1)];
    const slow = role.team === "Legal" || role.team === "Technology & AI" ? 14 : 0;
    return { id: `H-${i + 1}`, team: role.team, title: role.title, days_to_hire: intBetween(r, 18, 44) + slow };
  });
  // Interviewer hours this week: candidates in interview stages split across each req's panel.
  const load: Record<string, { hours: number; interviews: number; reqs: Set<string> }> = {};
  for (const q of reqs) {
    const weekly = (q.funnel[2] * INTERVIEW_HOURS.first + q.funnel[3] * INTERVIEW_HOURS.case) / 6; // spread over about six weeks
    for (const name of q.interviewers) {
      load[name] ??= { hours: 0, interviews: 0, reqs: new Set() };
      load[name].hours += weekly / q.interviewers.length;
      load[name].interviews += Math.round((q.funnel[2] + q.funnel[3]) / 6 / q.interviewers.length);
      load[name].reqs.add(q.id);
    }
  }
  const interviewers = Object.entries(load).map(([name, l]) => ({ name, hours: Math.round(l.hours * 10) / 10, interviews: l.interviews, reqs: [...l.reqs].length })).sort((a, b) => b.hours - a.hours);
  return { reqs, hires, interviewers };
}

export type OnboardingStep = { id: string; phase: "Before day 1" | "Day 1" | "Week 1" | "Day 30" | "Day 60 to 90"; task: string; owner: string; mode: "Automated" | "Triggered task" | "Manual" };
export const ONBOARDING: OnboardingStep[] = [
  { id: "contract", phase: "Before day 1", task: "Offer signed: create employee record and start date", owner: "People ops", mode: "Automated" },
  { id: "accounts", phase: "Before day 1", task: "Email, practice management (Clio) and portal accounts created with role-based permissions", owner: "IT", mode: "Triggered task" },
  { id: "equipment", phase: "Before day 1", task: "Laptop shipped (hybrid) or desk booked (Toronto office)", owner: "Operations", mode: "Triggered task" },
  { id: "buddy", phase: "Before day 1", task: "Buddy assigned from the same team and intro email sent", owner: "Hiring manager", mode: "Triggered task" },
  { id: "policies", phase: "Day 1", task: "Confidentiality, privilege and privacy training acknowledged", owner: "New hire", mode: "Automated" },
  { id: "welcome", phase: "Day 1", task: "Welcome session: how a file moves from intake to decision", owner: "People ops", mode: "Manual" },
  { id: "tools", phase: "Week 1", task: "Tool walkthroughs: case management, email templates, portal, AI drafting with approval", owner: "Team lead", mode: "Manual" },
  { id: "shadow", phase: "Week 1", task: "Shadow five client conversations in the person's practice area", owner: "Buddy", mode: "Manual" },
  { id: "playbook", phase: "Week 1", task: "Practice area playbook read and quiz passed", owner: "New hire", mode: "Automated" },
  { id: "first-queue", phase: "Day 30", task: "Takes a supervised queue; drafts reviewed before sending", owner: "Team lead", mode: "Manual" },
  { id: "check30", phase: "Day 30", task: "30-day check-in: survey and manager conversation", owner: "People ops", mode: "Triggered task" },
  { id: "goals", phase: "Day 60 to 90", task: "Goals set against team scorecard (CSAT, response time, quality)", owner: "Hiring manager", mode: "Manual" },
  { id: "check90", phase: "Day 60 to 90", task: "90-day review: confirm probation, feedback on onboarding itself", owner: "Hiring manager", mode: "Triggered task" },
];

export const NEW_HIRES = [
  { name: "Ana P.", title: "Case processing associate", start: "2026-10-26", done: ["contract", "accounts", "equipment"] },
  { name: "Ben T.", title: "Client success specialist", start: "2026-10-19", done: ["contract", "accounts", "equipment", "buddy", "policies"] },
  { name: "Carla M.", title: "Intake consultant", start: "2026-10-13", done: ["contract", "accounts", "equipment", "buddy", "policies", "welcome", "tools"] },
  { name: "Deepak S.", title: "RCIC", start: "2026-10-05", done: ["contract", "accounts", "equipment", "buddy", "policies", "welcome", "tools", "shadow", "playbook"] },
  { name: "Erin L.", title: "Case processing associate", start: "2026-09-21", done: ["contract", "accounts", "equipment", "buddy", "policies", "welcome", "tools", "shadow", "playbook", "first-queue"] },
  { name: "Farid A.", title: "Bilingual intake consultant", start: "2026-09-08", done: ["contract", "accounts", "equipment", "buddy", "policies", "welcome", "tools", "shadow", "playbook", "first-queue", "check30"] },
  { name: "Gloria N.", title: "Client success specialist", start: "2026-10-26", done: ["contract"] },
  { name: "Hugo R.", title: "Automation engineer", start: "2026-11-02", done: ["contract"] },
];

/** Steps that should be done by today for someone who started on `start`. */
export function stepsDue(start: string, today: string): string[] {
  const days = Math.floor((Date.parse(today) - Date.parse(start)) / 86_400_000);
  const due: string[] = [];
  for (const s of ONBOARDING) {
    const at = s.phase === "Before day 1" ? -3 : s.phase === "Day 1" ? 0 : s.phase === "Week 1" ? 7 : s.phase === "Day 30" ? 30 : 90;
    if (days >= at) due.push(s.id);
  }
  return due;
}
