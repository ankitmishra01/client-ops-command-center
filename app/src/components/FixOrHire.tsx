"use client";
import { useMemo, useState } from "react";
import { decide, DEFAULT_COSTS, LEVER_HELP, LEVERS, type Costs, type LeverKey, type Workload } from "@/lib/decide";

const cad = (v: number) => `$${Math.round(v).toLocaleString("en-CA")}`;
const num = (v: number, d = 0) => v.toLocaleString("en-CA", { maximumFractionDigits: d, minimumFractionDigits: d });
const people = (n: number) => (n === 0 ? "no hire" : n === 1 ? "1 hire" : `${n} hires`);

function Field({ label, value, onChange, step = 1, min = 0, max, kind, fmt = (v: number) => v.toLocaleString("en-CA"), help }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max: number; kind: "data" | "assumption"; fmt?: (v: number) => string; help?: string }) {
  return (
    <div className="slider">
      <div className="slider-head"><label title={help}>{label}<span className={kind === "data" ? "tag-d" : "tag-a"}>{kind === "data" ? "FROM DATA" : "ASSUMPTION"}</span></label><output>{fmt(value)}</output></div>
      <input type="range" value={value} step={step} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      {help && <div className="slider-help">{help}</div>}
    </div>
  );
}

export default function FixOrHire({ examples }: { examples: Workload[] }) {
  const [sel, setSel] = useState(0);
  const [w, setW] = useState<Workload>(examples[0]);
  const [c, setC] = useState<Costs>(DEFAULT_COSTS);
  const pick = (i: number) => { setSel(i); setW(examples[i]); };
  const set = <K extends keyof Workload>(k: K, v: Workload[K]) => setW((x) => ({ ...x, [k]: v }));
  const setShare = (k: LeverKey, v: number) => setW((x) => ({ ...x, shares: { ...x.shares, [k]: v } }));
  const d = useMemo(() => decide(w, c), [w, c]);
  const top = d.hours_week_grown || 1;
  const fromData = !!examples[sel].volume_from_data;
  return (
    <>
      <div className="area-tabs" role="group" aria-label="Worked example">
        {examples.map((e, i) => <button key={e.key} className={sel === i ? "on" : ""} aria-pressed={sel === i} onClick={() => pick(i)}>{e.name}</button>)}
      </div>
      <div className="grid2 decide">
        <div className="card">
          <h2>{w.name}</h2>
          <p className="small muted" style={{ marginTop: 0, marginBottom: 16 }}>{w.note}</p>
          <div className="sliders">
            <Field label={`Volume per week (${w.unit})`} value={w.volume_week} min={20} max={2000} step={5} onChange={(v) => set("volume_week", v)} kind={fromData ? "data" : "assumption"} />
            <Field label="Minutes per item today" value={w.minutes} min={1} max={90} onChange={(v) => set("minutes", v)} kind="assumption" fmt={(v) => `${v} min`} />
            <Field label="Volume multiple over the next 12 months" value={w.growth} min={1} max={3} step={0.1} onChange={(v) => set("growth", v)} kind="assumption" fmt={(v) => `${v.toFixed(1)}x`} />
            <Field label="People on this work today (full-time equivalent)" value={w.team_fte} min={0} max={10} step={0.5} onChange={(v) => set("team_fte", v)} kind="assumption" fmt={(v) => num(v, 1)} />
          </div>
          <h3 style={{ marginTop: 16 }}>Levers, applied in this order</h3>
          <div className="sliders">
            {LEVERS.map((k) => <Field key={k} label={d.saved.find((s) => s.key === k)!.label} value={Math.round(w.shares[k] * 100)} max={80} onChange={(v) => setShare(k, v / 100)} kind="assumption" fmt={(v) => `${v}%`} help={LEVER_HELP[k]} />)}
          </div>
          <h3 style={{ marginTop: 16 }}>Costs</h3>
          <div className="sliders">
            <Field label="One-time cost of the fixes (build, training)" value={w.one_time_cost} max={200000} step={1000} onChange={(v) => set("one_time_cost", v)} kind="assumption" fmt={cad} />
            <Field label="Run cost per year (licences, model usage)" value={w.run_cost_year} max={100000} step={1000} onChange={(v) => set("run_cost_year", v)} kind="assumption" fmt={cad} />
            <Field label="Loaded cost per hire, per year" value={c.loaded_cost_per_fte} min={40000} max={160000} step={1000} onChange={(v) => setC((x) => ({ ...x, loaded_cost_per_fte: v }))} kind="assumption" fmt={cad} />
            <Field label="Recruiting and onboarding cost per hire" value={c.recruiting_cost_per_hire} max={40000} step={500} onChange={(v) => setC((x) => ({ ...x, recruiting_cost_per_hire: v }))} kind="assumption" fmt={cad} />
          </div>
          <div className="toolbar" style={{ marginTop: 12 }}><button className="ghost sm" onClick={() => { setW(examples[sel]); setC(DEFAULT_COSTS); }}>Reset this example</button></div>
        </div>
        <div className="card dark decide-result" aria-live="polite">
          <p className="eyebrow">Recommendation</p>
          <h2 className="decide-verdict">{d.primary === "No change" ? "No change needed" : d.primary}</h2>
          <p style={{ marginTop: 0 }}>{d.verdict}</p>
          <div className="decide-wf" role="img" aria-label="Hours per week at next year's volume, and what each lever removes">
            <span>Next year, no change</span><div className="track"><div className="fill" style={{ width: "100%" }} /></div><span className="v">{num(d.hours_week_grown)} h</span>
            {d.saved.map((s, i) => { const after = d.hours_week_grown - d.saved.slice(0, i + 1).reduce((t, x) => t + x.hours_week, 0); return <div key={s.key} style={{ display: "contents" }}><span>− {s.label.toLowerCase()}</span><div className="track"><div className="fill alt" style={{ marginLeft: `${(after / top) * 100}%`, width: `${(s.hours_week / top) * 100}%` }} /></div><span className="v">{num(s.hours_week, 1)} h</span></div>; })}
            <span><strong>Left for people</strong></span><div className="track"><div className="fill" style={{ width: `${(d.hours_week_after / top) * 100}%` }} /></div><span className="v"><strong>{num(d.hours_week_after)} h</strong></span>
          </div>
          <dl className="levers" style={{ color: "var(--paper)" }}>
            <div><dt className="muted">Hours a week today ({num(w.volume_week)} × {w.minutes} min)</dt><dd>{num(d.hours_week_today, 1)}</dd></div>
            <div><dt className="muted">People needed next year, no change</dt><dd>{num(d.fte_need_without, 1)} FTE · {people(d.hires_without)}</dd></div>
            <div><dt className="muted">People needed next year, after the levers</dt><dd>{num(d.fte_need_with, 1)} FTE · {people(d.hires_with)}</dd></div>
            {d.spare_fte > 0 && <div><dt className="muted">Time freed for other work</dt><dd>{num(d.spare_fte, 1)} people</dd></div>}
            <div><dt className="muted">Year one, hire to volume</dt><dd>{cad(d.cost_year1_hire)}</dd></div>
            <div><dt className="muted">Year one, levers plus any hires still needed</dt><dd>{cad(d.cost_year1_levers)}</dd></div>
            <div className="tot" style={{ borderTopColor: "rgba(246,247,241,.4)" }}><dt style={{ color: "var(--paper)" }}>Payback on the fixes</dt><dd>{d.payback_months == null ? "No hires avoided" : `${num(d.payback_months, 1)} months`}</dd></div>
          </dl>
          <p className="muted small" style={{ marginTop: 14 }}>Formula: hours a week = volume × minutes ÷ 60 × growth. Each lever removes its share of what the levers before it left: process fix, then ownership, training, automation, tooling. People = hours × 52 ÷ {num(c.hours_per_fte_year)} productive hours a year. Hires = people needed minus people today, rounded up. Payback = one-time cost ÷ (hires avoided × loaded cost − run cost).</p>
        </div>
      </div>
    </>
  );
}
