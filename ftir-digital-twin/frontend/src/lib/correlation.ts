import type { AttackCode } from "../types/api";

export type LinkRule = "attack" | "model" | "time";

export const LINK_LABEL: Record<LinkRule, string> = {
  attack: "Same attack type",
  model: "Same vehicle model",
  time: "Within 7 days",
};

/** One cyber incident, as far as correlation is concerned. */
export interface CorrelationItem {
  ftir: string;
  /** Attack type saved by the backend, or null if none was identified yet. */
  code: AttackCode | null;
  model: string | null;
  date: string | null;
}

export interface CorrelationEdge {
  a: string;
  b: string;
  rules: LinkRule[];
}

const DAY = 86_400_000;

/** Client-side correlation. Swap for a backend endpoint later (see README). */
export function correlate(items: CorrelationItem[]): CorrelationEdge[] {
  const edges: CorrelationEdge[] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const p = items[i];
      const q = items[j];
      const rules: LinkRule[] = [];
      if (p.code && p.code === q.code && p.code !== "UNCLASSIFIED") rules.push("attack");
      if (p.model && p.model === q.model) rules.push("model");
      if (p.date && q.date && Math.abs(new Date(p.date).getTime() - new Date(q.date).getTime()) <= 7 * DAY) rules.push("time");
      if (rules.length) edges.push({ a: p.ftir, b: q.ftir, rules });
    }
  }
  return edges;
}

export function linkedTo(ftir: string, edges: CorrelationEdge[]) {
  return edges
    .filter((e) => e.a === ftir || e.b === ftir)
    .map((e) => ({ ftir: e.a === ftir ? e.b : e.a, rules: e.rules }))
    .sort((x, y) => y.rules.length - x.rules.length);
}