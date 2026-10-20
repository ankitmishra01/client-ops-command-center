/** People-ops foundations: illustrative pay bands, the performance-review cadence and rubric, and the offboarding and
 *  leave checklists. Pay figures are invented placeholders for the shape of a framework, not market data or anyone's pay. */

export const LEVELS = ["Level 1", "Level 2", "Level 3"] as const;
export const LEVEL_NAME = ["Associate", "Experienced", "Lead"] as const;

export type Family = { family: string; roles: [string, string, string]; mids: [number, number, number] };
/** Midpoints in CAD per year, base salary. Each band runs 15% either side of its midpoint. */
export const FAMILIES: Family[] = [
  { family: "Client service", roles: ["Intake or customer success specialist", "Senior specialist, bilingual specialist", "Customer success or intake team lead"], mids: [56000, 66000, 80000] },
  { family: "Case management", roles: ["Case manager", "Senior case manager", "Case management team lead"], mids: [60000, 72000, 88000] },
  { family: "Licensed professionals", roles: ["Regulated immigration consultant (RCIC)", "Senior RCIC or associate lawyer", "Senior lawyer"], mids: [74000, 96000, 125000] },
  { family: "People and talent", roles: ["Recruiting or people ops coordinator", "Talent acquisition partner, HR generalist", "Talent or people ops lead"], mids: [58000, 76000, 96000] },
  { family: "Operations technology", roles: ["Clio administrator, operations analyst", "Automation engineer", "Senior automation engineer"], mids: [72000, 94000, 124000] },
];
export const SPREAD = 0.15;
/** Ontario's pay transparency rule for publicly advertised postings (employers with 25 or more employees, from 1 January 2026): a posted range can be no wider than $50,000. */
export const MAX_POSTED_RANGE = 50000;

const round = (x: number) => Math.round(x / 1000) * 1000;
export function band(mid: number) { return { min: round(mid * (1 - SPREAD)), mid, max: round(mid * (1 + SPREAD)) }; }
export const bands = (f: Family) => f.mids.map(band);
/** How far one level's midpoint sits above the level below. */
export const progression = (f: Family) => f.mids.slice(1).map((m, i) => m / f.mids[i] - 1);
/** Where an offer or a salary sits in its band: salary ÷ midpoint. */
export const compaRatio = (salary: number, mid: number) => salary / mid;

export const PAY_RULES = [
  "New offers land between the band minimum and the midpoint. Above the midpoint needs the COO's sign-off and a written reason.",
  "Every public posting shows the band for the level, so candidates and recruiters work from the same number.",
  "Promotion moves a person to at least the next band's minimum, or 8% more, whichever is higher.",
  "One pay review a year, after the review cycle, with a merit budget set first and spent against ratings and position in band.",
  "Bands are checked against market data once a year. The figures here are placeholders until that is done.",
];

/** Review cadence: what happens, how often, who owns it. */
export const CADENCE = [
  { when: "Every two weeks", what: "One-to-one", detail: "30 minutes on the team scorecard, blockers and one development goal. Notes in the HR system, not a private document.", owner: "Manager" },
  { when: "Days 30, 60, 90", what: "Probation checks", detail: "Tied to the onboarding checklist. Day 90 confirms probation or extends it with a written plan.", owner: "Manager, people ops" },
  { when: "Each quarter", what: "Goal check-in", detail: "Short written note against two or three goals. No rating.", owner: "Manager" },
  { when: "Twice a year", what: "Review and calibration", detail: "Self-review, manager rating on the rubric, then a calibration meeting across managers before anyone sees a rating.", owner: "Manager, people ops" },
  { when: "Once a year", what: "Pay review", detail: "After the second review of the year. Uses the rating and position in band; no separate negotiation.", owner: "People ops, COO" },
];

export const RATINGS = ["Not yet meeting", "Developing", "Meeting", "Exceeding"] as const;
/** Rubric for client-facing roles (case managers, intake, customer success). Evidence is named so ratings are not opinions. */
export const RUBRIC = [
  { dimension: "Client outcomes", meeting: "Clients hear from them before they need to ask. Files they own rarely escalate.", evidence: "Silent files and escalations on their queue, CSAT comments that name them" },
  { dimension: "Quality and compliance", meeting: "Files are accurate and complete. Approved templates are used; nothing in a message reads as legal advice.", evidence: "Monthly audit of five files, template use, approval log" },
  { dimension: "Reliability", meeting: "Response targets are met. Handoffs have a note, callbacks happen when promised.", evidence: "Response time against target, handoff notes written, missed callbacks" },
  { dimension: "Team and improvement", meeting: "Flags a recurring problem with an example instead of working around it. Helps new hires get up to speed.", evidence: "Root-cause flags raised, buddy feedback from new hires" },
];

export type Step = { when: string; task: string; owner: string; mode: "Automated" | "Triggered task" | "Manual" };
export const OFFBOARDING: Step[] = [
  { when: "Notice received", task: "Exit date confirmed in the HR system; manager, payroll and IT told", owner: "People ops", mode: "Automated" },
  { when: "Notice received", task: "Every open matter gets a new owner and a handoff note in Clio", owner: "Team lead", mode: "Triggered task" },
  { when: "Before last day", task: "Each client gets an approved introduction to their new named contact", owner: "New owner", mode: "Triggered task" },
  { when: "Before last day", task: "Open tasks, deadlines and calendar entries moved to the new owner", owner: "Team lead", mode: "Triggered task" },
  { when: "Before last day", task: "Exit conversation; reason for leaving coded for the attrition report", owner: "People ops", mode: "Manual" },
  { when: "Last day", task: "Access removed: Clio, email, client portal, shared drives", owner: "IT", mode: "Automated" },
  { when: "Last day", task: "Laptop and building pass returned", owner: "Operations", mode: "Triggered task" },
  { when: "Next pay run", task: "Final pay and vacation pay processed; Record of Employment filed with Service Canada", owner: "Payroll", mode: "Triggered task" },
];
export const LEAVE: Step[] = [
  { when: "Request", task: "Leave logged with dates and type (vacation, sick, family, pregnancy or parental, other)", owner: "Employee", mode: "Automated" },
  { when: "Request", task: "Approved, and a named cover person for each open file", owner: "Manager", mode: "Manual" },
  { when: "Before leave", task: "Clients with a deadline during the leave told who is covering", owner: "Team lead", mode: "Triggered task" },
  { when: "Before leave", task: "Out-of-office message and portal routing point to the cover person", owner: "IT", mode: "Automated" },
  { when: "Before leave", task: "Payroll updated; Record of Employment filed for extended leave so benefits can start", owner: "Payroll", mode: "Triggered task" },
  { when: "During leave", task: "Optional keep-in-touch check for leaves over a month", owner: "Manager", mode: "Manual" },
  { when: "Return", task: "Files handed back with a note; access and queue restored", owner: "Team lead", mode: "Triggered task" },
];
