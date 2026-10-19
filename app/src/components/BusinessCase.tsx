"use client";
import { useMemo, useState } from "react";
import { runModel, type Lever, type ModelInputs } from "@/lib/model";

const cad = (v: number) => `$${Math.round(v).toLocaleString("en-CA")}`;
const num = (v: number, d = 0) => v.toLocaleString("en-CA", { maximumFractionDigits: d, minimumFractionDigits: d });

function Field({ label, value, onChange, step = 1, min = 0, max, kind, fmt = (v: number) => v.toLocaleString("en-CA") }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max: number; kind: "data" | "assumption"; fmt?: (v: number) => string }) {
  return (
    <div className="slider">
      <div className="slider-head"><label>{label}<span className={kind === "data" ? "tag-d" : "tag-a"}>{kind === "data" ? "FROM DATA" : "ASSUMPTION"}</span></label><output>{fmt(value)}</output></div>
      <input type="range" value={value} step={step} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

export default function BusinessCase({ initial }: { initial: ModelInputs }) {
  const [i, setI] = useState<ModelInputs>(initial);
  const set = <K extends keyof ModelInputs>(k: K, v: ModelInputs[K]) => setI((x) => ({ ...x, [k]: v }));
  const setLever = (key: string, patch: Partial<Lever>) => setI((x) => ({ ...x, levers: x.levers.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
  const o = useMemo(() => runModel(i), [i]);
  const half = useMemo(() => runModel({ ...i, ai_draft_saving: i.ai_draft_saving / 2, levers: i.levers.map((l) => ({ ...l, avoidable: l.avoidable / 2 })) }), [i]);
  return (
    <div className="grid2">
      <div className="card">
        <h2>Inputs</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Edit any number. <span className="tag-d" style={{ marginLeft: 0, color: "var(--teal)", fontWeight: 700, fontSize: 10 }}>FROM DATA</span> comes from the synthetic history on the CSAT page; <span style={{ color: "var(--amber)", fontWeight: 700, fontSize: 10 }}>ASSUMPTION</span> is a planning assumption to replace with the firm&apos;s own numbers in the first 30 days.</p>
        <div className="sliders">
          <Field label="Inbound messages per week, today" value={i.weekly_tickets} min={200} max={3000} step={10} onChange={(v) => set("weekly_tickets", v)} kind="data" />
          <Field label="Volume multiple over the next 12 months" value={i.growth_multiple} min={1} max={3} step={0.1} onChange={(v) => set("growth_multiple", v)} kind="assumption" fmt={(v) => `${v.toFixed(1)}x`} />
          <Field label="Handling time per message" value={i.aht_minutes} min={3} max={30} onChange={(v) => set("aht_minutes", v)} kind="assumption" fmt={(v) => `${v} min`} />
          <Field label="Time saved by an approved AI draft" value={Math.round(i.ai_draft_saving * 100)} max={60} onChange={(v) => set("ai_draft_saving", v / 100)} kind="assumption" fmt={(v) => `${v}%`} />
          <Field label="Productive hours per person per year" value={i.hours_per_fte_year} min={1000} max={1900} step={50} onChange={(v) => set("hours_per_fte_year", v)} kind="assumption" />
          <Field label="Loaded cost per customer success hire" value={i.loaded_cost_per_fte} min={40000} max={120000} step={1000} onChange={(v) => set("loaded_cost_per_fte", v)} kind="assumption" fmt={cad} />
          <Field label="One-time build cost" value={i.build_cost} max={400000} step={5000} onChange={(v) => set("build_cost", v)} kind="assumption" fmt={cad} />
          <Field label="Run cost per year (licences, model usage)" value={i.run_cost_year} max={150000} step={1000} onChange={(v) => set("run_cost_year", v)} kind="assumption" fmt={cad} />
        </div>
        <h3 style={{ marginTop: 16 }}>System fixes</h3>
        <div className="lever" style={{ borderTop: 0, fontSize: 11, color: "var(--muted)" }}><span></span><span>Fix</span><span style={{ textAlign: "right" }}>Share of messages <span className="tag-d" style={{ display: "block", color: "var(--teal)", fontWeight: 700, fontSize: 10 }}>DATA</span></span><span style={{ textAlign: "right" }}>Avoidable % <span style={{ display: "block", color: "var(--amber)", fontWeight: 700, fontSize: 10 }}>ASSUMPTION</span></span></div>
        {i.levers.map((l) => (
          <div className="lever" key={l.key}>
            <input type="checkbox" checked={l.on} onChange={(e) => setLever(l.key, { on: e.target.checked })} aria-label={`Include ${l.label}`} />
            <span>{l.label}</span>
            <span style={{ textAlign: "right" }}>{(l.share * 100).toFixed(1)}%</span>
            <span className="lever-range"><input type="range" value={Math.round(l.avoidable * 100)} min={0} max={100} onChange={(e) => setLever(l.key, { avoidable: Number(e.target.value) / 100 })} aria-label={`Avoidable share for ${l.label}`} /><output>{Math.round(l.avoidable * 100)}%</output></span>
          </div>
        ))}
        <div className="toolbar" style={{ marginTop: 10 }}><button className="ghost sm" onClick={() => setI(initial)}>Reset to defaults</button></div>
      </div>
      <div className="card dark">
        <p className="eyebrow">Result</p>
        <h2 style={{ fontSize: 26 }}>{o.hires_deferred} customer success hires deferred</h2>
        <p className="muted" style={{ marginTop: 0 }}>at next year&apos;s volume, from {num(o.hours_saved_year_grown)} hours a year that no longer need doing.</p>
        <dl className="levers" style={{ color: "var(--paper)" }}>
          <div><dt className="muted">Messages avoided per week</dt><dd>{num(o.tickets_avoided_week)} ({(o.share_avoided * 100).toFixed(0)}%)</dd></div>
          <div><dt className="muted">Hours saved per week, messages avoided</dt><dd>{num(o.hours_saved_week_avoided, 1)}</dd></div>
          <div><dt className="muted">Hours saved per week, AI drafts on the rest</dt><dd>{num(o.hours_saved_week_drafts, 1)}</dd></div>
          <div><dt className="muted">Hours saved per year, today&apos;s volume</dt><dd>{num(o.hours_saved_year)}</dd></div>
          <div><dt className="muted">Full-time equivalent, next year&apos;s volume</dt><dd>{num(o.fte_equivalent, 1)}</dd></div>
          <div><dt className="muted">Gross saving per year (whole hires only)</dt><dd>{cad(o.gross_saving_year)}</dd></div>
          <div><dt className="muted">Net of run cost</dt><dd>{cad(o.net_saving_year)}</dd></div>
          <div className="tot" style={{ borderTopColor: "rgba(246,247,241,.4)" }}><dt style={{ color: "var(--paper)" }}>Payback on the build</dt><dd>{o.payback_months == null ? "Does not pay back" : `${num(o.payback_months, 1)} months`}</dd></div>
        </dl>
        <p className="muted small" style={{ marginTop: 14 }}>If every fix works half as well as assumed: {half.hires_deferred} hires deferred, payback {half.payback_months == null ? "never" : `${num(half.payback_months, 1)} months`}. That downside is why the pilot measures avoided messages in one practice area before anything is scaled.</p>
        <p className="muted small">Formula: messages avoided = weekly messages × Σ(share × avoidable). Hours = messages avoided × handling time, plus remaining messages × handling time × draft saving. FTE = annual hours × growth multiple ÷ productive hours. Hires deferred rounds down, because a fraction of a hire is not a saving.</p>
      </div>
    </div>
  );
}
