import Link from "next/link";
import Shell from "@/components/Shell";
import { classify, slaStatus } from "@/lib/classify";
import { INBOX, WEEKLY } from "@/lib/data";
import { rootCauseClusters, windowTotals } from "@/lib/metrics";
import { HEADCOUNT, TEAMS } from "@/lib/hiring";
import { INBOX_NOW } from "@/lib/taxonomy";

export default function Home() {
  const cls = INBOX.map((m) => ({ m, c: classify(m) }));
  const breached = cls.filter(({ m, c }) => slaStatus(c.priority, m.received_at, INBOX_NOW).state === "breached").length;
  const p1 = cls.filter(({ c }) => c.priority === "P1").length;
  const last = windowTotals(WEEKLY, "ALL", 4);
  const first = windowTotals(WEEKLY, "ALL", 4, 22);
  const removable = rootCauseClusters(WEEKLY, 8).reduce((s, c) => s + c.removable_share, 0);
  const now = TEAMS.reduce((s, t) => s + HEADCOUNT[t].now, 0);
  const target = TEAMS.reduce((s, t) => s + HEADCOUNT[t].target, 0);
  return (
    <Shell>
      <section className="hero">
        <div>
          <p className="hero-eyebrow">Client experience and operations</p>
          <h1>Build the system before adding the people.</h1>
          <p className="hero-lede">A working prototype of the command center a Head of Operations &amp; Customer Success would run at a fast-growing immigration practice: every client message triaged and owned, satisfaction tied to root causes, a hiring pipeline for the scale-up, and a 90-day plan with the arithmetic.</p>
          <div className="hero-actions">
            <Link className="btn hero-cta" href="/triage/">Open the triage queue</Link>
            <Link className="btn ghost hero-cta" href="/plan/">See the 90-day plan</Link>
          </div>
        </div>
        <ol className="sequence">
          <li><span>01</span><strong>Triage</strong>Label, prioritise, route and draft, with a person approving every reply.</li>
          <li><span>02</span><strong>Fix causes</strong>Rank root causes by how much volume each system fix removes.</li>
          <li><span>03</span><strong>Then hire</strong>Hire for the volume that is left, and onboard without retyping.</li>
        </ol>
      </section>
      <div className="live-strip" aria-label="Headline numbers (synthetic)">
        <div><span className="k">Open messages</span><strong>{INBOX.length}</strong></div>
        <div><span className="k">SLA breached</span><strong>{breached}</strong></div>
        <div><span className="k">P1 deadlines</span><strong>{p1}</strong></div>
        <div><span className="k">CSAT, last 4 wks</span><strong>{(last.csat * 100).toFixed(0)}% <span className="muted" style={{ fontSize: 13 }}>from {(first.csat * 100).toFixed(0)}%</span></strong></div>
        <div><span className="k">Volume removable</span><strong>{(removable * 100).toFixed(0)}%</strong></div>
        <div><span className="k">Headcount plan</span><strong>{now} → {target}</strong></div>
      </div>
      <div className="workspace">
        <div className="panel"><p className="panel-index">01 · Escalations &amp; complaints</p><h2>Triage queue</h2><p>300 email and portal messages across five practice areas, each labelled by intent, root cause, tone, deadline and escalation risk, with the rule that fired. SLA queues, owners and a draft reply for approval.</p><Link className="panel-link" href="/triage/">Open triage</Link></div>
        <div className="panel"><p className="panel-index">02 · CSAT &amp; reviews</p><h2>Satisfaction, tied to causes</h2><p>26 weeks of CSAT, Google reviews, complaint and escalation rates by practice area, and the system fix for each root cause with the share of volume it would remove.</p><Link className="panel-link" href="/csat/">Open the dashboard</Link></div>
        <div className="panel"><p className="panel-index">03 · People operations</p><h2>Hiring pipeline</h2><p>Funnel and requisitions for the scale-up, time to hire, interviewer load against a weekly limit, and an onboarding checklist that shows who is behind.</p><Link className="panel-link" href="/hiring/">Open hiring</Link></div>
      </div>
      <div className="workspace" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="panel"><p className="panel-index">04 · Plan</p><h2>First 90 days and the business case</h2><p>Baseline, pilot in one practice area, scale to all five, with a checkpoint at each stage. An editable model: messages avoided × handling time → hours saved → hires deferred.</p><Link className="panel-link" href="/plan/">Open the plan</Link></div>
        <div className="panel"><p className="panel-index">05 · Methodology</p><h2>What is real and what is not</h2><p>Synthetic data, limits, privacy and privilege, and how it would connect to the practice management system, email and the client portal.</p><Link className="panel-link" href="/about/">Read the methodology</Link></div>
      </div>
    </Shell>
  );
}
