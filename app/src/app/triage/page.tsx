import type { Metadata } from "next";
import Shell from "@/components/Shell";
import Triage from "@/components/Triage";
import TryClassifier from "@/components/TryClassifier";
import { AREA_RULES, INTENT_RULES, ROOT_RULES } from "@/lib/classify";
import { INBOX, META } from "@/lib/data";
import { AREA_SHORT, INTENT_LABEL, ROOT_LABEL, SLA_HOURS } from "@/lib/taxonomy";

export const metadata: Metadata = { title: "Escalations & complaints triage" };
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const src = (r: RegExp) => r.source.replace(/\\b/g, "").replace(/\\/g, "");

export default function Page() {
  const a = META.agreement;
  return (
    <Shell>
      <h1>Escalations and complaints triage</h1>
      <p className="takeaway">Every inbound email and portal message is labelled by practice area, intent, root cause, tone and deadline, put in an SLA queue, routed to an owner and given a draft reply that a person approves.</p>
      <p className="lede">300 synthetic messages from the last five days across five practice areas: Express Entry, work permits, family sponsorship, citizenship and criminal inadmissibility. The classifier is a set of plain rules in code, so every label shows the phrase that produced it. Drafts come only from lawyer-approved templates, are checked for legal advice, and are never sent: approval records the decision in your browser.</p>
      <Triage messages={INBOX} />

      <div className="grid2" style={{ marginTop: 20 }}>
        <TryClassifier />
        <div className="card">
          <h2>How well the rules hold up</h2>
          <p className="small muted" style={{ marginTop: 0 }}>Agreement between the rules and the labels the generator attached to each synthetic message ({a.n} messages). This checks that the rules are coherent; it is not real-world accuracy. A real rollout starts by hand-labelling 300 to 500 real messages and measuring against those.</p>
          <dl className="levers">
            <div><dt>Intent</dt><dd>{pct(a.intent)}</dd></div>
            <div><dt>Root cause</dt><dd>{pct(a.root_cause)}</dd></div>
            <div><dt>Practice area, when a phrase is present</dt><dd>{pct(a.area)}</dd></div>
            <div><dt>Messages with a practice-area phrase</dt><dd>{pct(a.area_coverage)}</dd></div>
            <div><dt>Deadline found when one was stated</dt><dd>{pct(a.deadline)}</dd></div>
          </dl>
          <h3 style={{ marginTop: 16 }}>Priority and SLA</h3>
          <ul className="clean small">
            <li><strong>P1</strong>: the message states a deadline within 14 days (a permit expiry, a procedural fairness letter, an ITA). First response within {SLA_HOURS.P1} hours, routed to the practice area&apos;s case lead.</li>
            <li><strong>P2</strong>: complaint, escalation request, strongly negative tone, or a third contact in 30 days. First response within {SLA_HOURS.P2} hours.</li>
            <li><strong>P3</strong>: everything else, within {SLA_HOURS.P3} hours. At risk when under a quarter of the target remains.</li>
            <li><strong>Escalation risk</strong> (0 to 100) adds up intent, tone, repeat contacts, a near deadline and mentions of reviews, refunds or a regulator.</li>
          </ul>
        </div>
      </div>

      <div className="card" id="rules">
        <h2>The classification rules</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Intent and root cause: the first rule that matches wins, and the rules are ordered from most to least severe, so a complaint about fees is a complaint first. Practice area: the rule with the most matching phrases wins. Patterns are case-insensitive. Source: <code>app/src/lib/classify.ts</code>.</p>
        <div className="grid3">
          <div>
            <h3>Intent</h3>
            <table className="rules mini"><tbody>{INTENT_RULES.map((r) => <tr key={r.label}><td>{INTENT_LABEL[r.label]}</td><td>{r.patterns.slice(0, 6).map((p, i) => <code key={i} style={{ marginRight: 4, display: "inline-block", marginBottom: 2 }}>{src(p)}</code>)}{r.patterns.length > 6 && <span className="muted"> +{r.patterns.length - 6}</span>}</td></tr>)}</tbody></table>
          </div>
          <div>
            <h3>Root cause</h3>
            <table className="rules mini"><tbody>{ROOT_RULES.map((r) => <tr key={r.label}><td>{ROOT_LABEL[r.label]}</td><td>{r.patterns.slice(0, 6).map((p, i) => <code key={i} style={{ marginRight: 4, display: "inline-block", marginBottom: 2 }}>{src(p)}</code>)}{r.patterns.length > 6 && <span className="muted"> +{r.patterns.length - 6}</span>}</td></tr>)}</tbody></table>
          </div>
          <div>
            <h3>Practice area</h3>
            <table className="rules mini"><tbody>{AREA_RULES.map((r) => <tr key={r.label}><td>{AREA_SHORT[r.label]}</td><td>{r.patterns.slice(0, 6).map((p, i) => <code key={i} style={{ marginRight: 4, display: "inline-block", marginBottom: 2 }}>{src(p)}</code>)}{r.patterns.length > 6 && <span className="muted"> +{r.patterns.length - 6}</span>}</td></tr>)}</tbody></table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
