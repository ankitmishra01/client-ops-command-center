"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PRODUCT } from "@/lib/brand";
import { NAV_GROUPS, NAV_ITEMS, activeItem, breadcrumb, type Badges } from "@/lib/nav";
import { Ic } from "./Icons";

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

/** App frame: ink left rail (full, icon-only at tablet width, drawer on phones), slim top bar, then the page. */
export default function Rail({ badges, children }: { badges: Badges; children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const [open, setOpen] = useState(false); // drawer (phone) or expanded overlay (tablet)
  const act = activeItem(path);
  const crumbs = breadcrumb(path);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName)))) return;
      const hit = NAV_ITEMS.find((n) => n.key === e.key.toUpperCase());
      if (hit) { e.preventDefault(); router.push(hit.href); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className={`app${open ? " rail-open" : ""}`}>
      <a className="skip" href="#content">Skip to content</a>
      <aside className="rail" id="rail" aria-label="Site navigation">
        <div className="rail__brand">
          <Link href="/" className="rail__mark" aria-label={`${PRODUCT}, home`}>CV</Link>
          <div className="rail__brandtext"><div className="rail__title">Canada<span>Visa</span></div><div className="rail__sub">Client Ops · concept workspace</div><div className="rail__asof">Prototype · Oct 2026</div></div>
          <button className="rail__expand" onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse navigation" : "Expand navigation"} aria-expanded={open} aria-controls="rail"><Ic name="expand" /></button>
        </div>
        <nav aria-label="Primary" className="rail__navwrap">
          {NAV_GROUPS.map((g) => (
            <div key={g.name} className="rail__group">
              <div className="rail__hdr">{g.name}</div>
              {g.items.map((it) => {
                const b = it.badge ? badges[it.badge] : undefined, on = act.href === it.href;
                return (
                  <Link key={it.href} href={it.href} className={`rail__item${on ? " active" : ""}`} aria-current={on ? "page" : undefined} data-label={it.label} aria-label={b ? `${it.label}, ${b.label}` : undefined} title={`${it.label} (${it.key})`}>
                    <Ic name={it.icon} /><span className="rail__lbl rail__text">{it.label}</span>
                    {b && <span className={`rail__badge ${b.tone}`}>{b.n}</span>}
                    <span className="rail__lbl kbd" aria-hidden="true">{it.key}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="rail__spacer" />
        <div className="rail__foot rail__lbl">
          <ul className="rail__conn" aria-label="Connections (simulated)">
            <li><i className="dot ok" />Clio · simulated · 2 min ago</li>
            <li><i className="dot ok" />Gmail · simulated</li>
            <li><i className="dot ok" />Client portal · simulated</li>
          </ul>
          <div className="rail__note">Synthetic data. Not affiliated with CanadaVisa.</div>
          <div className="rail__userbox"><div className="rail__avatar" aria-hidden="true">AM</div><div><div className="rail__user-name">Ankit M.</div><div className="rail__user-sub">Head of Ops (demo)</div></div></div>
        </div>
      </aside>
      <div className="rail-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="main-col">
        <header className="topbar">
          <button className="topbar__menu" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} aria-controls="rail"><Ic name="menu" /></button>
          <nav className="crumbs" aria-label="Breadcrumb"><ol>{crumbs.map((c, i) => <li key={i} aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</li>)}</ol></nav>
          <span className="topbar__sync"><span className="dot-live" aria-hidden="true" />Last synced 2 min ago <span className="muted">(simulated)</span></span>
          <Bell />
        </header>
        {children}
      </div>
    </div>
  );
}
