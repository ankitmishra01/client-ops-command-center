import { gauss, intBetween, mulberry32, pickOne, weighted, type Rng } from "./rng.ts";
import { AREAS, CASE_MANAGERS, INBOX_NOW, ROOT_CAUSES, type Area, type Channel, type Intent, type Message, type RootCause, type Status, type ThreadItem } from "./taxonomy.ts";

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

type Tpl = { intent: Intent; root: RootCause; w: number; subjects: string[]; body: string; channels?: Channel[] };
const TEMPLATES: Tpl[] = [
  { intent: "status_request", root: "status_silence", w: 9, subjects: ["Update on my file?", "Status of my application", "Checking in on {thing_title}", "Any progress?"], body: "Hello, I have not heard anything about my {thing} in {weeks} weeks. Could you tell me the status and what the next step is?" },
  { intent: "status_request", root: "status_silence", w: 8, subjects: ["Any news?", "Following up", "Quick status check", "Re: next steps"], body: "Hi, just checking in. Is there any update on my {thing}? The last email I had from your office was in {month}." },
  { intent: "status_request", root: "status_silence", w: 6, subjects: ["Still waiting", "Where are we?", "No news for weeks"], body: "We are still waiting to hear back about the {thing}. It feels like we are in the dark. Where are we in the process?" },
  { intent: "status_request", root: "gov_delay", w: 6, subjects: ["Processing time question", "Past the posted processing time", "Is my file stuck?"], body: "My {thing} has been with IRCC for {months} months now, which is beyond the posted processing time. Is there anything that can be done?" },
  { intent: "status_request", root: "gov_delay", w: 3, subjects: ["GCMS notes", "Can you order my notes?"], body: "Could you order my GCMS notes? My {thing} has been in processing for {months} months and I want to understand what the officer is doing. How long can this take?" },
  { intent: "status_request", root: "handoff", w: 3, subjects: ["New case manager?", "Who is my contact now?"], body: "I got an email from a different person about my {thing}. Who is handling my file now, and is there any update?" },
  { intent: "complaint", root: "status_silence", w: 4, channels: ["email", "portal", "phone"], subjects: ["Third email with no reply", "No reply again", "Is anyone reading these?"], body: "This is my third email about my {thing} and no one has replied. I am frustrated. I paid for a service and I am still waiting for a simple status update." },
  { intent: "complaint", root: "status_silence", w: 3, channels: ["email", "portal", "review"], subjects: ["Very disappointed", "Poor communication", "Weeks without an update"], body: "I am disappointed with the communication on my {thing}. Weeks without any update is unacceptable." },
  { intent: "complaint", root: "doc_confusion", w: 3, subjects: ["Asked for the same documents again", "Already sent this", "Duplicate document request"], body: "I already uploaded my {doc} last month and today I was asked for it again. This keeps happening and it is frustrating. Which documents do you actually still need?" },
  { intent: "complaint", root: "handoff", w: 2, channels: ["email", "phone", "review"], subjects: ["Who is handling my file now?", "Had to explain everything again"], body: "My consultant changed and nobody told me. The new person asked me to explain everything again about my {thing}. I am disappointed." },
  { intent: "complaint", root: "callback", w: 2, channels: ["email", "phone"], subjects: ["Missed call again", "Promised call never came"], body: "I was promised a call back on {day} about my {thing} and no one called. This is the second time. I am disappointed." },
  { intent: "complaint", root: "file_closed", w: 1.5, channels: ["email", "review", "phone"], subjects: ["Why was my file closed?", "File closed with no explanation"], body: "I got an email that you are closing my file for the {thing} without any explanation, and no one will call me back. I am disappointed." },
  { intent: "escalation", root: "file_closed", w: 0.8, subjects: ["Case closed, want a refund", "Refund and explanation required"], body: "My case was closed without any explanation after I paid. I want a refund or I will file a complaint with the law society." },
  { intent: "complaint", root: "callback", w: 2, channels: ["email", "review", "phone"], subjects: ["Nobody answered for my consultation", "Consultation no-show"], body: "I booked a consultation about my {thing} and nobody answered the phone at the scheduled time. No call back either. Very disappointed." },
  { intent: "status_request", root: "status_silence", w: 4, subjects: ["Paid, no update since", "What happens after payment?", "Paid and waiting"], body: "We paid in {month} for the {thing} and have heard nothing since. What is the status?" },
  { intent: "complaint", root: "fee_billing", w: 1, subjects: ["Unexpected charge", "Charged twice?"], body: "I was charged again for my {thing} and nobody explained why. What am I paying for at this point? I am frustrated." },
  { intent: "escalation", root: "fee_billing", w: 1.5, subjects: ["Refund request", "Please escalate: fees"], body: "I want a refund. I was charged for my {thing} and I still do not understand what the fees covered. Please escalate this to a manager." },
  { intent: "escalation", root: "status_silence", w: 2, channels: ["email", "portal", "phone"], subjects: ["Escalating my file", "Request for a manager", "Final follow-up before a review"], body: "I would like to speak to a manager. My {thing} has had no update for {weeks} weeks and my emails are not answered. If I do not hear back I will leave a Google review describing this." },
  { intent: "escalation", root: "handoff", w: 1, subjects: ["Request to speak with a senior lawyer", "Too many handoffs"], body: "My file has been handed over three times. I want to speak with a lawyer who knows my {thing}, not a different person every month." },
  { intent: "billing_question", root: "fee_billing", w: 4, subjects: ["Question about invoice", "Invoice breakdown please", "Government fee vs your fee"], body: "Hi, I received an invoice for my {thing}. Could you explain which part is government fees and which part is your professional fee?" },
  { intent: "billing_question", root: "fee_billing", w: 2, subjects: ["Instalment plan", "Payment schedule"], body: "Is it possible to pay the remaining fees in instalments? We are going ahead with the {thing}." },
  { intent: "document_question", root: "doc_confusion", w: 5, subjects: ["Which documents do I need?", "Checklist does not match email", "Document list question"], body: "Hello, I am not sure which documents you still need for the {thing}. The checklist says {doc} but the last email said something different." },
  { intent: "document_question", root: "doc_confusion", w: 3, subjects: ["Translation requirements", "Certified or notarized?"], body: "Does my {doc} need a certified translation, or is a notarized copy enough for the {thing}?" },
  { intent: "document_question", root: "portal_access", w: 3, channels: ["email", "phone"], subjects: ["Upload not working", "Portal upload error"], body: "I tried to upload my {doc} for the {thing} but the portal upload keeps failing with an error message. Maybe the file is too large?" },
  { intent: "document_question", root: "portal_access", w: 2, channels: ["email", "phone"], subjects: ["Cannot log in to the portal", "Password reset link expired"], body: "My portal password reset link has expired twice. I need to upload the {doc} for my {thing}." },
  { intent: "scheduling", root: "callback", w: 3, subjects: ["Reschedule our call", "Can we move our meeting?"], body: "Could we reschedule our call about my {thing}? I can do any afternoon this week." },
  { intent: "scheduling", root: "callback", w: 2, subjects: ["Missed meeting", "No one joined the call"], body: "I joined the Zoom link at the agreed time and no one showed. Can we book another meeting about my {thing}?" },
  { intent: "new_enquiry", root: "none", w: 4, channels: ["email", "phone"], subjects: ["Eligibility question", "New enquiry", "Do I qualify?"], body: "Hello, I am interested in {newthing}. Am I eligible, and how much would you charge?" },
  { intent: "new_enquiry", root: "none", w: 2, channels: ["email", "phone"], subjects: ["Consultation request", "Looking to hire a lawyer"], body: "I would like to retain your firm for {newthing}. What are the next steps?" },
  { intent: "praise", root: "none", w: 1.5, channels: ["email", "portal", "review"], subjects: ["Approved!", "Great news", "We got it"], body: "We got it! My {thing} was approved this morning. Thank you so much to the whole team." },
  { intent: "praise", root: "none", w: 1, channels: ["email", "review"], subjects: ["Thank you", "Thanks to the team"], body: "I just wanted to say I appreciate all the help on my {thing}. Great work." },
];
/** Area tilt on root causes: family and citizenship files wait longer on government; inadmissibility files change hands more; work permits have more paperwork. */
const ROOT_TILT: Record<Area, Partial<Record<RootCause, number>>> = {
  EE: { doc_confusion: 1.2 }, FAM: { gov_delay: 1.6, status_silence: 1.2 }, WP: { doc_confusion: 1.4, portal_access: 1.5 }, CIT: { gov_delay: 1.8 }, INA: { handoff: 1.8, file_closed: 1.8, fee_billing: 1.3 },
};
const EXTRA = ["", "", "", "", "Thank you for your help so far.", "This is stressful for our family.", "Sent from my phone.", "Please reply when you can.", "I can be reached at the number on file.", "Merci."];
export const FIRST = ["Aarav", "Sofia", "Wei", "Fatima", "Mateo", "Priya", "Oluwaseun", "Hana", "Arjun", "Camila", "Yusuf", "Mei", "Diego", "Zainab", "Lucas", "Ananya", "Kofi", "Elena", "Rahul", "Noor", "Gabriel", "Amara", "Tariq", "Isabela", "Jun", "Leila", "Andrei", "Chiamaka", "Javier", "Sana", "Nikhil", "Marta", "Emeka", "Lina", "Hiroshi", "Aisha", "Pablo", "Simran", "Tomasz", "Yara", "Ifeoma", "Mohammed", "Thanh", "Valeria", "Kwame", "Anya", "Ravi", "Beatriz", "Samir", "Ingrid"];
export const LAST = ["Achterberg", "Balogun", "Castellanos", "Dimitrova", "Esfahani", "Fonseca", "Gunawardena", "Halvorsen", "Iwu", "Jankowski", "Kapoor", "Laurentis", "Moreau", "Nakashima", "Oyelaran", "Petrescu", "Quintero", "Rahimi", "Szabo", "Thorvaldsen", "Uchenna", "Varga", "Wojcik", "Xu", "Yildirim", "Zaragoza", "Abernathy", "Brightwater", "Cordeiro", "Delacroix", "Eskandari", "Fairweather", "Ghosal", "Hollingsworth", "Ibarra", "Juarez-Lin", "Kowalczyk", "Lindgren", "Mbeki-Rowe", "Nwachukwu"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

function fill(s: string, r: Rng, area: Area, received: Date, n: number, thing = pickOne(r, THING[area])) {
  const date = new Date(received.getTime() + n * 86_400_000);
  return s
    .replaceAll("{thing}", thing).replaceAll("{thing_title}", cap(thing)).replace("{doc}", pickOne(r, DOC[area])).replace("{newthing}", pickOne(r, NEW_THING[area]))
    .replace("{weeks}", String(intBetween(r, 3, 9))).replace("{months}", String(intBetween(r, 7, 16)))
    .replace("{month}", MONTH_NAMES[(received.getUTCMonth() + 12 - intBetween(r, 1, 3)) % 12]).replace("{day}", pickOne(r, DAYS))
    .replaceAll("{n}", String(n)).replace("{date}", `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`);
}

/** Status follows age: recent messages are mostly new, older ones mostly resolved, and a backlog of unanswered ones remains. */
function statusFor(r: Rng, hoursAgo: number, intent: Intent): Status {
  const angry = intent === "escalation" || (intent === "complaint" && r() < 0.3);
  const pick = (items: [Status, number][]) => weighted(r, items);
  if (hoursAgo < 8) return pick([["New", 0.85], ["In progress", 0.15]]);
  if (hoursAgo < 48) return angry ? pick([["Escalated", 0.6], ["New", 0.4]]) : pick([["New", 0.4], ["In progress", 0.35], ["Waiting on client", 0.15], ["Resolved", 0.1]]);
  if (hoursAgo < 24 * 4) return angry ? pick([["Escalated", 0.5], ["Resolved", 0.5]]) : pick([["New", 0.1], ["In progress", 0.25], ["Waiting on client", 0.2], ["Resolved", 0.45]]);
  if (hoursAgo < 24 * 7) return angry ? pick([["In progress", 0.4], ["Resolved", 0.6]]) : pick([["In progress", 0.25], ["Waiting on client", 0.2], ["Resolved", 0.55]]);
  return angry ? "Resolved" : pick([["Resolved", 0.86], ["Waiting on client", 0.09], ["In progress", 0.05]]);
}

const FOLLOW = ["Following up on my message about my {thing}.", "Sending this again in case my last email was missed.", "I called and left a voicemail as well about my {thing}.", "Just checking that you received my documents for the {thing}."];

function threadFor(r: Rng, m: { received_at: string; prior: number; area: Area; thing: string; client: string; case_manager: string | null }): ThreadItem[] {
  const out: ThreadItem[] = [];
  const t0 = Date.parse(m.received_at);
  for (let k = m.prior; k >= 1; k--) {
    const at = new Date(t0 - k * intBetween(r, 2, 6) * 86_400_000 - intBetween(r, 1, 600) * 60_000);
    at.setUTCSeconds(0, 0);
    out.push({ at: at.toISOString(), from: "client", author: m.client, text: fill(pickOne(r, FOLLOW), r, m.area, at, 0, m.thing) });
    out.push({ at: new Date(at.getTime() + 60_000).toISOString(), from: "system", author: "Auto-acknowledgement", text: "Thank you, we have received your message. A member of our team will respond as soon as possible." });
    if (r() < 0.35 && m.case_manager) out.push({ at: new Date(at.getTime() + intBetween(r, 20, 60) * 3_600_000).toISOString(), from: "firm", author: m.case_manager, text: "Thanks for your patience. I am checking on this and will come back to you shortly." });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).filter((x) => x.at < m.received_at);
}

/** The worked example the triage page opens on: a paying client, twelve days of silence, a one-star review. Invented. */
export const FEATURED: Message = {
  id: "MSG-10000", channel: "email", received_at: "2026-10-18T15:00:00.000Z", client: "Daniela Rosário-Klein", matter: "CV-2026-03184", case_manager: "Priya Raman", status: "New",
  subject: "12 days of silence after paying",
  body: "We paid in full on October 7 for my spousal sponsorship and have heard nothing since. That is 12 days. Nobody has replied to my two emails. I have posted a one-star Google review today and I want to speak to a manager. I am very disappointed.",
  thread: [
    { at: "2026-10-07T16:12:00.000Z", from: "system", author: "Payment confirmation", text: "Payment received in full for the spousal sponsorship retainer. Thank you." },
    { at: "2026-10-12T14:03:00.000Z", from: "client", author: "Daniela Rosário-Klein", text: "Hello, we paid on October 7. What happens next with our spousal sponsorship, and who is our contact?" },
    { at: "2026-10-12T14:04:00.000Z", from: "system", author: "Auto-acknowledgement", text: "Thank you, we have received your message. A member of our team will respond as soon as possible." },
    { at: "2026-10-15T19:40:00.000Z", from: "client", author: "Daniela Rosário-Klein", text: "Following up again. It has been over a week since we paid and we have not heard from anyone." },
    { at: "2026-10-15T19:41:00.000Z", from: "system", author: "Auto-acknowledgement", text: "Thank you, we have received your message. A member of our team will respond as soon as possible." },
  ],
  prior_contacts_30d: 3,
  truth: { area: "FAM", intent: "escalation", root_cause: "status_silence", deadline_days: null },
};

export const INBOX_SIZE = 340;

export function generateInbox(count = INBOX_SIZE, seed = SEED): Message[] {
  const r = mulberry32(seed);
  const now = new Date(INBOX_NOW).getTime();
  const out: Message[] = [FEATURED];
  for (let i = 1; i < count; i++) {
    const area = weighted(r, AREAS.map((a) => [a, AREA_SHARE[a]] as const));
    const tpl = weighted(r, TEMPLATES.map((t) => [t, t.w * (ROOT_TILT[area][t.root] ?? 1)] as const));
    // Received over the last 30 days, weighted toward recent days (volume is growing).
    const hoursAgo = 719.5 * Math.pow(r(), 1.35) + 0.15;
    const received = new Date(now - hoursAgo * 3_600_000);
    received.setUTCSeconds(0, 0);
    const channel = tpl.channels ? pickOne(r, tpl.channels) : (r() < 0.42 ? "portal" : r() < 0.12 ? "phone" : "email");
    const hasDeadline = channel !== "review" && tpl.intent !== "new_enquiry" && tpl.intent !== "praise" && r() < 0.13;
    const n = hasDeadline ? intBetween(r, 2, 28) : 0;
    const thing = pickOne(r, THING[area]);
    let body = fill(tpl.body, r, area, received, n, thing);
    if (hasDeadline) body += " " + fill(pickOne(r, DEADLINE[area]), r, area, received, n, thing);
    const extra = channel === "phone" || channel === "review" ? "" : pickOne(r, EXTRA);
    if (extra) body += " " + extra;
    const angry = tpl.intent === "complaint" || tpl.intent === "escalation";
    const stars = tpl.intent === "praise" ? 5 : angry ? intBetween(r, 1, 2) : 3;
    if (channel === "phone") body = `Phone note by intake: client called and said: "${body}"`;
    if (channel === "review") body = `Google review, ${stars} star${stars > 1 ? "s" : ""}: "${body}"`;
    const client = `${pickOne(r, FIRST)} ${pickOne(r, LAST)}`;
    const isNew = tpl.intent === "new_enquiry";
    const case_manager = isNew ? null : pickOne(r, CASE_MANAGERS[area]);
    const prior = angry ? intBetween(r, 1, 4) : r() < 0.7 ? intBetween(r, 0, 1) : intBetween(r, 2, 3);
    out.push({
      id: `MSG-${String(10000 + i)}`,
      channel,
      received_at: received.toISOString(),
      client,
      matter: isNew ? null : `CV-2026-${String(intBetween(r, 1000, 9899)).padStart(5, "0")}`,
      case_manager,
      status: statusFor(r, hoursAgo, tpl.intent),
      subject: fill(pickOne(r, tpl.subjects), r, area, received, n, thing),
      body,
      thread: isNew ? [] : threadFor(r, { received_at: received.toISOString(), prior, area, thing, client, case_manager }),
      prior_contacts_30d: prior,
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

export type Review = { id: string; date: string; reviewer: string; stars: number; area: Area; text: string; replied: boolean };
const REVIEW_TEXT: Record<number, string[]> = {
  5: ["Our case manager explained every step of the {thing} and we always knew what came next. Approved in {months} months.", "Very responsive team. They caught a mistake in our {doc} before submission.", "Professional and quick. The consultation was clear about costs and timelines.", "Excellent guidance from start to finish on my {thing}. Thank you!"],
  4: ["Good result on our {thing}, though updates were sometimes slow.", "Knowledgeable lawyers. The portal was confusing at first but support helped.", "Helpful and thorough. I wish the document checklist had been clearer up front."],
  3: ["The outcome was fine but I had to chase for every update on my {thing}.", "Mixed experience. My file changed hands twice and I had to repeat everything.", "Competent work, slow communication. Weeks with no update after payment."],
  2: ["Paid quickly, then waited weeks for any news on my {thing}.", "Missed my consultation and the call back came two days later.", "Asked for the same documents three times. Which documents do they actually need?"],
  1: ["My file was closed without any explanation and nobody will call me back.", "Nobody answered for my scheduled consultation and no one called back.", "After payment, silence. Three emails, no reply, no status update.", "Charged again with no explanation of the fees. Very disappointed."],
};
export function generateReviews(count = 84, seed = SEED + 2): Review[] {
  const r = mulberry32(seed);
  const out: Review[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.pow(r(), 0.7); // later weeks have more reviews
    const day = Math.floor(t * (WEEKS * 7 - 1));
    const date = new Date(Date.parse(FIRST_WEEK + "T00:00:00Z") + day * 86_400_000 + intBetween(r, 9, 21) * 3_600_000).toISOString();
    const bad = 0.08 + 0.2 * t;
    const stars = weighted(r, [[5, 0.66 - bad], [4, 0.18], [3, 0.08], [2, bad * 0.4], [1, bad * 0.6]] as const);
    const area = weighted(r, AREAS.map((a) => [a, AREA_SHARE[a]] as const));
    const text = fill(pickOne(r, REVIEW_TEXT[stars]), r, area, new Date(date), 0);
    out.push({ id: `R-${2000 + i}`, date, reviewer: `${pickOne(r, FIRST)} ${String.fromCharCode(65 + intBetween(r, 0, 25))}.`, stars, area, text, replied: stars >= 4 ? r() < 0.5 : r() < 0.35 });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export type SilentFile = { matter: string; client: string; area: Area; case_manager: string; stage: string; paid_on: string; last_update: string; days_silent: number; next: string };
const STAGES: Record<Area, [string, string][]> = {
  EE: [["Documents in review", "Submit eAPR"], ["Submitted to IRCC", "Medical exam request"], ["Awaiting ITA", "Profile refresh"]],
  WP: [["Employer documents pending", "LMIA approval"], ["Submitted to IRCC", "Biometrics"], ["Documents in review", "Submit extension"]],
  FAM: [["Relationship evidence in review", "Submit sponsorship"], ["Submitted to IRCC", "Acknowledgement of receipt"], ["Awaiting biometrics", "Biometrics appointment"]],
  CIT: [["Travel history in review", "Submit application"], ["Submitted to IRCC", "Test invitation"]],
  INA: [["Court records requested", "Draft rehabilitation submission"], ["Submitted to visa office", "Officer decision"]],
};
export function generateSilentFiles(count = 52, seed = SEED + 3): SilentFile[] {
  const r = mulberry32(seed);
  const now = Date.parse(INBOX_NOW);
  return Array.from({ length: count }, () => {
    const area = weighted(r, AREAS.map((a) => [a, AREA_SHARE[a] * (area_tilt[a] ?? 1)] as const));
    const days = Math.round(11 + Math.pow(r(), 1.8) * 38);
    const last = new Date(now - days * 86_400_000).toISOString().slice(0, 10);
    const paid = new Date(now - (days + intBetween(r, 0, 60)) * 86_400_000).toISOString().slice(0, 10);
    const [stage, next] = pickOne(r, STAGES[area]);
    return { matter: `CV-2026-${String(intBetween(r, 1000, 9899)).padStart(5, "0")}`, client: `${pickOne(r, FIRST)} ${pickOne(r, LAST)}`, area, case_manager: pickOne(r, CASE_MANAGERS[area]), stage, paid_on: paid, last_update: last, days_silent: days, next };
  }).sort((a, b) => b.days_silent - a.days_silent);
}
const area_tilt: Partial<Record<Area, number>> = { FAM: 1.4, CIT: 1.3 };
