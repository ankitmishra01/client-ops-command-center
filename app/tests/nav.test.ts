import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { NAV_ITEMS, activeItem, breadcrumb } from "../src/lib/nav.ts";

const appDir = path.join(import.meta.dirname, "..", "src", "app");

test("every rail item links to an existing page", () => {
  for (const i of NAV_ITEMS) assert.ok(existsSync(path.join(appDir, i.href, "page.tsx")), `${i.href} has no page.tsx`);
});

test("rail keys and hrefs are unique", () => {
  assert.equal(new Set(NAV_ITEMS.map((i) => i.key)).size, NAV_ITEMS.length);
  assert.equal(new Set(NAV_ITEMS.map((i) => i.href)).size, NAV_ITEMS.length);
});

test("active item: home only on /, inner pages with or without a trailing slash", () => {
  assert.equal(activeItem("/").href, "/");
  assert.equal(activeItem("/triage").href, "/triage/");
  assert.equal(activeItem("/csat/").href, "/csat/");
  assert.equal(activeItem("/hiring/").href, "/hiring/");
  assert.deepEqual(breadcrumb("/plan/"), ["Team & plan", "First 90 days"]);
  assert.deepEqual(breadcrumb("/people/"), ["Team & plan", "People ops"]);
  assert.equal(activeItem("/decide").href, "/decide/");
});
