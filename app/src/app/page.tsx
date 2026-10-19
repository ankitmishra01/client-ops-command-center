import Link from "next/link";
import Shell from "@/components/Shell";
import { INBOX, SILENT, WEEKLY } from "@/lib/data";
import { defaultModelInputs, rootCauseClusters, windowTotals } from "@/lib/metrics";
import { runModel } from "@/lib/model";

export default function Home() {
  const last = windowTotals(WEEKLY, "ALL", 4);
  const first = windowTotals(WEEKLY, "ALL", 4, 22);
  const target = last.escalations_per_100_files * 0.65;
  const removable = rootCauseClusters(WEEKLY, 8).reduce((s, c) => s + c.removable_share, 0);
  const model = runModel(defaultModelInputs(WEEKLY));
  const silenceFix = rootCauseClusters(WEEKLY, 8).find((c) => c.root_cause === "status_silence")?.removable_share ?? 0;
  const tiles = [
    { k: "Escalations per 100 open files", v: last.escalations_per_100_files.toFixed(2), was: `from ${first.escalations_per_100_files.toFixed(2)} in April`, goal: `90-day target ≤ ${target.toFixed(2)}`, cls: "y" },
    { k: "CSAT (4 or 5 out of 5)", v: `${(last.csat * 100).toFixed(0)}%`, was: `from ${(first.csat * 100).toFixed(0)}% in April`, goal: "90-day target +5 points", cls: "" },
    { k: "Google rating, new reviews", v: last.rating.toFixed(2), was: `from ${first.rating.toFixed(2)} in April`, goal: "90-day target above 4.6", cls: "" },
    { k: "Silent files (paid, no update 14+ days)", v: `${(last.silent_file_rate * 100).toFixed(0)}%`, was: `from ${(first.silent_file_rate * 100).toFixed(0)}% in April`, goal: "90-day target under 5%", cls: "p" },
  ];
  return (
    <Shell>
      <section className="hero">
        <div>
          <p className="hero-eyebrow">Simulated target on synthetic data</p>
          <h1>Escalations per 100 client files: from {last.escalations_per_100_files.toFixed(2)} to {target.toFixed(2)} in 90 days.</h1>
          <p className="hero-lede">A working prototype of the system a Head of Operations &amp; Customer Success would build first at a fast-growing immigration practice: every client message triaged, owned and answered on time, satisfaction tied to root causes, hiring run as a pipeline, and a 90-day plan with the arithmetic.</p>
          <div className="hero-actions">
            <a className="btn hero-cta" href="#tour">Take the 60-second tour</a>
            <Link className="btn ghost hero-cta" href="/triage/">Open the triage queue</Link>
          </div>
        </div>
        <ol className="sequence">
          <li><span>01</span><strong>Triage</strong>Every message labelled, timed and owned; a lawyer approves risky replies.</li>
          <li><span>02</span><strong>Fix causes</strong>{(removable * 100).toFixed(0)}% of volume traced to causes a system can remove.</li>
          <li><span>03</span><strong>Then hire</strong>{model.hires_deferred} customer success hires deferred at default assumptions.</li>
        </ol>
      </section>

      <div className="tiles" aria-label="Headline KPIs, last 4 weeks, synthetic">
        {tiles.map((t) => <div key={t.k} className={`tile ${t.cls}`}><span className="k">{t.k}</span><strong>{t.v}</strong><span className="was">{t.was}</span><span className="goal">{t.goal}</span></div>)}
      </div>
      <p className="small muted" style={{ margin: "6px 0 24px" }}>Last four weeks of synthetic data for a firm whose volume grew about five times in six months. Targets are proposals for the 90-day plan.</p>

      <section id="tour" className="tour" aria-label="60-second tour">
        <h2>60-second tour</h2>
        <ol>
          <li><Link href="/triage/"><span className="n">1</span><strong>One message, start to finish</strong><span>A client paid, heard nothing for 12 days and posted a one-star review. See it classified, timed, routed and answered with a lawyer-approved draft.</span></Link></li>
          <li><Link href="/csat/"><span className="n">2</span><strong>Why clients write in</strong><span>Silence after payment is the biggest root cause. Proactive status updates alone would remove an estimated {(silenceFix * 100).toFixed(0)}% of all messages.</span></Link></li>
          <li><Link href="/hiring/"><span className="n">3</span><strong>Hiring as a pipeline</strong><span>15 roles, a candidate board, interviewer load and an onboarding tracker for growing from 60 to about 100 people.</span></Link></li>
          <li><Link href="/plan/"><span className="n">4</span><strong>The first 90 days</strong><span>Baseline, pilot in one practice area, scale to all five. Drag the sliders to see hours saved and hires deferred.</span></Link></li>
        </ol>
      </section>

      <div className="bigcards">
        <Link href="/triage/" className="bigcard"><span className="panel-index">01 · Escalations &amp; complaints</span><h2>Triage</h2><p>{INBOX.length} email, portal, phone and review messages over 30 days with live SLA timers, owners, statuses, the full thread and a reply draft for approval.</p><span className="go">Open triage →</span></Link>
        <Link href="/csat/" className="bigcard"><span className="panel-index">02 · Client experience</span><h2>CSAT &amp; reviews</h2><p>26 weeks of CSAT, Google rating and escalations by practice area, a tagged review feed, root-cause clusters and today&apos;s {SILENT.length} silent files.</p><span className="go">Open the dashboard →</span></Link>
        <Link href="/hiring/" className="bigcard"><span className="panel-index">03 · People operations</span><h2>Hiring</h2><p>Requisitions, a candidate board, time to hire, offer acceptance, interviewer load and onboarding progress for every new hire.</p><span className="go">Open hiring →</span></Link>
        <Link href="/plan/" className="bigcard dark"><span className="panel-index">04 · Plan</span><h2>First 90 days</h2><p>A week-by-week timeline, a KPI scorecard and an interactive &quot;systems before headcount&quot; model.</p><span className="go">Open the plan →</span></Link>
      </div>

      <section className="card why" aria-label="Why this matters for CanadaVisa">
        <p className="eyebrow" style={{ marginTop: 0 }}>Why this matters for CanadaVisa</p>
        <div className="why-grid">
          <div><h3>A builder, not an administrator</h3><p>The role asks for someone who builds better systems. Everything here is working software with tests, not slides, and it was built with the same AI tools the firm is adopting.</p></div>
          <div><h3>Systems before headcount</h3><p>Each root cause has a fix, and the model turns removed volume into hires the firm does not need to make: {model.hires_deferred} in customer success at default assumptions.</p></div>
          <div><h3>Five practice areas</h3><p>Express Entry, work permits, family sponsorship, citizenship and criminal inadmissibility. Every queue, chart and target splits by them.</p></div>
          <div><h3>The themes clients raise</h3><p>Unreturned calls and missed consults, silence after payment, files closed without explanation and details lost in handoffs are each a tracked root cause with a fix.</p></div>
          <div><h3>Guardrails built in</h3><p>Lawyer-approved templates only, no automated legal advice, client data kept in approved systems, and a lawyer signs off anything with a deadline or an escalation.</p></div>
        </div>
      </section>
    </Shell>
  );
}
