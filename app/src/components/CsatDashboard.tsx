"use client";
import { useState } from "react";
import { reviewThemes } from "@/lib/classify";
import type { Review, SilentFile } from "@/lib/generate";
import LineChart from "@/components/LineChart";
import type { WeekRow } from "@/lib/generate";
import { rootCauseClusters, series, windowTotals } from "@/lib/metrics";
import { AREA_LABEL, AREA_SHORT, AREAS, ROOT_LABEL, type Area } from "@/lib/taxonomy";

export const AREA_COLOR: Record<Area, string> = { EE: "#6238D1", WP: "#197A4B", FAM: "#A23F36", CIT: "#9A5B0A", INA: "#10172A" };
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const lbl = (w: string) => new Date(w + "T12:00:00Z").toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

function Delta({ now, before, good, fmt }: { now: number; before: number; good: "up" | "down"; fmt: (v: number) => string }) {
  const d = now - before; const better = good === "up" ? d > 0 : d < 0;
  return <span className={Math.abs(d) < 1e-9 ? "muted" : better ? "good" : "bad"} style={{ fontSize: 12 }}>{d > 0 ? "+" : d < 0 ? "−" : ""}{fmt(Math.abs(d))} vs first 4 weeks in range</span>;
}

const RANGES = [[8, "Last 8 weeks"], [13, "Last 13 weeks"], [26, "Last 26 weeks"]] as const;

export default function CsatDashboard({ rows: allRows, reviews, silent }: { rows: WeekRow[]; reviews: Review[]; silent: SilentFile[] }) {
  const [area, setArea] = useState<Area | "ALL">("ALL");
  const [span, setSpan] = useState<number>(26);
  const allWeeks = [...new Set(allRows.map((r) => r.week))].sort();
  const keep = new Set(allWeeks.slice(-span));
  const rows = allRows.filter((r) => keep.has(r.week));
  const s = series(rows, area);
  const labels = s.map((x) => lbl(x.week));
  const last = windowTotals(rows, area, 4);
  const first = windowTotals(rows, area, 4, span - 4);
  const clusters = rootCauseClusters(rows, 8, area);
  const fixable = clusters.filter((c) => c.fix);
  const allLevers = fixable.reduce((t, c) => t + c.removable_share, 0);
  const per = (a: Area) => series(rows, a);
  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
      <div className="area-tabs" role="group" aria-label="Practice area" style={{ marginBottom: 0 }}>
        <button className={area === "ALL" ? "on" : ""} aria-pressed={area === "ALL"} onClick={() => setArea("ALL")}>All areas</button>
        {AREAS.map((a) => <button key={a} className={area === a ? "on" : ""} aria-pressed={area === a} onClick={() => setArea(a)}>{AREA_SHORT[a]}</button>)}
      </div>
      <label className="range">Date range <select value={span} onChange={(e) => setSpan(Number(e.target.value))} aria-label="Date range">{RANGES.map(([n, l]) => <option key={n} value={n}>{l}</option>)}</select></label>
      </div>
      <div className="kpis">
        <div className="kpi y"><div className="v">{last.escalations_per_100_files.toFixed(2)}</div><div className="l"><strong>Headline:</strong> escalations per 100 open files, per 4 weeks</div><Delta now={last.escalations_per_100_files} before={first.escalations_per_100_files} good="down" fmt={(v) => v.toFixed(2)} /></div>
        <div className="kpi"><div className="v">{pct(last.csat)}</div><div className="l">CSAT, share scoring 4 or 5 of 5</div><Delta now={last.csat} before={first.csat} good="up" fmt={(v) => `${(v * 100).toFixed(1)} pts`} /></div>
        <div className="kpi"><div className="v">{last.rating.toFixed(2)}</div><div className="l">Google rating, new reviews ({Math.round(last.reviews / 4)} a week)</div><Delta now={last.rating} before={first.rating} good="up" fmt={(v) => v.toFixed(2)} /></div>
        <div className="kpi p"><div className="v">{Math.round(last.silent_files).toLocaleString()} <span style={{ fontSize: 14 }}>({pct(last.silent_file_rate, 0)})</span></div><div className="l">Silent files: paid, no client update in 14+ days</div><Delta now={last.silent_file_rate} before={first.silent_file_rate} good="down" fmt={(v) => `${(v * 100).toFixed(1)} pts`} /></div>
        <div className="kpi"><div className="v">{last.first_contact_hours.toFixed(1)} h</div><div className="l">Speed to first contact, new leads (median)</div><Delta now={last.first_contact_hours} before={first.first_contact_hours} good="down" fmt={(v) => `${v.toFixed(1)} h`} /></div>
        <div className="kpi p"><div className="v">{pct(last.consult_missed_rate)}</div><div className="l">Consultations the firm missed</div><Delta now={last.consult_missed_rate} before={first.consult_missed_rate} good="down" fmt={(v) => `${(v * 100).toFixed(1)} pts`} /></div>
      </div>
      <p className="small muted" style={{ margin: "-6px 0 14px" }}>Also: {Math.round(last.tickets / 4).toLocaleString()} inbound messages a week (from {Math.round(first.tickets / 4).toLocaleString()}), {Math.round(last.open_files).toLocaleString()} open files, complaint rate {pct(last.complaint_rate)} per message, median first response to existing clients {last.first_response_hours.toFixed(1)} h. Deltas compare the last 4 weeks with the first 4 weeks of the selected range.</p>

      <div className="charts2">
        <div className="card">
          <h2>Volume grew about five times; satisfaction slipped as it did</h2>
          <p className="chart-note" style={{ marginTop: -4, marginBottom: 8 }}>Inbound messages per week, {area === "ALL" ? "by practice area" : AREA_LABEL[area]}</p>
          <LineChart labels={labels} ariaLabel="Inbound messages per week" series={area === "ALL" ? AREAS.map((a) => ({ name: AREA_SHORT[a], color: AREA_COLOR[a], values: per(a).map((x) => x.tickets) })) : [{ name: AREA_SHORT[area], color: AREA_COLOR[area], values: s.map((x) => x.tickets) }]} />
        </div>
        <div className="card">
          <h2>CSAT by week</h2>
          <p className="chart-note" style={{ marginTop: -4, marginBottom: 8 }}>Share of survey responses scoring 4 or 5 out of 5</p>
          <LineChart labels={labels} min={0.6} maxY={1} fmt={(v) => `${Math.round(v * 100)}%`} ariaLabel="CSAT by week" series={area === "ALL" ? AREAS.map((a) => ({ name: AREA_SHORT[a], color: AREA_COLOR[a], values: per(a).map((x) => x.csat), width: 1.5 })) : [{ name: AREA_SHORT[area], color: AREA_COLOR[area], values: s.map((x) => x.csat) }]} />
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
          <LineChart labels={labels} min={3.8} maxY={5} fmt={(v) => v.toFixed(1)} height={160} ariaLabel="Average Google rating" series={[{ name: "Average rating", color: "#10172A", values: s.map((x) => x.rating) }]} />
          <LineChart labels={labels} height={120} ariaLabel="Reviews per week" series={[{ name: "Reviews per week", color: "#9A5B0A", values: s.map((x) => x.reviews) }]} />
        </div>
      </div>

      <div className="card t-violet">
        <h2>Root causes, and the system fix for each</h2>
        <p className="takeaway" style={{ margin: "0 0 6px" }}>Taken together, the {fixable.length} fixes would remove an estimated {pct(allLevers, 0)} of all inbound messages{area === "ALL" ? "" : ` in ${AREA_LABEL[area]}`}; proactive status updates alone would remove {pct(fixable.find((c) => c.root_cause === "status_silence")?.removable_share ?? 0, 0)}.</p>
        <p className="small muted" style={{ marginTop: 0 }}>Share of messages by root cause over the last 8 weeks. &quot;Removable&quot; = share × the assumed avoidable rate for that fix (an assumption to test in the pilot, shown in brackets). The business case on the 90-day page uses the same numbers.</p>
        <div className="hbar" style={{ margin: "10px 0 16px" }} aria-label="Root-cause clusters">
          {clusters.filter((c) => c.fix).map((c) => (
            <div key={c.root_cause} style={{ display: "contents" }}>
              <span>{ROOT_LABEL[c.root_cause]}</span>
              <div className="track" style={{ position: "relative" }} title={`${pct(c.share)} of messages; ${pct(c.removable_share)} removable`}>
                <div className="fill" style={{ position: "absolute", inset: 0, width: `${(c.share / clusters[0].share) * 100}%`, opacity: 0.3 }} />
                <div className="fill" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${(c.removable_share / clusters[0].share) * 100}%` }} />
              </div>
              <span className="v">{pct(c.share, 0)}</span>
            </div>
          ))}
        </div>
        <div className="legend" style={{ marginTop: -8, marginBottom: 12 }}><span><i style={{ background: "var(--accent-action)", opacity: 0.3 }} />Share of all messages</span><span><i style={{ background: "var(--accent-action)" }} />Removable by the system fix</span></div>
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
      <div className="charts2">
        <ReviewFeed reviews={reviews} area={area} />
        <SilentFiles silent={silent} area={area} />
      </div>
    </>
  );
}

function Stars({ n }: { n: number }) { return <span className="stars" aria-label={`${n} of 5 stars`}>{"★★★★★".slice(0, n)}<span className="off">{"★★★★★".slice(n)}</span></span>; }

function ReviewFeed({ reviews, area }: { reviews: Review[]; area: Area | "ALL" }) {
  const [stars, setStars] = useState<number | 0>(0);
  const [theme, setTheme] = useState("");
  const tagged = reviews.filter((r) => area === "ALL" || r.area === area).map((r) => ({ r, themes: reviewThemes(r.text) }));
  const allThemes = [...new Set(tagged.flatMap((t) => t.themes.map((x) => x.label)))].sort();
  const shown = tagged.filter(({ r, themes }) => (!stars || r.stars === stars) && (!theme || themes.some((x) => x.label === theme)));
  const avg = tagged.reduce((s, t) => s + t.r.stars, 0) / Math.max(1, tagged.length);
  const needReply = tagged.filter((t) => t.r.stars <= 3 && !t.r.replied).length;
  return (
    <div className="card">
      <h2>Google review feed</h2>
      <p className="small muted" style={{ marginTop: 0 }}>{tagged.length} synthetic reviews over 26 weeks, average {avg.toFixed(2)}. Themes are tagged automatically by the same root-cause rules as the inbox. <strong>{needReply}</strong> reviews of 3 stars or fewer have no reply yet.</p>
      <div className="filters">
        <label>Stars <select value={stars} onChange={(e) => setStars(Number(e.target.value))}><option value={0}>All</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</select></label>
        <label>Theme <select value={theme} onChange={(e) => setTheme(e.target.value)}><option value="">All</option>{allThemes.map((t) => <option key={t}>{t}</option>)}</select></label>
      </div>
      <ol className="reviews">
        {shown.slice(0, 40).map(({ r, themes }) => (
          <li key={r.id}>
            <div className="rv-head"><Stars n={r.stars} /> <strong>{r.reviewer}</strong> <span className="muted small">{new Date(r.date).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })} · {AREA_SHORT[r.area]}</span>{r.replied ? <span className="pill ok">Replied</span> : r.stars <= 3 ? <span className="pill at_risk">Needs reply</span> : null}</div>
            <p>{r.text}</p>
            <div className="chips" style={{ margin: 0 }}>{themes.map((t) => <span key={t.label} className={t.tone === "neg" ? "theme-neg" : "theme-pos"}>{t.label}</span>)}</div>
          </li>
        ))}
        {shown.length === 0 && <li className="muted">No reviews match. Try another star rating or theme.</li>}
      </ol>
      {shown.length > 40 && <p className="small muted">Showing the 40 most recent of {shown.length}.</p>}
    </div>
  );
}

function SilentFiles({ silent, area }: { silent: SilentFile[]; area: Area | "ALL" }) {
  const rows = silent.filter((f) => area === "ALL" || f.area === area);
  const byOwner = Object.entries(rows.reduce<Record<string, number>>((m, f) => { m[f.case_manager] = (m[f.case_manager] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  return (
    <div className="card t-orange">
      <h2>Silent files: paid, no update in more than 10 days</h2>
      <p className="small muted" style={{ marginTop: 0 }}>{rows.length} files on today&apos;s alert list, oldest silence first. Each one gets a plain-language update from its case manager within one business day. Most on one list: {byOwner.slice(0, 3).map(([n, c]) => `${n} (${c})`).join(", ")}.</p>
      <div className="table-wrap" style={{ maxHeight: 640 }}>
        <table>
          <thead><tr><th>File</th><th>Client</th><th>Case manager</th><th>Stage</th><th className="num">Days silent</th><th>Next milestone</th></tr></thead>
          <tbody>{rows.map((f) => <tr key={f.matter}><td className="sku">{f.matter}<div>{AREA_SHORT[f.area]}</div></td><td>{f.client}<div className="sku">paid {f.paid_on}</div></td><td>{f.case_manager}</td><td>{f.stage}</td><td className="num"><span className={f.days_silent > 21 ? "bad" : ""}>{f.days_silent}</span></td><td>{f.next}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
