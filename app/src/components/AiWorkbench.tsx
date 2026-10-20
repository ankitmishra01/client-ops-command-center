"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { assessMessage, runSafetyChecks, SCENARIOS } from "@/lib/workbench";
import { AREA_LABEL, INTENT_LABEL, ROOT_LABEL, type Area, type Intent, type RootCause } from "@/lib/taxonomy";

type ModelResult = { source: "rules" | "llm"; model?: string; note?: string; error?: string; area: Area | null; intent: Intent; root_cause: RootCause; priority: string; reason?: string };
const REVIEW = { lawyer: "Lawyer review required", triage: "Human triage required", lead: "Client success lead review" };

export default function AiWorkbench() {
  const [scenario, setScenario] = useState(SCENARIOS[0].id);
  const [text, setText] = useState(SCENARIOS[0].text);
  const [tab, setTab] = useState<"workflow" | "evaluation">("workflow");
  const [results, setResults] = useState<ReturnType<typeof runSafetyChecks> | null>(null);
  const [checked, setChecked] = useState(false);
  const [approved, setApproved] = useState(false);
  const [model, setModel] = useState<ModelResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const request = useRef<AbortController | null>(null);
  const a = useMemo(() => assessMessage(text), [text]);
  useEffect(() => () => request.current?.abort(), []);
  const edit = (value: string, id = "custom") => {
    request.current?.abort(); request.current = null;
    setText(value); setScenario(id); setChecked(false); setApproved(false); setModel(null); setBusy(false); setNotice(""); setEvents([]);
  };
  const compare = async () => {
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setModel(null); setNotice("");
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/classify/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }), signal: controller.signal });
      if (!response.ok) throw new Error("The comparison service is unavailable. The local assessment is still usable.");
      const result = await response.json() as ModelResult;
      if (request.current !== controller) return;
      setModel(result); setEvents((e) => [...e, result.source === "llm" ? "Model proposal received; routing policy unchanged." : "API returned the rules baseline; no model result was generated."]);
    } catch {
      if (request.current === controller) setNotice("Comparison unavailable or timed out. The local assessment remains available.");
    } finally { clearTimeout(timer); if (request.current === controller) { setBusy(false); request.current = null; } }
  };
  const exportHandoff = () => {
    if (!approved) return;
    const output = { prototype: true, syntheticOnly: true, message: text, policyVersion: "ops-review-v1", assessment: a, modelProposal: model, events, status: "Internal handoff only. Not sent to a client or a case system.", exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "client-ops-handoff.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Handoff downloaded. No message was sent and no case system was changed.");
  };
  const disagreements = model?.source === "llm" ? [model.area !== a.classification.area && "practice area", model.intent !== a.classification.intent && "intent", model.root_cause !== a.classification.root_cause && "root cause"].filter(Boolean) : [];
  return <>
    <section className="ai-intro">
      <div><p className="eyebrow">AI + operating judgment</p><h1>A message in.<br /><span>A defensible next step out.</span></h1><p className="lede">Turn a difficult client message into evidence, ownership and a reviewable action plan. Then test what happens when the input gets difficult.</p></div>
      <aside className="ai-contract"><span className="pill violet">Interactive work sample</span><h2>Automation earns its scope.</h2><p>Rules protect urgency. A model can propose labels. People verify facts and approve actions.</p><small>Synthetic messages only · no automatic sending · no live Clio connection</small></aside>
    </section>
    <div className="ai-switch" aria-label="Workbench views">
      <button className={tab === "workflow" ? "" : "ghost"} aria-pressed={tab === "workflow"} onClick={() => setTab("workflow")}>01 / Work a case</button>
      <button className={tab === "evaluation" ? "" : "ghost"} aria-pressed={tab === "evaluation"} onClick={() => setTab("evaluation")}>02 / Test the boundaries</button>
      <span className="small muted">Local rules + policy running. Model use is optional and explicitly reported.</span>
    </div>
    {tab === "workflow" ? <>
      <div className="ai-workspace">
        <section className="card ai-input"><p className="eyebrow">01 / Incoming message</p><h2>Choose the hard case.</h2><div className="ai-scenarios">{SCENARIOS.slice(0, 6).map((s) => <button className={`ghost ${scenario === s.id ? "selected" : ""}`} aria-pressed={scenario === s.id} key={s.id} onClick={() => edit(s.text, s.id)}>{s.label}</button>)}</div>
          <label className="small" htmlFor="ai-message">Synthetic client message</label><textarea id="ai-message" className="try" maxLength={2000} value={text} onChange={(e) => edit(e.target.value)} />
          <div className="ai-input-meta"><span>{text.length}/2,000 characters</span><span>Assessed locally as you type</span></div>
          <div className="ai-explainer"><strong>The operating decision</strong><p>{SCENARIOS.find((s) => s.id === scenario)?.why ?? "Every change resets review. This is triage support, not a determination of a client's legal position."}</p></div>
          <button className="ghost" disabled={busy || !text.trim()} onClick={compare}>{busy ? "Checking available classifier…" : "Compare with the API classifier"}</button>
          <p className="small muted">This button sends the synthetic text to the demo API. The public model flag is off; a rules fallback is labelled as such, never presented as AI.</p>
          {model && <div className="ai-model" aria-live="polite"><strong>{model.source === "llm" ? `Model proposal · ${model.model}` : "Rules fallback · no model was run"}</strong><p>{model.area ? AREA_LABEL[model.area] : "Area unclear"} · {INTENT_LABEL[model.intent]} · {ROOT_LABEL[model.root_cause]}</p>{disagreements.length > 0 && <p>Disagreement on {disagreements.join(", ")}. A reviewer must resolve this; the model cannot change the routing policy.</p>}<small>{model.note ?? "Proposal only. No action executed."}</small></div>}
        </section>
        <section className="card ai-decision" aria-live="polite"><p className="eyebrow">02 / Decision with evidence</p><div className="ai-decision-title"><h2>{a.hasInput ? REVIEW[a.review] : "Add a message to begin"}</h2>{a.hasInput && <span className={`pill ${a.priority}`}>{a.priority}</span>}</div>
          {a.hasInput && <><div className="ai-route"><div><small>Suggested owner</small><strong>{a.owner}</strong></div><div><small>First-response target</small><strong>{a.targetHours} hours</strong></div></div><p className="small muted">Demo policy uses elapsed hours. Verify every deadline against the original notice. Classification is not a legal assessment.</p>
          <div className="chips"><span className="pill violet">{a.classification.area ? AREA_LABEL[a.classification.area] : "Area unconfirmed"}</span><span>{INTENT_LABEL[a.classification.intent]}</span></div>
          {a.warnings.map((w) => <p className="ai-warning" key={w}>{w}</p>)}
          <h3>Show the evidence</h3><div className="ai-evidence">{a.evidence.length ? a.evidence.map((e, i) => <div key={`${e.field}-${e.quote}`}><span className="sku">E{String(i + 1).padStart(2, "0")}</span><div><strong>{e.field}</strong><blockquote>“{e.quote}”</blockquote></div></div>) : <p className="muted">No matching evidence. The default label is not a confirmed fact.</p>}</div>
          <p className="small muted">Exact excerpts from the message, not retrieved case-file facts or model-generated explanations.</p></>}
        </section>
      </div>
      {a.hasInput && <section className="card ai-action"><div className="ai-section-heading"><div><p className="eyebrow">03 / Reviewed handoff</p><h2>Give the next person something they can act on.</h2></div><span className="pill violet">No client reply is generated here</span></div>
        <div className="ai-task-grid">{a.tasks.map((task, i) => <div key={task.id}><span className="panel-index">0{i + 1}</span><h3>{task.title}</h3><p>{task.detail}</p></div>)}</div>
        {a.fix && <div className="ai-prevention"><strong>Prevent the next complaint: {a.fix.fix}</strong><p>{a.fix.detail}</p><Link href="/csat/">Inspect the root-cause dashboard →</Link></div>}
        <div className="ai-review"><label><input type="checkbox" checked={checked} onChange={(e) => { setChecked(e.target.checked); setApproved(false); }} /> I have reviewed this internal handoff and its unresolved facts. This is not client-send approval.</label><div className="toolbar"><button disabled={!checked || approved} onClick={() => { setApproved(true); setEvents((e) => [...e, "Demo reviewer marked the current internal handoff reviewed. Outstanding facts still require verification."]); }}>{approved ? "Handoff reviewed" : "Mark handoff reviewed"}</button><button className="ghost" disabled={!approved} onClick={exportHandoff}>Export handoff</button><Link href="/triage/">Open reply workflow →</Link></div></div>
        {events.length > 0 && <details><summary>Decision trail · this browser session</summary><ol className="small">{events.map((e, i) => <li key={i}>{e}</li>)}</ol><p className="small muted">Illustrative, editable client-side state. Not an authenticated or tamper-proof audit log. Editing the message resets this trail.</p></details>}
      </section>}
    </> : <section className="card"><div className="ai-section-heading"><div><p className="eyebrow">Regression checks, not a marketing accuracy score</p><h2>Test whether the right person stays in control.</h2><p className="muted">Ten hand-written scenarios compare baseline routing with the review policy. No LLM calls, no tokens, no claims of production accuracy.</p></div><button onClick={() => setResults(runSafetyChecks())}>Run 10 safety checks</button></div>
      {results ? <><div className="ai-eval-summary" role="status"><strong>{results.filter((r) => r.passed).length}/{results.length}</strong><span>review-policy checks pass</span><small>Baseline routing: {results.filter((r) => r.baseline === r.expected).length}/{results.length}. These cases informed the policy and are not a held-out benchmark.</small></div><div className="table-wrap"><table><thead><tr><th>Scenario</th><th>Expected reviewer</th><th>Baseline rules</th><th>With review policy</th><th>Inspect</th></tr></thead><tbody>{results.map((r) => <tr key={r.id}><td><strong>{r.label}</strong><br /><span className="muted">{r.category}</span></td><td>{REVIEW[r.expected]}</td><td><span className={`pill ${r.baseline === r.expected ? "positive" : "negative"}`}>{r.baseline === r.expected ? "Pass" : "Miss"}</span></td><td><span className={`pill ${r.passed ? "positive" : "negative"}`}>{r.passed ? "Pass" : "Miss"}</span></td><td><button className="ghost" onClick={() => { edit(r.text, r.id); setTab("workflow"); }}>Inspect</button></td></tr>)}</tbody></table></div></> : <div className="ai-eval-empty"><span>01 → 10</span><h3>Urgency. Ambiguity. Injection. Language gaps.</h3><p>Run the suite to see where the baseline needs a human-review policy.</p></div>}
      <div className="ai-task-grid ai-gates"><div><h3>Before a real pilot</h3><p>Have reviewers label historical messages independently. Separate training examples from a held-out set. Evaluate each practice area and supported language.</p></div><div><h3>Proposed release gate</h3><p>No missed urgent cases in the reviewed evaluation set. Log overrides, reviewer agreement, latency and cost. A pass on ten examples is not enough to release.</p></div><div><h3>Measure the business result</h3><p>Compare handling time, repeat contacts and escalations per 100 files with the baseline. Expand only if service quality holds while manual work falls.</p></div></div>
    </section>}
    {notice && <p role="status" className="ai-warning">{notice}</p>}
    <section className="ai-bottom"><div><h2>The implementation choice</h2><p>Buy the case system and model access. Build the workflow, evidence trace and evaluation layer. Keep client communication behind human approval.</p></div><Link className="btn ghost" href="/plan/">See the 90-day rollout →</Link></section>
  </>;
}
