import { Check, Circle, Download, Minus, Printer, X } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { IncidentSelect } from "../components/IncidentSelect";
import { PageFrame } from "../components/layout/PageFrame";
import { RunChainPrompt } from "../components/RunChainPrompt";
import { Button, Card, Field, FtirId, Pill, SeverityPill, cx } from "../components/ui";
import { useAllClassified, useReport } from "../hooks/data";
import { useActiveIncident } from "../hooks/incident";
import { useFinalReport, useImpact, usePipelineIds, useSimulation } from "../hooks/pipeline";
import { errMsg, fmtDate, fmtNum, pct, reportText } from "../lib/format";
import { ATTACK_LABEL, ecuLabel, prettyText } from "../lib/labels";
import { downloadPdf } from "../lib/pdf";
import { pipelineKey, useApp } from "../store/app";

type StepState = "done" | "pending" | "failed" | "skipped";

function Stepper({ steps }: { steps: { label: string; state: StepState; to: string }[] }) {
  const { search } = useLocation();
  return (
    <ol className="card p-4 flex flex-wrap items-center gap-y-3">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center">
          <Link to={{ pathname: s.to, search }} className="flex items-center gap-2 rounded-full pr-3 hover:bg-raised">
            <span
              className={cx(
                "h-7 w-7 rounded-full grid place-items-center text-xs",
                s.state === "done" && "bg-safe-soft text-safe",
                (s.state === "pending" || s.state === "skipped") && "bg-raised text-faint",
                s.state === "failed" && "bg-danger-soft text-danger",
              )}
            >
              {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : s.state === "failed" ? <X className="h-3.5 w-3.5" /> : s.state === "skipped" ? <Minus className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
            </span>
            <span className={cx("text-xs", s.state === "done" || s.state === "failed" ? "text-fg" : "text-muted")}>{s.label}{s.state === "skipped" && " · skipped"}</span>
          </Link>
          {i < steps.length - 1 && <span className="mx-2 h-px w-6 sm:w-10 bg-line" />}
        </li>
      ))}
    </ol>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 py-5 border-t border-divider first:border-0 first:pt-0">
      <h3 className="text-[13px] font-medium"><span className="text-faint mr-2 num">{String(n).padStart(2, "0")}</span>{title}</h3>
      {children}
    </section>
  );
}

const state = (q: { isError: boolean; data: unknown }): StepState => (q.isError ? "failed" : q.data ? "done" : "pending");

export default function FinalReportPage() {
  const mode = useApp((s) => s.mode);
  const { key, profile, manual } = useActiveIncident();
  const ids = usePipelineIds(key);
  const report = useReport(manual ? null : key);
  const classified = useAllClassified();
  const sim = useSimulation(key);
  const impact = useImpact(key);
  const final = useFinalReport(key);
  const planned = useApp((s) => (key ? s.planned[pipelineKey(mode, key)] ?? [] : []));
  const classification = key ? classified.data?.byFtir.get(key)?.classification : undefined;
  const a = impact.data?.analysis;
  const c = final.data?.content;

  const steps = [
    { label: "FTIR", state: manual ? "skipped" : state(report), to: "/reports" },
    { label: "Cyber filter", state: manual ? "skipped" : classification ? "done" : "pending", to: "/cyber-filter" },
    { label: "Threat correlation", state: manual ? "skipped" : profile ? "done" : "pending", to: "/threats" },
    { label: "Simulation", state: state(sim), to: "/digital-twin" },
    { label: "Impact", state: state(impact), to: "/impact" },
    { label: "Mitigations", state: state(final), to: "/recommendations" },
  ] as { label: string; state: StepState; to: string }[];

  const exportPdf = () => {
    if (!key) return;
    try {
      downloadPdf({ key, report: report.data, classification, profile, sim: sim.data, impact: impact.data, final: final.data, planned });
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <PageFrame
      title="Final Report"
      subtitle="Everything about one incident, start to finish"
      actions={
        <>
          <IncidentSelect />
          <div className="flex-1" />
          <Button onClick={() => window.print()} icon={<Printer className="h-3.5 w-3.5" />} disabled={!c}>Print</Button>
          <Button variant="primary" onClick={exportPdf} icon={<Download className="h-3.5 w-3.5" />} disabled={!c}>Download PDF</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[10px]">
        <div className="no-print"><Stepper steps={steps} /></div>
        {!ids ? (
          <RunChainPrompt what="final report" />
        ) : final.isLoading ? (
          <div className="skeleton h-[480px] rounded-card" />
        ) : (
          <Card bodyClass="p-6 sm:p-8">
            <article className="max-w-[880px] mx-auto">
              <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
                <div className="flex flex-col gap-1">
                  <span className="label">Incident report</span>
                  <h2 className="text-xl font-medium tracking-tight">{c?.title ?? "Automotive Cybersecurity Incident Report"}</h2>
                  <p className="text-xs text-muted">{manual ? "Manual scenario" : <FtirId id={key!} />} · generated {fmtDate(final.data?.createdAt ?? new Date().toISOString())}</p>
                </div>
                {a && <SeverityPill severity={a.severity} score={a.severityScore} />}
              </header>

              {c && (
                <div className="rounded-xl bg-raised/60 p-4 mb-2">
                  <span className="label">Executive summary</span>
                  <p className="text-[13px] mt-1.5 leading-relaxed">{prettyText(c.executiveSummary)}</p>
                </div>
              )}

              {c?.plainReport && (
                <section className="rounded-xl border border-line p-5 mb-4 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="label">Easy-read report</span>
                    <span className="text-[11px] text-muted">
                      {c.plainReport.source === "AI"
                        ? `Written by AI${c.plainReport.modelName ? ` (${c.plainReport.modelName})` : ""} from the results of every step, nothing added`
                        : "Written from the results of every step (standard template)"}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed">{c.plainReport.summary}</p>
                  {c.plainReport.sections.map((s) => (
                    <div key={s.key} className="flex flex-col gap-1">
                      <h4 className="text-[13px] font-medium">{s.heading}</h4>
                      <p className="text-[13px] leading-relaxed text-muted">{s.body}</p>
                    </div>
                  ))}
                </section>
              )}

              {c?.plainReport && <span className="label block mb-1">Technical details</span>}

              <Section n={1} title="Field technical incident report">
                {report.data ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Field label="Vehicle">{report.data.vehicleModel ?? "—"}</Field>
                      <Field label="Mileage">{fmtNum(report.data.mileage)} km</Field>
                      <Field label="Incident date">{fmtDate(report.data.incidentDate)}</Field>
                      <Field label="Report date">{fmtDate(report.data.ftirReportDate)}</Field>
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted">{reportText(report.data)}</p>
                  </>
                ) : <p className="text-xs text-muted">{manual ? "Manual scenario run, no FTIR attached." : "Report not loaded."}</p>}
              </Section>

              <Section n={2} title="Cyber classification">
                {classification ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Pill tone={classification.label === "CYBERSECURITY" ? "danger" : "safe"} dot>
                        {classification.label === "CYBERSECURITY" ? "Cybersecurity incident" : "Non-cybersecurity fault"}
                      </Pill>
                      <span className="text-xs text-muted">Confidence {pct(classification.confidenceScore)}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed">{classification.reason}</p>
                  </>
                ) : <p className="text-xs text-muted">Not classified.</p>}
              </Section>

              <Section n={3} title="Threat correlation">
                {profile ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Attack type">{ATTACK_LABEL[profile.attackType.code]}</Field>
                    <Field label="Root cause">{profile.rootCause}</Field>
                    <Field label="Description">{profile.attackDescription}</Field>
                  </div>
                ) : <p className="text-xs text-muted">{manual ? "Scenario chosen manually." : "No attack profile."}</p>}
              </Section>

              <Section n={4} title="Digital twin simulation">
                {sim.data ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="Scenario">{ATTACK_LABEL[sim.data.input.scenarioType]}</Field>
                    <Field label="Duration">{sim.data.input.durationMs / 1000} s</Field>
                    <Field label="Events">{fmtNum(sim.data.result.summary.totalEvents)}</Field>
                    <Field label="Anomalies">{fmtNum(sim.data.result.summary.anomalyCount)}</Field>
                  </div>
                ) : <p className="text-xs text-muted">Not simulated.</p>}
              </Section>

              <Section n={5} title="Impact assessment">
                {a ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Field label="Severity"><SeverityPill severity={a.severity} score={a.severityScore} /></Field>
                      <Field label="Targeted">{a.directlyTargetedEcus.map(ecuLabel).join(", ") || "None"}</Field>
                      <Field label="Affected">{a.affectedEcus.map(ecuLabel).join(", ") || "None"}</Field>
                      <Field label="Path">{a.propagationPath.map(ecuLabel).join(" → ")}</Field>
                    </div>
                    <ul className="text-[13px] flex flex-col gap-1">{[...a.vehicleImpact, ...a.networkImpact].map((x) => <li key={x}>• {prettyText(x)}</li>)}</ul>
                    {c && <p className="text-xs text-muted leading-relaxed">{prettyText(c.rootCauseSummary)}</p>}
                  </>
                ) : <p className="text-xs text-muted">Not analysed.</p>}
              </Section>

              <Section n={6} title="Mitigations">
                {c?.recommendationSource && (
                  <p className="text-[11px] text-muted mb-2">
                    {c.recommendationSource.source === "AI"
                      ? `AI-generated from the simulation results${c.recommendationSource.modelName ? ` (${c.recommendationSource.modelName})` : ""}.`
                      : "Standard mitigation list for this attack type."}
                  </p>
                )}
                {c?.recommendationSummary && <p className="text-xs leading-relaxed mb-3">{c.recommendationSummary}</p>}
                {c?.recommendations.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left text-[11px] text-muted border-b border-divider">
                          <th className="font-normal py-2 pr-4">Mitigation</th>
                          <th className="font-normal py-2 pr-4">Priority</th>
                          <th className="font-normal py-2 pr-4">Description</th>
                          <th className="font-normal py-2">Planned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.recommendations.map((r) => (
                          <tr key={r.title} className="table-row align-top">
                            <td className="py-2.5 pr-4 font-medium whitespace-nowrap">{r.title}</td>
                            <td className="py-2.5 pr-4"><SeverityPill severity={r.priority} /></td>
                            <td className="py-2.5 pr-4 text-muted">
                              {r.description}
                              {r.rationale && <span className="block mt-1 text-[12px] text-faint">Why: {r.rationale}</span>}
                              {r.targetEcus?.length ? <span className="block mt-1 text-[11px] text-faint">ECUs: {r.targetEcus.map(ecuLabel).join(", ")}</span> : null}
                            </td>
                            <td className="py-2.5">{planned.includes(r.title) ? <Check className="h-4 w-4 text-safe" /> : <span className="text-faint">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-xs text-muted">No mitigations generated.</p>}
              </Section>
            </article>
          </Card>
        )}
      </div>
    </PageFrame>
  );
}