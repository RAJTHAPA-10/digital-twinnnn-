import { useQuery } from "@tanstack/react-query";
import { Cpu, Lightbulb, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageFrame } from "../components/layout/PageFrame";
import { Button, Card, EmptyState, ErrorState, FtirId, SkeletonRows, cx } from "../components/ui";
import { useAllClassified, useAllProfiles } from "../hooks/data";
import { ATTACK_LABEL, attackCss } from "../lib/labels";
import { explainAttackType } from "../services/llm";
import { useApp } from "../store/app";
import type { AttackCode, ScenarioType } from "../types/api";

/** One report the AI classified as cyber. */
interface Incident {
  ftir: string;
  model: string | null;
  text: string;
  reason: string | null;
  /** Attack type confirmed by the backend's attack-identification step, if any. */
  backendType: ScenarioType | null;
}

/** Asks the LLM what type of attack this report is, with an explanation and an example. */
function AttackTypeView({ incident }: { incident: Incident }) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["llm-attack", incident.ftir],
    queryFn: () => explainAttackType({ ftirNumber: incident.ftir, text: incident.text, backendReason: incident.reason }),
    enabled: Boolean(incident.text),
    staleTime: Infinity,
    retry: false,
  });

  if (q.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 animate-pulse text-accent" /> Identifying the type of attack…</span>
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    );
  }

  const a = q.data?.attack;
  if (q.isError || !a) {
    return (
      <div className="rounded-xl border border-line px-3 py-2 text-xs text-muted flex items-center justify-between gap-3">
        <span>
          {q.isError && q.error instanceof Error
            ? `Couldn't identify the attack: ${q.error.message}`
            : "The AI didn't return an attack type. Make sure frontend/server/llmExplain.ts is updated, then restart npm run dev."}
        </span>
        <Button size="sm" variant="quiet" onClick={() => q.refetch()}>Retry</Button>
      </div>
    );
  }

  const code: AttackCode = a.type === "OTHER" ? "UNCLASSIFIED" : a.type;
  const typeLabel = a.type === "OTHER" ? "Other cyber attack" : ATTACK_LABEL[a.type];

  // Digital Twin can run the 5 known attack types. Prefer the backend-confirmed type
  // (keeps the FTIR linked through Impact and Final Report); otherwise run the AI's type as a scenario.
  const simulateTo = incident.backendType
    ? `/digital-twin?ftir=${encodeURIComponent(incident.ftir)}`
    : a.type !== "OTHER"
      ? `/digital-twin?ftir=${encodeURIComponent(`manual:${a.type}`)}`
      : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="label">Type of attack</span>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: attackCss(code) }} />
          <span className="text-[20px] font-medium tracking-tight">{typeLabel}</span>
          {a.name && <span className="text-[13px] text-muted">· {a.name}</span>}
        </div>
      </div>

      {a.explanation && (
        <div className="flex flex-col gap-2">
          <span className="label">Explanation</span>
          <p className="text-[14px] leading-relaxed">{a.explanation}</p>
        </div>
      )}

      {a.example && (
        <div className="flex flex-col gap-2 rounded-xl bg-raised/50 p-4">
          <span className="label flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" /> Example</span>
          <p className="text-[13px] leading-relaxed">{a.example}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
        <span className="text-[11px] text-faint flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Identified by {q.data?.model}</span>
        {simulateTo ? (
          <Button variant="primary" icon={<Cpu className="h-3.5 w-3.5" />} onClick={() => navigate(simulateTo)}>
            Simulate this attack
          </Button>
        ) : (
          <span className="text-[11px] text-muted">This kind of attack can't be simulated in the digital twin yet.</span>
        )}
      </div>
    </div>
  );
}

export default function ThreatsPage() {
  const classified = useAllClassified();
  const profiles = useAllProfiles();
  const activeKey = useApp((s) => s.activeKey);
  const setActive = useApp((s) => s.setActive);

  // Every report the AI classified as cyber.
  const incidents: Incident[] = useMemo(
    () =>
      (classified.data?.list ?? [])
        .filter((r) => r.classification.label === "CYBERSECURITY")
        .map((r) => {
          const p = profiles.data?.byFtir.get(r.ftirNumber);
          const backendType = p?.identificationStatus === "IDENTIFIED" && p.attackType.code !== "UNCLASSIFIED" ? p.attackType.code : null;
          return { ftir: r.ftirNumber, model: r.vehicleModel, text: r.cleanedSubject ?? "", reason: r.classification.reason, backendType };
        })
        .sort((a, b) => a.ftir.localeCompare(b.ftir)),
    [classified.data, profiles.data],
  );

  const selectedId = incidents.some((i) => i.ftir === activeKey) ? activeKey : incidents[0]?.ftir ?? null;
  const selected = incidents.find((i) => i.ftir === selectedId);

  useEffect(() => {
    if (!activeKey && selectedId) setActive(selectedId);
  }, [activeKey, selectedId, setActive]);

  return (
    <PageFrame title="Threat Correlation" subtitle="Click a cyber incident to see what type of attack it is">
      {classified.isError ? (
        <Card><ErrorState error={classified.error} onRetry={() => classified.refetch()} /></Card>
      ) : (
        <div className="grid gap-[10px] grid-cols-1 lg:grid-cols-3">
          <Card title={`Cyber incidents · ${incidents.length}`} bodyClass="p-0">
            {classified.isLoading ? (
              <div className="p-4"><SkeletonRows rows={8} /></div>
            ) : incidents.length === 0 ? (
              <EmptyState title="No cyber incidents yet" body="Run the AI Cyber Filter to find reports that are cyber attacks." />
            ) : (
              <ul className="mt-2 max-h-[calc(100vh-190px)] overflow-y-auto">
                {incidents.map((i) => (
                  <li key={i.ftir}>
                    <button
                      onClick={() => setActive(i.ftir)}
                      className={cx("w-full text-left px-4 py-3 border-t border-divider transition-colors",
                        selectedId === i.ftir ? "bg-accent-soft/40" : "hover:bg-raised/60")}
                    >
                      <div className="flex items-center gap-2">
                        <FtirId id={i.ftir} />
                        <span className="text-[11px] text-faint">{i.model}</span>
                      </div>
                      <p className="text-xs text-muted truncate mt-0.5">{i.text}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Incident" className="lg:col-span-2 lg:sticky lg:top-[68px] self-start w-full">
            {!selected ? (
              <EmptyState title="Pick an incident" body="Click any FTIR ID on the left." />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <FtirId id={selected.ftir} className="text-[14px]" />
                  <span className="text-[12px] text-muted">{selected.model}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="label">Report text</span>
                  <p className="text-[13px] leading-relaxed rounded-xl bg-raised/60 p-3">{selected.text}</p>
                </div>
                <AttackTypeView key={selected.ftir} incident={selected} />
              </div>
            )}
          </Card>
        </div>
      )}
    </PageFrame>
  );
}