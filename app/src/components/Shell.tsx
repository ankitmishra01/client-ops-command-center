import Link from "next/link";
import Rail from "@/components/Rail";
import { DISCLAIMER, GITHUB_URL, PRODUCT } from "@/lib/brand";
import { HIRING, INBOX, SILENT } from "@/lib/data";
import type { Badges } from "@/lib/nav";
import { INBOX_NOW } from "@/lib/taxonomy";

/** Rail badge counts, computed at build time from the same data the destination pages show. */
function badges(): Badges {
  const now = Date.parse(INBOX_NOW);
  const open = INBOX.filter((m) => m.status !== "Resolved" && now - Date.parse(m.received_at) <= 30 * 86_400_000).length;
  const reqs = HIRING.reqs.length;
  return {
    triage: { n: open, tone: "amber", label: `${open} open messages` },
    silent: { n: SILENT.length, tone: "red", label: `${SILENT.length} silent files` },
    reqs: { n: reqs, tone: "amber", label: `${reqs} live requisitions` },
  };
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Rail badges={badges()}>
      <div className="prototype-bar" role="note"><div><span className="prototype-tag">WORKING PROTOTYPE</span><span>By Ankit Mishra · synthetic data · not affiliated with CanadaVisa</span></div><Link href="/about/">How this demo works ↗</Link></div>
      <main id="content" tabIndex={-1}>{children}</main>
      <footer className="site-footer"><div><strong>{PRODUCT}</strong><p>{DISCLAIMER}</p><span>Synthetic data. No live integrations or client messages sent. Not legal advice.</span></div><div className="footer-links"><Link href="/about/">Methodology</Link><a href={GITHUB_URL}>GitHub ↗</a><a href="#content">Back to top ↑</a></div></footer>
    </Rail>
  );
}
