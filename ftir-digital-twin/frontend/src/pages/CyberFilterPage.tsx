import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { PageFrame } from "../components/layout/PageFrame";
import { Button, Card, ConfidenceBar, EmptyState, ErrorState, FtirId, Pill, Segmented, SkeletonRows, cx } from "../components/ui";
import { useAllClassified, useClassSummary } from "../hooks/data";
import { useAiRun } from "../hooks/useAiRun";
import { useColors } from "../hooks/useColors";
import { pct } from "../lib/format";
import { api } from "../services/api";
import { explainCyberAttack } from "../services/llm";
import { useApp } from "../store/app";
import type { ClassifiedReport } from "../types/api";

type Filter = "all" | "cyber" | "normal";
const PAGE = 12;

function CyberExplanationView({ row }: { row: ClassifiedReport }) {
  const text = row.cleanedSubject ?? "";
  const q = useQuery({
    queryKey: ["llm-explain", row.ftirNumber],
    queryFn: () => explainCyberAttack({ ftirNumber: row.ftirNumber, text, backendReason: row.classification.reason }),
    enabled: Boolean(text),
    staleTime: Infinity,
    retry: false,
  });

  if (q.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 animate-pulse text-accent" /> Asking the AI…</span>
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-3/4" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] leading-relaxed">{row.classification.reason}</p>
        <div className="rounded-xl border border-line px-3 py-2 text-xs text-muted flex items-center justify-between gap-3">
          <span>Couldn't get the AI explanation{q.error instanceof Error ? `: ${q.error.message}` : ""}. Showing the classifier's note instead.</span>
          <Button size="sm" variant="quiet" onClick={() => q.refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] leading-relaxed">{q.data.summary}</p>
      {q.data.reasons.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {q.data.reasons.map((r) => (
            <li key={r.point} className="flex gap-2.5 text-[13px] leading-relaxed">
              <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
              <span>
                {r.point}
                {r.quote && <span className="block text-xs text-muted mt-0.5">“{r.quote}”</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <span className="text-[11px] text-faint flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Explained by {q.data.model}</span>
    </div>
  );
}

function AiTake({ row }: { row: ClassifiedReport | undefined }) {
  if (!row) {
    return <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Pick a report" body="Click any FTIR ID to see the explanation." />;
  }
  const isCyber = row.classification.label === "CYBERSECURITY";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <FtirId id={row.ftirNumber} className="text-[13px]" />
        <Pill tone={isCyber ? "danger" : "safe"} dot>{isCyber ? "Cyber attack" : "Non-cyber attack"}</Pill>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label">Report text</span>
        <p className="text-[13px] leading-relaxed rounded-xl bg-raised/60 p-3">{row.cleanedSubject}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label">{isCyber ? "Why it's a cyber attack" : "Why it's not a cyber attack"}</span>
        {isCyber ? <CyberExplanationView key={row.ftirNumber} row={row} /> : <p className="text-[13px] leading-relaxed">{row.classification.reason}</p>}
      </div>
    </div>
  );
}

export default function CyberFilterPage() {
  const classified = useAllClassified();
  const summary = useClassSummary();
  const ai = useAiRun();
  const colors = useColors();
  const activeKey = useApp((s) => s.activeKey);
  const setActive = useApp((s) => s.setActive);
  const [filter, setFilter] = useState<Filter>("all");
  const [review, setReview] = useState(false);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    let list = classified.data?.list ?? [];
    if (filter === "cyber") list = list.filter((r) => r.classification.label === "CYBERSECURITY");
    if (filter === "normal") list = list.filter((r) => r.classification.label === "NON_CYBERSECURITY");
    if (review) list = list.filter((r) => r.classification.reviewRequired);
    return [...list].sort((a, b) => (a.classification.label === b.classification.label ? a.ftirNumber.localeCompare(b.ftirNumber) : a.classification.label === "CYBERSECURITY" ? -1 : 1));
  }, [classified.data, filter, review]);

  useEffect(() => setPage(1), [filter, review]);

  // The AI take always shows the active incident (?ftir= in the URL).
  // If none is set yet, it falls back to the first row.
  const selected = activeKey && classified.data?.byFtir.has(activeKey) ? activeKey : rows[0]?.ftirNumber ?? null;

  // Jump to the table page that contains the active incident.
  useEffect(() => {
    if (!activeKey) return;
    const index = rows.findIndex((r) => r.ftirNumber === activeKey);
    if (index >= 0) setPage(Math.floor(index / PAGE) + 1);
  }, [activeKey, rows]);

  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const selectedRow = selected ? classified.data?.byFtir.get(selected) : undefined;

  const donut = [
    { name: "Cyber", value: summary.data?.cybersecurityCount ?? 0, color: colors.danger },
    { name: "Non-cyber", value: summary.data?.nonCybersecurityCount ?? 0, color: colors.safe },
  ];
  const totalClassified = donut[0].value + donut[1].value;

  return (
    <PageFrame
      title="AI Cyber Filter"
      subtitle="Separates cyber incidents from regular faults"
      actions={
        <>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "cyber", label: "Flagged as cyber" },
              { value: "normal", label: "Just regular faults" },
            ]}
          />
          <button
            onClick={() => setReview((v) => !v)}
            className={cx("h-8 px-3 rounded-full text-xs border transition-colors", review ? "border-sev-medium/40 text-sev-medium bg-sev-medium/10" : "border-line text-muted hover:text-fg")}
          >
            Needs review{summary.data ? ` · ${summary.data.reviewRequiredCount}` : ""}
          </button>
          <div className="flex-1" />
          {summary.data && summary.data.pendingCount > 0 && <span className="text-xs text-muted">{summary.data.pendingCount} waiting</span>}
          <Button size="sm" onClick={() => ai.ask("Classify the next batch?", [{ label: "Classifying next batch", run: () => api.classifyBatch() }])} loading={ai.busy === "Classify the next batch?"}>
            Classify next batch
          </Button>
          <Button size="sm" variant="primary" onClick={() => ai.ask("Classify all pending reports?", [{ label: "Classifying all pending", run: () => api.classifyAll() }])} loading={ai.busy === "Classify all pending reports?"}>
            Classify all pending
          </Button>
        </>
      }
    >
      <div className="grid gap-[10px] grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2" bodyClass="p-0" title={`Classified reports · ${rows.length}`}>
          {classified.isLoading ? (
            <div className="p-4"><SkeletonRows rows={10} /></div>
          ) : classified.isError ? (
            <ErrorState error={classified.error} onRetry={() => classified.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title="Nothing classified yet" body="Run the AI Cyber Filter to sort reports into cyber and regular faults." />
          ) : (
            <>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] text-muted border-y border-divider">
                      <th className="font-normal px-4 py-2.5 w-[130px]">FTIR ID</th>
                      <th className="font-normal px-4 py-2.5">Summary</th>
                      <th className="font-normal px-4 py-2.5 w-[100px]">Verdict</th>
                      <th className="font-normal px-4 py-2.5 w-[150px]">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => {
                      const cyber = r.classification.label === "CYBERSECURITY";
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setActive(r.ftirNumber)}
                          className={cx("table-row cursor-pointer", selected === r.ftirNumber ? "bg-accent-soft/40" : "hover:bg-raised/60")}
                        >
                          <td className="px-4 py-3"><FtirId id={r.ftirNumber} /></td>
                          <td className="px-4 py-3"><p className="line-clamp-1">{r.cleanedSubject}</p></td>
                          <td className="px-4 py-3"><Pill tone={cyber ? "danger" : "safe"} dot>{cyber ? "Cyber" : "Normal"}</Pill></td>
                          <td className="px-4 py-3"><ConfidenceBar value={r.classification.confidenceScore} tone={cyber ? "danger" : "safe"} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-divider text-xs text-muted">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft className="h-3.5 w-3.5" />}>Prev</Button>
                  <Button size="sm" variant="quiet" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card title="AI take" className="lg:row-span-2 lg:sticky lg:top-[68px] self-start w-full">
          {classified.isLoading ? <SkeletonRows rows={6} /> : <AiTake row={selectedRow} />}
        </Card>

        <div className="lg:col-span-2">
          <Card title="Cyber vs non-cyber">
            {totalClassified === 0 ? (
              <EmptyState title="No data yet" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative h-[150px] w-[150px] shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={donut} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={2} stroke="none" isAnimationActive={false}>
                        {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <div className="num text-xl font-medium">{pct(donut[0].value / totalClassified)}</div>
                      <div className="text-[10px] text-muted">cyber</div>
                    </div>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 text-xs">
                  {donut.map((d) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted">{d.name}</span>
                      <span className="num ml-2">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
      {ai.dialog}
    </PageFrame>
  );
}