/** Writes the synthetic data the app reads: node scripts/generate.ts (Node 22.18+ runs TypeScript directly).
 *  Deterministic: a rerun reproduces app/data/*.json byte for byte. */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { generateInbox, generateReviews, generateSilentFiles, generateWeekly, SEED } from "../src/lib/generate.ts";
import { generateHiring } from "../src/lib/hiring.ts";
import { agreement } from "../src/lib/metrics.ts";

const out = path.join(import.meta.dirname, "..", "data");
mkdirSync(out, { recursive: true });
const inbox = generateInbox();
const weekly = generateWeekly();
const hiring = generateHiring();
const write = (name: string, data: unknown) => writeFileSync(path.join(out, name), JSON.stringify(data, null, 1) + "\n");
write("inbox.json", inbox);
write("weekly.json", weekly);
write("hiring.json", hiring);
write("reviews.json", generateReviews());
write("silent.json", generateSilentFiles());
const a = agreement(inbox);
write("meta.json", { seed: SEED, generated_for: "2026-10-19", messages: inbox.length, weeks: new Set(weekly.map((r) => r.week)).size, agreement: a });
console.log(`inbox ${inbox.length}, weekly rows ${weekly.length}, reqs ${hiring.reqs.length}`);
console.log(`agreement: area ${(a.area * 100).toFixed(1)}% (coverage ${(a.area_coverage * 100).toFixed(1)}%), intent ${(a.intent * 100).toFixed(1)}%, root ${(a.root_cause * 100).toFixed(1)}%, deadline ${(a.deadline * 100).toFixed(1)}%`);
