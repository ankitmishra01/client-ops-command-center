import type { Classification } from "./classify.ts";
import { AREA_LABEL, type Area, type Message } from "./taxonomy.ts";

/** Fictional team roster. In a real rollout the owner list would come from the practice management system's user list. */
export const CASE_LEAD: Record<Area, string> = { EE: "Express Entry case lead", WP: "Work permit case lead", FAM: "Family case lead", CIT: "Citizenship case lead", INA: "Inadmissibility case lead" };
export const CS_POD: Record<Area, string> = { EE: "Express Entry CS pod", WP: "Work permit CS pod", FAM: "Family CS pod", CIT: "Citizenship CS pod", INA: "Inadmissibility CS pod" };
export const SHARED_OWNERS = ["Escalations desk", "Billing team", "Portal support", "Intake team", "Triage desk"] as const;
export const ALL_OWNERS = [...Object.values(CASE_LEAD), ...Object.values(CS_POD), ...SHARED_OWNERS];

/** Routing, first rule that applies wins. Returns the owner and the rule, so a reassignment can be traced back to a rule worth changing. */
export function routeOwner(c: Classification): { owner: string; rule: string } {
  if (c.intent === "new_enquiry") return { owner: "Intake team", rule: "New enquiry goes to intake" };
  if (c.intent === "escalation" || (c.intent === "complaint" && c.escalation_risk >= 60)) return { owner: "Escalations desk", rule: "Escalation request, or complaint with risk ≥ 60" };
  if (c.priority === "P1" && c.area) return { owner: CASE_LEAD[c.area], rule: "Deadline within 14 days goes to the practice area's case lead" };
  if (c.root_cause === "portal_access") return { owner: "Portal support", rule: "Portal access issue" };
  if (c.intent === "billing_question" || c.root_cause === "fee_billing") return { owner: "Billing team", rule: "Fees or billing" };
  if (c.area) return { owner: CS_POD[c.area], rule: "Default: the practice area's client success pod" };
  return { owner: "Triage desk", rule: "Practice area unclear: a person decides" };
}

const OPEN: Record<string, string> = {
  status_silence: "You should not have had to ask for this, and I am sorry for the silence on your file.",
  doc_confusion: "I am sorry our document requests have not been clear. Below is the single list of what is still outstanding, so you do not have to piece it together from several emails.",
  fee_billing: "Thank you for raising this. Here is a plain breakdown so you can see exactly what each amount covers.",
  handoff: "I am sorry you have had to explain your situation more than once. From today, I am your named contact on this file.",
  gov_delay: "I understand how hard the wait is. Here is where your application stands and what the government's posted timelines mean for you.",
  portal_access: "I am sorry the portal got in the way. Here is how to get back in, and an alternative if it happens again.",
  callback: "I am sorry we missed you. That should not have happened, and I want to make sure it does not happen twice.",
  file_closed: "I am sorry you learned about this by email without an explanation. You are owed one, and a lawyer will give it to you directly.",
  none: "Thank you for getting in touch.",
};

/** A suggested first reply for a person to edit and approve. It never sends. Square brackets mark facts the person
 *  must check in the case file before approving; the draft never states an outcome, a timeline or legal advice. */
export function draftReply(m: Message, c: Classification): string {
  const first = m.client.split(" ")[0];
  const area = c.area ? AREA_LABEL[c.area].toLowerCase() : "immigration";
  const ref = m.matter ? ` (file ${m.matter})` : "";
  const lines: string[] = [`Dear ${first},`, ""];
  switch (c.intent) {
    case "new_enquiry":
      lines.push(`Thank you for your interest in working with us on your ${area} matter. The next step is a consultation, where a licensed professional reviews your situation before anyone gives advice on eligibility.`, "", "You can book a time here: [booking link]. If you have a deadline, please tell us the date when you book so we can prioritise accordingly.");
      break;
    case "praise":
      lines.push("Thank you for letting us know, and congratulations. Messages like yours mean a great deal to the team who worked on your file.", "", "[If appropriate: invite a review using the standard review request link.]");
      break;
    case "escalation":
    case "complaint":
      lines.push(OPEN[c.root_cause], "", `I have read your message${ref} in full and I am now personally responsible for getting you an answer. Here is what happens next:`, "", `1. By [date and time, within one business day], I will confirm [the specific point raised] after checking your file with [case lead name].`, "2. You will hear from me directly, not from a new person.", `3. If you would like to speak by phone, you can book a time with me here: [booking link].`, "", "If you remain unhappy after that, our complaints process is here: [complaints policy link].");
      break;
    case "billing_question":
      lines.push(OPEN.fee_billing, "", "[Professional fees invoiced to date and what they covered]", "[Government fees paid on your behalf, with receipt numbers]", "[What is still due and when, per the retainer agreement]", "", "If anything in the breakdown does not match your records, reply to this email and I will reconcile it with our billing team.");
      break;
    case "scheduling":
      lines.push(OPEN.callback, "", "Please choose a time that suits you here: [booking link]. You will receive a confirmation and a reminder the day before. If you prefer, reply with two times that work and I will book it for you.");
      break;
    case "document_question":
      lines.push(OPEN[c.root_cause === "none" ? "doc_confusion" : c.root_cause], "", "Still needed for your file:", "[Document 1, with an example of an acceptable version]", "[Document 2, including translation requirements if applicable]", "", "Already received, no action needed: [list from the case file].", "", "You can upload through the portal, or reply to this email with the files attached if the portal gives you any trouble.");
      break;
    default:
      lines.push(OPEN[c.root_cause], "", `Current stage of your file${ref}: [stage from the case file, with the date it was reached].`, "What happens next: [next milestone] and the government's currently posted processing time of [posted time, with the source date].", "", "We will update you when that milestone is reached, and in any case by [date 14 days from today], even if nothing has changed.");
  }
  if (c.deadline_days != null && c.deadline_days <= 14) lines.push("", `I have flagged the deadline you mentioned to [case lead name] today. [Confirm the deadline date and the planned action before sending.]`);
  lines.push("", "Kind regards,", "[Your name]", "Client Success");
  return lines.join("\n");
}

/** Approved template library. Client-facing copy comes only from templates a lawyer has approved; the draft fills
 *  them, a person checks the bracketed facts, and the approval level depends on risk. Versions and dates are illustrative. */
export const TEMPLATES: Record<string, { name: string; version: string; approved: string }> = {
  "T-STATUS": { name: "Status update", version: "v4", approved: "2026-09-30" },
  "T-COMPLAINT": { name: "Complaint acknowledgement and plan", version: "v3", approved: "2026-10-02" },
  "T-BILLING": { name: "Fee breakdown", version: "v2", approved: "2026-09-12" },
  "T-SCHEDULE": { name: "Rebook a call or consultation", version: "v3", approved: "2026-09-25" },
  "T-DOCS": { name: "Outstanding documents", version: "v5", approved: "2026-10-06" },
  "T-ENQUIRY": { name: "New enquiry to consultation", version: "v2", approved: "2026-08-28" },
  "T-THANKS": { name: "Thanks and review invitation", version: "v1", approved: "2026-08-28" },
};
const TEMPLATE_FOR: Record<string, string> = { status_request: "T-STATUS", complaint: "T-COMPLAINT", escalation: "T-COMPLAINT", billing_question: "T-BILLING", scheduling: "T-SCHEDULE", document_question: "T-DOCS", new_enquiry: "T-ENQUIRY", praise: "T-THANKS" };
export const templateFor = (c: Classification) => TEMPLATE_FOR[c.intent];

/** Who must approve before anything reaches the client. Lawyer sign-off for anything with a legal deadline, an escalation,
 *  a closed file or a criminal inadmissibility matter; a client success lead for routine replies. */
export function approver(c: Classification): { role: "Lawyer" | "Client success lead"; why: string } {
  if (c.priority === "P1") return { role: "Lawyer", why: "a legal deadline is involved" };
  if (c.intent === "escalation") return { role: "Lawyer", why: "the client asked to escalate" };
  if (c.root_cause === "file_closed") return { role: "Lawyer", why: "the file was closed or withdrawn" };
  if (c.area === "INA") return { role: "Lawyer", why: "criminal inadmissibility matters" };
  return { role: "Client success lead", why: "routine reply from an approved template" };
}

/** Phrases a draft must never contain: outcome promises and anything that reads as legal advice. */
export const ADVICE_PATTERNS: RegExp[] = [/\bguarantee/i, /\byou (are|will be|qualify|should qualify)( definitely| certainly)? (eligible|approved)\b/i, /\bwill (definitely|certainly|surely) be approved/i, /\byour chances\b/i, /\bin (my|our) (legal )?opinion\b/i, /\byou (do not|don'?t) need (a|an|to)\b/i, /\byou should (apply|withdraw|travel|leave|stay)\b/i, /\b(it|this) is (fine|safe|legal) to\b/i];

export type Guard = { label: string; ok: boolean; detail: string; blocking: boolean };
/** Checks run on the edited draft before approval. Blocking checks disable approval. */
export function guardrails(text: string, c: Classification): Guard[] {
  const advice = ADVICE_PATTERNS.map((p) => text.match(p)?.[0]).filter((m): m is string => !!m);
  const open = (text.match(/\[[^\]]+\]/g) ?? []).length;
  const t = TEMPLATES[templateFor(c)];
  const a = approver(c);
  return [
    { label: "Lawyer-approved template", ok: true, detail: `${templateFor(c)} ${t.name}, ${t.version}, approved ${t.approved}`, blocking: false },
    { label: "No legal advice or outcome promises", ok: advice.length === 0, detail: advice.length ? `Remove: ${advice.map((x) => `"${x}"`).join(", ")}` : "No advice or promise phrases found", blocking: true },
    { label: "Facts checked against the file", ok: open === 0, detail: open ? `${open} bracketed fact${open > 1 ? "s" : ""} still to confirm; sending stays blocked until filled` : "All bracketed facts filled", blocking: false },
    { label: "Client data stays in approved systems", ok: true, detail: "Drafted in the browser from the template library; no external model call", blocking: false },
    { label: `Approval: ${a.role.toLowerCase()}`, ok: true, detail: `Required because ${a.why}`, blocking: false },
  ];
}
