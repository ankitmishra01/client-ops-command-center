"use client";
import { useMemo, useState } from "react";

export type Series = { name: string; values: (number | null)[]; color: string; dashed?: boolean; width?: number };
type Props = { labels: string[]; series: Series[]; band?: { lo: (number | null)[]; hi: (number | null)[]; color: string }; height?: number; marker?: number; ariaLabel: string; min?: number; fmt?: (v: number) => string };

/** Minimal responsive SVG line chart with an optional range band and a hover readout. */
export default function LineChart({ labels, series, band, height = 220, marker, ariaLabel, min = 0, fmt = (v) => Math.round(v).toLocaleString() }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = height, P = { l: 44, r: 12, t: 12, b: 26 };
  const { y, x, max } = useMemo(() => {
    const all = [...series.flatMap((s) => s.values), ...(band ? band.hi : [])].filter((v): v is number => v != null);
    const top = Math.max(...all); const max = min > 0 ? top + (top - min) * 0.08 : Math.max(1e-9, top) * 1.08;
    const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, labels.length - 1);
    const y = (v: number) => H - P.b - ((v - min) / (max - min)) * (H - P.t - P.b);
    return { x, y, max };
  }, [series, band, labels.length, H, min]);
  const path = (vals: (number | null)[]) => {
    let d = "", pen = false;
    vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
    return d;
  };
  const bandPath = band ? (() => {
    const idx = band.hi.map((v, i) => (v != null && band.lo[i] != null ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return "";
    return `M${idx.map((i) => `${x(i)},${y(band.hi[i]!)}`).join("L")}L${idx.reverse().map((i) => `${x(i)},${y(band.lo[i]!)}`).join("L")}Z`;
  })() : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));
  const step = Math.max(1, Math.ceil(labels.length / 8));
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = (e.target as SVGElement).closest("svg")!.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (labels.length - 1)); setHover(Math.min(labels.length - 1, Math.max(0, i))); }}>
        {ticks.map((t, i) => (<g key={i}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" /><text x={P.l - 6} y={y(t) + 4} className="axis" textAnchor="end">{fmt(t)}</text></g>))}
        {labels.map((l, i) => (i % step === 0 ? <text key={l + i} x={x(i)} y={H - 6} className="axis" textAnchor="middle">{l}</text> : null))}
        {marker != null && <line x1={x(marker)} x2={x(marker)} y1={P.t} y2={H - P.b} className="marker" />}
        {band && <path d={bandPath} fill={band.color} opacity={0.18} />}
        {series.map((s) => <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? "5 4" : undefined} />)}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} className="hover" />}
      </svg>
      <div className="legend">
        {series.map((s) => (<span key={s.name}><i style={{ background: s.color }} />{s.name}{hover != null && s.values[hover] != null ? `: ${fmt(s.values[hover]!)}` : ""}</span>))}
        {band && <span><i style={{ background: band.color, opacity: 0.35 }} />Range</span>}
        {hover != null && <span className="muted">{labels[hover]}</span>}
      </div>
    </div>
  );
}
