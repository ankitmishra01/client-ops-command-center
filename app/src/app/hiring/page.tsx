import type { Metadata } from "next";
import Shell from "@/components/Shell";
import Kanban from "@/components/Kanban";
import CaseManagerFunnel from "@/components/CaseManagerFunnel";
import Link from "next/link";
import { HIRING } from "@/lib/data";
import { HEADCOUNT, LOAD_LIMIT_HOURS, NEW_HIRES, ONBOARDING, STAGES, TEAMS, stepsDue } from "@/lib/hiring";

export const metadata: Metadata = { title: "Hiring pipeline" };
const TODAY = "2026-10-19";
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };

export default function Page() {
  const { reqs, hires, interviewers, candidates, offers_120d } = HIRING;
  const now = TEAMS.reduce((s, t) => s + HEADCOUNT[t].now, 0);
  const target = TEAMS.reduce((s, t) => s + HEADCOUNT[t].target, 0);
  const without = TEAMS.reduce((s, t) => s + (HEADCOUNT[t].target_without_systems ?? HEADCOUNT[t].target), 0);
  const openings = reqs.reduce((s, r) => s + r.openings, 0);
  const funnel = STAGES.map((_, i) => reqs.reduce((s, r) => s + r.funnel[i], 0));
  const over = interviewers.filter((x) => x.hours > LOAD_LIMIT_HOURS);
  const maxLoad = Math.max(...interviewers.map((x) => x.hours), LOAD_LIMIT_HOURS);
  const cs = HEADCOUNT["Customer success"];
  return (
    <Shell>
      <h1>Hiring pipeline and onboarding</h1>
      <p className="takeaway">Scaling from {now} to about {target} people in six months is a recruiting operation in its own right: {openings} openings across {reqs.length} roles, every one needing interviewers who also carry a caseload.</p>
      <p className="lede">Synthetic requisitions, candidates and interviewers. The plan hires {cs.target - cs.now} customer success people rather than {(cs.target_without_systems ?? cs.target) - cs.now}, because the system fixes on the CSAT page absorb part of the volume growth; the 90-day page shows the arithmetic. Before a requisition opens, the work it covers goes through the <Link href="/decide/">fix, automate or hire</Link> check.</p>
      <div className="kpis">
        <div className="kpi"><div className="v">{now} → {target}</div><div className="l">Headcount today → plan (April 2027)</div></div>
        <div className="kpi y"><div className="v">{without - target}</div><div className="l">Roles not hired because systems come first</div></div>
        <div className="kpi"><div className="v">{openings}</div><div className="l">Openings across {reqs.length} live requisitions</div></div>
        <div className="kpi"><div className="v">{funnel[0].toLocaleString()}</div><div className="l">Applicants in the pipeline</div></div>
        <div className="kpi t"><div className="v">{median(hires.map((h) => h.days_to_hire))} days</div><div className="l">Median time to hire, last 120 days</div></div>
        <div className="kpi"><div className="v">{Math.round((offers_120d.accepted / offers_120d.made) * 100)}%</div><div className="l">Offer acceptance, last 120 days ({offers_120d.accepted} of {offers_120d.made})</div></div>
        <div className="kpi p"><div className="v">{over.length}</div><div className="l">Interviewers over {LOAD_LIMIT_HOURS} h this week</div></div>
      </div>

      <div className="card">
        <h2>Funnel, all live roles</h2>
        <div className="funnel">
          {STAGES.map((st, i) => <div key={st}><span className="k">{st}</span><strong>{funnel[i].toLocaleString()}</strong>{i > 0 ? <span className="conv">{((funnel[i] / Math.max(1, funnel[i - 1])) * 100).toFixed(0)}% of previous</span> : <span className="conv">&nbsp;</span>}</div>)}
        </div>
        <p className="small muted">The screen is where volume is won or lost: at {Math.round(funnel[0] / Math.max(1, funnel[1]))} applicants per screened candidate, a structured screening form and a scored work sample save more interviewer time than any later step.</p>
      </div>

      <CaseManagerFunnel req={reqs.find((r) => r.title === "Case manager")!} acceptance={offers_120d.accepted / offers_120d.made} planHires={HEADCOUNT["Case management"].target - HEADCOUNT["Case management"].now} />

      <Kanban reqs={reqs} candidates={candidates} />

      <div className="grid2">
        <div className="card">
          <h2>Headcount plan by team</h2>
          <div className="hbar">
            {TEAMS.map((t) => { const h = HEADCOUNT[t]; const top = Math.max(...TEAMS.map((x) => HEADCOUNT[x].target_without_systems ?? HEADCOUNT[x].target)); return (
              <div key={t} style={{ display: "contents" }}>
                <span>{t}</span>
                <div className="track" style={{ position: "relative" }} title={`${h.now} today, ${h.target} planned`}>
                  {h.target_without_systems && <div style={{ position: "absolute", inset: 0, width: `${(h.target_without_systems / top) * 100}%`, border: "1px dashed var(--orange)" }} />}
                  <div className="fill alt" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${(h.target / top) * 100}%`, opacity: 0.35 }} />
                  <div className="fill" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${(h.now / top) * 100}%` }} />
                </div>
                <span className="v">{h.now} → {h.target}</span>
              </div>
            ); })}
          </div>
          <div className="legend"><span><i style={{ background: "var(--accent-action)" }} />Today</span><span><i style={{ background: "var(--teal)", opacity: 0.35 }} />Plan</span><span><i style={{ border: "1px dashed var(--orange)", background: "transparent" }} />Customer success if hired to volume ({cs.target_without_systems})</span></div>
        </div>
        <div className="card">
          <h2>Interviewer load this week</h2>
          <div className="hbar">
            {interviewers.map((x) => (
              <div key={x.name} style={{ display: "contents" }}>
                <span>{x.name}</span>
                <div className="track" style={{ position: "relative" }}><div className={`fill${x.hours > LOAD_LIMIT_HOURS ? " warn" : ""}`} style={{ width: `${(x.hours / maxLoad) * 100}%` }} /><div style={{ position: "absolute", top: -2, bottom: -2, left: `${(LOAD_LIMIT_HOURS / maxLoad) * 100}%`, borderLeft: "1px dashed var(--ink)" }} /></div>
                <span className="v">{x.hours.toFixed(1)} h</span>
              </div>
            ))}
          </div>
          <p className="small muted">Dashed line: a {LOAD_LIMIT_HOURS}-hour weekly limit (an assumption) so interviewing does not eat client work. Over the limit: add a trained interviewer to the panel or move the first interview to a recorded work sample.</p>
        </div>
      </div>

      <div className="card">
        <h2>Live requisitions</h2>
        <div className="table-wrap">
          <table style={{ minWidth: 980 }}>
            <thead><tr><th>Req</th><th>Role</th><th>Team</th><th className="num">Openings</th><th className="num">Days open</th>{STAGES.map((s) => <th key={s} className="num">{s}</th>)}<th>Flag</th></tr></thead>
            <tbody>
              {reqs.map((r) => { const late = r.days_open > r.target_days; const thin = r.funnel[3] < r.openings; return (
                <tr key={r.id}>
                  <td className="sku">{r.id}</td><td>{r.title}</td><td>{r.team}</td><td className="num">{r.openings}</td>
                  <td className="num"><span className={late ? "bad" : ""}>{r.days_open}</span> <span className="muted">/ {r.target_days}</span></td>
                  {r.funnel.map((n, i) => <td key={i} className="num">{n}</td>)}
                  <td>{late && <span className="pill breached">Over target</span>} {thin && <span className="pill at_risk">Thin late stage</span>}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
        <p className="small muted">Days open shown against the target for that role. &quot;Thin late stage&quot;: fewer candidates at the exercise stage than openings, so the role will miss its date unless sourcing widens now.</p>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Time to hire by team</h2>
          <table className="mini">
            <thead><tr><th>Team</th><th className="num">Hires, last 120 days</th><th className="num">Median days</th></tr></thead>
            <tbody>{TEAMS.map((t) => { const h = hires.filter((x) => x.team === t); return <tr key={t}><td>{t}</td><td className="num">{h.length}</td><td className="num">{h.length ? median(h.map((x) => x.days_to_hire)) : "n/a"}</td></tr>; })}</tbody>
          </table>
        </div>
        <div className="card t-teal">
          <h2>What gets automated first</h2>
          <ul className="clean small">
            <li>One intake form per role with knock-out questions (work authorisation, licence for lawyers and RCICs, French for bilingual roles), scored before a person reads a CV.</li>
            <li>Self-scheduling for interviews against panel calendars, with the weekly load limit enforced.</li>
            <li>Structured scorecards per stage, so offers are decided on the same criteria across interviewers.</li>
            <li>Offer accepted → employee record, accounts and equipment requests created without retyping (the onboarding view below).</li>
            <li>Compensation bands and levels per role family written down before the hiring wave, not after it (<Link href="/people/#pay-bands">illustrative bands</Link>).</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <h2>Onboarding: checklist and who is behind</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Each step is automated, a task triggered for its owner, or manual. Filled dot: done. Orange ring: due by today and not done. Empty: not yet due. As of {TODAY}.</p>
        <div className="table-wrap" style={{ maxHeight: "none" }}>
          <table className="checklist" style={{ minWidth: 980 }}>
            <thead><tr><th>Phase</th><th>Step</th><th>Owner</th><th>Mode</th>{NEW_HIRES.map((h) => <th key={h.name} className="num" title={`${h.title}, starts ${h.start}`}>{h.name}<div className="sku">{h.start.slice(5)}</div></th>)}</tr></thead>
            <tbody>
              {ONBOARDING.map((s) => (
                <tr key={s.id}>
                  <td className="muted">{s.phase}</td><td>{s.task}</td><td>{s.owner}</td>
                  <td><span className={`pill ${s.mode === "Automated" ? "ok" : s.mode === "Triggered task" ? "violet" : ""}`}>{s.mode}</span></td>
                  {NEW_HIRES.map((h) => { const done = h.done.includes(s.id); const due = stepsDue(h.start, TODAY).includes(s.id); return <td key={h.name} className="c">{done ? <span className="done-dot" aria-label="done" /> : due ? <span className="due-dot" aria-label="overdue" /> : <span className="todo-dot" aria-label="not yet due" />}</td>; })}
                </tr>
              ))}
              <tr><td></td><td><strong>Complete</strong></td><td></td><td></td>{NEW_HIRES.map((h) => { const p = Math.round((h.done.length / ONBOARDING.length) * 100); return <td key={h.name} className="c"><div className="progress"><span className="bar"><div style={{ width: `${p}%` }} /></span></div><span className="small">{p}%</span></td>; })}</tr>
              <tr><td></td><td><strong>Overdue steps</strong></td><td></td><td></td>{NEW_HIRES.map((h) => { const n = stepsDue(h.start, TODAY).filter((id) => !h.done.includes(id)).length; return <td key={h.name} className="c"><span className={n ? "bad" : "good"}>{n}</span></td>; })}</tr>
            </tbody>
          </table>
        </div>
        <p className="small muted">{ONBOARDING.filter((s) => s.mode !== "Manual").length} of {ONBOARDING.length} steps run without anyone remembering to start them. The manual ones are the ones that should be human: the welcome, shadowing, the first supervised queue and goal setting. Offboarding and leave follow the same pattern on the <Link href="/people/#checklists">People ops</Link> page.</p>
      </div>
    </Shell>
  );
}
