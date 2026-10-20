/** 16px inline-SVG icons in one stroke style (1.5px, round joins). Decorative: the label carries the meaning. */
import type { Icon } from "@/lib/nav";
const P: Record<Icon | "menu" | "expand", string> = {
  overview: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  ai: "M8 1.5l1.4 3.6 3.6 1.4-3.6 1.4L8 11.5 6.6 7.9 3 6.5l3.6-1.4zM12.5 10.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z",
  triage: "M1.5 9.5l2-6.5h9l2 6.5v4h-13zM1.5 9.5h4l1 1.5h3l1-1.5h4",
  csat: "M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z",
  hiring: "M6 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5M11 2.2a2.5 2.5 0 0 1 0 4.6M12.5 9.8c1.2.6 2 1.9 2 3.4v.8",
  decide: "M2 8h4.5M6.5 8l3-4.5h4M6.5 8l3 4.5h4M12 2l1.5 1.5L12 5M12 11l1.5 1.5L12 14",
  people: "M3.5 2.5h9v12h-9zM6 1.5h4v2H6zM5.5 7l1 1 2-2M10 7.5h.5M5.5 11l1 1 2-2M10 11.5h.5",
  plan: "M2 3.5h12v10.5H2zM2 6.5h12M5 1.5v3M11 1.5v3M4.5 9h2M9.5 9h2M4.5 11.5h2",
  about: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 7.3v4M8 4.8v.2",
  menu: "M2 4h12M2 8h12M2 12h12",
  expand: "M6 3.5l4.5 4.5L6 12.5",
};
export function Ic({ name, size = 16 }: { name: keyof typeof P; size?: number }) {
  return <svg className="ic" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={P[name]} /></svg>;
}
