const SCENARIO_NAME = "GPS_SPOOFING";

export const createGpsSpoofingScenario = ({
  canBus,
  clock,
  vehicleState,
  logger,
  config = {},
}) => {
  const attackStartMs = config.attackStartMs ?? 5_000;
  const spoofedRoutePositionKm = config.spoofedRoutePositionKm ?? 999.9;
  let activated = false;

  const tick = () => {
    if (activated || clock.timeMs < attackStartMs) {
      return;
    }

    activated = true;
    vehicleState.activeScenario = SCENARIO_NAME;

    logger.log({
      timeMs: clock.timeMs,
      eventType: "SCENARIO_ACTIVATED",
      sourceEcu: "SCENARIO_ENGINE",
      targetEcu: "GPS_ECU",
      message: "GPS spoofing scenario activated in the isolated digital twin.",
      severity: "HIGH",
      isAnomalous: true,
      data: {
        scenario: SCENARIO_NAME,
        spoofedRoutePositionKm,
      },
    });

    canBus.transmit({
      sourceEcu: "SCENARIO_ENGINE",
      targetEcu: "GPS_ECU",
      messageType: "GPS_LOCATION_UPDATE",
      priority: "HIGH",
      isAnomalous: true,
      anomalyReason: "Controlled GPS spoofing event generated inside the digital twin.",
      data: {
        virtualRoutePositionKm: spoofedRoutePositionKm,
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