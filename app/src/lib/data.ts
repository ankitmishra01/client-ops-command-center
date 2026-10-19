/** Server-side access to the committed synthetic data (imported at build time; pages are static). */
import inbox from "../../data/inbox.json";
import weekly from "../../data/weekly.json";
import hiring from "../../data/hiring.json";
import meta from "../../data/meta.json";
import reviews from "../../data/reviews.json";
import silent from "../../data/silent.json";
import type { Message } from "./taxonomy.ts";
import type { Review, SilentFile, WeekRow } from "./generate.ts";
import type { Req } from "./hiring.ts";

export const INBOX = inbox as Message[];
export const WEEKLY = weekly as WeekRow[];
export const HIRING = hiring as { reqs: Req[]; hires: { id: string; team: Req["team"]; title: string; days_to_hire: number }[]; interviewers: { name: string; hours: number; interviews: number; reqs: number }[]; candidates: { id: string; req: string; stage: string; name: string; source: string; score: number; days_in_stage: number }[]; offers_120d: { made: number; accepted: number } };
export const META = meta as { seed: number; generated_for: string; messages: number; weeks: number; agreement: { n: number; area: number; area_coverage: number; intent: number; root_cause: number; deadline: number; confusion: Record<string, Record<string, number>> } };
export const REVIEWS = reviews as Review[];
export const SILENT = silent as SilentFile[];
