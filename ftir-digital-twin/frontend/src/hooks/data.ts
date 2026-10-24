import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useApp } from "../store/app";
import type { AttackProfile, ClassifiedReport, ReportListParams } from "../types/api";

const useMode = () => useApp((s) => s.mode);

export const useStats = () => {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "stats"], queryFn: () => api.getStats(), enabled: mode !== "checking" });
};

export const useReports = (params: ReportListParams) => {
  const mode = useMode();
  return useQuery({
    queryKey: [mode, "reports", params],
    queryFn: () => api.listReports(params),
    enabled: mode !== "checking",
    placeholderData: (prev) => prev,
  });
};

export const useReport = (ftirNumber: string | null | undefined) => {
  const mode = useMode();
  return useQuery({
    queryKey: [mode, "report", ftirNumber],
    queryFn: () => api.getReport(ftirNumber!),
    enabled: mode !== "checking" && Boolean(ftirNumber) && !ftirNumber!.startsWith("manual:"),
  });
};

export const useClassSummary = () => {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "class-summary"], queryFn: () => api.classificationSummary(), enabled: mode !== "checking" });
};

/** Every classified report (both labels), paged through at the backend max of 100. */
export const useAllClassified = () => {
  const mode = useMode();
  return useQuery({
    queryKey: [mode, "classified-all"],
    enabled: mode !== "checking",
    queryFn: async () => {
      const all: ClassifiedReport[] = [];
      for (const label of ["CYBERSECURITY", "NON_CYBERSECURITY"] as const) {
        let page = 1;
        for (;;) {
          const res = await api.listClassified(label, page, 100);
          all.push(...res.reports);
          if (!res.pagination.hasNextPage) break;
          page += 1;
        }
      }
      return { list: all, byFtir: new Map(all.map((r) => [r.ftirNumber, r])) };
    },
  });
};

export const useAttackSummary = () => {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "attack-summary"], queryFn: () => api.attackSummary(), enabled: mode !== "checking" });
};

export const useAllProfiles = () => {
  const mode = useMode();
  return useQuery({
    queryKey: [mode, "profiles-all"],
    enabled: mode !== "checking",
    queryFn: async () => {
      const all: AttackProfile[] = [];
      let page = 1;
      for (;;) {
        const res = await api.listProfiles(page, 100);
        all.push(...res.profiles);
        if (!res.pagination.hasNextPage) break;
        page += 1;
      }
      return { list: all, byFtir: new Map(all.map((p) => [p.report.ftirNumber, p])) };
    },
  });
};

export const useImpactList = () => {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "impacts"], queryFn: () => api.listImpacts(), enabled: mode !== "checking" });
};
