import type { Metadata } from "next";
import Shell from "@/components/Shell";
import BusinessCase from "@/components/BusinessCase";
import { WEEKLY } from "@/lib/data";
import { defaultModelInputs, rootCauseClusters, windowTotals } from "@/lib/metrics";
import { AREA_LABEL, AREAS } from "@/lib/taxonomy";

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

export const metadata: Metadata = { title: "First 90 days & business case" };

const GANTT: { phase?: string; label: string; from: number; to: number; cls: string; text?: string }[] = [
  { phase: "Days 1 to 30 · baseline", label: "Sit in every queue; map how a message moves", from: 1, to: 2, cls: "ph1" },
  { label: "Hand-label 500 messages (classifier test set)", from: 1, to: 4, cls: "ph1" },
  { label: "Baseline scorecard by practice area", from: 2, to: 4, cls: "ph1", text: "COO sign-off" },
  { label: "Quick wins: owners, SLA queue, complaint log", from: 1, to: 3, cls: "ph1" },
  { label: "Hiring: scorecards, interviewer limit, bands", from: 1, to: 6, cls: "ph1" },
  { phase: "Days 31 to 60 · build and pilot in one area", label: "Silent-file alert and proactive updates", from: 5, to: 9, cls: "ph2" },
  { label: "Triage queue with approved-template drafts", from: 5, to: 9, cls: "ph2" },
  { label: "No-show alert, closure notice, handoff note", from: 5, to: 8, cls: "ph2" },
  { label: "Onboarding automation for the hiring wave", from: 4, to: 8, cls: "ph2" },
  { phase: "Days 61 to 90 · scale to all five", label: "Roll out area by area with playbooks", from: 10, to: 13, cls: "ph3" },
  { label: "Team leads own rules and templates", from: 10, to: 13, cls: "ph3" },
  { label: "Re-run business case; reset hiring plan", from: 12, to: 13, cls: "ph3" },
  { phase: "Throughout", label: "Weekly KPI review with the COO", from: 2, to: 13, cls: "ongoing" },
];
const CHECKPOINTS = [4, 9, 13];

function Gantt() {
  return (
    <div className="card">
      <h2>Timeline, week by week</h2>
      <p className="small muted" style={{ marginTop: 0 }}>Thirteen weeks. Bold week numbers are checkpoints (day 30, 60 and 90), where the work stops if the numbers do not clear.</p>
      <div className="gantt" role="table" aria-label="90-day timeline">
        <div className="g-row head" role="row"><div className="g-label" role="columnheader">Workstream</div>{Array.from({ length: 13 }, (_, i) => <div key={i} className={`g-wk${CHECKPOINTS.includes(i + 1) ? " cp" : ""}`} style={{ gridColumn: i + 2 }} role="columnheader">W{i + 1}</div>)}</div>
        {GANTT.map((g) => (
          <div key={g.label}>
            {g.phase && <div className="g-row head"><div className="g-label" style={{ gridColumn: "1 / -1", fontWeight: 600, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent-text)", background: "transparent" }}>{g.phase}</div></div>}
            <div className="g-row" role="row">
              <div className="g-label" role="cell">{g.label}</div>
              <div className={`g-bar ${g.cls}`} style={{ gridColumn: `${g.from + 1} / ${g.to + 2}` }} role="cell">{g.text ?? `W${g.from}${g.to > g.from ? `–${g.to}` : ""}`}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const initial = defaultModelInputs(WEEKLY);
  // Pilot area: the one with the highest share of status-silence messages, where proactive updates have the most to remove.
  const pilot = [...AREAS].sort((a, b) => (rootCauseClusters(WEEKLY, 8, b).find((c) => c.root_cause === "status_silence")?.share ?? 0) - (rootCauseClusters(WEEKLY, 8, a).find((c) => c.root_cause === "status_silence")?.share ?? 0))[0];
  const b = windowTotals(WEEKLY, "ALL", 4);
  const kpis = [
    { k: "Escalations per 100 open files (headline)", def: "Escalations to a manager, lawyer or outside body in 4 weeks, per 100 paid open files. Normalised so growth alone does not move it.", base: b.escalations_per_100_files.toFixed(2), d60: `−25% in the pilot area vs. the other four`, d90: `−35% across all five (≤ ${(b.escalations_per_100_files * 0.65).toFixed(2)})` },
    { k: "Silent files", def: "Paid open files with no client update in 14 or more days.", base: `${Math.round(b.silent_files).toLocaleString()} (${pct(b.silent_file_rate)})`, d60: "Under 10% in the pilot area", d90: "Under 5% everywhere; none over 30 days" },
    { k: "Speed to first contact", def: "Median hours from a new lead or consult request to a person contacting them.", base: `${b.first_contact_hours.toFixed(1)} h`, d60: "Under 4 business hours", d90: "Under 2 business hours" },
    { k: "Missed consultations", def: "Booked consultations the firm did not call or join.", base: `${(b.consult_missed_rate * 100).toFixed(1)}%`, d60: "Under 3%, every miss called back the same day", d90: "Under 1%" },
    { k: "CSAT", def: "Share of survey responses scoring 4 or 5 out of 5.", base: pct(b.csat), d60: "Pilot area not below its baseline", d90: "+5 points across all five" },
    { k: "Google rating, new reviews", def: "Average star rating of reviews posted in the period.", base: b.rating.toFixed(2), d60: "Hold at or above baseline", d90: "Back above 4.6" },
  ];
  return (
    <Shell>
      <h1>First 90 days and the business case</h1>
      <p className="takeaway">Systems before headcount: measure where the volume comes from, fix the causes in one practice area, prove it, then scale to all five, and hire for what is left.</p>
      <p className="lede">A 30/60/90 plan with a checkpoint at each stage, and a simple model of what the fixes are worth: messages avoided × handling time → hours saved → hires deferred. Every assumption is labelled and editable.</p>

      <div className="steps" aria-label="Plan stages"><div><span className="n">1</span>Days 1 to 30: baseline</div><div><span className="n">2</span>Days 31 to 60: build and pilot in one area</div><div><span className="n">3</span>Days 61 to 90: scale to all five</div></div>
      <Gantt />
      <div className="grid3">
        <div className="card phase">
          <p className="eyebrow" style={{ marginTop: 0 }}>Days 1 to 30</p>
          <h3>Baseline, and the quick wins that need no software</h3>
          <ul className="clean small">
            <li>Sit in every queue: client success, case processing, intake, billing. Map how a message moves from inbox to answer, and where it waits.</li>
            <li>Hand-label 500 recent messages by practice area, intent and root cause. This is the test set for any classifier, rules or model.</li>
            <li>Baseline by practice area: first-response time, CSAT, Google rating and volume, complaint and escalation rates.</li>
            <li>Inventory the case management fields and matter stages, the inboxes and the client portal events a status update could be triggered from. Agree data handling with the COO and the lawyers: privileged content stays inside the firm&apos;s systems.</li>
            <li>Quick wins: one owner per inbox, a visible SLA queue, a complaint log with a root-cause field, a weekly operations review.</li>
            <li>People: structured screening and scorecards for the open roles, an interviewer load limit, draft compensation bands.</li>
          </ul>
          <div className="gate"><strong>Checkpoint, day 30.</strong> COO signs off the baseline, including escalations per 100 files and the silent-file count by area. Rules agree with the hand labels on at least 85% of intents (or the rules are fixed first). Pilot area chosen from the data.</div>
        </div>
        <div className="card phase p2">
          <p className="eyebrow" style={{ marginTop: 0 }}>Days 31 to 60</p>
          <h3>Build and pilot in one practice area</h3>
          <ul className="clean small">
            <li>Pilot the triage queue in one practice area, where the fixes have most to remove. In this synthetic data that is <strong>{AREA_LABEL[pilot]}</strong>, with the highest share of silence-after-payment messages.</li>
            <li>Silent-file alert and proactive status updates triggered by matter milestones, plus a 14-day &quot;nothing has changed&quot; note.</li>
            <li>Consult no-show alert to the team lead within 15 minutes; no file closed without a lawyer-approved closure notice; a handoff note whenever a file changes owner.</li>
            <li>Draft replies from lawyer-approved templates only, with a lawyer signing off anything with a deadline, an escalation or a closed file.</li>
            <li>One document checklist per matter type in the pilot area.</li>
            <li>Onboarding automation live for the hiring wave; the other four areas continue as they are and act as the comparison.</li>
          </ul>
          <div className="gate"><strong>Checkpoint, day 60.</strong> Escalations per 100 files down at least 25% in the pilot against the other four areas, silent files under 10%, first-response SLA met on 90% or more. Zero replies sent without approval, zero legal advice in drafts. CSAT not down. If the numbers do not clear, fix or stop before scaling.</div>
        </div>
        <div className="card phase p3">
          <p className="eyebrow" style={{ marginTop: 0 }}>Days 61 to 90</p>
          <h3>Scale to all five practice areas</h3>
          <ul className="clean small">
            <li>Roll out area by area with a short playbook for each: its milestones, its document checklists, its escalation contacts.</li>
            <li>Weekly dashboard to the COO and practice leads: CSAT, reviews, complaint and escalation rates, SLA, root-cause mix.</li>
            <li>Team leads own the routing rules and templates, with a change log, so the system improves without a ticket to IT.</li>
            <li>Re-run the business case with measured, not assumed, avoided volume, and reset the customer success hiring plan to match.</li>
          </ul>
          <div className="gate"><strong>Checkpoint, day 90.</strong> Measured avoided volume compared with the model below. Hiring plan for the next quarter set from it. Next fixes chosen from the root-cause data (billing explainer, handoff notes, portal self-help).</div>
        </div>
      </div>

      <div className="card t-violet" id="scorecard">
        <h2>Scorecard</h2>
        <p className="small muted" style={{ marginTop: 0 }}>One headline number, escalations per 100 open files, because it captures what clients feel and cannot be improved by growth alone. Baselines are the last four weeks of synthetic data; targets are proposals to agree with the COO at day 30.</p>
        <div className="table-wrap" style={{ maxHeight: "none" }}>
          <table style={{ minWidth: 760 }}>
            <thead><tr><th>KPI</th><th>Definition</th><th className="num">Baseline (synthetic)</th><th>Day 60 target</th><th>Day 90 target</th></tr></thead>
            <tbody>{kpis.map((r, i) => <tr key={r.k}><td style={{ fontWeight: i === 0 ? 700 : 600 }}>{r.k}</td><td className="muted" style={{ minWidth: 220 }}>{r.def}</td><td className="num">{r.base}</td><td>{r.d60}</td><td>{r.d90}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <h2 style={{ marginTop: 8 }} id="business-case">Business case: systems before headcount</h2>
      <p className="lede" style={{ marginBottom: 12 }}>Defaults use the last four weeks of synthetic volume and the last eight weeks of root-cause shares. The avoidable rates and costs are assumptions; the 30-day baseline replaces them.</p>
      <BusinessCase initial={initial} />
      <div className="card">
        <h2>What the model leaves out, on purpose</h2>
        <ul className="clean small">
          <li>Revenue effects: better reviews and fewer complaints should help conversion and referrals, but they are not counted. The case stands on cost alone.</li>
          <li>Lawyer and consultant time: fewer status calls frees licensed time too; only client success time is counted.</li>
          <li>Partial hires: a fraction of a person is not a saving until volume grows into it, so hires deferred rounds down.</li>
          <li>Real fees, salaries and volumes: none are known from outside the firm. Every cost figure here is a placeholder.</li>
        </ul>
      </div>
    </Shell>
  );
}
