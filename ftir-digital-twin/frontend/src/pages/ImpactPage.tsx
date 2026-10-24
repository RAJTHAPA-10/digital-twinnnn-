import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SeverityGauge } from "../components/charts/SeverityGauge";
import { IncidentSelect } from "../components/IncidentSelect";
import { PageFrame } from "../components/layout/PageFrame";
import { RunChainPrompt } from "../components/RunChainPrompt";
import { Button, Card, ErrorState, Pill, SeverityPill } from "../components/ui";
import { useActiveIncident } from "../hooks/incident";
import { useFinalReport, useImpact, usePipelineIds } from "../hooks/pipeline";
import { ATTACK_LABEL, ecuLabel, prettyText } from "../lib/labels";
import type { RecommendationCategory, Severity } from "../types/api";

const PRIORITY_ORDER: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  PREVENTION: "Prevent",
  DETECTION: "Detect",
  RESPONSE: "Respond",
  RECOVERY: "Recover",
};

function Recommendations({ ftirKey }: { ftirKey: string | null }) {
  const report = useFinalReport(ftirKey);
  const recs = [...(report.data?.content.recommendations ?? [])].sort((x, y) => PRIORITY_ORDER[x.priority] - PRIORITY_ORDER[y.priority]);

  if (report.isLoading) {
    return <div className="grid gap-[10px] md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[96px] rounded-xl" />)}</div>;
  }
  if (report.isError) return <ErrorState error={report.error} onRetry={() => report.refetch()} />;
  if (!recs.length) return <p className="text-xs text-muted">No recommendations yet. Run the simulation on the Digital Twin page first.</p>;

  const content = report.data?.content;
  const source = content?.recommendationSource;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        {source?.source === "AI" ? (
          <>
            <Pill tone="indigo"><Sparkles className="h-3 w-3" /> AI-generated</Pill>
            <span>from the affected ECUs and simulation results{source.modelName ? ` · ${source.modelName}` : ""}</span>
          </>
        ) : (
          <>
            <Pill tone="neutral">Standard list</Pill>
            <span>{source?.reason ? `AI unavailable: ${source.reason}` : "Fixed mitigations for this attack type"}</span>
          </>
        )}
      </div>
      {content?.recommendationSummary && (
        <p className="text-[13px] leading-relaxed rounded-xl bg-indigo-soft/40 px-4 py-3">{content.recommendationSummary}</p>
      )}
      <ol className="grid gap-[10px] md:grid-cols-2">
        {recs.map((r, i) => (
          <li key={r.title} className="rounded-xl bg-raised/50 p-4 flex gap-3">
            <span className="num h-6 w-6 shrink-0 rounded-full bg-safe-soft text-safe grid place-items-center text-[11px] font-medium">{i + 1}</span>
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[14px] font-medium leading-snug">{r.title}</h3>
                <SeverityPill severity={r.priority} />
              </div>
              <p className="text-[13px] text-muted leading-relaxed">{r.description}</p>
              {r.rationale && (
                <p className="text-[12px] leading-relaxed"><span className="text-faint">Why: </span>{r.rationale}</p>
              )}
              {(r.category || r.targetEcus?.length || r.standardReference) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {r.category && <Pill tone="accent">{CATEGORY_LABEL[r.category]}</Pill>}
                  {r.targetEcus?.map((e) => <Pill key={e} tone="warn">{ecuLabel(e)}</Pill>)}
                  {r.standardReference && <span className="text-[11px] text-faint">{r.standardReference}</span>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ImpactPage() {
  const navigate = useNavigate();
  const { key, scenario } = useActiveIncident();
  const ids = usePipelineIds(key);
  const impact = useImpact(key);
  const a = impact.data?.analysis;
  const propagated = a ? a.affectedEcus.filter((e) => !a.directlyTargetedEcus.includes(e)) : [];

  return (
    <PageFrame
      title="Impact Analysis"
      subtitle="How serious the attack is, which parts it hit, and what to do about it"
      actions={
        <>
          <IncidentSelect />
          {scenario && <Pill tone="indigo">{ATTACK_LABEL[scenario]}</Pill>}
        </>
      }
    >
      {!ids ? (
        <RunChainPrompt what="impact analysis" />
      ) : impact.isLoading ? (
        <div className="grid gap-[10px] lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="skeleton h-[300px] rounded-card" />)}</div>
      ) : impact.isError ? (
        <Card><ErrorState error={impact.error} onRetry={() => impact.refetch()} /></Card>
      ) : !a ? (
        <RunChainPrompt what="impact analysis" />
      ) : (
        <div className="grid gap-[10px] grid-cols-1 lg:grid-cols-2">
          <Card title="Severity">
            <div className="flex flex-col items-center gap-3">
              <SeverityGauge score={a.severityScore} />
              <SeverityPill severity={a.severity} />
              <p className="text-[13px] text-muted text-center leading-relaxed">{prettyText(a.summary)}</p>
              <div className="flex gap-3 text-[10px] text-faint">
                <span>Low 1–3</span><span>Medium 4–6</span><span>High 7–8</span><span>Critical 9–10</span>
              </div>
            </div>
            {a.severityReasons.length > 0 && (
              <div className="mt-5 flex flex-col gap-2 border-t border-divider pt-4">
                <span className="label">Why this severity</span>
                <ul className="flex flex-col gap-1.5 text-[13px]">
                  {a.severityReasons.map((r) => (
                    <li key={r} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-sev-high shrink-0" />{prettyText(r)}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Affected ECUs">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="label">Directly targeted</span>
                <div className="flex flex-wrap gap-1.5">
                  {a.directlyTargetedEcus.length ? a.directlyTargetedEcus.map((e) => <Pill key={e} tone="danger">{ecuLabel(e)}</Pill>) : <span className="text-xs text-muted">None</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="label">Also affected</span>
                <div className="flex flex-wrap gap-1.5">
                  {propagated.length ? propagated.map((e) => <Pill key={e} tone="warn">{ecuLabel(e)}</Pill>) : <span className="text-xs text-muted">None</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="label">How the attack spread</span>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {a.propagationPath.map((n, i) => (
                    <span key={`${n}-${i}`} className="flex items-center gap-1.5">
                      <span className="rounded-full bg-raised px-2.5 py-1">{ecuLabel(n)}</span>
                      {i < a.propagationPath.length - 1 && <ArrowRight className="h-3 w-3 text-faint" />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="lg:col-span-2"
            title={
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-safe" /> Recommendations
                {scenario && <span className="text-muted font-normal">· for {ATTACK_LABEL[scenario]}</span>}
              </span>
            }
          >
            <Recommendations ftirKey={key} />
          </Card>

          <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-[11px] text-faint max-w-3xl">{a.disclaimer}</p>
            <Button variant="ghost" onClick={() => navigate(`/final-report?ftir=${encodeURIComponent(key ?? "")}`)}>
              Final report <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </PageFrame>
  );
}