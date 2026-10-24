import { analyzePropagationPath } from "./propagationAnalyzer.js";
import { assessSeverity } from "./severityRules.js";

const getAffectedEcus = (ecus = {}) =>
  Object.entries(ecus)
    .filter(([, ecu]) => ecu?.status === "AFFECTED")
    .map(([ecuName]) => ecuName);

const getVehicleImpact = (vehicleState) => {
  const impacts = [];
  const { ecus = {}, sensors = {}, network = {} } = vehicleState;

  if (ecus.BRAKE_ECU?.safetyAvailable === false) {
    impacts.push("Virtual brake safety availability was reduced.");
  }
  if (ecus.STEERING_ECU?.steeringAvailable === false) {
    impacts.push("Virtual steering availability was reduced.");
  }
  if (ecus.GPS_ECU?.navigationTrusted === false) {
    impacts.push("Virtual navigation information became untrusted.");
  }
  if (sensors.sensorTrusted === false) {
    impacts.push("Virtual sensor information became untrusted.");
  }
  if (ecus.ADAS_ECU?.status === "AFFECTED") {
    impacts.push(`ADAS raised a ${ecus.ADAS_ECU.warningLevel.toLowerCase()} driver-assistance warning.`);
  }
  if (network.delayedMessageCount > 0) {
    impacts.push("Virtual CAN communication experienced message delays.");
  }
  if (network.droppedMessageCount > 0) {
    impacts.push("Virtual CAN communication experienced dropped messages.");
  }

  return impacts.length > 0
    ? impacts
    : ["No significant adverse vehicle-state change was detected."];
};

const getNetworkImpact = (network = {}) => {
  const impacts = [];

  if (network.healthScore < 100) {
    impacts.push(`Virtual CAN-bus health decreased to ${network.healthScore}.`);
  }
  if (network.delayedMessageCount > 0) {
    impacts.push(`${network.delayedMessageCount} virtual CAN message(s) were delayed.`);
  }
  if (network.droppedMessageCount > 0) {
    impacts.push(`${network.droppedMessageCount} virtual CAN message(s) were dropped.`);
  }
  if (network.replayedMessageCount > 0) {
    impacts.push(`${network.replayedMessageCount} virtual CAN message(s) were replayed.`);
  }
  if (network.unauthorisedMessageCount > 0) {
    impacts.push(`${network.unauthorisedMessageCount} unauthorised virtual CAN message(s) were detected.`);
  }

  return impacts.length > 0
    ? impacts
    : ["Virtual CAN bus remained operational with no recorded degradation."];
};

export const analyzeSimulationImpact = (simulationResult) => {
  if (!simulationResult?.vehicleState || !simulationResult?.scenarioType) {
    throw new Error("A completed simulation result is required for impact analysis.");
  }

  const vehicleState = simulationResult.vehicleState;
  const affectedEcus = getAffectedEcus(vehicleState.ecus);
  const severityAssessment = assessSeverity(simulationResult);
  const propagation = analyzePropagationPath(simulationResult);

  return {
    attackType: simulationResult.scenarioType,
    affectedEcus,
    directlyTargetedEcus: Object.entries(vehicleState.ecus ?? {})
      .filter(([, ecu]) => ecu?.directlyTargeted === true)
      .map(([ecuName]) => ecuName),
    vehicleImpact: getVehicleImpact(vehicleState),
    networkImpact: getNetworkImpact(vehicleState.network),
    severity: severityAssessment.severity,
    severityScore: severityAssessment.severityScore,
    riskLevel: severityAssessment.riskLevel,
    severityReasons: severityAssessment.reasons,
    propagationPath: propagation.nodes,
    propagationLinks: propagation.links,
    propagationDisplayPath: propagation.displayPath,
    observedPropagationEvents: propagation.observedEvents,
    evidence: {
      alertCount: vehicleState.alerts?.length ?? 0,
      anomalyCount: vehicleState.anomalies?.length ?? 0,
      affectedEcuCount: affectedEcus.length,
      networkHealthScore: vehicleState.network?.healthScore ?? null,
    },
    summary: `${simulationResult.scenarioType} produced a ${severityAssessment.severity.toLowerCase()} virtual impact affecting ${affectedEcus.length} ECU(s).`,
    disclaimer:
      "This impact analysis is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation.",
  };
};