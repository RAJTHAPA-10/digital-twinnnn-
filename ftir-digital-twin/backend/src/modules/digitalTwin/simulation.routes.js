import { Router } from "express";
import {
  createSimulation,
  getSimulationById,
  getSimulations,
} from "./simulation.controller.js";

export const simulationRouter = Router();

simulationRouter.post("/", createSimulation);
simulationRouter.get("/", getSimulations);
simulationRouter.get("/:runId", getSimulationById);