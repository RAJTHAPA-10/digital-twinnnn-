export const fmtDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const pct = (v: number | null | undefined, digits = 0) => (v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`);

export const fmtMs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export const fmtNum = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-IN"));

export const reportText = (r: { cleanedSubject?: string | null; rawSubject?: string | null }) => r.cleanedSubject || r.rawSubject || "";

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
