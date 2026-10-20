import type { Metadata } from "next";
import Link from "next/link";
import Shell from "@/components/Shell";
import { ONBOARDING } from "@/lib/hiring";
import { bands, CADENCE, FAMILIES, LEAVE, LEVEL_NAME, LEVELS, MAX_POSTED_RANGE, OFFBOARDING, PAY_RULES, progression, RATINGS, RUBRIC, SPREAD, type Step } from "@/lib/peopleops";

export const metadata: Metadata = { title: "People ops foundations" };
const k = (v: number) => `$${Math.round(v / 1000)}K`;
const modeClass = (m: Step["mode"]) => (m === "Automated" ? "ok" : m === "Triggered task" ? "violet" : "");

function Checklist({ title, steps, note }: { title: string; steps: Step[]; note: string }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <ol className="steplist">
        {steps.map((s) => <li key={s.task}><span className="sku">{s.when}</span><span>{s.task}</span><span className="steplist-meta"><span className="muted">{s.owner}</span> <span className={`pill ${modeClass(s.mode)}`}>{s.mode}</span></span></li>)}
      </ol>
      <p className="small muted" style={{ marginBottom: 0 }}>{note}</p>
    </div>
  );
}

export default function Page() {
  const all = FAMILIES.flatMap(bands);
  const lo = Math.floor(Math.min(...all.map((b) => b.min)) / 10000) * 10000, hi = Math.ceil(Math.max(...all.map((b) => b.max)) / 10000) * 10000;
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const ticks = Array.from({ length: Math.floor((hi - lo) / 20000) + 1 }, (_, i) => lo + i * 20000);
  const onboarding: Step[] = ONBOARDING.map((s) => ({ when: s.phase, task: s.task, owner: s.owner, mode: s.mode }));
  return (
    <Shell>
      <h1>People ops foundations</h1>
      <p className="takeaway">Before the team grows from about 60 to more than 100, write down how people are paid, reviewed, brought in, given leave and let go. Decided once, in the open, instead of case by case.</p>
      <p className="lede">Three building blocks for the people operations function: pay bands by role family and level, a review cadence with a rubric, and the onboarding, offboarding and leave checklists that payroll and Clio access hang off. Pay figures are illustrative placeholders, not market data and not anyone&apos;s pay.</p>

      <div className="card t-violet" id="pay-bands">
        <div className="section-head" style={{ marginTop: 0 }}><h2 style={{ margin: 0 }}>Pay bands by role family</h2><span className="pill at_risk">Illustrative figures</span></div>
        <p className="small muted">Base salary in CAD a year. Three levels per family; each band runs {SPREAD * 100}% either side of its midpoint, levels overlap so a strong performer can earn more than a new joiner one level up, and each band is narrower than the ${MAX_POSTED_RANGE.toLocaleString("en-CA")} Ontario allows in a posted range. The dot marks the midpoint.</p>
        <div className="bands" role="table" aria-label="Illustrative pay bands">
          <div className="bands-row bands-axis" role="row" aria-hidden="true"><span /><div className="bands-scale">{ticks.map((t) => <i key={t} style={{ left: `${x(t)}%` }}>{k(t)}</i>)}</div></div>
          {FAMILIES.map((f) => (
            <div key={f.family} className="bands-family" role="rowgroup">
              <div className="bands-fam">{f.family} <span className="muted">· steps of {progression(f).map((p) => `${Math.round(p * 100)}%`).join(" and ")}</span></div>
              {bands(f).map((b, i) => (
                <div key={i} className="bands-row" role="row">
                  <span role="rowheader"><strong>{LEVELS[i]}</strong> {LEVEL_NAME[i]}<small>{f.roles[i]}</small></span>
                  <div className="bands-track" role="cell" aria-label={`${k(b.min)} to ${k(b.max)}, midpoint ${k(b.mid)}`}>
                    {ticks.map((t) => <i key={t} className="grid" style={{ left: `${x(t)}%` }} />)}
                    <div className={`bands-bar l${i + 1}`} style={{ left: `${x(b.min)}%`, width: `${x(b.max) - x(b.min)}%` }}><span className="lo">{k(b.min)}</span><b style={{ left: `${((b.mid - b.min) / (b.max - b.min)) * 100}%` }} /><span className="hi">{k(b.max)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <h3 style={{ marginTop: 16 }}>Rules that go with the bands</h3>
        <ul className="clean small">{PAY_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>

      <div className="grid2" id="reviews">
        <div className="card">
          <h2>Performance reviews: the cadence</h2>
          <table className="mini cadence">
            <thead><tr><th>When</th><th>What</th><th>Owner</th></tr></thead>
            <tbody>{CADENCE.map((c) => <tr key={c.what}><td className="sku" style={{ whiteSpace: "nowrap" }}>{c.when}</td><td><strong>{c.what}</strong><div className="small muted">{c.detail}</div></td><td className="small">{c.owner}</td></tr>)}</tbody>
          </table>
          <p className="small muted">Probation checks reuse the day-30 and day-90 steps of the <Link href="/hiring/">onboarding checklist</Link>, so nothing is scheduled twice.</p>
        </div>
        <div className="card">
          <h2>The rubric, client-facing roles</h2>
          <p className="small muted" style={{ marginTop: 0 }}>Four ratings: {RATINGS.map((r, i) => `${i + 1} ${r.toLowerCase()}`).join(", ")}. The description below is what &quot;meeting&quot; looks like; most people should sit there.</p>
          <div className="rubric">
            {RUBRIC.map((r) => <div key={r.dimension}><h3>{r.dimension}</h3><p>{r.meeting}</p><p className="small muted"><strong>Evidence:</strong> {r.evidence}</p></div>)}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Ratings come from a manager&apos;s judgment backed by the evidence, then calibration across managers. They do not come from a dashboard number alone: queue metrics describe the system as much as the person.</p>
        </div>
      </div>

      <h2 id="checklists" style={{ marginTop: 8 }}>Joiners, leavers and leave</h2>
      <p className="lede" style={{ marginBottom: 12 }}>Each step is automated, a task created for its owner, or manual. The client-facing steps matter most: a file that changes hands without a note is the handoff complaint on the <Link href="/csat/">CSAT page</Link> waiting to happen.</p>
      <div className="grid3">
        <Checklist title="Onboarding" steps={onboarding} note="The same steps drive the per-person tracker on the hiring page." />
        <Checklist title="Offboarding" steps={OFFBOARDING} note="Access is removed by the HR system's exit date, not by someone remembering. Exit reasons feed a monthly attrition report." />
        <Checklist title="Leave" steps={LEAVE} note="Leave types and entitlements follow Ontario's Employment Standards Act and the firm's policy; this is a process checklist, to be checked with employment counsel, not advice." />
      </div>

      <div className="card t-teal">
        <h2>Payroll and one source of truth</h2>
        <ul className="clean small">
          <li>Hires, exits, leave and pay changes are entered once, in the HR system, and flow to payroll. Nothing is retyped from an email.</li>
          <li>Changes lock three business days before each pay date. Anything later goes in the next run, with an off-cycle payment only for errors.</li>
          <li>Each month, three counts are reconciled: people in the HR system, people paid, and active Clio and portal users. A Clio licence with no employee behind it is a cost and an access risk.</li>
        </ul>
      </div>
    </Shell>
  );
}
