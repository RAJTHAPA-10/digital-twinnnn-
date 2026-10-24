import { useMemo } from "react";
import { useApp } from "../store/app";

const NAMES = ["accent", "indigo", "safe", "danger", "muted", "faint", "line", "divider", "fg", "card", "raised", "sev-low", "sev-medium", "sev-high", "sev-critical"] as const;
export type ColorName = (typeof NAMES)[number];

/** Resolved theme colors for SVG/Recharts (CSS vars don't work in SVG attributes everywhere). */
export function useColors(): Record<ColorName, string> {
  const theme = useApp((s) => s.theme);
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(NAMES.map((n) => [n, `rgb(${style.getPropertyValue(`--${n}`).trim().split(/\s+/).join(",")})`])) as Record<ColorName, string>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
