import type { Metadata } from "next";
import Link from "next/link";
import Shell from "@/components/Shell";
import FixOrHire from "@/components/FixOrHire";
import { HIRING, WEEKLY } from "@/lib/data";
import { exampleWorkloads } from "@/lib/decide";
import { caseManagerPlan } from "@/lib/funnel";
import { rootCauseClusters, windowTotals } from "@/lib/metrics";

export const metadata: Metadata = { title: "Fix, automate or hire" };

export default function Page() {
  const last = windowTotals(WEEKLY, "ALL", 4);
  const status = rootCauseClusters(WEEKLY, 4).find((c) => c.root_cause === "status_silence")!.per_week;
  const cm = HIRING.reqs.find((r) => r.title === "Case manager")!;
  const weeksToFull = Math.round(caseManagerPlan(cm.funnel, HIRING.offers_120d.accepted / HIRING.offers_120d.made, 1).to_full_target / 7);
  const examples = exampleWorkloads({ status_messages_week: status, new_enquiries_week: last.new_leads / 4 });
  return (
    <Shell>
      <h1>Fix, automate or hire</h1>
      <p className="takeaway">Improve and automate the work before adding people to it. When a team says it needs another person, size the work first, take out what should not exist, make the rest cheaper, and hire for what is left.</p>
      <p className="lede">Pick a workload and change any number. The tool works out next year&apos;s hours, what each lever removes, how many people the work still needs and what each route costs in year one. Volumes marked FROM DATA come from the last four weeks of synthetic history; every share and cost is an assumption to replace with a two-week time study.</p>
      <FixOrHire examples={examples} />
      <div className="grid2">
        <div className="card t-violet">
          <h2>Why the levers run in this order</h2>
          <ul className="clean small">
            <li><strong>Process fix first.</strong> Work that should not exist is the cheapest to remove and makes every later lever smaller. A status update sent before the client asks removes the email, the reply and the follow-up.</li>
            <li><strong>Clearer ownership and training next.</strong> Items that bounce between people, or get redone, cost time without any tool. Both are fixed by a named owner and a short playbook.</li>
            <li><strong>Automation on what is left.</strong> Rules and approved templates handle the repeatable part, with a person approving anything a client will read. No automated legal advice.</li>
            <li><strong>Tooling for the rest.</strong> Prefilled fields, templates and one screen instead of three shorten the work people still do.</li>
            <li><strong>Hire for the remainder.</strong> Once the work is as small as it can be, the remaining hours are a real need, and the hire gets a cleaner job to step into.</li>
          </ul>
        </div>
        <div className="card t-teal">
          <h2>When hiring is the right answer</h2>
          <ul className="clean small">
            <li>The work needs professional judgment, such as a licensed review before filing, and the levers remove little of it. The fourth example shows this case.</li>
            <li>The work is already lean: few avoidable items, little rework, nothing a rule can do safely.</li>
            <li>Volume is growing faster than a fix can be built and proven. Then hire now and run the fix in parallel, as the <Link href="/plan/">90-day plan</Link> does with one pilot practice area.</li>
            <li>Hiring takes time to pay off: a case manager reaches a full caseload about {weeksToFull} weeks after the requisition opens (see the <Link href="/hiring/#case-managers">case-manager funnel</Link>), so the decision is made a quarter ahead.</li>
          </ul>
        </div>
      </div>
    </Shell>
  );
}
