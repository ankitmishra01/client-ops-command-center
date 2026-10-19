import { AREAS, ROOT_LABEL, SLA_HOURS, type Area, type Intent, type Priority, type RootCause, type Sentiment } from "./taxonomy.ts";

/** Deterministic, explainable classifier. Every label carries the rule and the phrases that produced it,
 *  so a reviewer can see why a message landed where it did and correct the rule rather than the output. */

type Rule<T> = { label: T; name: string; patterns: RegExp[] };

export const AREA_RULES: Rule<Area>[] = [
  { label: "EE", name: "Express Entry and economic programs", patterns: [/express entry/i, /\bita\b/i, /invitation to apply/i, /\bcrs\b/i, /\bpnp\b/i, /provincial nominee/i, /nomination/i, /\bfsw\b/i, /canadian experience class/i, /\bcec\b/i, /\beapr\b/i, /\bpr application\b/i, /proof of funds/i] },
  { label: "FAM", name: "Family programs", patterns: [/sponsor/i, /spous/i, /common[- ]law/i, /\bwife\b/i, /\bhusband\b/i, /partner'?s? /i, /parents? and grandparents/i, /super visa/i, /dependent child/i, /relationship evidence/i] },
  { label: "WP", name: "Work permits", patterns: [/work permit/i, /study permit/i, /\bpgwp\b/i, /post-graduation/i, /\blmia\b/i, /maintained status/i, /visitor (visa|record)/i, /\btrv\b/i, /\bdli\b/i, /letter of acceptance/i, /\bpal\b/i, /open work permit/i] },
  { label: "CIT", name: "Citizenship", patterns: [/citizenship/i, /oath/i, /citizenship test/i, /physical presence/i, /\bproof of citizenship\b/i, /\bcitizen\b/i] },
  { label: "INA", name: "Criminal inadmissibility", patterns: [/inadmissib/i, /rehabilitation/i, /deemed rehabilitat/i, /temporary resident permit/i, /\btrp\b/i, /\bdui\b/i, /\bdwi\b/i, /impaired driving/i, /record suspension/i, /\bpardon\b/i, /court records?/i, /conviction/i, /fbi (background )?check/i, /refused (entry|at the border)/i] },
];

export const INTENT_RULES: Rule<Intent>[] = [
  { label: "escalation", name: "Asks for a manager, lawyer or outside body", patterns: [/speak (to|with) (a|the|your)? ?(manager|supervisor|senior|lawyer)/i, /escalat/i, /law society/i, /\bcicc\b/i, /college of immigration/i, /file a complaint/i, /(leave|write|post) (a|an)? ?(google |online )?review/i, /refund/i, /cancel (my|the) (retainer|file|contract)/i] },
  { label: "complaint", name: "Expresses dissatisfaction with service", patterns: [/unacceptable/i, /disappointed/i, /frustrat/i, /(not|never) (been )?(answered|replied|responded|heard back)/i, /no one (has )?(replied|answered|called)/i, /terrible/i, /third (email|time|message)/i, /keep (being|getting) (asked|told)/i, /paid for a service/i, /what am i paying/i, /won'?t (even )?call me back/i, /without (any |an )?explanation/i] },
  { label: "new_enquiry", name: "Prospective client", patterns: [/\bi am (interested|considering|thinking)/i, /(would like|want) to (apply|know if i)/i, /am i eligible/i, /\beligib/i, /free assessment/i, /(retain|hire) your (firm|services)/i, /how much (do|would) (you|it) (charge|cost)/i] },
  { label: "billing_question", name: "Fees, invoices or payments", patterns: [/invoice/i, /\bfees?\b/i, /payment/i, /instal?ments?/i, /\bcharged?\b/i, /\breceipt\b/i, /retainer/i, /\bbill(ed|ing)?\b/i] },
  { label: "scheduling", name: "Callback, meeting or consultation time", patterns: [/call ?back/i, /reschedul/i, /book (a|another) (call|meeting|consultation)/i, /appointment/i, /missed (my|our|the) (call|meeting|appointment)/i, /meeting link/i, /\bzoom\b/i] },
  { label: "document_question", name: "Document requests and uploads", patterns: [/which documents?/i, /what documents?/i, /document (list|checklist|request)/i, /\bupload/i, /translation/i, /police (certificate|clearance)/i, /bank statements?/i, /\bnotari[sz]/i, /\bpassport (copy|scan)\b/i, /medical exam/i, /reference letter/i] },
  { label: "status_request", name: "Asks where the file stands", patterns: [/status/i, /any (update|news)/i, /\bupdate on\b/i, /where (are we|is my|does my)/i, /haven'?t heard/i, /what is happening/i, /next step/i, /how long/i, /still waiting/i] },
  { label: "praise", name: "Thanks or good news", patterns: [/thank you so much/i, /\bapproved\b/i, /grateful/i, /\bwe got it\b/i, /great (job|work|news)/i, /\bappreciate (all|everything)/i] },
];

export const ROOT_RULES: Rule<RootCause>[] = [
  { label: "file_closed", name: "File closed or withdrawn without a reason given", patterns: [/clos(ed|ing) (my|the|our) (file|case|matter)/i, /(file|case|matter) (was|has been|is being) (closed|withdrawn)/i, /withdr(ew|awn|awing) (my|our|the) (file|case|application)/i, /without (any |an )?explanation/i] },
  { label: "portal_access", name: "Portal login or upload failure", patterns: [/portal/i, /log ?in/i, /password/i, /upload (fails|failed|error|keeps)/i, /(file|attachment) (is )?too (large|big)/i, /error message/i, /link (has )?expired/i] },
  { label: "fee_billing", name: "Fees unclear or unexpected", patterns: [/invoice/i, /\bfees?\b/i, /\bcharged?\b/i, /payment/i, /refund/i, /instal?ments?/i, /what am i paying/i, /retainer/i] },
  { label: "handoff", name: "File changed hands without a clear owner", patterns: [/new (consultant|lawyer|case manager|person)/i, /(who|whom) (is|am i) (now )?(handling|dealing|speak)/i, /(consultant|lawyer|case manager) (left|changed|is no longer)/i, /repeat (myself|everything)/i, /explain (everything|it) again/i, /handed (over|off)/i, /different person/i] },
  { label: "callback", name: "Unreturned call or missed consultation", patterns: [/call ?back/i, /(didn'?t|did not|won'?t|will not) (even )?(answer|pick up|call)/i, /no-?show/i, /promised (to )?call/i, /missed (my|our|the) (call|meeting|appointment)/i, /no one (called|showed|joined)/i, /reschedul/i, /appointment/i] },
  { label: "doc_confusion", name: "Unclear or repeated document requests", patterns: [/which documents?/i, /what documents?/i, /(already|previously) (sent|uploaded|provided|submitted)/i, /(asked|asking) (for|me for) .* again/i, /checklist/i, /translation/i, /not sure (what|which|if)/i, /conflicting/i, /document (list|request)/i] },
  { label: "gov_delay", name: "Waiting on government processing", patterns: [/\bircc\b/i, /processing times?/i, /backlog/i, /(government|visa office|officer) (has|is|hasn'?t)/i, /beyond (the )?(posted|normal|published)/i, /\bbiometrics\b/i, /\bmonths? (now|ago)\b/i, /\bgcms\b/i, /\batip\b/i] },
  { label: "status_silence", name: "No update received from the firm", patterns: [/(haven'?t|have not|never) (heard|received|had) (anything|any update|back|an update)/i, /no (update|news|response)/i, /any (update|news)/i, /\bstatus\b/i, /still waiting/i, /where (are we|is my|does my)/i, /weeks? (without|with no)/i, /(silence|in the dark)/i, /(paid|since paying|after paying).*(nothing|no update|heard nothing)/i] },
];

const NEG: [RegExp, number][] = [[/unacceptable/i, 3], [/disappointed/i, 2], [/frustrat/i, 2], [/terrible/i, 3], [/angry/i, 3], [/stress(ed|ful)?/i, 1], [/worried/i, 1], [/anxious/i, 1], [/confus/i, 1], [/(not|never) (been )?(answered|replied|responded|heard back)/i, 2], [/no one/i, 1], [/refund/i, 2], [/review/i, 1], [/law society|\bcicc\b/i, 3], [/!{2,}/, 1], [/urgent/i, 1], [/third (email|time|message)/i, 2], [/in the dark/i, 1], [/what am i paying/i, 2]];
const POS: [RegExp, number][] = [[/thank/i, 1], [/grateful/i, 2], [/great (job|work|news)/i, 2], [/\bapproved\b/i, 2], [/appreciate/i, 1], [/excellent/i, 2], [/helpful/i, 1]];

export type Evidence = { field: string; rule: string; matches: string[] };
export type Classification = {
  area: Area | null;
  intent: Intent;
  root_cause: RootCause;
  sentiment: Sentiment;
  sentiment_score: number;
  deadline_days: number | null;
  priority: Priority;
  escalation_risk: number; // 0 to 100
  evidence: Evidence[];
};

function scoreRules<T>(rules: Rule<T>[], text: string) {
  return rules.map((r, order) => {
    const matches = r.patterns.map((p) => text.match(p)?.[0]).filter((m): m is string => !!m);
    return { rule: r, order, matches, score: matches.length };
  });
}

/** Highest number of matching phrases wins; ties go to the rule listed first (rules are ordered by severity). */
function pick<T>(rules: Rule<T>[], text: string, fallback: T) {
  const scored = scoreRules(rules, text).filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.order - b.order);
  return scored[0] ? { label: scored[0].rule.label, rule: scored[0].rule.name, matches: scored[0].matches } : { label: fallback, rule: "No rule matched (default)", matches: [] };
}

/** First-match-wins: rules are ordered from most to least severe, so a complaint about fees is a complaint, not a billing question. */
function firstMatch<T>(rules: Rule<T>[], text: string, fallback: T) {
  for (const r of rules) {
    const matches = r.patterns.map((p) => text.match(p)?.[0]).filter((m): m is string => !!m);
    if (matches.length) return { label: r.label, rule: r.name, matches };
  }
  return { label: fallback, rule: "No rule matched (default)", matches: [] as string[] };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Finds a stated deadline: "in 5 days", "within 30 days", "expires on October 28", "tomorrow". Returns days from receipt. */
export function extractDeadline(text: string, receivedAt: Date): { days: number | null; match: string | null } {
  const cue = /(expir|deadline|due|within|respond|submit|ends?|valid until|lapse|by)/i;
  const rel = text.match(/(?:in|within|only|next)\s+(\d{1,2})\s+days?/i);
  if (rel && cue.test(text)) return { days: Number(rel[1]), match: rel[0] };
  if (/\b(tomorrow)\b/i.test(text) && cue.test(text)) return { days: 1, match: "tomorrow" };
  const abs = text.match(/\b(?:on|by|until)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i);
  if (abs) {
    const m = MONTHS.indexOf(abs[1].slice(0, 3).toLowerCase());
    let d = new Date(Date.UTC(receivedAt.getUTCFullYear(), m, Number(abs[2]), 23));
    if (d.getTime() < receivedAt.getTime() - 86_400_000 * 180) d = new Date(Date.UTC(receivedAt.getUTCFullYear() + 1, m, Number(abs[2]), 23));
    // A past date ("we paid on October 7") is history, not a deadline; a future date needs a deadline word nearby.
    if (d.getTime() >= receivedAt.getTime() - 86_400_000 && cue.test(text)) return { days: Math.max(0, Math.round((d.getTime() - receivedAt.getTime()) / 86_400_000)), match: abs[0] };
  }
  return { days: null, match: null };
}

export function sentimentOf(text: string): { label: Sentiment; score: number; matches: string[] } {
  let score = 0; const matches: string[] = [];
  for (const [p, w] of NEG) { const m = text.match(p); if (m) { score -= w; matches.push(m[0]); } }
  for (const [p, w] of POS) { const m = text.match(p); if (m) { score += w; matches.push(m[0]); } }
  return { label: score <= -2 ? "negative" : score >= 2 ? "positive" : "neutral", score, matches };
}

/** P1: a stated deadline within 14 days. P2: complaint, escalation, strongly negative tone, or a third contact in 30 days. P3: everything else. */
export function priorityOf(intent: Intent, deadlineDays: number | null, sentimentScore: number, priorContacts: number): Priority {
  if (deadlineDays != null && deadlineDays <= 14) return "P1";
  if (intent === "escalation" || intent === "complaint" || sentimentScore <= -3 || priorContacts >= 3) return "P2";
  return "P3";
}

/** 0 to 100. Weighted sum of the signals that, in the synthetic history, preceded a formal complaint or a public review. */
export function escalationRisk(intent: Intent, sentimentScore: number, priorContacts: number, deadlineDays: number | null, text: string): number {
  let r = 5;
  if (intent === "escalation") r += 45; else if (intent === "complaint") r += 30;
  r += Math.min(25, Math.max(0, -sentimentScore) * 4);
  r += Math.min(20, priorContacts * 5);
  if (deadlineDays != null && deadlineDays <= 7) r += 10;
  if (/review|law society|\bcicc\b|refund/i.test(text)) r += 10;
  if (intent === "praise") r = 2;
  return Math.max(0, Math.min(100, Math.round(r)));
}

export function classify(input: { subject: string; body: string; received_at: string; prior_contacts_30d?: number }): Classification {
  const text = `${input.subject}\n${input.body}`;
  const prior = input.prior_contacts_30d ?? 0;
  const areaPick = pick(AREA_RULES, text, null as Area | null);
  const intentPick = firstMatch(INTENT_RULES, text, "status_request" as Intent);
  let rootPick = firstMatch(ROOT_RULES, text, "none" as RootCause);
  if (intentPick.label === "new_enquiry" || intentPick.label === "praise") rootPick = { label: "none", rule: `Intent is ${intentPick.label.replace("_", " ")}, so no service failure`, matches: [] };
  const sent = sentimentOf(text);
  const dl = extractDeadline(text, new Date(input.received_at));
  const priority = priorityOf(intentPick.label, dl.days, sent.score, prior);
  const evidence: Evidence[] = [
    { field: "Practice area", rule: areaPick.rule, matches: areaPick.matches },
    { field: "Intent", rule: intentPick.rule, matches: intentPick.matches },
    { field: "Root cause", rule: rootPick.rule, matches: rootPick.matches },
    { field: "Sentiment", rule: `Lexicon score ${sent.score > 0 ? "+" : ""}${sent.score}`, matches: sent.matches },
    { field: "Priority", rule: priority === "P1" ? `Deadline in ${dl.days} days (≤ 14)` : priority === "P2" ? (prior >= 3 ? `${prior} contacts in 30 days` : intentPick.label === "escalation" || intentPick.label === "complaint" ? `Intent is ${intentPick.label}` : "Strongly negative tone") : "No deadline or risk signal", matches: dl.match ? [dl.match] : [] },
  ];
  return {
    area: areaPick.label, intent: intentPick.label, root_cause: rootPick.label, sentiment: sent.label, sentiment_score: sent.score,
    deadline_days: dl.days, priority, escalation_risk: escalationRisk(intentPick.label, sent.score, prior, dl.days, text), evidence,
  };
}

export type SlaState = "breached" | "at_risk" | "ok";
/** First-response SLA from receipt. At risk when under a quarter of the target remains. */
export function slaStatus(priority: Priority, receivedAt: string, now: string): { state: SlaState; hours_left: number; target: number } {
  const target = SLA_HOURS[priority];
  const elapsed = (new Date(now).getTime() - new Date(receivedAt).getTime()) / 3_600_000;
  const left = target - elapsed;
  return { state: left < 0 ? "breached" : left < target * 0.25 ? "at_risk" : "ok", hours_left: left, target };
}

export const ALL_AREAS = AREAS;

const POSITIVE_THEMES: [string, RegExp][] = [["Responsive", /responsive|quick|always knew/i], ["Clear guidance", /explained|clear about|guidance|thorough/i], ["Good outcome", /approved|good result|outcome was fine/i], ["Caught errors", /caught a mistake/i]];
/** Themes for a public review: every root-cause rule that matches (not just the first), plus positive themes. */
export function reviewThemes(text: string): { label: string; tone: "neg" | "pos"; root?: RootCause }[] {
  const neg = ROOT_RULES.filter((r) => r.patterns.some((p) => p.test(text))).map((r) => ({ label: ROOT_LABEL[r.label], tone: "neg" as const, root: r.label }));
  const pos = POSITIVE_THEMES.filter(([, p]) => p.test(text)).map(([label]) => ({ label, tone: "pos" as const }));
  return [...neg, ...pos];
}
