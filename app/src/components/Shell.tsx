"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DISCLAIMER, GITHUB_URL, PRODUCT } from "@/lib/brand";

const NAV = [["/triage/", "Triage"], ["/csat/", "CSAT & reviews"], ["/hiring/", "Hiring"], ["/plan/", "90 days & business case"], ["/about/", "About"]];

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
          <span className="demo">Synthetic data</span>
        </div>
      </header>
      <div className="disclaimer" role="note"><strong>Prototype.</strong> <span>{DISCLAIMER}</span> <Link href="/about/">Methodology and limits</Link></div>
      <main>{children}</main>
      <footer>{DISCLAIMER} Every message, client, matter number, staff name and metric is generated; nothing comes from a real case file. Nothing here is legal advice. <Link href="/about/">About</Link> · <a href={GITHUB_URL}>Source on GitHub</a>.</footer>
    </>
  );
}
