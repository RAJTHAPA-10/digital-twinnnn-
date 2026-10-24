import { Router } from "express";
import {
  createImpact,
  getImpactById,
  getImpacts,
} from "./impact.controller.js";

export const impactRouter = Router();

impactRouter.post("/", createImpact);
impactRouter.get("/", getImpacts);
impactRouter.get("/:impactId", getImpactById);