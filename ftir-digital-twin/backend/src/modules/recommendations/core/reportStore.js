const reports = new Map();
let nextReportId = 1;

export const createReport = (reportData) => {
  const reportId = `report-${String(nextReportId).padStart(5, "0")}`;
  nextReportId += 1;

  const report = {
    reportId,
    createdAt: new Date().toISOString(),
    status: "COMPLETED",
    ...reportData
  };

  reports.set(reportId, report);
  return structuredClone(report);
};

export const getReportById = (reportId) => {
  const report = reports.get(reportId);
  return report ? structuredClone(report) : null;
};

export const getReportByImpactId = (impactId) => {
  return [...reports.values()].find(r => r.impactId === impactId) || null;
};

export const listReports = () => {
  return [...reports.values()].map(r => structuredClone(r));
};