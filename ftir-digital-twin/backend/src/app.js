import express from "express";
import cors from "cors";

import apiRoutes from "./routes/api.routes.js";
import classificationRoutes from "./modules/classification/classification.routes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import attackIdentificationRoutes from "./modules/attackIdentification/attackIdentification.routes.js";
import { simulationRouter } from "./modules/digitalTwin/simulation.routes.js";
import { impactRouter } from "./modules/impactAnalysis/impact.routes.js";
import recommendationRoutes from "./modules/recommendations/recommendation.routes.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the FTIR Digital Twin API",
  });
});

app.use("/api/v1/classification", classificationRoutes);
app.use("/api/v1/attack-identification", attackIdentificationRoutes);
app.use("/api/v1", apiRoutes);
app.use("/api/simulations", simulationRouter);
app.use("/api/impact-analysis", impactRouter);
app.use("/api/recommendations", recommendationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;