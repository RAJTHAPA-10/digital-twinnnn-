const SCENARIO_NAME = "SENSOR_SPOOFING";

export const createSensorSpoofingScenario = ({
  canBus,
  clock,
  vehicleState,
  logger,
  config = {},
}) => {
  const attackStartMs = config.attackStartMs ?? 5_000;
  const spoofedObstacleDistanceM = config.spoofedObstacleDistanceM ?? 1.2;
  let activated = false;

  const tick = () => {
    if (activated || clock.timeMs < attackStartMs) {
      return;
    }

    activated = true;

    vehicleState.sensors.frontObstacleDistanceM = spoofedObstacleDistanceM;
    vehicleState.sensors.sensorTrusted = false;

    logger.log({
      timeMs: clock.timeMs,
      eventType: "SCENARIO_ACTIVATED",
      sourceEcu: "SCENARIO_ENGINE",
      targetEcu: "ADAS_ECU",
      message: "Sensor spoofing scenario activated in the isolated digital twin.",
      severity: "HIGH",
      isAnomalous: true,
      data: {
        scenario: SCENARIO_NAME,
        spoofedObstacleDistanceM,
      },
    });

    canBus.transmit({
      sourceEcu: "VIRTUAL_SENSOR_ECU",
      messageType: "SENSOR_READING",
      priority: "HIGH",
      isAnomalous: true,
      anomalyReason:
        "Controlled inconsistent sensor reading generated inside the digital twin.",
      data: {
        sensorType: "VIRTUAL_PROXIMITY_SENSOR",
        obstacleDistanceM: spoofedObstacleDistanceM,
        scenario: SCENARIO_NAME,
      },
    });
  };

  const reset = () => {
    activated = false;
  };

  return {
    name: SCENARIO_NAME,
    tick,
    reset,
  };
};