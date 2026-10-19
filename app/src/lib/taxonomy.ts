/** Shared vocabulary for the classifier, the synthetic data generator and every page.
 *  The five practice areas follow the operating units named in public job postings for the role's firm; the data behind them is synthetic. */

export const AREAS = ["EE", "WP", "FAM", "CIT", "INA"] as const;
export type Area = (typeof AREAS)[number];
export const AREA_LABEL: Record<Area, string> = {
  EE: "Express Entry",
  WP: "Work permits",
  FAM: "Family sponsorship",
  CIT: "Citizenship",
  INA: "Criminal inadmissibility",
};
export const AREA_SHORT: Record<Area, string> = { EE: "Express Entry", WP: "Work permits", FAM: "Family", CIT: "Citizenship", INA: "Inadmissibility" };

export const INTENTS = ["status_request", "document_question", "billing_question", "scheduling", "complaint", "escalation", "new_enquiry", "praise"] as const;
export type Intent = (typeof INTENTS)[number];
export const INTENT_LABEL: Record<Intent, string> = {
  status_request: "Status request",
  document_question: "Document question",
  billing_question: "Fees or billing",
  scheduling: "Callback or appointment",
  complaint: "Complaint",
  escalation: "Escalation request",
  new_enquiry: "New enquiry",
  praise: "Thanks or praise",
};

export const ROOT_CAUSES = ["status_silence", "callback", "handoff", "file_closed", "doc_confusion", "fee_billing", "gov_delay", "portal_access", "none"] as const;
export type RootCause = (typeof ROOT_CAUSES)[number];
export const ROOT_LABEL: Record<RootCause, string> = {
  status_silence: "Silence after payment",
  callback: "Unreturned call or missed consult",
  handoff: "Details lost in a handoff",
  file_closed: "File closed without explanation",
  doc_confusion: "Document request confusion",
  fee_billing: "Fee and billing clarity",
  gov_delay: "Government processing delay",
  portal_access: "Client portal access",
  none: "No root cause (enquiry or praise)",
};

/** The "fix the system" lever for each root cause, and the share of those tickets it is assumed to remove.
 *  Every avoidable rate is an assumption to be tested in the pilot, not a measured result. */
export const SYSTEM_FIX: Record<Exclude<RootCause, "none">, { fix: string; avoidable: number; detail: string }> = {
  status_silence: { fix: "Proactive status updates", avoidable: 0.6, detail: "Flag every paid file with no client update in 14 days (a silent file). Send a plain-language update at every file milestone, and a 'nothing has changed, here is what to expect' note after 14 quiet days. Triggered from the case management system, sent by email and posted in the portal." },
  doc_confusion: { fix: "One checklist per matter", avoidable: 0.45, detail: "Replace free-text document requests with a single checklist per matter: examples of an acceptable document, translation rules, and upload checks that reject the wrong file before a person has to." },
  fee_billing: { fix: "Fee explainer at retainer", avoidable: 0.5, detail: "Separate professional fees from government fees on every invoice, show what is paid and what is next, and send the schedule with the retainer instead of after the first question." },
  handoff: { fix: "Handoff note and intro email", avoidable: 0.55, detail: "When a file changes hands (intake to case team, consultant to lawyer), the new owner gets a structured handoff note and the client gets an introduction with one named contact." },
  gov_delay: { fix: "Expectation setting at milestones", avoidable: 0.3, detail: "The firm cannot speed up government processing, but it can remove the surprise: published processing times at each milestone, and a refresh when they change." },
  portal_access: { fix: "Self-serve portal help", avoidable: 0.65, detail: "Self-serve password reset, file size and format limits shown before upload, and a status page for known portal issues." },
  callback: { fix: "Booking links and callback tracking", avoidable: 0.5, detail: "Booking links instead of 'we will call you', automatic confirmations and reminders, a no-show alert to the consultant's lead within 15 minutes, and a callback queue with its own response-time target." },
  file_closed: { fix: "Closure checklist and notice", avoidable: 0.7, detail: "No matter is closed or withdrawn without a lawyer-approved closure notice that says why, what the client can do next and an offer of a call; the closure step in the case management system will not complete without it." },
};

export const PRIORITIES = ["P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];
/** First-response targets in elapsed hours (calendar time in the prototype; a real rollout would use business hours). */
export const SLA_HOURS: Record<Priority, number> = { P1: 4, P2: 24, P3: 48 };
export const PRIORITY_LABEL: Record<Priority, string> = { P1: "P1 deadline", P2: "P2 at risk", P3: "P3 routine" };

export type Channel = "email" | "portal" | "phone" | "review";
export const CHANNEL_LABEL: Record<Channel, string> = { email: "Email", portal: "Client portal", phone: "Phone note", review: "Google review" };
export const STATUSES = ["New", "In progress", "Waiting on client", "Escalated", "Resolved"] as const;
export type Status = (typeof STATUSES)[number];
export type ThreadItem = { at: string; from: "client" | "firm" | "system"; author: string; text: string };

/** Fictional case managers by practice area, and the fictional lawyer who signs off drafts in each. */
export const CASE_MANAGERS: Record<Area, string[]> = {
  EE: ["Maya Lindqvist", "Omar Haddad", "Jess Tremblay"],
  WP: ["Leila Karimi", "Nate Okafor", "Sofia Marchetti"],
  FAM: ["Daniel Osei", "Priya Raman", "Claire Dubois"],
  CIT: ["Tomás García", "Hannah Weiss"],
  INA: ["Ruth Abebe", "Marcus Lee"],
};
export const AREA_LAWYER: Record<Area, string> = { EE: "Alex Novak", WP: "Bea Sandoval", FAM: "Chidi Mensah", CIT: "Dana Whitfield", INA: "Eli Brandt" };
export type Sentiment = "negative" | "neutral" | "positive";

/** A synthetic inbound client message. `truth` holds the generator's labels, used only to measure the classifier. */
export type Message = {
  id: string;
  channel: Channel;
  received_at: string; // ISO, UTC
  client: string; // fictional full name
  matter: string | null; // fictional file number (CV-2026-04817), null for a new enquiry
  case_manager: string | null; // fictional; null until intake assigns one
  status: Status;
  subject: string;
  body: string;
  thread: ThreadItem[]; // earlier messages on the same file, oldest first
  prior_contacts_30d: number;
  truth: { area: Area; intent: Intent; root_cause: RootCause; deadline_days: number | null };
};

/** The fixed "now" for the inbox: Monday 2026-10-19, 09:00 Toronto time. */
export const INBOX_NOW = "2026-10-19T13:00:00Z";
