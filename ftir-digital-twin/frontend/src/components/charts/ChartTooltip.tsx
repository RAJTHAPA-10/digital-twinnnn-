import type { TooltipProps } from "recharts";

/** Flat tooltip that follows the theme. */
export function ChartTooltip({ active, payload, label, unit, labelFormat }: TooltipProps<number, string> & { unit?: string; labelFormat?: (l: string | number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-[11px]">
      {label !== undefined && <div className="text-muted mb-1">{labelFormat ? labelFormat(label) : label}</div>}
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="num ml-auto pl-3 text-fg">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}
