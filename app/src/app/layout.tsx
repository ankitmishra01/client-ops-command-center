import "./globals.css";
import type { Metadata, Viewport } from "next";
import { DISCLAIMER, PRODUCT } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: `${PRODUCT} · prototype`, template: `%s · ${PRODUCT}` },
  description: `Client experience and operations prototype: escalation triage, CSAT and reviews, hiring pipeline and a systems-before-headcount plan. ${DISCLAIMER}`,
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-CA"><body>{children}</body></html>;
}
