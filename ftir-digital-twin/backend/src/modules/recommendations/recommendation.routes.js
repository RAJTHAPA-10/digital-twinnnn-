import express from "express";
import * as recommendationController from "./recommendation.controller.js";

const router = express.Router();

router.post("/", recommendationController.createReport);
router.get("/", recommendationController.getAllReports);
router.get("/:reportId", recommendationController.getReportById);

export default router;