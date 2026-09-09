import type { CSSProperties } from "react";

export const screenPad: CSSProperties = { padding: "58px 20px 28px", height: "100%", overflow: "auto", boxSizing: "border-box" };
export const kicker: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" };
export const h1: CSSProperties = { fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 34, lineHeight: 1.06, margin: "10px 0 0" };
export const h2: CSSProperties = { fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 21, margin: "26px 0 12px" };
export const sectionLabel: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-neutral-600)" };
export const card: CSSProperties = { background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)" };
export const cardLg: CSSProperties = { background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)" };
export const rowBetween: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between" };
export const divider: CSSProperties = { borderBottom: "1px solid var(--color-divider)" };
