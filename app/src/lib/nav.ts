/** Navigation model for the left rail, the top-bar breadcrumb and the keyboard shortcuts. Pure, so routes and keys can be tested. */
export type Badge = "triage" | "silent" | "reqs";
export type Icon = "overview" | "ai" | "triage" | "csat" | "hiring" | "plan" | "about";
export type NavItem = { href: string; label: string; key: string; icon: Icon; badge?: Badge };
export type NavGroup = { name: string; items: NavItem[] };
export type Badges = Partial<Record<Badge, { n: number; tone: "red" | "amber"; label: string }>>;

export const NAV_GROUPS: NavGroup[] = [
  { name: "Client experience", items: [
    { href: "/", label: "Overview", key: "O", icon: "overview" },
    { href: "/ai/", label: "AI workbench", key: "A", icon: "ai" },
    { href: "/triage/", label: "Triage", key: "T", icon: "triage", badge: "triage" },
    { href: "/csat/", label: "CSAT & reviews", key: "C", icon: "csat", badge: "silent" },
  ] },
  { name: "Team & plan", items: [
    { href: "/hiring/", label: "Hiring", key: "H", icon: "hiring", badge: "reqs" },
    { href: "/plan/", label: "First 90 days", key: "P", icon: "plan" },
  ] },
  { name: "Prototype", items: [{ href: "/about/", label: "About & methodology", key: "M", icon: "about" }] },
];
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.name })));

/** The nav item a path belongs to: the longest matching prefix, with "/" only for the home page. */
export function activeItem(path: string) {
  const p = path.endsWith("/") ? path : `${path}/`;
  if (p === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.filter((i) => i.href !== "/" && p.startsWith(i.href)).sort((a, b) => b.href.length - a.href.length)[0] ?? NAV_ITEMS[0];
}
/** Breadcrumb for the top bar: group / page. */
export const breadcrumb = (path: string) => { const it = activeItem(path); return [it.group, it.label]; };
