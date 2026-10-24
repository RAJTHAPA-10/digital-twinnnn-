import { useColors } from "../../hooks/useColors";
import { severityFromScore, SEVERITY_LABEL } from "../../lib/labels";

// Semicircle gauge, 1–10, with Low 1–3 / Medium 4–6 / High 7–8 / Critical 9–10 bands.
const BANDS = [
  { from: 1, to: 3.5, color: "sev-low" },
  { from: 3.5, to: 6.5, color: "sev-medium" },
  { from: 6.5, to: 8.5, color: "sev-high" },
  { from: 8.5, to: 10, color: "sev-critical" },
] as const;

const CX = 120;
const CY = 120;
const R = 92;

const angle = (v: number) => Math.PI * (1 - (v - 1) / 9);
const point = (v: number, r = R) => [CX + r * Math.cos(angle(v)), CY - r * Math.sin(angle(v))] as const;

function arc(from: number, to: number) {
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
}

export function SeverityGauge({ score }: { score: number }) {
  const c = useColors();
  const sev = severityFromScore(score);
  const [nx, ny] = point(Math.min(10, Math.max(1, score)), R - 22);
  const tone = c[`sev-${sev.toLowerCase()}` as "sev-low"];

  return (
    <svg viewBox="0 0 240 172" className="w-full max-w-[280px]">
      {BANDS.map((b) => (
        <path key={b.from} d={arc(b.from + 0.06, b.to - 0.06)} stroke={c[b.color]} strokeOpacity={sev === severityFromScore((b.from + b.to) / 2) ? 1 : 0.25} strokeWidth={14} fill="none" strokeLinecap="butt" />
      ))}
      <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={c.fg} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={5} fill={c.fg} />
      <text x={CX} y={CY + 44} textAnchor="middle" fontSize={28} fontWeight={500} fill={tone} letterSpacing="-0.03em">{score}<tspan fontSize={13} fill={c.muted}>/10</tspan></text>
      <text x={18} y={CY + 18} fontSize={9} fill={c.muted}>1</text>
      <text x={216} y={CY + 18} fontSize={9} fill={c.muted}>10</text>
      <title>{SEVERITY_LABEL[sev]}</title>
    </svg>
  );
}
