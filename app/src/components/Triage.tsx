"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { classify, slaStatus, type Classification, type SlaState } from "@/lib/classify";
import { ALL_OWNERS, approver, draftReply, guardrails, routeOwner } from "@/lib/routing";
import { AREA_LAWYER, AREA_SHORT, AREAS, CHANNEL_LABEL, INBOX_NOW, INTENT_LABEL, INTENTS, ROOT_CAUSES, ROOT_LABEL, STATUSES, type Area, type Channel, type Intent, type Message, type RootCause, type Status } from "@/lib/taxonomy";

type Row = { m: Message; c: Classification; owner: string; rule: string };
type Sla = { state: SlaState | "none"; hours_left: number; target: number };
type Decision = { at: string; action: "approved" | "lawyer_review" | "rejected"; reason?: string; text?: string; by?: string };
type Store = { owners: Record<string, string>; decisions: Record<string, Decision>; status: Record<string, Status> };
const KEY = "client-ops-triage-v2";
const QUEUES = [["open", "All open"], ["breached", "SLA breached"], ["at_risk", "SLA at risk"], ["P1", "P1 deadline"], ["risk", "Escalation risk ≥ 60"], ["escalated", "Escalated"], ["all", "Everything, incl. resolved"]] as const;
type Queue = (typeof QUEUES)[number][0];
type SortKey = "sla" | "received" | "risk" | "client";
const CHANNEL_SHORT: Record<Channel, string> = { email: "Email", portal: "Portal", phone: "Phone", review: "Review" };
const RANGES = [[7, "Last 7 days"], [14, "Last 14 days"], [30, "Last 30 days"]] as const;

function load(): Store { try { const s = JSON.parse(localStorage.getItem(KEY) ?? ""); return { owners: s.owners ?? {}, decisions: s.decisions ?? {}, status: s.status ?? {} }; } catch { return { owners: {}, decisions: {}, status: {} }; } }
function save(s: Store) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: decisions last for this visit only */ } }

/** Simulated clock: starts at the fixed demo time and runs in real time from page load, so SLA timers count down. */
function useSimNow() {
  const start = useRef<number | null>(null);
  const [now, setNow] = useState(Date.parse(INBOX_NOW));
  useEffect(() => { start.current = Date.now(); const t = setInterval(() => setNow(Date.parse(INBOX_NOW) + (Date.now() - start.current!)), 1000); return () => clearInterval(t); }, []);
  return now;
}
const fmtAgo = (iso: string, now: number) => { const h = (now - Date.parse(iso)) / 3_600_000; return h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} d ago`; };
export function fmtTimer(h: number) {
  const neg = h < 0; const s = Math.abs(Math.round(h * 3600));
  if (s >= 48 * 3600) return `${neg ? "−" : ""}${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${neg ? "−" : ""}${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
const timed = (s: Status) => s === "New" || s === "Escalated";

export default function Triage({ messages }: { messages: Message[] }) {
  const [store, setStore] = useState<Store>({ owners: {}, decisions: {}, status: {} });
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => setStore(load()), []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);
  const update = (f: (s: Store) => Store) => setStore((s) => { const n = f(s); save(n); return n; });
  const now = useSimNow();

  const rows: Row[] = useMemo(() => messages.map((m) => { const c = classify(m); const r = routeOwner(c); return { m, c, owner: r.owner, rule: r.rule }; }), [messages]);

  const [queue, setQueue] = useState<Queue>("open");
  const [days, setDays] = useState<number>(30);
  const [area, setArea] = useState<Area | "">("");
  const [intent, setIntent] = useState<Intent | "">("");
  const [root, setRoot] = useState<RootCause | "">("");
  const [channel, setChannel] = useState<Channel | "">("");
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "sla", dir: 1 });
  const [sel, setSel] = useState<string | null>(null);

  const nowIso = new Date(now).toISOString();
  const statusOf = (r: Row) => store.status[r.m.id] ?? r.m.status;
  const ownerOf = (r: Row) => store.owners[r.m.id] ?? r.owner;
  const slaOf = (r: Row): Sla => timed(statusOf(r)) ? slaStatus(r.c.priority, r.m.received_at, nowIso) : { state: "none", hours_left: Number.POSITIVE_INFINITY, target: 0 };
  const inRange = (r: Row) => now - Date.parse(r.m.received_at) <= days * 86_400_000;
  const inQueue = (r: Row, k: Queue) => {
    const open = statusOf(r) !== "Resolved";
    if (k === "all") return true;
    if (!open) return false;
    return k === "open" ? true : k === "breached" ? slaOf(r).state === "breached" : k === "at_risk" ? slaOf(r).state === "at_risk" : k === "P1" ? r.c.priority === "P1" : k === "risk" ? r.c.escalation_risk >= 60 : statusOf(r) === "Escalated";
  };
  const ranged = rows.filter(inRange);
  const cmp = (a: Row, b: Row) => {
    const la = slaOf(a).hours_left, lb = slaOf(b).hours_left;
    const d = sort.key === "sla" ? (la === lb ? Date.parse(b.m.received_at) - Date.parse(a.m.received_at) : la < lb ? -1 : 1)
      : sort.key === "received" ? Date.parse(b.m.received_at) - Date.parse(a.m.received_at)
      : sort.key === "risk" ? b.c.escalation_risk - a.c.escalation_risk : a.m.client.localeCompare(b.m.client);
    return d * sort.dir;
  };
  const shown = ranged
    .filter((r) => inQueue(r, queue) && (!area || r.c.area === area) && (!intent || r.c.intent === intent) && (!root || r.c.root_cause === root) && (!channel || r.m.channel === channel) && (!owner || ownerOf(r) === owner))
    .filter((r) => !q || `${r.m.subject} ${r.m.body} ${r.m.client} ${r.m.matter ?? ""} ${r.m.id} ${r.m.case_manager ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort(cmp);
  const count = (k: Queue) => ranged.filter((r) => inQueue(r, k)).length;
  const openRows = ranged.filter((r) => statusOf(r) !== "Resolved");
  const selRow = rows.find((r) => r.m.id === sel) ?? null;
  const feat = rows.find((r) => r.m.id === "MSG-10000");
  const th = (key: SortKey, label: string) => <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}><button className="sortbtn" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>{label}{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</button></th>;
  const clear = () => { setArea(""); setIntent(""); setRoot(""); setChannel(""); setOwner(""); setQ(""); setQueue("open"); };

  return (
    <>
      {feat && <Featured row={feat} sla={slaOf(feat)} onOpen={() => setSel(feat.m.id)} />}
      <div className="section-head">
        <h2>The full queue</h2>
        <label className="range">Date range <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range">{RANGES.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></label>
      </div>
      <div className="kpis">
        <div className="kpi"><div className="v">{openRows.length}</div><div className="l">Open of {ranged.length} messages in range</div></div>
        <div className="kpi p"><div className="v">{count("breached")}</div><div className="l">First-response SLA breached</div></div>
        <div className="kpi y"><div className="v">{count("P1")}</div><div className="l">Open with a deadline ≤ 14 days</div></div>
        <div className="kpi"><div className="v">{count("risk")}</div><div className="l">Open, escalation risk ≥ 60</div></div>
        <div className="kpi"><div className="v">{openRows.filter((r) => r.c.sentiment === "negative").length}</div><div className="l">Open, negative tone</div></div>
        <div className="kpi t"><div className="v">{Object.values(store.decisions).filter((d) => d.action !== "rejected").length}</div><div className="l">Drafts approved or with a lawyer (you)</div></div>
      </div>
      <div className="qbar" role="group" aria-label="Queues">
        {QUEUES.map(([k, label]) => <button key={k} className={queue === k ? "on" : ""} aria-pressed={queue === k} onClick={() => setQueue(k)}>{label} <span className="n">{count(k)}</span></button>)}
      </div>
      <div className="filters">
        <label>Area <select value={area} onChange={(e) => setArea(e.target.value as Area | "")}><option value="">All</option>{AREAS.map((a) => <option key={a} value={a}>{AREA_SHORT[a]}</option>)}</select></label>
        <label>Channel <select value={channel} onChange={(e) => setChannel(e.target.value as Channel | "")}><option value="">All</option>{(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select></label>
        <label>Intent <select value={intent} onChange={(e) => setIntent(e.target.value as Intent | "")}><option value="">All</option>{INTENTS.map((i) => <option key={i} value={i}>{INTENT_LABEL[i]}</option>)}</select></label>
        <label>Root cause <select value={root} onChange={(e) => setRoot(e.target.value as RootCause | "")}><option value="">All</option>{ROOT_CAUSES.map((r) => <option key={r} value={r}>{ROOT_LABEL[r]}</option>)}</select></label>
        <label>Owner <select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">All</option>{ALL_OWNERS.map((o) => <option key={o}>{o}</option>)}</select></label>
        <input type="search" placeholder="Search client, file number, case manager or text" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search messages" />
      </div>
      <p className="small muted" style={{ margin: "0 0 8px" }}>{shown.length} shown. Click a column header to sort. SLA timers run live from Monday 19 October 2026, 09:00 Toronto time (simulated clock) and apply to New and Escalated messages. Select a row for the thread, the reasoning and the draft.</p>
      <div className="table-wrap">
        <table className="inbox">
          <colgroup><col className="c-sla" /><col className="c-status" /><col className="c-pri" /><col className="c-recv" /><col className="c-client" /><col /><col className="c-area" /><col className="c-cm" /><col className="c-root" /><col className="c-tone" /><col className="c-risk" /></colgroup>
          <thead><tr>{th("sla", "SLA")}<th>Status</th><th>Pri.</th>{th("received", "Received")}{th("client", "Client · file")}<th>Message</th><th>Area</th><th>Case manager</th><th>Root cause</th><th>Tone</th>{th("risk", "Risk")}</tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={11} style={{ padding: 24, textAlign: "center" }}>No messages match these filters. <button className="sm ghost" onClick={clear}>Clear filters</button></td></tr>}
            {shown.map((r) => {
              const d = store.decisions[r.m.id]; const sla = slaOf(r); const st = statusOf(r);
              return (
                <tr key={r.m.id} className={`row${sel === r.m.id ? " sel" : ""}`} onClick={() => setSel(r.m.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setSel(r.m.id); }}>
                  <td>{sla.state === "none" ? <span className="muted small">{st === "Resolved" ? "Closed" : "Replied"}</span> : <span className={`pill timer ${sla.state}`}>{fmtTimer(sla.hours_left)}</span>}</td>
                  <td><span className={`status-chip s-${st.replace(/ /g, "-").toLowerCase()}`}>{st}</span></td>
                  <td><span className={`pill ${r.c.priority}`}>{r.c.priority}</span></td>
                  <td title={CHANNEL_LABEL[r.m.channel]}>{fmtAgo(r.m.received_at, now)}<div className="sku">{CHANNEL_SHORT[r.m.channel]}</div></td>
                  <td title={`${r.m.client} · ${r.m.matter ?? "New enquiry"}`}>{r.m.client}<div className="sku">{r.m.matter ?? "New enquiry"}</div></td>
                  <td className="subj" title={r.m.subject}><strong style={{ fontWeight: 600 }}>{r.m.subject}</strong>{d && <> <span className={`pill ${d.action === "approved" ? "approved" : d.action === "lawyer_review" ? "violet" : ""}`}>{d.action === "approved" ? "Approved" : d.action === "lawyer_review" ? "With lawyer" : "Rejected"}</span></>}<span className="snip">{r.m.body}</span></td>
                  <td className="wrap2" title={r.c.area ? AREA_SHORT[r.c.area] : "Unclear"}>{r.c.area ? AREA_SHORT[r.c.area] : <span className="muted">Unclear</span>}</td>
                  <td title={`${r.m.case_manager ?? "Intake"} · ${ownerOf(r)}`}>{r.m.case_manager ?? <span className="muted">Intake</span>}<div className="sku">{ownerOf(r)}</div></td>
                  <td className="wrap2" title={ROOT_LABEL[r.c.root_cause]}><span className="clamp2">{ROOT_LABEL[r.c.root_cause]}</span></td>
                  <td><span className={`pill ${r.c.sentiment}`}>{r.c.sentiment}</span></td>
                  <td><span className="risk">{r.c.escalation_risk}<span className="bar"><div style={{ width: `${r.c.escalation_risk}%` }} /></span></span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selRow && <Drawer row={selRow} store={store} status={statusOf(selRow)} sla={slaOf(selRow)} ownerOf={ownerOf} onClose={() => setSel(null)} update={update} toast={setToast} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

function Drawer({ row, store, status, sla, ownerOf, onClose, update, toast }: { row: Row; store: Store; status: Status; sla: Sla; ownerOf: (r: Row) => string; onClose: () => void; update: (f: (s: Store) => Store) => void; toast: (t: string) => void }) {
  const { m, c } = row;
  const [text, setText] = useState(() => store.decisions[m.id]?.text ?? draftReply(m, c));
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => { setText(store.decisions[m.id]?.text ?? draftReply(m, c)); setEditing(false); setReason(""); }, [m.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const d = store.decisions[m.id];
  const placeholders = (text.match(/\[[^\]]+\]/g) ?? []).length;
  const guards = guardrails(text, c);
  const blocked = guards.some((g) => g.blocking && !g.ok);
  const who = approver(c);
  const lawyer = c.area ? AREA_LAWYER[c.area] : "the responsible lawyer";
  const approve = () => {
    if (blocked) return;
    const action = who.role === "Lawyer" ? "lawyer_review" : "approved";
    update((s) => ({ ...s, decisions: { ...s.decisions, [m.id]: { at: new Date().toISOString(), action, text, by: who.role } }, status: { ...s.status, [m.id]: status === "New" ? "In progress" : status } }));
    setEditing(false);
    toast(action === "lawyer_review" ? `Draft saved for lawyer review (${lawyer}). Nothing was sent.` : "Draft approved by the client success lead. Nothing was sent.");
  };
  const thread = [...m.thread, { at: m.received_at, from: "client" as const, author: m.client, text: m.body }];
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Message ${m.id}`}>
        <button className="close sm" onClick={onClose}>Close</button>
        <div className="sku">{m.id} · {CHANNEL_LABEL[m.channel]} · {m.matter ?? "New enquiry"}</div>
        <h2 style={{ marginTop: 6 }}>{m.subject}</h2>
        <div className="chips"><span>{m.client}</span><span>Case manager: {m.case_manager ?? "not yet assigned"}</span><span>{m.prior_contacts_30d} earlier contacts in 30 days</span></div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <label className="small">Status <select value={status} onChange={(e) => { const v = e.target.value as Status; update((s) => ({ ...s, status: { ...s.status, [m.id]: v } })); toast(`Status set to ${v}`); }} aria-label="Status">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
          {sla.state !== "none" && <span className={`pill timer ${sla.state}`}>SLA {fmtTimer(sla.hours_left)} · target {sla.target} h</span>}
        </div>
        <section>
          <h3>Thread</h3>
          <ol className="thread">
            {thread.map((t, i) => <li key={i} className={`t-${t.from}${i === thread.length - 1 ? " latest" : ""}`}><div className="meta"><strong>{t.author}</strong> · {new Date(t.at).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" })}</div><div>{t.text}</div></li>)}
          </ol>
        </section>
        <section>
          <h3>Classification and why</h3>
          <div className="chips">
            <span className={`pill ${c.priority}`}>{c.priority}</span>
            <span className={`pill ${c.sentiment}`}>{c.sentiment} ({c.sentiment_score > 0 ? "+" : ""}{c.sentiment_score})</span>
            <span className="pill violet">Escalation risk {c.escalation_risk}</span>
            <span>Root cause: {ROOT_LABEL[c.root_cause]}</span>
          </div>
          <dl className="ev">
            {c.evidence.map((e) => (
              <div key={e.field} style={{ display: "contents" }}>
                <dt>{e.field}</dt>
                <dd><strong style={{ fontWeight: 600 }}>{e.field === "Practice area" ? (c.area ? AREA_SHORT[c.area] : "Unclear") : e.field === "Intent" ? INTENT_LABEL[c.intent] : e.field === "Root cause" ? ROOT_LABEL[c.root_cause] : e.field === "Sentiment" ? c.sentiment : c.priority}</strong> · {e.rule}{e.matches.length > 0 && <> · matched {e.matches.map((x, i) => <code key={i} style={{ marginRight: 4 }}>{x}</code>)}</>}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Suggested owner</h3>
          <div className="toolbar" style={{ marginBottom: 4 }}>
            <select value={ownerOf(row)} onChange={(e) => { const v = e.target.value; update((s) => { const owners = { ...s.owners }; if (v === row.owner) delete owners[m.id]; else owners[m.id] = v; return { ...s, owners }; }); toast(`Reassigned to ${v}`); }} aria-label="Owner">
              {ALL_OWNERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <p className="small muted">Routed by rule: {row.rule}. Reassignments are logged and reviewed weekly to fix the rule, not just the ticket.</p>
        </section>
        <section>
          <h3>Reply draft · {who.role === "Lawyer" ? `lawyer approval required (${lawyer})` : "client success lead approval"}</h3>
          <ul className="clean small guards">
            {guards.map((g) => <li key={g.label}><span className={g.ok ? "good" : g.blocking ? "bad" : "warnc"}>{g.ok ? "✓" : g.blocking ? "✕" : "!"}</span><strong style={{ fontWeight: 600 }}>{g.label}</strong> <span className="muted">· {g.detail}</span></li>)}
          </ul>
          <textarea className={`draft${editing ? " editing" : ""}`} value={text} readOnly={!editing} onChange={(e) => setText(e.target.value)} aria-label="Draft reply" />
          <p className="small muted" style={{ margin: "4px 0 0" }}>Square brackets mark facts to confirm in the file ({placeholders} left). Try editing in &quot;you will be approved&quot; to see the advice guardrail block approval.</p>
          <div className="toolbar" style={{ marginTop: 8 }}>
            <button onClick={approve} disabled={blocked} title={blocked ? "Remove the legal-advice phrase first" : undefined}>{who.role === "Lawyer" ? "Approve and send to lawyer" : "Approve"}</button>
            <button className="ghost" onClick={() => setEditing((e) => !e)}>{editing ? "Done editing" : "Edit"}</button>
            <button className="ghost" onClick={() => { setText(draftReply(m, c)); toast("Draft reset to the template"); }}>Reset</button>
          </div>
          <div className="toolbar">
            <input type="text" placeholder="Reason, if rejecting the draft" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Rejection reason" style={{ flex: 1, minWidth: 160 }} />
            <button className="ghost" onClick={() => { update((s) => ({ ...s, decisions: { ...s.decisions, [m.id]: { at: new Date().toISOString(), action: "rejected", reason: reason || "No reason given" } } })); toast("Draft rejected; the reason goes to the weekly template review"); }}>Reject</button>
          </div>
          {d && <div className={`callout${d.action === "rejected" ? " bad" : ""}`} role="status">
            {d.action === "approved" ? <>Approved by the client success lead at {new Date(d.at).toLocaleTimeString("en-CA", { timeStyle: "short" })}. <strong>Not sent.</strong> In a real rollout it goes to the owner&apos;s outbound queue in email or the client portal, and a person presses send once the bracketed facts are filled.</> : d.action === "lawyer_review" ? <>Saved for lawyer review at {new Date(d.at).toLocaleTimeString("en-CA", { timeStyle: "short" })} ({who.why}). <strong>Not sent to the client.</strong> {lawyer} reviews it in the case file, edits or approves it, and only then does it go out.</> : <>Rejected: {d.reason}.</>}
            {" "}<button className="sm ghost" onClick={() => update((s) => { const decisions = { ...s.decisions }; delete decisions[m.id]; return { ...s, decisions }; })}>Undo</button>
          </div>}
        </section>
      </aside>
    </>
  );
}

function Featured({ row, sla, onOpen }: { row: Row; sla: Sla; onOpen: () => void }) {
  const { m, c } = row;
  const who = approver(c);
  const g = guardrails(draftReply(m, c), c);
  const route = routeOwner(c);
  return (
    <div className="featured">
      <div className="feat-msg">
        <p className="eyebrow" style={{ marginTop: 0 }}>Start here: one message, start to finish</p>
        <h2>{m.subject}</h2>
        <div className="chips"><span>{m.client}</span><span>{m.matter}</span><span>{CHANNEL_LABEL[m.channel]}</span><span>{m.prior_contacts_30d} earlier contacts</span></div>
        <div className="msg">{m.body}</div>
        <p className="small muted">A client who paid, heard nothing for twelve days and has just posted a one-star review. In a shared inbox this waits behind routine questions. Here it goes to the top.</p>
      </div>
      <div className="feat-steps">
        <div><span className="n">1</span><div><strong>Classified: {c.area ? AREA_SHORT[c.area] : "area unclear"}, {INTENT_LABEL[c.intent].toLowerCase()}</strong><span>Tone {c.sentiment}, escalation risk {c.escalation_risk} of 100, third contact in 30 days</span></div></div>
        <div><span className="n">2</span><div><strong>Root cause: {ROOT_LABEL[c.root_cause].toLowerCase()}</strong><span>The system fix: a silent-file alert at 14 days and a proactive update at every milestone, so the next client never writes this.</span></div></div>
        <div><span className="n">3</span><div><strong>SLA {sla.state === "at_risk" ? "at risk" : sla.state === "breached" ? "breached" : "running"}: <span className="mono">{sla.state === "none" ? "n/a" : fmtTimer(sla.hours_left)}</span> left</strong><span>{c.priority} · first response due {sla.target} hours after receipt</span></div></div>
        <div><span className="n">4</span><div><strong>Owner: {route.owner}</strong><span>Case manager {m.case_manager}; {route.rule.toLowerCase()}</span></div></div>
        <div><span className="n">5</span><div><strong>Reply drafted, {who.role.toLowerCase()} approval required</strong><span>From {g[0].detail}. No legal advice; nothing is sent automatically.</span></div></div>
        <button onClick={onOpen}>Open the thread and the draft</button>
      </div>
    </div>
  );
}
