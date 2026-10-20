import Link from "next/link";
import Rail from "@/components/Rail";
import { DISCLAIMER, GITHUB_URL } from "@/lib/brand";
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
      <div className="disclaimer" role="note"><strong>Prototype by Ankit Mishra · synthetic data · not affiliated with CanadaVisa.</strong> <span>{DISCLAIMER}</span> <Link href="/about/">Methodology and limits</Link></div>
      <main id="content" tabIndex={-1}>{children}</main>
      <footer><strong>Prototype by Ankit Mishra · synthetic data · not affiliated with CanadaVisa.</strong> {DISCLAIMER} Every message, client, file number, staff name, review and metric is generated; nothing comes from a real case file. Nothing here is legal advice. <Link href="/about/">About</Link> · <a href={GITHUB_URL}>Source on GitHub</a>.</footer>
    </Rail>
  );
}
