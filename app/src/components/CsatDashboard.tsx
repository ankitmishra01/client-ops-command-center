"use client";
import { useState } from "react";
import LineChart from "@/components/LineChart";
import type { WeekRow } from "@/lib/generate";
import { rootCauseClusters, series, windowTotals } from "@/lib/metrics";
import { AREA_LABEL, AREA_SHORT, AREAS, ROOT_LABEL, type Area } from "@/lib/taxonomy";

export const AREA_COLOR: Record<Area, string> = { EE: "#6238D1", WP: "#197A4B", FAM: "#A23F36", CIT: "#9A5B0A", INA: "#10172A" };
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const lbl = (w: string) => new Date(w + "T12:00:00Z").toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

function Delta({ now, before, good, fmt }: { now: number; before: number; good: "up" | "down"; fmt: (v: number) => string }) {
  const d = now - before; const better = good === "up" ? d > 0 : d < 0;
  return <span className={Math.abs(d) < 1e-9 ? "muted" : better ? "good" : "bad"} style={{ fontSize: 12 }}>{d > 0 ? "+" : d < 0 ? "−" : ""}{fmt(Math.abs(d))} vs first 4 weeks</span>;
}

export default function CsatDashboard({ rows }: { rows: WeekRow[] }) {
  const [area, setArea] = useState<Area | "ALL">("ALL");
  const s = series(rows, area);
  const labels = s.map((x) => lbl(x.week));
  const last = windowTotals(rows, area, 4);
  const first = windowTotals(rows, area, 4, 22);
  const clusters = rootCauseClusters(rows, 8, area);
  const fixable = clusters.filter((c) => c.fix);
  const allLevers = fixable.reduce((t, c) => t + c.removable_share, 0);
  const per = (a: Area) => series(rows, a);
  return (
    <>
      <div className="area-tabs" role="group" aria-label="Practice area">
        <button className={area === "ALL" ? "on" : ""} aria-pressed={area === "ALL"} onClick={() => setArea("ALL")}>All areas</button>
        {AREAS.map((a) => <button key={a} className={area === a ? "on" : ""} aria-pressed={area === a} onClick={() => setArea(a)}>{AREA_SHORT[a]}</button>)}
      </div>
      <div className="kpis">
        <div className="kpi y"><div className="v">{last.escalations_per_100_files.toFixed(2)}</div><div className="l"><strong>Headline:</strong> escalations per 100 open files, per 4 weeks</div><Delta now={last.escalations_per_100_files} before={first.escalations_per_100_files} good="down" fmt={(v) => v.toFixed(2)} /></div>
        <div className="kpi"><div className="v">{pct(last.csat)}</div><div className="l">CSAT, share scoring 4 or 5 of 5</div><Delta now={last.csat} before={first.csat} good="up" fmt={(v) => `${(v * 100).toFixed(1)} pts`} /></div>
        <div className="kpi"><div className="v">{last.rating.toFixed(2)}</div><div className="l">Google rating, new reviews ({Math.round(last.reviews / 4)} a week)</div><Delta now={last.rating} before={first.rating} good="up" fmt={(v) => v.toFixed(2)} /></div>
        <div className="kpi p"><div className="v">{Math.round(last.silent_files).toLocaleString()} <span style={{ fontSize: 14 }}>({pct(last.silent_file_rate, 0)})</span></div><div className="l">Silent files: paid, no client update in 14+ days</div><Delta now={last.silent_file_rate} before={first.silent_file_rate} good="down" fmt={(v) => `${(v * 100).toFixed(1)} pts`} /></div>
        <div className="kpi"><div className="v">{last.first_contact_hours.toFixed(1)} h</div><div className="l">Speed to first contact, new leads (median)</div><Delta now={last.first_contact_hours} before={first.first_contact_hours} good="down" fmt={(v) => `${v.toFixed(1)} h`} /></div>
        <div className="kpi p"><div className="v">{pct(last.consult_missed_rate)}</div><div className="l">Consultations the firm missed</div><Delta now={last.consult_missed_rate} before={first.consult_missed_rate} good="down" fmt={(v) => `${(v * 100).toFixed(1)} pts`} /></div>
      </div>
      <p className="small muted" style={{ margin: "-6px 0 14px" }}>Also: {Math.round(last.tickets / 4).toLocaleString()} inbound messages a week (from {Math.round(first.tickets / 4).toLocaleString()}), {Math.round(last.open_files).toLocaleString()} open files, complaint rate {pct(last.complaint_rate)} per message, median first response to existing clients {last.first_response_hours.toFixed(1)} h. Deltas compare the last 4 weeks with the first 4.</p>

      <div className="charts2">
        <div className="card">
          <h2>Volume grew about five times; satisfaction slipped as it did</h2>
          <p className="chart-note" style={{ marginTop: -4, marginBottom: 8 }}>Inbound messages per week, {area === "ALL" ? "by practice area" : AREA_LABEL[area]}</p>
          <LineChart labels={labels} ariaLabel="Inbound messages per week" series={area === "ALL" ? AREAS.map((a) => ({ name: AREA_SHORT[a], color: AREA_COLOR[a], values: per(a).map((x) => x.tickets) })) : [{ name: AREA_SHORT[area], color: AREA_COLOR[area], values: s.map((x) => x.tickets) }]} />
        </div>
        <div className="card">
          <h2>CSAT by week</h2>
          <p className="chart-note" style={{ marginTop: -4, marginBottom: 8 }}>Share of survey responses scoring 4 or 5 out of 5</p>
          <LineChart labels={labels} min={0.6} fmt={(v) => `${Math.round(v * 100)}%`} ariaLabel="CSAT by week" series={area === "ALL" ? AREAS.map((a) => ({ name: AREA_SHORT[a], color: AREA_COLOR[a], values: per(a).map((x) => x.csat), width: 1.5 })) : [{ name: AREA_SHORT[area], color: AREA_COLOR[area], values: s.map((x) => x.csat) }]} />
        </div>
        <div className="card">
          <h2>Escalations per 100 open files</h2>
          <p className="chart-note" style={{ marginTop: -4, marginBottom: 8 }}>The headline KPI, per 4 weeks, {area === "ALL" ? "all areas" : AREA_LABEL[area]}. Normalised by open files so growth alone does not move it.</p>
          <LineChart labels={labels} fmt={(v) => v.toFixed(2)} ariaLabel="Escalations per 100 open files" series={[{ name: "Escalations per 100 files", color: "#6238D1", values: s.map((x) => x.escalations_per_100_files) }]} />
        </div>
        <div className="card">
          <h2>Silent files and speed to first contact</h2>
          <p className="chart-note" style={{ marginTop: -4, marginBottom: 8 }}>Share of paid open files with no client update in 14+ days, and the median hours before a new lead hears from a person</p>
          <LineChart labels={labels} height={150} fmt={(v) => `${Math.round(v * 100)}%`} ariaLabel="Silent file rate" series={[{ name: "Silent files", color: "#A23F36", values: s.map((x) => x.silent_file_rate) }]} />
          <LineChart labels={labels} height={130} fmt={(v) => `${v.toFixed(0)} h`} ariaLabel="Speed to first contact" series={[{ name: "Speed to first contact (h)", color: "#9A5B0A", values: s.map((x) => x.first_contact_hours) }]} />
        </div>
        <div className="card">
          <h2>Google reviews</h2>
          <p className="chart-note" style={{ marginTop: -4, marginBottom: 8 }}>Average star rating of new reviews each week, and reviews per week</p>
          <LineChart labels={labels} min={3.8} fmt={(v) => v.toFixed(2)} height={160} ariaLabel="Average Google rating" series={[{ name: "Average rating", color: "#10172A", values: s.map((x) => x.rating) }]} />
          <LineChart labels={labels} height={120} ariaLabel="Reviews per week" series={[{ name: "Reviews per week", color: "#9A5B0A", values: s.map((x) => x.reviews) }]} />
        </div>
      </div>

      <div className="card t-violet">
        <h2>Root causes, and the system fix for each</h2>
        <p className="takeaway" style={{ margin: "0 0 6px" }}>Taken together, the {fixable.length} fixes would remove an estimated {pct(allLevers, 0)} of all inbound messages{area === "ALL" ? "" : ` in ${AREA_LABEL[area]}`}; proactive status updates alone would remove {pct(fixable.find((c) => c.root_cause === "status_silence")?.removable_share ?? 0, 0)}.</p>
        <p className="small muted" style={{ marginTop: 0 }}>Share of messages by root cause over the last 8 weeks. &quot;Removable&quot; = share × the assumed avoidable rate for that fix (an assumption to test in the pilot, shown in brackets). The business case on the 90-day page uses the same numbers.</p>
        <div className="table-wrap" style={{ maxHeight: "none" }}>
          <table>
            <thead><tr><th>Root cause</th><th className="num">Per week</th><th className="num">Share</th><th style={{ minWidth: 140 }}></th><th>System fix</th><th className="num">Removable share of all messages</th></tr></thead>
            <tbody>
              {clusters.map((c) => (
                <tr key={c.root_cause}>
                  <td>{ROOT_LABEL[c.root_cause]}</td>
                  <td className="num">{Math.round(c.per_week).toLocaleString()}</td>
                  <td className="num">{pct(c.share)}</td>
                  <td><div className="bar"><div style={{ width: `${Math.min(100, c.share * 250)}%`, background: c.fix ? "var(--accent-action)" : "var(--line-strong)" }} /></div></td>
                  <td style={{ minWidth: 280 }}>{c.fix ? <><strong style={{ fontWeight: 600 }}>{c.fix.fix}</strong> <span className="muted">(assumes {pct(c.fix.avoidable, 0)} avoidable)</span><div className="small muted" style={{ marginTop: 2 }}>{c.fix.detail}</div></> : <span className="muted">Not a service failure: new enquiries and thanks. Keep, and route well.</span>}</td>
                  <td className="num">{c.fix ? pct(c.removable_share) : "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>By practice area, last 8 weeks</h2>
        <div className="table-wrap" style={{ maxHeight: "none" }}>
          <table className="spark">
            <thead><tr><th>Practice area</th><th className="num">Open files</th><th className="num">Escalations / 100 files</th><th className="num">CSAT</th><th className="num">Google rating</th><th className="num">Silent files</th><th className="num">First contact</th><th className="num">Missed consults</th><th>Top root cause</th></tr></thead>
            <tbody>
              {AREAS.map((a) => { const t = windowTotals(rows, a, 8); const top = rootCauseClusters(rows, 8, a).find((c) => c.fix); return (
                <tr key={a}><td><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: AREA_COLOR[a], marginRight: 6 }} />{AREA_LABEL[a]}</td><td className="num">{Math.round(t.open_files).toLocaleString()}</td><td className="num">{t.escalations_per_100_files.toFixed(2)}</td><td className="num">{pct(t.csat)}</td><td className="num">{t.rating.toFixed(2)}</td><td className="num">{pct(t.silent_file_rate, 0)}</td><td className="num">{t.first_contact_hours.toFixed(1)} h</td><td className="num">{pct(t.consult_missed_rate)}</td><td>{top ? ROOT_LABEL[top.root_cause] : ""}</td></tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
