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
  // Bound actual bytes, including chunked requests, before JSON parsing.
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "text is required" }, { status: 400 });
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 12_000) { await reader.cancel(); return NextResponse.json({ error: "request too large" }, { status: 413 }); }
      chunks.push(value);
    }
  } catch { return NextResponse.json({ error: "invalid request" }, { status: 400 }); }
  let text = "";
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (body && typeof body === "object" && "text" in body && typeof body.text === "string") text = body.text;
  } catch { /* handled below */ }
  if (text.length > 2000) return NextResponse.json({ error: "text must be at most 2000 characters" }, { status: 413 });
  if (!text.trim()) return NextResponse.json({ error: "text is required" }, { status: 400 });
  const rules = classify({ subject: "", body: text, received_at: INBOX_NOW });
  const base = { area: rules.area, intent: rules.intent, root_cause: rules.root_cause, priority: rules.priority };
  if (process.env.LLM_CLASSIFIER !== "on" || !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ source: "rules", ...base, note: "language-model flag is off" });
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 7_000, maxRetries: 0 });
    const res = await client.messages.create({ model: MODEL, max_tokens: 400, output_config: { effort: "low" }, system: SYSTEM, messages: [{ role: "user", content: text }] });
    if (res.stop_reason === "refusal") throw new Error("refusal");
    const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { area: string | null; intent: string; root_cause: string; reason?: string };
    const ok = (j.area === null || (AREAS as readonly string[]).includes(j.area)) && (INTENTS as readonly string[]).includes(j.intent) && (ROOT_CAUSES as readonly string[]).includes(j.root_cause);
    if (!ok || (j.reason !== undefined && (typeof j.reason !== "string" || j.reason.length > 500))) throw new Error("label outside the fixed set");
    return NextResponse.json({ source: "llm", model: MODEL, area: j.area, intent: j.intent, root_cause: j.root_cause, priority: rules.priority, reason: j.reason });
  } catch (e) {
    return NextResponse.json({ source: "rules", ...base, note: "model unavailable or output invalid; used rules" });
  }
}
