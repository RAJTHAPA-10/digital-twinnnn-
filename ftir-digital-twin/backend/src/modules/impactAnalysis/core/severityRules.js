const severityProfiles = {
  LOW: { score: 2, riskLevel: "LOW" },
  MEDIUM: { score: 5, riskLevel: "MEDIUM" },
  HIGH: { score: 7, riskLevel: "HIGH" },
  CRITICAL: { score: 10, riskLevel: "CRITICAL" },
};

const createAssessment = (severity, reasons) => ({
  severity,
  severityScore: severityProfiles[severity].score,
  riskLevel: severityProfiles[severity].riskLevel,
  reasons,
});

export const assessSeverity = (simulationResult) => {
  const vehicleState = simulationResult?.vehicleState ?? {};
  const ecus = vehicleState.ecus ?? {};
  const network = vehicleState.network ?? {};
  const sensors = vehicleState.sensors ?? {};

  const brakeSafetyUnavailable = ecus.BRAKE_ECU?.safetyAvailable === false;
  const steeringUnavailable = ecus.STEERING_ECU?.steeringAvailable === false;
  const gpsUntrusted = ecus.GPS_ECU?.navigationTrusted === false;
  const adasAffected = ecus.ADAS_ECU?.status === "AFFECTED";
  const sensorUntrusted = sensors.sensorTrusted === false;
  const networkCongested =
    Number(network.healthScore ?? 100) < 100 &&
    Number(network.delayedMessageCount ?? 0) > 0;
  const affectedEcuCount = Object.values(ecus).filter(
    (ecu) => ecu?.status === "AFFECTED",
  ).length;

  if (brakeSafetyUnavailable) {
    return createAssessment("CRITICAL", [
      "Virtual brake safety availability was reduced.",
    ]);
  }

  if (steeringUnavailable) {
    return {
      severity: "CRITICAL",
      severityScore: 9,
      riskLevel: "CRITICAL",
      reasons: ["Virtual steering availability was reduced."],
    };
  }

  if (gpsUntrusted && adasAffected) {
    return {
      severity: "HIGH",
      severityScore: 8,
      riskLevel: "HIGH",
      reasons: [
        "Virtual navigation information became untrusted.",
        "ADAS was affected by unreliable navigation context.",
      ],
    };
  }

  if (sensorUntrusted && adasAffected) {
    return createAssessment("HIGH", [
      "Virtual sensor information became untrusted.",
      "ADAS raised a warning after receiving inconsistent sensor data.",
    ]);
  }

  if (networkCongested) {
    return createAssessment("HIGH", [
      "Virtual CAN-bus health was degraded.",
      "Virtual CAN messages experienced delivery delays.",
    ]);
  }

  if (adasAffected) {
    return {
      severity: "HIGH",
      severityScore: 6,
      riskLevel: "HIGH",
      reasons: ["ADAS entered an affected state."],
    };
  }

  if (affectedEcuCount > 0) {
    return createAssessment("MEDIUM", [
      `${affectedEcuCount} virtual ECU(s) entered an affected state.`,
    ]);
  }

  return createAssessment("LOW", [
    "No significant adverse state was detected in the completed virtual simulation.",
  ]);
};

export const getSeverityProfiles = () => structuredClone(severityProfiles);