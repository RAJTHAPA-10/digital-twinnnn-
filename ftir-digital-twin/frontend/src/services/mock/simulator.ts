import type { EventSeverity, ScenarioType, SimEvent, SimulationResult, VehicleState } from "../../types/api";
import { FIXTURES } from "./fixtures";

// Produces events in the SAME shape as the backend digital twin (see backend/src/modules/digitalTwin).
const ECUS = ["ENGINE_ECU", "BRAKE_ECU", "STEERING_ECU", "GPS_ECU", "ADAS_ECU"] as const;

const STATUS_TYPE: Record<(typeof ECUS)[number], string> = {
  ENGINE_ECU: "ENGINE_STATUS",
  BRAKE_ECU: "BRAKE_STATUS",
  STEERING_ECU: "STEERING_STATUS",
  GPS_ECU: "GPS_POSITION",
  ADAS_ECU: "ADAS_WARNING",
};

const SCENARIO_NAMES: Record<ScenarioType, string> = {
  GPS_SPOOFING: "GPS spoofing",
  CAN_MESSAGE_INJECTION: "CAN message injection",
  REPLAY_ATTACK: "Replay attack",
  DENIAL_OF_SERVICE: "Denial of service",
  SENSOR_SPOOFING: "Sensor spoofing",
};

export function simulate(scenarioType: ScenarioType, durationMs: number, tickIntervalMs: number): SimulationResult {
  const events: SimEvent[] = [];
  let seq = 0;
  let msg = 0;
  const attackAt = Math.round(durationMs / 2 / tickIntervalMs) * tickIntervalMs;

  const ecuData: Record<string, Record<string, unknown>> = {
    ENGINE_ECU: { status: "NORMAL", rpm: 1800, powerAvailable: true },
    BRAKE_ECU: { status: "NORMAL", brakePressure: 0, safetyAvailable: true },
    STEERING_ECU: { status: "NORMAL", steeringAngle: 0, steeringAvailable: true },
    GPS_ECU: { status: "NORMAL", routePositionKm: 12.4, trustScore: 1, navigationTrusted: true },
    ADAS_ECU: { status: "NORMAL", warningLevel: "NONE", assistanceAvailable: true },
  };

  const push = (e: Omit<SimEvent, "sequence">) => events.push({ ...e, sequence: ++seq });

  const transmit = (
    timeMs: number,
    source: string,
    target: string | null,
    messageType: string,
    data: Record<string, unknown>,
    anomalous: boolean,
    severity: EventSeverity,
    anomalyReason: string | null = null,
    delayed = false,
  ) => {
    msg += 1;
    const messageId = `virtual-can-${msg}`;
    const payload = {
      messageId, timestampMs: timeMs, sourceEcu: source, targetEcu: target, messageType,
      priority: anomalous ? "HIGH" : "NORMAL", data, isAnomalous: anomalous, anomalyReason,
      delivery: delayed ? "DELAYED" : "DELIVERED", delayedByMs: delayed ? 100 : 0,
    };
    if (delayed) {
      push({ timeMs, eventType: "CAN_MESSAGE_DELAYED", sourceEcu: source, targetEcu: target,
        message: `${messageType} was delayed by 100 ms in the virtual CAN Bus.`, severity: "MEDIUM", isAnomalous: true, data: payload });
    }
    push({ timeMs, eventType: "CAN_MESSAGE_TRANSMITTED", sourceEcu: source, targetEcu: target,
      message: `${source} transmitted ${messageType}.`, severity, isAnomalous: anomalous, data: payload });
    const receivers = target ? [target] : ECUS.filter((e) => e !== source);
    receivers.forEach((r) =>
      push({ timeMs, eventType: "CAN_MESSAGE_DELIVERED", sourceEcu: source, targetEcu: r,
        message: `${messageType} was delivered to ${r}.`, severity: "INFO", isAnomalous: anomalous, data: { messageId, messageType } }),
    );
    return messageId;
  };

  push({ timeMs: 0, eventType: "SIMULATION_STARTED", sourceEcu: "SIMULATION_ENGINE", targetEcu: null,
    message: `Virtual simulation started for ${scenarioType}.`, severity: "INFO", isAnomalous: false,
    data: { scenarioType, durationMs, tickIntervalMs } });

  for (let t = tickIntervalMs; t <= durationMs; t += tickIntervalMs) {
    if (t % 500 === 0) {
      ECUS.forEach((ecu) => {
        const affected = ecuData[ecu].status === "AFFECTED";
        transmit(t, ecu, null, STATUS_TYPE[ecu], { ...ecuData[ecu] }, affected, affected ? "HIGH" : "INFO",
          affected ? `${ecu} is operating in an affected state.` : null);
      });
    }

    if (t === attackAt) {
      const activate = (target: string, severity: EventSeverity, data: Record<string, unknown>, label: string) =>
        push({ timeMs: t, eventType: "SCENARIO_ACTIVATED", sourceEcu: "SCENARIO_ENGINE", targetEcu: target,
          message: `${label} scenario activated in the isolated digital twin.`, severity, isAnomalous: true, data: { scenario: scenarioType, ...data } });

      if (scenarioType === "GPS_SPOOFING") {
        activate("GPS_ECU", "HIGH", { spoofedRoutePositionKm: 999.9 }, "GPS spoofing");
        const id = transmit(t, "SCENARIO_ENGINE", "GPS_ECU", "GPS_LOCATION_UPDATE", { virtualRoutePositionKm: 999.9, scenario: scenarioType }, true, "HIGH", "Spoofed virtual GPS location update.");
        push({ timeMs: t, eventType: "GPS_ECU_AFFECTED", sourceEcu: "GPS_ECU", targetEcu: null, message: "GPS ECU marked navigation data as untrusted after an anomalous location update.", severity: "HIGH", isAnomalous: true, data: { messageId: id, trustScore: 0.2 } });
        push({ timeMs: t, eventType: "ADAS_WARNING_RAISED", sourceEcu: "GPS_ECU", targetEcu: "ADAS_ECU", message: "ADAS raised a warning after receiving untrusted navigation data.", severity: "HIGH", isAnomalous: true, data: { messageId: id } });
        Object.assign(ecuData.GPS_ECU, { status: "AFFECTED", routePositionKm: 999.9, trustScore: 0.2, navigationTrusted: false });
        Object.assign(ecuData.ADAS_ECU, { status: "AFFECTED", warningLevel: "HIGH" });
      } else if (scenarioType === "CAN_MESSAGE_INJECTION") {
        activate("STEERING_ECU", "CRITICAL", { requestedSteeringAngle: 35 }, "CAN message-injection");
        const id = transmit(t, "SCENARIO_ENGINE", "STEERING_ECU", "STEERING_STATE_OVERRIDE", { requestedSteeringAngle: 35, scenario: scenarioType }, true, "CRITICAL", "Unauthorised steering override.");
        push({ timeMs: t, eventType: "STEERING_ECU_AFFECTED", sourceEcu: "STEERING_ECU", targetEcu: null, message: "Steering ECU changed to AFFECTED state after an anomalous virtual message.", severity: "CRITICAL", isAnomalous: true, data: { messageId: id } });
        Object.assign(ecuData.STEERING_ECU, { status: "AFFECTED", steeringAvailable: false });
      } else if (scenarioType === "REPLAY_ATTACK") {
        activate("BRAKE_ECU", "CRITICAL", {}, "Replay-attack");
        const id = transmit(t, "REPLAY_BUFFER", "BRAKE_ECU", "BRAKE_STATE_OVERRIDE", { replayed: true, originalSourceEcu: "BRAKE_ECU", scenario: scenarioType }, true, "HIGH", "Previously recorded virtual brake-state message replayed inside the digital twin.");
        push({ timeMs: t, eventType: "BRAKE_ECU_AFFECTED", sourceEcu: "BRAKE_ECU", targetEcu: null, message: "Brake ECU changed to AFFECTED state after an anomalous virtual message.", severity: "CRITICAL", isAnomalous: true, data: { messageId: id } });
        Object.assign(ecuData.BRAKE_ECU, { status: "AFFECTED" });
      } else if (scenarioType === "SENSOR_SPOOFING") {
        activate("ADAS_ECU", "HIGH", { spoofedObstacleDistanceM: 1.2 }, "Sensor spoofing");
        const id = transmit(t, "VIRTUAL_SENSOR_ECU", null, "SENSOR_READING", { sensorType: "VIRTUAL_PROXIMITY_SENSOR", obstacleDistanceM: 1.2, scenario: scenarioType }, true, "HIGH", "Controlled inconsistent sensor reading generated inside the digital twin.");
        push({ timeMs: t, eventType: "ADAS_WARNING_RAISED", sourceEcu: "VIRTUAL_SENSOR_ECU", targetEcu: "ADAS_ECU", message: "ADAS received anomalous virtual sensor information and raised a driver-assistance warning.", severity: "HIGH", isAnomalous: true, data: { messageId: id, warningType: "SENSOR_DATA_INCONSISTENCY" } });
        Object.assign(ecuData.ADAS_ECU, { status: "AFFECTED", warningLevel: "HIGH" });
      } else {
        activate("ADAS_ECU", "HIGH", { attackDurationMs: 2000, messagesPerTick: 5 }, "Denial-of-service");
      }
    }

    if (scenarioType === "DENIAL_OF_SERVICE" && t >= attackAt && t < attackAt + 2000) {
      for (let burst = 1; burst <= 5; burst += 1) {
        transmit(t, "VIRTUAL_FLOOD_SOURCE", "ADAS_ECU", "DIAGNOSTIC_STATUS", { scenario: scenarioType, burstIndex: burst }, true, "HIGH", "Virtual flood traffic.", true);
      }
      if (t + tickIntervalMs >= attackAt + 2000) {
        push({ timeMs: t, eventType: "SCENARIO_COMPLETED", sourceEcu: "SCENARIO_ENGINE", targetEcu: "ADAS_ECU", message: "Denial-of-service scenario completed.", severity: "INFO", isAnomalous: false, data: { scenario: scenarioType } });
      }
    }
  }

  push({ timeMs: durationMs, eventType: "SIMULATION_COMPLETED", sourceEcu: "SIMULATION_ENGINE", targetEcu: null,
    message: `Virtual simulation completed for ${scenarioType}.`, severity: "INFO", isAnomalous: false, data: { scenarioType } });

  const anomalies = events.filter((e) => e.isAnomalous);
  const severityCounts: Record<EventSeverity, number> = { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  events.forEach((e) => (severityCounts[e.severity] += 1));

  const finalState: VehicleState = structuredClone(FIXTURES[scenarioType].finalState);
  finalState.simulation = { tick: durationMs / tickIntervalMs, timeMs: durationMs, status: "COMPLETED" };

  return {
    scenarioType,
    scenarioName: SCENARIO_NAMES[scenarioType],
    clock: { tick: durationMs / tickIntervalMs, timeMs: durationMs, durationMs, tickIntervalMs, progressPercentage: 100, isComplete: true },
    vehicleState: finalState,
    events,
    anomalies,
    summary: {
      totalEvents: events.length,
      anomalyCount: anomalies.length,
      severityCounts,
      firstEventTimeMs: 0,
      lastEventTimeMs: durationMs,
    },
  };
}
