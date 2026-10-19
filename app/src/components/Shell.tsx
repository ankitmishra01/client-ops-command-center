"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DISCLAIMER, GITHUB_URL, PRODUCT } from "@/lib/brand";

const NAV = [["/triage/", "Triage"], ["/csat/", "CSAT & reviews"], ["/hiring/", "Hiring"], ["/plan/", "First 90 days"], ["/about/", "About"]];
const NOTES = [
  { href: "/triage/", title: "Escalation, SLA at risk", body: "Daniela Rosário-Klein · Family sponsorship · paid, 12 days silent" },
  { href: "/csat/", title: "52 silent files today", body: "Paid files with no client update in more than 10 days" },
  { href: "/hiring/", title: "Requisitions over target", body: "Several open roles are past their target days to hire" },
  { href: "/plan/", title: "Day-30 checkpoint in 11 days", body: "Baseline scorecard for COO sign-off" },
];

function Bell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="bell" ref={ref}>
      <button className="bell-btn" aria-label={`Notifications, ${NOTES.length} new`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        <span className="badge">{NOTES.length}</span>
      </button>
      {open && <div className="bell-menu" role="menu">
        <div className="bell-title">Notifications <span className="muted">(simulated)</span></div>
        {NOTES.map((n) => <Link key={n.title} href={n.href} role="menuitem" onClick={() => setOpen(false)}><strong>{n.title}</strong><span>{n.body}</span></Link>)}
      </div>}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="top">
        <div className="top-inner">
          <Link className="logo" href="/" aria-label={`${PRODUCT}, home`}>
            <span className="mark">{PRODUCT}</span>
            <span>Prototype</span>
          </Link>
          <nav aria-label="Pages">{NAV.map(([href, label]) => <Link key={href} href={href} className={path?.startsWith(href) ? "active" : ""} aria-current={path?.startsWith(href) ? "page" : undefined}>{label}</Link>)}</nav>
          <div className="top-right">
            <Bell />
            <div className="user" title="Demo user"><span className="avatar" aria-hidden="true">AM</span><span className="user-name">Ankit M. · Head of Ops (demo)</span></div>
          </div>
        </div>
      </header>
      <div className="syncbar"><span className="dot-live" aria-hidden="true" />Last synced 2 min ago · Clio · Gmail · Client portal <span className="muted">(simulated; no live connections)</span></div>
      <div className="disclaimer" role="note"><strong>Prototype by Ankit Mishra · synthetic data · not affiliated with CanadaVisa.</strong> <span>{DISCLAIMER}</span> <Link href="/about/">Methodology and limits</Link></div>
      <main>{children}</main>
      <footer><strong>Prototype by Ankit Mishra · synthetic data · not affiliated with CanadaVisa.</strong> {DISCLAIMER} Every message, client, file number, staff name, review and metric is generated; nothing comes from a real case file. Nothing here is legal advice. <Link href="/about/">About</Link> · <a href={GITHUB_URL}>Source on GitHub</a>.</footer>
    </>
  );
}
