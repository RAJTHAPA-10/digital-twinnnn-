

const ATTACK_NAMES = {
  GPS_SPOOFING: "GPS spoofing (fake location signals)",
  CAN_MESSAGE_INJECTION: "CAN message injection (fake commands sent on the car's internal network)",
  REPLAY_ATTACK: "Replay attack (old valid messages sent again at the wrong time)",
  DENIAL_OF_SERVICE: "Denial of service (the car's internal network is flooded with messages)",
  SENSOR_SPOOFING: "Sensor spoofing (sensors are fed fake readings)",
  UNCLASSIFIED: "Unclassified cyber incident",
};

const partName = (code) =>
  String(code)
    .toLowerCase()
    .split("_")
    .map((word) => (["ecu", "can", "gps", "adas"].includes(word) ? word.toUpperCase() : word))
    .join(" ")
    .replace(/^\w/, (first) => first.toUpperCase());

const percent = (score) => (typeof score === "number" ? Math.round(score * 100) : null);
const day = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);
const round = (value, digits = 1) => (typeof value === "number" ? Number(value.toFixed(digits)) : null);

const summariseRealWorld = (realWorld) => {
  const rows = realWorld?.attacked?.telemetry;
  if (!rows?.length) return null;
  const last = rows[rows.length - 1];
  const obstacle = rows.map((row) => row.obstacleDistanceM).filter((d) => d !== null && d !== undefined);
  return {
    attackReachedCarAtSecond: realWorld.attacked.attackAtMs !== null ? round(realWorld.attacked.attackAtMs / 1000) : null,
    driverStartsReactingAtSecond: realWorld.attacked.driverReactsAtMs !== null ? round(realWorld.attacked.driverReactsAtMs / 1000) : null,
    normalSpeedKph: round(realWorld.normal.telemetry[0]?.speedKph, 0),
    lowestSpeedKph: round(Math.min(...rows.map((row) => row.speedKph)), 0),
    furthestFromLaneCentreMetres: round(Math.max(...rows.map((row) => Math.abs(row.y))), 2),
    crossedLaneLine: rows.some((row) => Math.abs(row.y) > 0.85),
    closestDistanceToStoppedCarMetres: obstacle.length ? round(Math.min(...obstacle)) : null,
    mapShowedKm: last.gpsShownKm !== last.gpsRealKm ? round(last.gpsShownKm) : null,
    realPositionKm: last.gpsShownKm !== last.gpsRealKm ? round(last.gpsRealKm, 2) : null,
  };
};

export const buildPipelineData = ({ impactRecord, simulationRun, incidentContext, recommendationResult }) => {
  const analysis = impactRecord.analysis;
  const incident = incidentContext;
  const attack = incident?.identifiedAttack;

  const simulationEvents = simulationRun
    ? [...new Set(
        simulationRun.result.events
          .filter((event) => event.isAnomalous && !event.eventType.startsWith("CAN_MESSAGE"))
          .map((event) => event.message),
      )].slice(0, 12)
    : [];

  return {
    isManualTestRun: !incident,

    step1_ftir: incident
      ? {
          ftirNumber: incident.ftirNumber,
          vehicleModel: incident.vehicleModel,
          mileageKm: incident.mileage ?? null,
          incidentDate: day(incident.incidentDate),
          reportDate: day(incident.ftirReportDate),
          reportedProblem: incident.subject,
        }
      : null,

    step2_classification: incident?.classification
      ? {
          decision: incident.classification.label === "CYBERSECURITY" ? "Cybersecurity incident" : "Not a cybersecurity incident",
          confidencePercent: percent(incident.classification.confidenceScore),
          reason: incident.classification.reason,
          neededHumanReview: incident.classification.reviewRequired,
        }
      : null,

    step3_attack: attack
      ? {
          attackType: ATTACK_NAMES[attack.code] ?? attack.name,
          confidencePercent: percent(attack.confidenceScore),
          rootCause: attack.rootCause,
          description: attack.description,
        }
      : null,

    step4_simulation: simulationRun
      ? {
          simulatedAttack: ATTACK_NAMES[simulationRun.input.scenarioType],
          durationSeconds: simulationRun.input.durationMs / 1000,
          whatWasObserved: simulationEvents,
          carOnTheRoad: summariseRealWorld(simulationRun.result.realWorld),
        }
      : null,

    step5_impact: {
      severity: analysis.severity,
      severityScoreOutOf10: analysis.severityScore,
      whySoSerious: analysis.severityReasons ?? [],
      partsDirectlyAttacked: (analysis.directlyTargetedEcus ?? []).map(partName),
      partsAffected: (analysis.affectedEcus ?? []).map(partName),
      howTheAttackSpread: (analysis.propagationPath ?? []).map(partName).join(" -> "),
      effectOnTheCar: analysis.vehicleImpact ?? [],
      effectOnTheNetwork: analysis.networkImpact ?? [],
    },

    step6_actions: {
      mainWeakness: recommendationResult.summary ?? null,
      recommendations: recommendationResult.recommendations.map((rec) => ({
        title: rec.title,
        priority: rec.priority,
        whatToDo: rec.description,
        why: rec.rationale ?? null,
      })),
    },
  };
};