import { Router } from "express";
import {
  classifyAllPendingReports,
  classifyNextBatch,
  getClassificationOverview,
  getCybersecurityReports,
  getNonCybersecurityReports,
} from "./classification.controller.js";

const router = Router();

router.get("/summary", getClassificationOverview);
router.get("/cybersecurity", getCybersecurityReports);
router.get("/non-cybersecurity", getNonCybersecurityReports);

router.post("/run", classifyNextBatch);
router.post("/run-all", classifyAllPendingReports);

export default router;