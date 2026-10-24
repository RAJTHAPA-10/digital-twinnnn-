import { createScenario, isSupportedScenarioType } from "./core/scenarioRegistry.js";
import { SimulationLogger } from "./core/simulationLogger.js";
import {
  createInitialVehicleState,
  getVehicleSnapshot,
} from "./core/vehicleState.js";
import { VirtualCanBus } from "./core/virtualCanBus.js";
import { VirtualClock } from "./core/virtualClock.js";
import { createAdasEcu } from "./ecus/adasEcu.js";
import { createBrakeEcu } from "./ecus/brakeEcu.js";
import { createEngineEcu } from "./ecus/engineEcu.js";
import { createGpsEcu } from "./ecus/gpsEcu.js";
import { createSteeringEcu } from "./ecus/steeringEcu.js";

export class SimulationEngine {
  constructor({
    scenarioType,
    durationMs = 10_000,
    tickIntervalMs = 100,
    scenarioConfig = {},
  }) {
    if (!isSupportedScenarioType(scenarioType)) {
      throw new Error(`Unsupported simulation scenario: ${scenarioType}.`);
    }

    this.scenarioType = scenarioType;
    this.vehicleState = createInitialVehicleState();
    this.logger = new SimulationLogger();
    this.clock = new VirtualClock({ durationMs, tickIntervalMs });
    this.canBus = new VirtualCanBus({
      clock: this.clock,
      vehicleState: this.vehicleState,
      logger: this.logger,
    });

    const dependencies = {
      canBus: this.canBus,
      clock: this.clock,
      vehicleState: this.vehicleState,
      logger: this.logger,
    };

    this.ecus = [
      createEngineEcu(dependencies),
      createBrakeEcu(dependencies),
      createSteeringEcu(dependencies),
      createGpsEcu(dependencies),
      createAdasEcu(dependencies),
    ];

    this.scenario = createScenario({
      scenarioType,
      ...dependencies,
      config: scenarioConfig,
    });
  }

  run() {
    if (this.vehicleState.simulation.status === "COMPLETED") {
      return this.getResult();
    }

    this.vehicleState.simulation.status = "RUNNING";

    this.logger.log({
      timeMs: this.clock.timeMs,
      eventType: "SIMULATION_STARTED",
      sourceEcu: "SIMULATION_ENGINE",
      message: `Virtual simulation started for ${this.scenarioType}.`,
      severity: "INFO",
      data: {
        scenarioType: this.scenarioType,
        durationMs: this.clock.durationMs,
        tickIntervalMs: this.clock.tickIntervalMs,
      },
    });

    while (!this.clock.isComplete()) {
      const clockSnapshot = this.clock.advance();
      this.vehicleState.simulation.tick = clockSnapshot.tick;
      this.vehicleState.simulation.timeMs = clockSnapshot.timeMs;

      for (const ecu of this.ecus) {
        ecu.tick();
      }

      this.scenario.tick();
    }

    this.vehicleState.simulation.status = "COMPLETED";

    this.logger.log({
      timeMs: this.clock.timeMs,
      eventType: "SIMULATION_COMPLETED",
      sourceEcu: "SIMULATION_ENGINE",
      message: `Virtual simulation completed for ${this.scenarioType}.`,
      severity: "INFO",
      data: {
        scenarioType: this.scenarioType,
        loggerSummary: this.logger.getSummary(),
      },
    });

    return this.getResult();
  }

  getResult() {
    return {
      scenarioType: this.scenarioType,
      scenarioName: this.scenario.name,
      clock: this.clock.getSnapshot(),
      vehicleState: getVehicleSnapshot(this.vehicleState),
      events: this.logger.getEvents(),
      anomalies: this.logger.getAnomalies(),
      summary: this.logger.getSummary(),
    };
  }

  dispose() {
    for (const ecu of this.ecus) {
      ecu.dispose();
    }
  }
}

export const runSimulation = (options) => {
  const engine = new SimulationEngine(options);

  try {
    return engine.run();
  } finally {
    engine.dispose();
  }
};