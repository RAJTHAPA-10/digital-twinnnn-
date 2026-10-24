import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Play, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { PageFrame } from "../components/layout/PageFrame";
import { Button, Card, ConfidenceBar, Drawer, EmptyState, ErrorState, Field, FtirId, Kpi, Pill, SkeletonRows, cx } from "../components/ui";
import { useAllClassified, useAllProfiles, useClassSummary, useReports, useStats } from "../hooks/data";
import { useAiRun } from "../hooks/useAiRun";
import { errMsg, fmtDate, fmtNum, reportText } from "../lib/format";
import { ATTACK_LABEL } from "../lib/labels";
import { api } from "../services/api";
import { useApp } from "../store/app";
import type { ClassificationLabel, Report } from "../types/api";

/** Fields shared by plain reports and classified reports, enough for the table and drawer. */
type Row = Pick<Report, "id" | "ftirNumber" | "vehicleModel" | "mileage" | "registrationDate" | "ftirReportDate" | "incidentDate" | "cleanedSubject"> & {
  rawSubject?: string;
  processingError?: string | null;
};

type VerdictFilter = "" | ClassificationLabel;

/** Status shown on this page: Cyber attack / Non-cyber attack / Not classified. */
function VerdictPill({ label }: { label: ClassificationLabel | undefined }) {
  if (label === "CYBERSECURITY") return <Pill tone="danger" dot>Cyber attack</Pill>;
  if (label === "NON_CYBERSECURITY") return <Pill tone="safe" dot>Non-cyber attack</Pill>;
  return <Pill tone="neutral">Not classified</Pill>;
}

type SortKey = "ftirNumber" | "vehicleModel" | "incidentDate";

function UploadStrip({ onRun, running }: { onRun: () => void; running: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "json" || ext === "pdf") {
      toast.info("Only CSV is supported by the backend right now");
      return;
    }
    if (ext !== "csv") {
      toast.error("Please drop a .csv file");
      return;
    }
    setUploading(true);
    try {
      const res = await api.uploadCsv(file);
      toast.success(`${res.fileName} uploaded · ${res.validReports} valid rows`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    handle(e.dataTransfer.files[0]);
  };

  return (
    <div className="card p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => input.current?.click()}
        className={cx(
          "flex-1 flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 cursor-pointer transition-colors",
          over ? "border-accent bg-accent-soft/40" : "border-line hover:bg-raised",
        )}
      >
        <div className="h-8 w-8 rounded-full bg-raised grid place-items-center text-muted shrink-0">
          <Upload className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px]">{uploading ? "Uploading…" : "Drop an FTIR file here, or click to browse"}</p>
          <p className="text-[11px] text-faint">CSV, JSON, PDF · columns: FTIR, Model, Subject (English), dates, mileage</p>
        </div>
        <input ref={input} type="file" accept=".csv,.json,.pdf" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      </div>
      <Button variant="primary" onClick={onRun} loading={running} icon={<Play className="h-3.5 w-3.5" />}>
        Run analysis
      </Button>
    </div>
  );
}

function ReportDrawer({ report, onClose }: { report: Row | null; onClose: () => void }) {
  const classified = useAllClassified();
  const profiles = useAllProfiles();
  if (!report) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;

  const c = classified.data?.byFtir.get(report.ftirNumber)?.classification;
  const p = profiles.data?.byFtir.get(report.ftirNumber);

  return (
    <Drawer
      open
      onClose={onClose}
      title={<FtirId id={report.ftirNumber} className="text-[13px]" />}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="label">Reported symptom</span>
          <p className="text-[13px] leading-relaxed">{reportText(report)}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vehicle">{report.vehicleModel ?? "—"}</Field>
          <Field label="Mileage">{fmtNum(report.mileage)} km</Field>
          <Field label="Incident date">{fmtDate(report.incidentDate)}</Field>
          <Field label="FTIR report date">{fmtDate(report.ftirReportDate)}</Field>
          <Field label="Registered">{fmtDate(report.registrationDate)}</Field>
          <Field label="Status"><VerdictPill label={c?.label} /></Field>
        </div>
        {report.processingError && <p className="text-xs text-danger">{report.processingError}</p>}

        <div className="flex flex-col gap-3 border-t border-divider pt-5">
          <span className="label">AI cyber filter</span>
          {c ? (
            <>
              <div className="flex items-center gap-3">
                <Pill tone={c.label === "CYBERSECURITY" ? "danger" : "safe"} dot>{c.label === "CYBERSECURITY" ? "Flagged as cyber" : "Regular fault"}</Pill>
                <ConfidenceBar value={c.confidenceScore} tone={c.label === "CYBERSECURITY" ? "danger" : "safe"} />
              </div>
              <p className="text-xs text-muted leading-relaxed">{c.reason}</p>
            </>
          ) : (
            <p className="text-xs text-muted">Not classified yet.</p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-divider pt-5">
          <span className="label">Threat correlation</span>
          {p ? (
            <>
              <Pill tone="indigo" className="self-start">{ATTACK_LABEL[p.attackType.code]}</Pill>
              <Field label="Root cause">{p.rootCause}</Field>
              <Field label="What happened">{p.attackDescription}</Field>
            </>
          ) : (
            <p className="text-xs text-muted">No attack profile.</p>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [verdict, setVerdict] = useState<VerdictFilter>("");
  const [model, setModel] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "ftirNumber", dir: 1 });
  const [selected, setSelected] = useState<Row | null>(null);
  const setActive = useApp((s) => s.setActive);
  const limit = 20;

  const stats = useStats();
  const summary = useClassSummary();
  const reports = useReports({ page, limit, model: model.trim() || undefined });
  const classified = useAllClassified();
  const labelOf = (ftir: string) => classified.data?.byFtir.get(ftir)?.classification.label;
  const ai = useAiRun();

  // "All" = backend pages. "Cyber attack" / "Non-cyber attack" = classified list, paged here.
  const byVerdict = useMemo(() => {
    if (!verdict) return null;
    const m = model.trim().toUpperCase();
    return (classified.data?.list ?? []).filter(
      (r) => r.classification.label === verdict && (!m || (r.vehicleModel ?? "").toUpperCase() === m),
    );
  }, [verdict, model, classified.data]);

  const source = verdict ? classified : reports;
  const totalRows = byVerdict ? byVerdict.length : reports.data?.pagination.totalReports;
  const totalPages = byVerdict ? Math.max(1, Math.ceil(byVerdict.length / limit)) : reports.data?.pagination.totalPages ?? 1;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base: Row[] = byVerdict ?? reports.data?.reports ?? [];
    const sorted = [...base]
      .filter((r) => !q || r.ftirNumber.toLowerCase().includes(q) || reportText(r).toLowerCase().includes(q) || (r.vehicleModel ?? "").toLowerCase().includes(q))
      .sort((a, b) => String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? "")) * sort.dir);
    return byVerdict ? sorted.slice((page - 1) * limit, page * limit) : sorted;
  }, [byVerdict, reports.data, query, sort, page]);

  const runAnalysis = () =>
    ai.ask("Run the full AI analysis?", [
      { label: "Classifying reports", run: () => api.classifyAll() },
      { label: "Identifying attacks", run: () => api.identifyAll() },
    ]);

  const SortHead = ({ k, children }: { k: SortKey; children: string }) => (
    <button
      className="inline-flex items-center gap-1 hover:text-fg"
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : 1 }))}
    >
      {children}
      {sort.key === k && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <PageFrame title="FTIR Ingestion" subtitle="Every field incident report, in one place">
      <div className="grid gap-[10px] grid-cols-1 sm:grid-cols-3">
        <Kpi label="Total FTIRs" value={fmtNum(stats.data?.totalReports)} loading={stats.isLoading} hint={stats.data ? `${stats.data.failedReports} failed to parse` : undefined} />
        <Kpi label="Cyber attack" value={fmtNum(summary.data?.cybersecurityCount)} loading={summary.isLoading} tone="danger" hint={summary.data ? `${summary.data.reviewRequiredCount} need review` : undefined} />
        <Kpi label="Non-cyber attack" value={fmtNum(summary.data?.nonCybersecurityCount)} loading={summary.isLoading} tone="safe" hint={summary.data ? `${summary.data.pendingCount} still pending` : undefined} />

        <div className="sm:col-span-3">
          <UploadStrip onRun={runAnalysis} running={Boolean(ai.busy)} />
        </div>

        <Card
          className="sm:col-span-3"
          bodyClass="p-0"
          title="All reports"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter this page"
                  className="h-8 w-44 rounded-full bg-raised pl-8 pr-3 text-xs outline-none placeholder:text-faint"
                />
              </div>
              <select
                value={verdict}
                onChange={(e) => {
                  setVerdict(e.target.value as VerdictFilter);
                  setPage(1);
                }}
                className="h-8 rounded-full bg-raised px-3 text-xs outline-none"
              >
                <option value="">All reports</option>
                <option value="CYBERSECURITY">Cyber attack</option>
                <option value="NON_CYBERSECURITY">Non-cyber attack</option>
              </select>
              <input
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setPage(1);
                }}
                placeholder="Model (e.g. SWIFT)"
                className="h-8 w-36 rounded-full bg-raised px-3 text-xs outline-none placeholder:text-faint"
              />
            </div>
          }
        >
          {source.isLoading ? (
            <div className="p-4"><SkeletonRows rows={8} /></div>
          ) : source.isError ? (
            <ErrorState error={source.error} onRetry={() => source.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title="No reports here" body="Upload an FTIR CSV above, or clear the filters." />
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] text-muted border-y border-divider">
                    <th className="font-normal px-4 py-2.5 w-[130px]"><SortHead k="ftirNumber">FTIR ID</SortHead></th>
                    <th className="font-normal px-4 py-2.5 w-[120px]"><SortHead k="vehicleModel">Vehicle</SortHead></th>
                    <th className="font-normal px-4 py-2.5 w-[120px]"><SortHead k="incidentDate">Date</SortHead></th>
                    <th className="font-normal px-4 py-2.5">Reported symptom</th>
                    <th className="font-normal px-4 py-2.5 w-[150px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} onClick={() => { setSelected(r); setActive(r.ftirNumber); }} className="table-row cursor-pointer hover:bg-raised/60">
                      <td className="px-4 py-3"><FtirId id={r.ftirNumber} /></td>
                      <td className="px-4 py-3 text-muted">{r.vehicleModel ?? "—"}</td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">{fmtDate(r.incidentDate)}</td>
                      <td className="px-4 py-3"><p className="line-clamp-1 max-w-[640px]">{reportText(r)}</p></td>
                      <td className="px-4 py-3"><VerdictPill label={labelOf(r.ftirNumber)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-divider text-xs text-muted">
            <span>
              Page {page} of {totalPages} · {fmtNum(totalRows)} reports
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft className="h-3.5 w-3.5" />}>Prev</Button>
              <Button size="sm" variant="quiet" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <ReportDrawer report={selected} onClose={() => setSelected(null)} />
      {ai.dialog}
    </PageFrame>
  );
}