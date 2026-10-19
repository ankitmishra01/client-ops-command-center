"use client";
import { useState } from "react";
import { STAGES, type Req } from "@/lib/hiring";

type Cand = { id: string; req: string; stage: string; name: string; source: string; score: number; days_in_stage: number };

export default function Kanban({ reqs, candidates }: { reqs: Req[]; candidates: Cand[] }) {
  const [req, setReq] = useState(reqs.find((r) => r.title === "Customer success specialist")?.id ?? reqs[0].id);
  const [moved, setMoved] = useState<Record<string, string>>({});
  const q = reqs.find((r) => r.id === req)!;
  const stages = STAGES.slice(1);
  const stageOf = (c: Cand) => moved[c.id] ?? c.stage;
  const cards = candidates.filter((c) => c.req === req);
  const advance = (c: Cand) => { const i = stages.indexOf(stageOf(c) as (typeof stages)[number]); if (i < stages.length - 1) setMoved((m) => ({ ...m, [c.id]: stages[i + 1] })); };
  return (
    <div className="card">
      <div className="section-head" style={{ marginTop: 0 }}>
        <h2>Candidates by stage</h2>
        <label className="range">Requisition <select value={req} onChange={(e) => { setReq(e.target.value); setMoved({}); }} aria-label="Requisition">{reqs.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.title}</option>)}</select></label>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>{q.title}: {q.openings} opening{q.openings > 1 ? "s" : ""}, {q.funnel[0]} applied, panel {q.interviewers.map((x) => x.split(" (")[0]).join(", ")}. Fictional candidates. &quot;Advance&quot; moves a card for this session only.</p>
      <div className="kanban">
        {stages.map((st, j) => {
          const col = cards.filter((c) => stageOf(c) === st);
          const total = q.funnel[j + 1] + col.filter((c) => c.stage !== st).length - cards.filter((c) => c.stage === st && stageOf(c) !== st).length;
          return (
            <div key={st} className="kcol">
              <div className="khead"><strong>{st}</strong><span>{total}</span></div>
              {col.map((c) => (
                <div key={c.id} className="kcard">
                  <strong>{c.name}</strong>
                  <span>{c.source} · score {c.score.toFixed(1)}</span>
                  <span className={c.days_in_stage > 7 ? "bad" : "muted"}>{c.days_in_stage} d in stage</span>
                  {st !== "Accepted" && <button className="sm ghost" onClick={() => advance(c)}>Advance</button>}
                </div>
              ))}
              {total > col.length && <div className="kmore">+{total - col.length} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
