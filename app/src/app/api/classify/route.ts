import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { classify } from "@/lib/classify";
import { AREAS, INTENTS, ROOT_CAUSES, INBOX_NOW } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.LLM_MODEL ?? "claude-opus-5-5";
const SYSTEM = `You label inbound client messages for an immigration law firm's client success team. Return only JSON with keys area, intent, root_cause, reason.
area: one of ${AREAS.join(", ")} or null (EE Express Entry and economic, WP work and study permits, FAM family sponsorship, CIT citizenship, INA criminal inadmissibility).
intent: one of ${INTENTS.join(", ")}.
root_cause: one of ${ROOT_CAUSES.join(", ")} (the service failure that caused the message; none for new enquiries and praise).
reason: one short sentence. Never give legal advice.`;

/** POST { text } → labels. Deterministic rules by default. With LLM_CLASSIFIER=on and ANTHROPIC_API_KEY set, a language
 *  model labels area, intent and root cause; priority still comes from the rules (deadlines are parsed, not guessed).
 *  Any failure or out-of-vocabulary answer falls back to the rules, so the route always answers. */
export async function POST(req: Request) {
  let text = "";
  try { text = String(((await req.json()) as { text?: unknown }).text ?? "").slice(0, 2000); } catch { /* empty body */ }
  if (!text.trim()) return NextResponse.json({ error: "text is required" }, { status: 400 });
  const rules = classify({ subject: "", body: text, received_at: INBOX_NOW });
  const base = { area: rules.area, intent: rules.intent, root_cause: rules.root_cause, priority: rules.priority };
  if (process.env.LLM_CLASSIFIER !== "on" || !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ source: "rules", ...base, note: "language-model flag is off" });
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 });
    const res = await client.messages.create({ model: MODEL, max_tokens: 1024, output_config: { effort: "low" }, system: SYSTEM, messages: [{ role: "user", content: text }] });
    if (res.stop_reason === "refusal") throw new Error("refusal");
    const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { area: string | null; intent: string; root_cause: string; reason?: string };
    const ok = (j.area === null || (AREAS as readonly string[]).includes(j.area)) && (INTENTS as readonly string[]).includes(j.intent) && (ROOT_CAUSES as readonly string[]).includes(j.root_cause);
    if (!ok) throw new Error("label outside the fixed set");
    return NextResponse.json({ source: "llm", model: MODEL, area: j.area, intent: j.intent, root_cause: j.root_cause, priority: rules.priority, reason: j.reason });
  } catch (e) {
    return NextResponse.json({ source: "rules", ...base, note: `model path failed (${e instanceof Error ? e.message.slice(0, 60) : "error"}), used rules` });
  }
}
