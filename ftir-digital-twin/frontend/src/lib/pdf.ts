import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AttackProfile, Classification, FinalReport, ImpactRecord, Report, SimulationRun } from "../types/api";
import { fmtDate } from "./format";
import { ATTACK_LABEL, ecuLabel, prettyText, SEVERITY_LABEL } from "./labels";

export interface ReportBundle {
  key: string;
  report?: Report;
  classification?: Classification;
  profile?: AttackProfile;
  sim?: SimulationRun | null;
  impact?: ImpactRecord | null;
  final?: FinalReport | null;
  planned: string[];
}

export function downloadPdf(b: ReportBundle) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;
  const generated = new Date().toLocaleString("en-GB");

  const ensure = (h: number) => {
    if (y + h > doc.internal.pageSize.getHeight() - M) {
      doc.addPage();
      y = M;
    }
  };
  const heading = (text: string) => {
    ensure(40);
    y += 14;
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(15, 23, 42).text(text.toUpperCase(), M, y);
    y += 6;
    doc.setDrawColor(226, 232, 240).line(M, y, W - M, y);
    y += 14;
  };
  const para = (text: string, size = 10, color: [number, number, number] = [30, 41, 59]) => {
    doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(...color);
    const lines = doc.splitTextToSize(text, W - M * 2) as string[];
    lines.forEach((line) => {
      ensure(size + 4);
      doc.text(line, M, y);
      y += size + 4;
    });
    y += 4;
  };
  const kv = (rows: [string, string][]) => {
    autoTable(doc, {
      startY: y,
      body: rows,
      theme: "plain",
      styles: { fontSize: 9.5, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 140, textColor: [100, 116, 139] } },
      margin: { left: M, right: M },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  };

  
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(15, 23, 42);
  doc.text(b.final?.content.title ?? "Automotive Cybersecurity Incident Report", M, y);
  y += 18;
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(100, 116, 139);
  doc.text(`Incident: ${b.key}    Generated: ${generated}`, M, y);
  y += 10;

  if (b.final) {
    heading("Executive summary");
    para(prettyText(b.final.content.executiveSummary));
  }

  const plain = b.final?.content.plainReport;
  if (plain) {
    heading("Easy-read report");
    para(plain.summary, 10.5);
    plain.sections.forEach((s) => {
      ensure(30);
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(15, 23, 42).text(s.heading, M, y);
      y += 14;
      para(s.body);
    });
    para(
      plain.source === "AI"
        ? "Written by AI only from the results above; it was checked so that it adds no numbers that are not in the data."
        : "Written from the results above using a standard template.",
      8.5,
      [100, 116, 139],
    );
    heading("Technical details");
  }

  heading("1. Field technical incident report");
  kv([
    ["FTIR ID", b.report?.ftirNumber ?? b.key],
    ["Vehicle model", b.report?.vehicleModel ?? "—"],
    ["Mileage", b.report?.mileage != null ? `${b.report.mileage.toLocaleString("en-IN")} km` : "—"],
    ["Incident date", fmtDate(b.report?.incidentDate)],
    ["Report date", fmtDate(b.report?.ftirReportDate)],
  ]);
  if (b.report) para(`Reported symptom: ${b.report.cleanedSubject ?? b.report.rawSubject ?? ""}`);

  heading("2. Cyber classification");
  if (b.classification) {
    kv([
      ["Verdict", b.classification.label === "CYBERSECURITY" ? "Cybersecurity incident" : "Non-cybersecurity fault"],
      ["Confidence", b.classification.confidenceScore != null ? `${Math.round(b.classification.confidenceScore * 100)}%` : "—"],
      ["Model", b.classification.modelName ?? "—"],
      ["Manual review", b.classification.reviewRequired ? `Required. ${b.classification.reviewReason ?? ""}` : "Not required"],
    ]);
    para(b.classification.reason);
  } else para("Not classified.");

  heading("3. Threat correlation");
  if (b.profile) {
    kv([
      ["Attack type", ATTACK_LABEL[b.profile.attackType.code]],
      ["Confidence", b.profile.confidenceScore != null ? `${Math.round(b.profile.confidenceScore * 100)}%` : "—"],
    ]);
    para(`Root cause: ${b.profile.rootCause}`);
    para(`Description: ${b.profile.attackDescription}`);
  } else para("No attack profile on record.");

  heading("4. Digital twin simulation");
  if (b.sim) {
    kv([
      ["Scenario", ATTACK_LABEL[b.sim.input.scenarioType]],
      ["Run ID", b.sim.runId],
      ["Duration", `${b.sim.input.durationMs / 1000} s`],
      ["Events / anomalies", `${b.sim.result.summary.totalEvents} / ${b.sim.result.summary.anomalyCount}`],
    ]);
    para("The simulation was executed in an isolated software environment. No physical vehicle was involved.", 9, [100, 116, 139]);
  } else para("Not simulated.");

  heading("5. Impact assessment");
  const a = b.impact?.analysis;
  if (a) {
    kv([
      ["Severity", `${SEVERITY_LABEL[a.severity]} (${a.severityScore}/10)`],
      ["Risk level", SEVERITY_LABEL[a.riskLevel]],
      ["Directly targeted ECUs", a.directlyTargetedEcus.map(ecuLabel).join(", ") || "None"],
      ["Affected ECUs", a.affectedEcus.map(ecuLabel).join(", ") || "None"],
      ["Propagation path", a.propagationPath.map(ecuLabel).join(" > ")],
    ]);
    para(`Vehicle impact: ${prettyText(a.vehicleImpact.join(" "))}`);
    para(`Network impact: ${prettyText(a.networkImpact.join(" "))}`);
    if (b.final) para(`Root cause summary: ${prettyText(b.final.content.rootCauseSummary)}`);
  } else para("Not analysed.");

  heading("6. Recommended mitigations");
  if (b.final?.content.recommendations.length) {
    autoTable(doc, {
      startY: y,
      head: [["Mitigation", "Priority", "Description", "Planned"]],
      body: b.final.content.recommendations.map((r) => [r.title, SEVERITY_LABEL[r.priority], r.rationale ? `${r.description}\nWhy: ${r.rationale}` : r.description, b.planned.includes(r.title) ? "Yes" : "No"]),
      theme: "grid",
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 60 }, 3: { cellWidth: 50 } },
      margin: { left: M, right: M },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  } else para("No mitigations generated.");

  heading("Disclaimer");
  para(b.final?.content.disclaimer ?? "This report is indicative only.", 9, [100, 116, 139]);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(148, 163, 184);
    doc.text(`Vehicle Cyber Incident Analyzer · ${b.key} · Page ${i} of ${pages}`, M, doc.internal.pageSize.getHeight() - 24);
  }

  doc.save(`incident-report-${b.key.replace(/[^\w-]/g, "_")}.pdf`);
}