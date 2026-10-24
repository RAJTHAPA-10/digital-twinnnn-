const propagationPaths = {
  GPS_SPOOFING: ["SCENARIO_ENGINE", "GPS_ECU", "ADAS_ECU"],
  CAN_MESSAGE_INJECTION: ["SCENARIO_ENGINE", "STEERING_ECU"],
  REPLAY_ATTACK: ["REPLAY_BUFFER", "BRAKE_ECU"],
  DENIAL_OF_SERVICE: ["VIRTUAL_FLOOD_SOURCE", "VIRTUAL_CAN_BUS", "ADAS_ECU"],
  SENSOR_SPOOFING: ["VIRTUAL_SENSOR_ECU", "VIRTUAL_CAN_BUS", "ADAS_ECU"],
};

export const analyzePropagationPath = (simulationResult) => {
  const scenarioType = simulationResult?.scenarioType;
  const events = simulationResult?.events ?? [];
  const nodes = propagationPaths[scenarioType] ?? ["UNKNOWN_SOURCE"];

  const links = nodes.slice(0, -1).map((source, index) => ({
    source,
    target: nodes[index + 1],
  }));

  const observedEvents = events
    .filter((event) => event.isAnomalous)
    .filter((event) => [
      "SCENARIO_ACTIVATED",
      "CAN_MESSAGE_TRANSMITTED",
      "CAN_MESSAGE_DELIVERED",
      "GPS_ECU_AFFECTED",
      "STEERING_ECU_AFFECTED",
      "BRAKE_ECU_AFFECTED",
      "ADAS_WARNING_RAISED",
      "SCENARIO_COMPLETED",
    ].includes(event.eventType))
    .map((event) => ({
      timeMs: event.timeMs,
      eventType: event.eventType,
      sourceEcu: event.sourceEcu,
      targetEcu: event.targetEcu,
      severity: event.severity,
    }));

  return {
    nodes,
    links,
    displayPath: nodes.join(" -> "),
    observedEvents,
  };
};