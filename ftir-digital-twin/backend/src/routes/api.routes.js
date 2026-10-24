import { Router } from "express";

import prisma from "../config/database.js";
import ftirRoutes from "../modules/ftir/ftir.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FTIR Digital Twin backend is running",
    timestamp: new Date().toISOString()
  });
});

router.get("/health/database", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Neon PostgreSQL database is connected"
    });
  } catch (error) {
    next(error);
  }
});

router.use("/ftir", ftirRoutes);

export default router;