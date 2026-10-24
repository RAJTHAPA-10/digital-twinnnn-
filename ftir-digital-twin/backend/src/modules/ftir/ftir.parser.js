import { parse } from "csv-parse/sync";
import { reportImportSchema } from "./ftir.validator.js";

const monthMap = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

const normalizeRawValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized === "" ? null : normalized;
};

const normalizeSubject = (value) => {
  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const normalizeModel = (value) => {
  const normalized = normalizeRawValue(value);

  return normalized ? normalized.toUpperCase() : null;
};

const parseMileage = (value) => {
  const normalized = normalizeRawValue(value);

  if (!normalized) {
    return null;
  }

  const mileage = Number.parseInt(normalized.replace(/[^\d]/g, ""), 10);

  return Number.isNaN(mileage) ? null : mileage;
};

const parseExcelDate = (value) => {
  const serial = Number(value);

  if (!Number.isFinite(serial) || serial < 20_000 || serial > 60_000) {
    return null;
  }

  const excelEpoch = Date.UTC(1899, 11, 30);

  return new Date(excelEpoch + serial * 86_400_000);
};

const parseDashedDate = (value) => {
  const match = value.match(/^(\d{1,2})-([a-zA-Z]{3})-(\d{2}|\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, monthText, yearText] = match;
  const month = monthMap[monthText.toLowerCase()];

  if (month === undefined) {
    return null;
  }

  const year =
    yearText.length === 2
      ? 2000 + Number.parseInt(yearText, 10)
      : Number.parseInt(yearText, 10);

  return new Date(Date.UTC(year, month, Number.parseInt(day, 10)));
};

const parseSlashDate = (value) => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, month, day, year] = match;

  return new Date(
    Date.UTC(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10)
    )
  );
};

const parseDateValue = (value) => {
  const rawValue = normalizeRawValue(value);

  if (!rawValue || rawValue === "0") {
    return null;
  }

  if (/^\d+$/.test(rawValue)) {
    return parseExcelDate(rawValue);
  }

  return parseDashedDate(rawValue) || parseSlashDate(rawValue);
};

const createReportRecord = (row) => {
  const rawRegistrationDate = normalizeRawValue(
    row["Vehicle Registartion date"]
  );

  const rawFtirReportDate = normalizeRawValue(row["FTIR Report Date"]);

  const rawIncidentDate = normalizeRawValue(row["Date of Incident"]);

  const rawSubject = normalizeRawValue(row["Subject (English)"]);

  return {
    ftirNumber: normalizeRawValue(row.FTIR),
    vehicleModel: normalizeModel(row.Model),
    mileage: parseMileage(row["Mileage - Using Time"]),

    rawRegistrationDate,
    registrationDate: parseDateValue(rawRegistrationDate),

    rawFtirReportDate,
    ftirReportDate: parseDateValue(rawFtirReportDate),

    rawIncidentDate,
    incidentDate: parseDateValue(rawIncidentDate),

    rawSubject,
    cleanedSubject: rawSubject ? normalizeSubject(rawSubject) : "",

    sourceType: "COMPANY",
    processingStatus: "PREPROCESSED"
  };
};

export const parseFtirCsv = (csvText) => {
  const rows = parse(csvText, {
    bom: true,
    columns: (headers) => headers.map((header) => header.trim()),
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  const validReports = [];
  const failedRows = [];
  const duplicateRows = [];
  const seenFtirNumbers = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const reportRecord = createReportRecord(row);

    const validation = reportImportSchema.safeParse(reportRecord);

    if (!validation.success) {
      failedRows.push({
        rowNumber,
        ftirNumber: reportRecord.ftirNumber,
        reason: validation.error.issues.map((issue) => issue.message).join(" ")
      });

      return;
    }

    if (seenFtirNumbers.has(validation.data.ftirNumber)) {
      duplicateRows.push({
        rowNumber,
        ftirNumber: validation.data.ftirNumber,
        reason: "Duplicate FTIR number inside uploaded CSV."
      });

      return;
    }

    seenFtirNumbers.add(validation.data.ftirNumber);
    validReports.push(validation.data);
  });

  return {
    totalRows: rows.length,
    validReports,
    failedRows,
    duplicateRows
  };
};