"use client";
import { useMemo, useState } from "react";
import { classify } from "@/lib/classify";
import { routeOwner } from "@/lib/routing";
import { AREA_LABEL, INBOX_NOW, INTENT_LABEL, ROOT_LABEL, type Area, type Intent, type RootCause } from "@/lib/taxonomy";

const SAMPLE = "Hello, this is my third message about my spousal sponsorship and no one has replied. IRCC sent a procedural fairness letter and we must respond within 6 days. I am very worried.";
type ApiResult = { source: "rules" | "llm"; model?: string; note?: string; area: Area | null; intent: Intent; root_cause: RootCause; priority: string; reason?: string };

export default function TryClassifier() {
  const [text, setText] = useState(SAMPLE);
  const [api, setApi] = useState<ApiResult | null>(null);
  const [busy, setBusy] = useState(false);
  const c = useMemo(() => classify({ subject: "", body: text, received_at: INBOX_NOW, prior_contacts_30d: 0 }), [text]);
  const route = routeOwner(c);
  const callApi = async () => {
    setBusy(true); setApi(null);
    try { const r = await fetch("/api/classify/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }); setApi(await r.json()); }
    catch { setApi(null); }
    finally { setBusy(false); }
  };
  return (
    <div className="card t-yellow">
      <h2>Try a message</h2>
      <p className="small muted" style={{ marginTop: 0 }}>Type or paste any made-up client message. The rules run in your browser as you type; nothing is stored. Please do not paste real client information.</p>
      <textarea className="try" value={text} onChange={(e) => { setText(e.target.value); setApi(null); }} aria-label="Message to classify" maxLength={2000} />
      <div className="chips">
        <span className={`pill ${c.priority}`}>{c.priority}</span>
        <span>{c.area ? AREA_LABEL[c.area] : "Area unclear"}</span>
        <span>{INTENT_LABEL[c.intent]}</span>
        <span>{ROOT_LABEL[c.root_cause]}</span>
        <span className={`pill ${c.sentiment}`}>{c.sentiment}</span>
        <span className="pill violet">Risk {c.escalation_risk}</span>
        <span>Owner: {route.owner}</span>
      </div>
      <dl className="ev">
        {c.evidence.map((e) => <div key={e.field} style={{ display: "contents" }}><dt>{e.field}</dt><dd>{e.rule}{e.matches.length > 0 && <> · {e.matches.map((x, i) => <code key={i} style={{ marginRight: 4 }}>{x}</code>)}</>}</dd></div>)}
      </dl>
      <div className="toolbar" style={{ marginTop: 10 }}>
        <button className="ghost" onClick={callApi} disabled={busy || !text.trim()}>{busy ? "Classifying…" : "Classify through the API route"}</button>
        {api && <span className="small">Source: <strong>{api.source === "llm" ? `language model (${api.model})` : "deterministic rules"}</strong>{api.source === "llm" ? ` · ${api.area ? AREA_LABEL[api.area] : "Area unclear"} · ${INTENT_LABEL[api.intent]} · ${ROOT_LABEL[api.root_cause]} · ${api.priority}` : ""}{api.note ? ` · ${api.note}` : ""}</span>}
      </div>
      <p className="small muted">The API route has an optional language-model path behind a feature flag (<code>LLM_CLASSIFIER=on</code> plus an API key). On this public demo the flag is off, so it returns the same deterministic result. If the model path is on and fails or returns anything outside the fixed label set, the route falls back to the rules.</p>
    </div>
  );
}
