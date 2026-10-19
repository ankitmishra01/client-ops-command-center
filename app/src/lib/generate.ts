import { gauss, intBetween, mulberry32, pickOne, weighted, type Rng } from "./rng.ts";
import { AREAS, INBOX_NOW, ROOT_CAUSES, type Area, type Channel, type Intent, type Message, type RootCause } from "./taxonomy.ts";

/** Synthetic data for the prototype. Nothing here comes from a real client, a real firm or a real case file.
 *  Volumes and rates are invented to tell a plausible story: inbound volume grows about 5x over 26 weeks,
 *  staffing lags, and the share of "where is my file?" messages grows with it. */

export const SEED = 20261019;
export const AREA_SHARE: Record<Area, number> = { EE: 0.34, WP: 0.28, FAM: 0.2, CIT: 0.1, INA: 0.08 };

const THING: Record<Area, string[]> = {
  EE: ["Express Entry PR application", "PNP nomination application", "Canadian Experience Class application", "Express Entry profile"],
  FAM: ["spousal sponsorship application", "sponsorship application for my parents", "common-law partner sponsorship", "sponsorship of my dependent child"],

  CIT: ["citizenship application", "citizenship application for my son", "proof of citizenship application"],
  WP: ["work permit extension", "PGWP application", "LMIA-based work permit", "open work permit application", "study permit application"],
  INA: ["criminal rehabilitation application", "temporary resident permit application", "inadmissibility file for my old DUI", "record check and rehabilitation file"],
};
const DOC: Record<Area, string[]> = {
  EE: ["proof of funds letter", "employment reference letter", "police certificate", "language test results"],
  FAM: ["relationship evidence", "marriage certificate translation", "police certificate", "joint lease"],

  CIT: ["physical presence calculation", "travel history", "tax notices of assessment", "passport copies"],
  WP: ["employer offer letter", "bank statements", "LMIA approval letter", "letter of acceptance"],
  INA: ["court records", "FBI background check", "proof of sentence completion", "police certificate"],
};
const NEW_THING: Record<Area, string[]> = {
  EE: ["Express Entry", "a provincial nominee program"], FAM: ["sponsoring my spouse", "sponsoring my parents"],
  WP: ["a work permit", "a study permit for my daughter"], CIT: ["Canadian citizenship"], INA: ["entering Canada with an old DUI conviction", "criminal rehabilitation"],
};
const DEADLINE: Record<Area, string[]> = {
  EE: ["My ITA expires in {n} days and the document list is not finished.", "IRCC asked for additional documents and we must respond within {n} days."],
  FAM: ["IRCC sent a procedural fairness letter and we must respond within {n} days.", "We received a biometrics instruction letter and must complete it within {n} days."],

  CIT: ["The citizenship test is in {n} days and I must submit the updated travel history by then.", "IRCC asked for more documents and the deadline is in {n} days."],
  WP: ["My work permit expires on {date}, so the extension must be submitted by then.", "My current work permit ends in {n} days."],
  INA: ["I have a work trip to Canada in {n} days and need the temporary resident permit decided by then.", "IRCC asked for my court records within {n} days."],
};

type Tpl = { intent: Intent; root: RootCause; w: number; subject: string; body: string; channel?: Channel };
const TEMPLATES: Tpl[] = [
  { intent: "status_request", root: "status_silence", w: 9, subject: "Update on my file?", body: "Hello, I have not heard anything about my {thing} in {weeks} weeks. Could you tell me the status and what the next step is?" },
  { intent: "status_request", root: "status_silence", w: 8, subject: "Any news?", body: "Hi, just checking in. Is there any update on my {thing}? The last email I had from your office was in {month}." },
  { intent: "status_request", root: "status_silence", w: 6, subject: "Still waiting", body: "We are still waiting to hear back about the {thing}. It feels like we are in the dark. Where are we in the process?" },
  { intent: "status_request", root: "gov_delay", w: 6, subject: "Processing time question", body: "My {thing} has been with IRCC for {months} months now, which is beyond the posted processing time. Is there anything that can be done?" },
  { intent: "status_request", root: "gov_delay", w: 3, subject: "GCMS notes", body: "Could you order my GCMS notes? My {thing} has been in processing for {months} months and I want to understand what the officer is doing. How long can this take?" },
  { intent: "status_request", root: "handoff", w: 3, subject: "New case manager?", body: "I got an email from a different person about my {thing}. Who is handling my file now, and is there any update?" },
  { intent: "complaint", root: "status_silence", w: 4, subject: "Third email with no reply", body: "This is my third email about my {thing} and no one has replied. I am frustrated. I paid for a service and I am still waiting for a simple status update." },
  { intent: "complaint", root: "status_silence", w: 3, subject: "Very disappointed", body: "I am disappointed with the communication on my {thing}. Weeks without any update is unacceptable." },
  { intent: "complaint", root: "doc_confusion", w: 3, subject: "Asked for the same documents again", body: "I already uploaded my {doc} last month and today I was asked for it again. This keeps happening and it is frustrating. Which documents do you actually still need?" },
  { intent: "complaint", root: "handoff", w: 2, subject: "Who is handling my file now?", body: "My consultant changed and nobody told me. The new person asked me to explain everything again about my {thing}. I am disappointed." },
  { intent: "complaint", root: "callback", w: 2, subject: "Missed call again", body: "I was promised a call back on {day} about my {thing} and no one called. This is the second time. I am disappointed." },
  { intent: "complaint", root: "file_closed", w: 1.5, subject: "Why was my file closed?", body: "I got an email that you are closing my file for the {thing} without any explanation, and no one will call me back. I am disappointed." },
  { intent: "escalation", root: "file_closed", w: 0.8, subject: "Case closed, want a refund", body: "My case was closed without any explanation after I paid. I want a refund or I will file a complaint with the law society." },
  { intent: "complaint", root: "callback", w: 2, subject: "Nobody answered for my consultation", body: "I booked a consultation about my {thing} and nobody answered the phone at the scheduled time. No call back either. Very disappointed." },
  { intent: "status_request", root: "status_silence", w: 4, subject: "Paid, no update since", body: "We paid in {month} for the {thing} and have heard nothing since. What is the status?" },
  { intent: "complaint", root: "fee_billing", w: 1, subject: "Unexpected charge", body: "I was charged again for my {thing} and nobody explained why. What am I paying for at this point? I am frustrated." },
  { intent: "escalation", root: "fee_billing", w: 1.5, subject: "Refund request", body: "I want a refund. I was charged for my {thing} and I still do not understand what the fees covered. Please escalate this to a manager." },
  { intent: "escalation", root: "status_silence", w: 2, subject: "Escalating my file", body: "I would like to speak to a manager. My {thing} has had no update for {weeks} weeks and my emails are not answered. If I do not hear back I will leave a Google review describing this." },
  { intent: "escalation", root: "handoff", w: 1, subject: "Request to speak with a senior lawyer", body: "My file has been handed over three times. I want to speak with a lawyer who knows my {thing}, not a different person every month." },
  { intent: "billing_question", root: "fee_billing", w: 4, subject: "Question about invoice", body: "Hi, I received an invoice for my {thing}. Could you explain which part is government fees and which part is your professional fee?" },
  { intent: "billing_question", root: "fee_billing", w: 2, subject: "Instalment plan", body: "Is it possible to pay the remaining fees in instalments? We are going ahead with the {thing}." },
  { intent: "document_question", root: "doc_confusion", w: 5, subject: "Which documents do I need?", body: "Hello, I am not sure which documents you still need for the {thing}. The checklist says {doc} but the last email said something different." },
  { intent: "document_question", root: "doc_confusion", w: 3, subject: "Translation requirements", body: "Does my {doc} need a certified translation, or is a notarized copy enough for the {thing}?" },
  { intent: "document_question", root: "portal_access", w: 3, channel: "email", subject: "Upload not working", body: "I tried to upload my {doc} for the {thing} but the portal upload keeps failing with an error message. Maybe the file is too large?" },
  { intent: "document_question", root: "portal_access", w: 2, channel: "email", subject: "Cannot log in to the portal", body: "My portal password reset link has expired twice. I need to upload the {doc} for my {thing}." },
  { intent: "scheduling", root: "callback", w: 3, subject: "Reschedule our call", body: "Could we reschedule our call about my {thing}? I can do any afternoon this week." },
  { intent: "scheduling", root: "callback", w: 2, subject: "Missed meeting", body: "I joined the Zoom link at the agreed time and no one showed. Can we book another meeting about my {thing}?" },
  { intent: "new_enquiry", root: "none", w: 4, subject: "Eligibility question", body: "Hello, I am interested in {newthing}. Am I eligible, and how much would you charge?" },
  { intent: "new_enquiry", root: "none", w: 2, subject: "Consultation request", body: "I would like to retain your firm for {newthing}. What are the next steps?" },
  { intent: "praise", root: "none", w: 1.5, subject: "Approved!", body: "We got it! My {thing} was approved this morning. Thank you so much to the whole team." },
  { intent: "praise", root: "none", w: 1, subject: "Thank you", body: "I just wanted to say I appreciate all the help on my {thing}. Great work." },
];
/** Area tilt on root causes: family and citizenship files wait longer on government; business files change hands more; temporary residence has more paperwork. */
const ROOT_TILT: Record<Area, Partial<Record<RootCause, number>>> = {
  EE: { doc_confusion: 1.2 }, FAM: { gov_delay: 1.6, status_silence: 1.2 }, WP: { doc_confusion: 1.4, portal_access: 1.5 }, CIT: { gov_delay: 1.8 }, INA: { handoff: 1.8, file_closed: 1.8, fee_billing: 1.3 },
};
const EXTRA = ["", "", "", "", "Thank you for your help so far.", "This is stressful for our family.", "Sent from my phone.", "Please reply when you can.", "I can be reached at the number on file.", "Merci."];
const FIRST = ["Aarav", "Sofia", "Wei", "Fatima", "Mateo", "Priya", "Oluwaseun", "Hana", "Arjun", "Camila", "Yusuf", "Mei", "Diego", "Zainab", "Lucas", "Ananya", "Kofi", "Elena", "Rahul", "Noor", "Gabriel", "Amara", "Tariq", "Isabela", "Jun", "Leila", "Andrei", "Chiamaka", "Javier", "Sana", "Nikhil", "Marta", "Emeka", "Lina", "Hiroshi", "Aisha", "Pablo", "Simran", "Tomasz", "Yara"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function fill(s: string, r: Rng, area: Area, received: Date, n: number) {
  const date = new Date(received.getTime() + n * 86_400_000);
  return s
    .replaceAll("{thing}", pickOne(r, THING[area])).replace("{doc}", pickOne(r, DOC[area])).replace("{newthing}", pickOne(r, NEW_THING[area]))
    .replace("{weeks}", String(intBetween(r, 3, 9))).replace("{months}", String(intBetween(r, 7, 16)))
    .replace("{month}", MONTH_NAMES[(received.getUTCMonth() + 12 - intBetween(r, 1, 3)) % 12]).replace("{day}", pickOne(r, DAYS))
    .replaceAll("{n}", String(n)).replace("{date}", `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`);
}

export function generateInbox(count = 300, seed = SEED): Message[] {
  const r = mulberry32(seed);
  const now = new Date(INBOX_NOW).getTime();
  const out: Message[] = [];
  for (let i = 0; i < count; i++) {
    const area = weighted(r, AREAS.map((a) => [a, AREA_SHARE[a]] as const));
    const tpl = weighted(r, TEMPLATES.map((t) => [t, t.w * (ROOT_TILT[area][t.root] ?? 1)] as const));
    // Received in the last five days, weighted toward the most recent (an exponential with a 30-hour mean, capped).
    const hoursAgo = Math.min(118, -Math.log(1 - r() * 0.98) * 30) + 0.2;
    const received = new Date(now - hoursAgo * 3_600_000);
    received.setUTCSeconds(0, 0);
    const hasDeadline = tpl.intent !== "new_enquiry" && tpl.intent !== "praise" && r() < 0.13;
    const n = hasDeadline ? intBetween(r, 2, 28) : 0;
    let body = fill(tpl.body, r, area, received, n);
    if (hasDeadline) body += " " + fill(pickOne(r, DEADLINE[area]), r, area, received, n);
    const extra = pickOne(r, EXTRA);
    if (extra) body += " " + extra;
    const angry = tpl.intent === "complaint" || tpl.intent === "escalation";
    out.push({
      id: `MSG-${String(10001 + i)}`,
      channel: tpl.channel ?? (r() < 0.42 ? "portal" : "email"),
      received_at: received.toISOString(),
      client: `${pickOne(r, FIRST)} ${String.fromCharCode(65 + intBetween(r, 0, 25))}.`,
      matter: tpl.intent === "new_enquiry" ? null : `M-${26}-${String(intBetween(r, 10000, 48999))}`,
      subject: tpl.subject,
      body,
      prior_contacts_30d: angry ? intBetween(r, 1, 5) : r() < 0.7 ? intBetween(r, 0, 1) : intBetween(r, 2, 3),
      truth: { area, intent: tpl.intent, root_cause: tpl.root, deadline_days: hasDeadline ? n : null },
    });
  }
  return out.sort((a, b) => b.received_at.localeCompare(a.received_at));
}

export type WeekRow = {
  week: string; // Monday, ISO date
  area: Area;
  tickets: number;
  by_root: Record<RootCause, number>;
  complaints: number;
  escalations: number;
  csat_responses: number;
  csat_satisfied: number; // responses scoring 4 or 5 out of 5
  reviews: number;
  review_stars: number; // sum of star ratings
  first_response_hours: number; // median
  open_files: number; // paid, active client files at the end of the week
  silent_files: number; // open files with no client update in 14 or more days
  new_leads: number; // consultation requests and new enquiries
  first_contact_hours: number; // median hours from a new lead to first contact by a person
  consults_booked: number;
  consults_missed_by_firm: number; // consultant did not call or join
};

const BASE_ROOT: Record<RootCause, number> = { status_silence: 0.23, callback: 0.08, handoff: 0.06, file_closed: 0.02, doc_confusion: 0.14, fee_billing: 0.07, gov_delay: 0.12, portal_access: 0.07, none: 0.21 };
const AREA_CSAT: Record<Area, number> = { EE: 0.01, WP: 0.0, FAM: -0.02, CIT: 0.03, INA: -0.03 };

export const WEEKS = 26;
export const FIRST_WEEK = "2026-04-20";

export function generateWeekly(seed = SEED + 1): WeekRow[] {
  const r = mulberry32(seed);
  const rows: WeekRow[] = [];
  for (let w = 0; w < WEEKS; w++) {
    const t = w / (WEEKS - 1); // 0 to 1 across the half year
    const week = new Date(Date.parse(FIRST_WEEK + "T00:00:00Z") + w * 7 * 86_400_000).toISOString().slice(0, 10);
    const strain = Math.max(0, t - 0.15); // service strain builds once volume outruns staffing
    for (const area of AREAS) {
      const tickets = Math.round(235 * AREA_SHARE[area] * Math.pow(5, t) * (1 + 0.06 * gauss(r)));
      const open_files = Math.round(2000 * AREA_SHARE[area] * Math.pow(3, t) * (1 + 0.02 * gauss(r)));
      const new_leads = Math.round(160 * AREA_SHARE[area] * Math.pow(5, t) * (1 + 0.08 * gauss(r)));
      const consults_booked = Math.round(new_leads * 0.45);
      const shares = Object.fromEntries(ROOT_CAUSES.map((rc) => {
        let s = BASE_ROOT[rc] * (ROOT_TILT[area][rc] ?? 1);
        if (rc === "status_silence") s *= 1 + 0.75 * strain;
        if (rc === "callback") s *= 1 + 0.6 * strain;
        if (rc === "handoff" || rc === "file_closed") s *= 1 + 0.5 * strain;
        return [rc, s];
      })) as Record<RootCause, number>;
      const total = Object.values(shares).reduce((a, b) => a + b, 0);
      const by_root = Object.fromEntries(ROOT_CAUSES.map((rc) => [rc, Math.round((tickets * shares[rc]) / total)])) as Record<RootCause, number>;
      const complaintRate = (0.028 + 0.03 * strain) * (area === "INA" || area === "FAM" ? 1.2 : 1) * (1 + 0.12 * gauss(r));
      const escalationRate = complaintRate * (0.38 + 0.08 * strain);
      const csat_responses = Math.max(5, Math.round(tickets * 0.16 * (1 + 0.1 * gauss(r))));
      const csat = Math.min(0.97, 0.9 - 0.1 * strain + AREA_CSAT[area] + 0.015 * gauss(r));
      const reviews = Math.max(1, Math.round(tickets * 0.03 * (1 + 0.25 * gauss(r))));
      const rating = Math.min(4.95, 4.78 - 0.42 * strain + AREA_CSAT[area] * 3 + 0.07 * gauss(r));
      rows.push({
        week, area, tickets, by_root,
        complaints: Math.max(0, Math.round(tickets * complaintRate)),
        escalations: Math.max(0, Math.round(tickets * escalationRate)),
        csat_responses, csat_satisfied: Math.round(csat_responses * csat),
        reviews, review_stars: Math.round(reviews * rating * 10) / 10,
        first_response_hours: Math.round((5 + 20 * strain * strain * 1.6 + (area === "FAM" ? 2 : 0) + 1.2 * gauss(r)) * 10) / 10,
        open_files, silent_files: Math.round(open_files * Math.min(0.4, (0.07 + 0.26 * strain + (area === "FAM" || area === "CIT" ? 0.03 : 0)) * (1 + 0.05 * gauss(r)))),
        new_leads, first_contact_hours: Math.round(Math.max(1, 2.5 + 18 * strain * strain + 0.6 * gauss(r)) * 10) / 10,
        consults_booked, consults_missed_by_firm: Math.round(consults_booked * Math.max(0.005, 0.02 + 0.09 * strain + 0.005 * gauss(r))),
      });
    }
  }
  return rows;
}
