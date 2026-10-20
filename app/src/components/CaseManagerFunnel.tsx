"use client";
import { useMemo, useState } from "react";
import { caseManagerPlan, firstNinetyDays, NOTICE_DAYS, RAMP, weeksToFull } from "@/lib/funnel";
import { INTERVIEW_HOURS, type Req } from "@/lib/hiring";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** High-volume hiring for case managers: the live requisition's funnel, worked backwards from a cohort size. */
export default function CaseManagerFunnel({ req, acceptance, planHires }: { req: Req; acceptance: number; planHires: number }) {
  const open = req.openings - req.funnel[5];
  const [hires, setHires] = useState(open);
  const p = useMemo(() => caseManagerPlan(req.funnel, acceptance, hires), [req, acceptance, hires]);
  return (
    <div className="card t-violet" id="case-managers">
      <h2>High-volume hiring: case managers</h2>
      <p className="small muted" style={{ marginTop: 0 }}>{req.id}, {req.openings} openings, {req.funnel[5]} filled so far, open {req.days_open} days against a {req.target_days}-day target. Conversion between stages comes from this requisition; the last stage uses the firm-wide offer acceptance rate ({pct(acceptance)}) because offers still out have not been decided. Stage days, notice and ramp are assumptions.</p>
      <div className="kpis" style={{ marginTop: 12 }}>
        <div className="kpi"><div className="v">{Math.round(p.applicants_per_hire)}</div><div className="l">Applicants needed per case manager hired</div></div>
        <div className="kpi y"><div className="v">{p.days_today} → {p.days_target} days</div><div className="l">Time to hire: today&apos;s stages → proposed stage targets</div></div>
        <div className="kpi"><div className="v">{p.interviewer_hours_per_hire.toFixed(1)} h</div><div className="l">Interviewer time per hire (interview plus work-sample review)</div></div>
        <div className="kpi t"><div className="v">{weeksToFull()} weeks</div><div className="l">Start date to a full caseload</div></div>
        <div className="kpi p"><div className="v">{Math.round(p.to_full_target / 7)} weeks</div><div className="l">Requisition opened → full caseload, at target ({Math.round(p.to_full_today / 7)} today)</div></div>
      </div>
      <div className="cm-plan-head">
        <label htmlFor="cm-hires">Plan a cohort of <output>{hires}</output> case manager{hires === 1 ? "" : "s"}</label>
        <input id="cm-hires" type="range" min={1} max={16} value={hires} onChange={(e) => setHires(Number(e.target.value))} />
        <span className="small muted">{open} openings still to fill on {req.id}; {planHires} case-management hires in the six-month plan.</span>
      </div>
      <div className="table-wrap" style={{ maxHeight: "none" }}>
        <table className="cm-funnel">
          <thead><tr><th>Stage</th><th>What happens</th><th className="num">Live now</th><th className="num">Conversion</th><th className="num">Needed for {hires}</th><th className="num">Days today</th><th className="num">Target days</th></tr></thead>
          <tbody>
            {p.stages.map((s, i) => (
              <tr key={s.stage}>
                <td style={{ fontWeight: 600 }}>{s.stage}</td><td className="muted">{s.note}</td>
                <td className="num">{s.live}</td><td className="num">{i === 0 ? "" : pct(s.conv)}</td><td className="num"><strong>{s.need}</strong></td>
                <td className="num">{i === 0 ? "" : s.days_today}</td><td className="num">{i === 0 ? "" : s.days_target}</td>
              </tr>
            ))}
            <tr><td><strong>Total</strong></td><td className="muted">Plus {NOTICE_DAYS} days&apos; notice before the start date</td><td></td><td className="num">{(p.applicants_per_hire ? (1 / p.applicants_per_hire) * 100 : 0).toFixed(1)}%</td><td className="num" style={{ whiteSpace: "nowrap" }}>{p.interviewer_hours.toFixed(0)} h interviewing</td><td className="num"><strong>{p.days_today}</strong></td><td className="num"><strong>{p.days_target}</strong></td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <h3>Ramp to a full caseload</h3>
          <div className="ramp" role="img" aria-label={`Share of a full caseload by week: ${RAMP.map((r, i) => `week ${i + 1} ${pct(r)}`).join(", ")}`}>
            {RAMP.map((r, i) => <div key={i} title={`Week ${i + 1}: ${pct(r)} of a full caseload`}><span style={{ height: `${Math.max(2, r * 100)}%` }} /><small>W{i + 1}</small></div>)}
          </div>
          <p className="small muted">Weeks 1 and 2: training and shadowing. Weeks 3 to 10: a supervised queue that grows as drafts pass review. A new case manager carries about {pct(firstNinetyDays())} of a full caseload across the first 90 days, so capacity planned for January has to be hired in October.</p>
        </div>
        <div>
          <h3>Why this funnel is run as a cohort</h3>
          <ul className="clean small">
            <li>Start dates are grouped (four case managers together every six weeks), so one trainer runs one onboarding and buddies are not stretched.</li>
            <li>The screen does the volume work: about {Math.round(p.stages[0].need / Math.max(1, p.stages[1].need))} applicants per screened candidate, scored by the form before a recruiter reads anything.</li>
            <li>The work sample replaces a second interview. It tests the job (a clear client update, a missing document) and costs reviewers about {Math.round(INTERVIEW_HOURS.case * 60)} minutes a candidate.</li>
            <li>Each stage has a day target, and a candidate waiting past it shows on the board, because in high-volume hiring the best applicants accept the first credible offer.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
