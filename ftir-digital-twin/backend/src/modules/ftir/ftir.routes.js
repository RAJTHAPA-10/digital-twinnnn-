import { Router } from "express";

import upload from "./ftir.upload.js";
import {
  getFtirStats,
  getSingleReport,
  listReports,
  uploadFtirCsv
} from "./ftir.controller.js";

const router = Router();

router.get("/", listReports);

router.get("/stats/summary", getFtirStats);

router.get("/:ftirNumber", getSingleReport);

router.post("/upload", upload.single("file"), uploadFtirCsv);

export default router;