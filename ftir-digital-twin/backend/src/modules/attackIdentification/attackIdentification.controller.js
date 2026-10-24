import {
  getAttackIdentificationSummary,
  getAttackProfileByReportId,
  listAttackProfiles,
  runAllAttackIdentification,
  runAttackIdentificationBatch,
} from "./attackIdentification.service.js";

const positiveInteger = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const runAttackBatch = async (req, res, next) => {
  try {
    const batchSize = positiveInteger(req.body?.batchSize ?? req.query.batchSize);
    if (batchSize === null) return res.status(400).json({ success: false, message: "batchSize must be a positive integer." });
    return res.status(200).json({ success: true, data: await runAttackIdentificationBatch(batchSize) });
  } catch (error) { return next(error); }
};

export const runAllAttackProfiles = async (req, res, next) => {
  try {
    const batchSize = positiveInteger(req.body?.batchSize ?? req.query.batchSize);
    if (batchSize === null) return res.status(400).json({ success: false, message: "batchSize must be a positive integer." });
    return res.status(200).json({ success: true, data: await runAllAttackIdentification(batchSize) });
  } catch (error) { return next(error); }
};

export const getAttackSummary = async (req, res, next) => {
  try { return res.status(200).json({ success: true, data: await getAttackIdentificationSummary() }); }
  catch (error) { return next(error); }
};

export const getProfiles = (identificationStatus) => async (req, res, next) => {
  try {
    const page = positiveInteger(req.query.page);
    const limit = positiveInteger(req.query.limit);
    if (page === null || limit === null) return res.status(400).json({ success: false, message: "page and limit must be positive integers." });
    return res.status(200).json({ success: true, data: await listAttackProfiles({ identificationStatus, page, limit }) });
  } catch (error) { return next(error); }
};

export const getProfileByReportId = async (req, res, next) => {
  try { return res.status(200).json({ success: true, data: await getAttackProfileByReportId(req.params.reportId) }); }
  catch (error) { return next(error); }
};