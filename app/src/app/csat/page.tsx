import type { Metadata } from "next";
import Shell from "@/components/Shell";
import CsatDashboard from "@/components/CsatDashboard";
import { WEEKLY } from "@/lib/data";

export const metadata: Metadata = { title: "CSAT & reviews" };

export default function Page() {
  return (
    <Shell>
      <h1>CSAT, reviews and escalations</h1>
      <p className="takeaway">Twenty-six weeks of synthetic history: inbound volume up about five times, CSAT and the Google rating drifting down, escalations per 100 files roughly tripling and more paid files going silent. The answer is a set of system fixes, ranked by how much volume each removes.</p>
      <p className="lede">Weekly data from 20 April to 12 October 2026 for the five practice areas. Every figure is generated to show the shape of the dashboard, not the state of any real firm. Pick a practice area to filter every chart and table.</p>
      <CsatDashboard rows={WEEKLY} />
    </Shell>
  );
}
