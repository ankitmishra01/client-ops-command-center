"use client";
import { useEffect, useMemo, useState } from "react";
import { classify, slaStatus, type Classification } from "@/lib/classify";
import { ALL_OWNERS, approver, draftReply, guardrails, routeOwner } from "@/lib/routing";
import { AREA_SHORT, AREAS, INBOX_NOW, INTENT_LABEL, INTENTS, ROOT_CAUSES, ROOT_LABEL, type Area, type Intent, type Message, type RootCause } from "@/lib/taxonomy";

type Row = { m: Message; c: Classification; sla: ReturnType<typeof slaStatus>; owner: string; rule: string };
type Decision = { at: string; action: "approved" | "lawyer_review" | "rejected"; reason?: string; text?: string; by?: string };
type Store = { owners: Record<string, string>; decisions: Record<string, Decision> };
const KEY = "client-ops-triage-v1";
const QUEUES = [["all", "All open"], ["breached", "SLA breached"], ["at_risk", "SLA at risk"], ["P1", "P1 deadline"], ["risk", "Escalation risk ≥ 60"], ["triage", "Area unclear"]] as const;
type Queue = (typeof QUEUES)[number][0];

function load(): Store { try { const s = JSON.parse(localStorage.getItem(KEY) ?? ""); return { owners: s.owners ?? {}, decisions: s.decisions ?? {} }; } catch { return { owners: {}, decisions: {} }; } }
function save(s: Store) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: decisions last for this visit only */ } }

const fmtAgo = (iso: string) => { const h = (Date.parse(INBOX_NOW) - Date.parse(iso)) / 3_600_000; return h < 1 ? `${Math.round(h * 60)} min ago` : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} d ago`; };
const fmtLeft = (h: number) => (h < 0 ? `${Math.abs(h) < 48 ? `${Math.round(-h)} h` : `${Math.round(-h / 24)} d`} over` : `${Math.round(h)} h left`);

export default function Triage({ messages }: { messages: Message[] }) {
  const [store, setStore] = useState<Store>({ owners: {}, decisions: {} });
  useEffect(() => setStore(load()), []);
  const update = (f: (s: Store) => Store) => setStore((s) => { const n = f(s); save(n); return n; });

  const rows: Row[] = useMemo(() => messages.map((m) => {
    const c = classify(m); const r = routeOwner(c);
    return { m, c, sla: slaStatus(c.priority, m.received_at, INBOX_NOW), owner: r.owner, rule: r.rule };
  }), [messages]);

  const [queue, setQueue] = useState<Queue>("all");
  const [area, setArea] = useState<Area | "">("");
  const [intent, setIntent] = useState<Intent | "">("");
  const [root, setRoot] = useState<RootCause | "">("");
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const ownerOf = (r: Row) => store.owners[r.m.id] ?? r.owner;
  const inQueue = (r: Row, k: Queue) => k === "all" ? true : k === "breached" ? r.sla.state === "breached" : k === "at_risk" ? r.sla.state === "at_risk" : k === "P1" ? r.c.priority === "P1" : k === "risk" ? r.c.escalation_risk >= 60 : r.c.area == null;
  const shown = rows
    .filter((r) => inQueue(r, queue) && (!area || r.c.area === area) && (!intent || r.c.intent === intent) && (!root || r.c.root_cause === root) && (!owner || ownerOf(r) === owner))
    .filter((r) => !q || `${r.m.subject} ${r.m.body} ${r.m.client} ${r.m.matter ?? ""} ${r.m.id}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.sla.hours_left - b.sla.hours_left);
  const count = (k: Queue) => rows.filter((r) => inQueue(r, k)).length;
  const approved = Object.values(store.decisions).filter((d) => d.action !== "rejected").length;
  const selRow = rows.find((r) => r.m.id === sel) ?? null;

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="v">{rows.length}</div><div className="l">Open messages, last 5 days</div></div>
        <div className="kpi p"><div className="v">{count("breached")}</div><div className="l">First-response SLA breached</div></div>
        <div className="kpi y"><div className="v">{count("P1")}</div><div className="l">P1: stated deadline ≤ 14 days</div></div>
        <div className="kpi"><div className="v">{count("risk")}</div><div className="l">Escalation risk ≥ 60</div></div>
        <div className="kpi"><div className="v">{rows.filter((r) => r.c.sentiment === "negative").length}</div><div className="l">Negative tone</div></div>
        <div className="kpi t"><div className="v">{approved}</div><div className="l">Drafts approved or sent for lawyer sign-off (this browser)</div></div>
      </div>
      <div className="qbar" role="group" aria-label="Queues">
        {QUEUES.map(([k, label]) => <button key={k} className={queue === k ? "on" : ""} aria-pressed={queue === k} onClick={() => setQueue(k)}>{label} <span className="n">{count(k)}</span></button>)}
      </div>
      <div className="filters">
        <label>Area <select value={area} onChange={(e) => setArea(e.target.value as Area | "")}><option value="">All</option>{AREAS.map((a) => <option key={a} value={a}>{AREA_SHORT[a]}</option>)}</select></label>
        <label>Intent <select value={intent} onChange={(e) => setIntent(e.target.value as Intent | "")}><option value="">All</option>{INTENTS.map((i) => <option key={i} value={i}>{INTENT_LABEL[i]}</option>)}</select></label>
        <label>Root cause <select value={root} onChange={(e) => setRoot(e.target.value as RootCause | "")}><option value="">All</option>{ROOT_CAUSES.map((r) => <option key={r} value={r}>{ROOT_LABEL[r]}</option>)}</select></label>
        <label>Owner <select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">All</option>{ALL_OWNERS.map((o) => <option key={o}>{o}</option>)}</select></label>
        <input type="search" placeholder="Search subject, text, client or matter" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search messages" />
      </div>
      <p className="small muted" style={{ margin: "0 0 8px" }}>{shown.length} shown, most urgent first (least SLA time left). Clock fixed at Monday 19 October 2026, 09:00 Toronto time. Select a row to see why it was classified that way and the suggested reply.</p>
      <div className="table-wrap">
        <table className="inbox">
          <thead><tr><th>SLA</th><th>Priority</th><th>Received</th><th>Client · matter</th><th>Message</th><th>Area</th><th>Intent</th><th>Root cause</th><th>Tone</th><th>Risk</th><th>Owner</th></tr></thead>
          <tbody>
            {shown.map((r) => {
              const d = store.decisions[r.m.id];
              return (
                <tr key={r.m.id} className={`row${sel === r.m.id ? " sel" : ""}`} onClick={() => setSel(r.m.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setSel(r.m.id); }}>
                  <td><span className={`pill ${r.sla.state}`}>{fmtLeft(r.sla.hours_left)}</span></td>
                  <td><span className={`pill ${r.c.priority}`}>{r.c.priority}</span></td>
                  <td>{fmtAgo(r.m.received_at)}<div className="sku">{r.m.channel}</div></td>
                  <td>{r.m.client}<div className="sku">{r.m.matter ?? "new enquiry"}</div></td>
                  <td className="subj"><strong style={{ fontWeight: 600 }}>{r.m.subject}</strong>{d && <> <span className={`pill ${d.action === "approved" ? "approved" : d.action === "lawyer_review" ? "violet" : ""}`}>{d.action === "approved" ? "Draft approved" : d.action === "lawyer_review" ? "With lawyer" : "Draft rejected"}</span></>}<span className="snip">{r.m.body}</span></td>
                  <td>{r.c.area ? AREA_SHORT[r.c.area] : <span className="muted">Unclear</span>}</td>
                  <td>{INTENT_LABEL[r.c.intent]}</td>
                  <td>{ROOT_LABEL[r.c.root_cause]}</td>
                  <td><span className={`pill ${r.c.sentiment}`}>{r.c.sentiment}</span></td>
                  <td><span className="risk">{r.c.escalation_risk}<span className="bar"><div style={{ width: `${r.c.escalation_risk}%` }} /></span></span></td>
                  <td>{ownerOf(r)}{store.owners[r.m.id] && <div className="sku">reassigned</div>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selRow && <Drawer row={selRow} store={store} ownerOf={ownerOf} onClose={() => setSel(null)} update={update} />}
    </>
  );
}

function Drawer({ row, store, ownerOf, onClose, update }: { row: Row; store: Store; ownerOf: (r: Row) => string; onClose: () => void; update: (f: (s: Store) => Store) => void }) {
  const { m, c, sla } = row;
  const [text, setText] = useState(() => store.decisions[m.id]?.text ?? draftReply(m, c));
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setText(store.decisions[m.id]?.text ?? draftReply(m, c)); setCopied(false); setReason(""); }, [m.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const d = store.decisions[m.id];
  const placeholders = (text.match(/\[[^\]]+\]/g) ?? []).length;
  const guards = guardrails(text, c);
  const blocked = guards.some((g) => g.blocking && !g.ok);
  const who = approver(c);
  const approve = async () => {
    if (blocked) return;
    const action = who.role === "Lawyer" ? "lawyer_review" : "approved";
    update((s) => ({ ...s, decisions: { ...s.decisions, [m.id]: { at: new Date().toISOString(), action, text, by: who.role } } }));
    if (action === "approved") { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } }
  };
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Message ${m.id}`}>
        <button className="close sm" onClick={onClose}>Close</button>
        <div className="sku">{m.id} · {m.channel} · {new Date(m.received_at).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" })} Toronto</div>
        <h2 style={{ marginTop: 6 }}>{m.subject}</h2>
        <div className="chips"><span>{m.client}</span><span>{m.matter ?? "No matter yet"}</span><span>{m.prior_contacts_30d} earlier contacts in 30 days</span></div>
        <div className="msg">{m.body}</div>
        <section>
          <h3>Classification and why</h3>
          <div className="chips">
            <span className={`pill ${c.priority}`}>{c.priority}</span>
            <span className={`pill ${sla.state}`}>{sla.state === "breached" ? "SLA breached" : sla.state === "at_risk" ? "SLA at risk" : "Within SLA"} · target {sla.target} h · {fmtLeft(sla.hours_left)}</span>
            <span className={`pill ${c.sentiment}`}>{c.sentiment} ({c.sentiment_score > 0 ? "+" : ""}{c.sentiment_score})</span>
            <span className="pill violet">Escalation risk {c.escalation_risk}</span>
          </div>
          <dl className="ev">
            {c.evidence.map((e) => (
              <div key={e.field} style={{ display: "contents" }}>
                <dt>{e.field}</dt>
                <dd><strong style={{ fontWeight: 600 }}>{e.field === "Practice area" ? (c.area ? AREA_SHORT[c.area] : "Unclear") : e.field === "Intent" ? INTENT_LABEL[c.intent] : e.field === "Root cause" ? ROOT_LABEL[c.root_cause] : e.field === "Sentiment" ? c.sentiment : c.priority}</strong> · {e.rule}{e.matches.length > 0 && <> · matched {e.matches.map((x, i) => <code key={i} style={{ marginRight: 4 }}>{x}</code>)}</>}</dd>
              </div>
            ))}
          </dl>
          {c.area == null && <p className="small muted">No practice-area phrase in the text. In a real rollout the matter number would be looked up in the practice management system first; the keyword rules are the fallback.</p>}
        </section>
        <section>
          <h3>Owner</h3>
          <div className="toolbar" style={{ marginBottom: 4 }}>
            <select value={ownerOf(row)} onChange={(e) => { const v = e.target.value; update((s) => { const owners = { ...s.owners }; if (v === row.owner) delete owners[m.id]; else owners[m.id] = v; return { ...s, owners }; }); }} aria-label="Owner">
              {ALL_OWNERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <p className="small muted">Routed by rule: {row.rule}. A reassignment is kept in this browser; in a real rollout reassignments are logged and reviewed weekly to fix the rule, not just the ticket.</p>
        </section>
        <section>
          <h3>Suggested reply (draft for human approval)</h3>
          <p className="small muted" style={{ marginTop: 0 }}>Assembled only from lawyer-approved templates, never free-written, and never sent automatically. Square brackets mark facts to check in the case file; {placeholders > 0 ? <strong>{placeholders} still to fill</strong> : "none left"}. Try typing &quot;you will be approved&quot; into the draft to see the advice guardrail block approval.</p>
          <ul className="clean small" style={{ listStyle: "none", paddingLeft: 0, margin: "0 0 10px" }}>
            {guards.map((g) => <li key={g.label}><span className={g.ok ? "good" : g.blocking ? "bad" : ""} style={{ display: "inline-block", width: 18, color: g.ok ? undefined : g.blocking ? undefined : "var(--amber)", fontWeight: 700 }}>{g.ok ? "✓" : g.blocking ? "✕" : "!"}</span><strong style={{ fontWeight: 600 }}>{g.label}</strong> <span className="muted">· {g.detail}</span></li>)}
          </ul>
          <textarea className="draft" value={text} onChange={(e) => setText(e.target.value)} aria-label="Draft reply" />
          <div className="toolbar" style={{ marginTop: 8 }}>
            <button onClick={approve} disabled={blocked} title={blocked ? "Remove the legal-advice phrase first" : undefined}>{who.role === "Lawyer" ? "Send to lawyer for sign-off" : "Approve as CS lead"}</button>
            <input type="text" placeholder="Reason, if rejecting" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Rejection reason" style={{ flex: 1, minWidth: 160 }} />
            <button className="ghost" onClick={() => update((s) => ({ ...s, decisions: { ...s.decisions, [m.id]: { at: new Date().toISOString(), action: "rejected", reason: reason || "No reason given" } } }))}>Reject draft</button>
            <button className="ghost" onClick={() => setText(draftReply(m, c))}>Reset</button>
          </div>
          {d && <div className={`callout${d.action === "rejected" ? " bad" : ""}`} role="status">
            {d.action === "approved" ? <>Approved by the client success lead at {new Date(d.at).toLocaleTimeString("en-CA", { timeStyle: "short" })}{copied ? ", copied to clipboard" : ""}. <strong>Not sent.</strong> In a real rollout approval places the reply in the owner&apos;s outbound queue in email or the client portal, and a person presses send.{placeholders > 0 && " The draft still has bracketed facts; the send step stays blocked until they are filled."}</> : d.action === "lawyer_review" ? <>Sent for lawyer sign-off at {new Date(d.at).toLocaleTimeString("en-CA", { timeStyle: "short" })} ({who.why}). <strong>Not sent to the client.</strong> The responsible lawyer reviews the draft in the case file, edits or approves it, and only then does it go to the outbound queue.</> : <>Rejected: {d.reason}. Rejection reasons are reviewed weekly to improve the templates.</>}
            {" "}<button className="sm ghost" onClick={() => update((s) => { const decisions = { ...s.decisions }; delete decisions[m.id]; return { ...s, decisions }; })}>Undo</button>
          </div>}
        </section>
      </aside>
    </>
  );
}
