import { Router } from "express";
import {
  getAttackSummary,
  getProfileByReportId,
  getProfiles,
  runAllAttackProfiles,
  runAttackBatch,
} from "./attackIdentification.controller.js";

const router = Router();

router.get("/summary", getAttackSummary);
router.get("/profiles", getProfiles());
router.get("/unclassified", getProfiles("UNCLASSIFIED"));
router.get("/reports/:reportId", getProfileByReportId);
router.post("/run", runAttackBatch);
router.post("/run-all", runAllAttackProfiles);

export default router;