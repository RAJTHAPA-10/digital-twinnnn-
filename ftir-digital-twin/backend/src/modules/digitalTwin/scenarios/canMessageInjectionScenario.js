const SCENARIO_NAME = "CAN_MESSAGE_INJECTION";

export const createCanMessageInjectionScenario = ({
  canBus,
  clock,
  vehicleState,
  logger,
  config = {},
}) => {
  const attackStartMs = config.attackStartMs ?? 5_000;
  const requestedSteeringAngle = config.requestedSteeringAngle ?? 35;
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
      targetEcu: "STEERING_ECU",
      message: "CAN message-injection scenario activated in the isolated digital twin.",
      severity: "CRITICAL",
      isAnomalous: true,
      data: {
        scenario: SCENARIO_NAME,
        requestedSteeringAngle,
      },
    });

    canBus.transmit({
      sourceEcu: "SCENARIO_ENGINE",
      targetEcu: "STEERING_ECU",
      messageType: "STEERING_STATE_OVERRIDE",
      priority: "CRITICAL",
      isAnomalous: true,
      anomalyReason:
        "Controlled unauthorised steering-state event generated inside the digital twin.",
      data: {
        requestedSteeringAngle,
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