import { addAlert, addAnomaly } from "../core/vehicleState.js";

const SCENARIO_NAME = "REPLAY_ATTACK";

export const createReplayAttackScenario = ({
  canBus,
  clock,
  vehicleState,
  logger,
  config = {},
}) => {
  const attackStartMs = config.attackStartMs ?? 5_000;
  let activated = false;

  const tick = () => {
    if (activated || clock.timeMs < attackStartMs) {
      return;
    }

    activated = true;

    vehicleState.network.replayedMessageCount += 1;
    vehicleState.network.unauthorisedMessageCount += 1;
    vehicleState.ecus.BRAKE_ECU.directlyTargeted = true;

    addAnomaly(vehicleState, {
      source: "SCENARIO_ENGINE",
      type: "REPLAYED_BRAKE_STATE_MESSAGE",
      severity: "CRITICAL",
      message: "A previously recorded virtual brake-state message was replayed.",
    });

    addAlert(vehicleState, {
      source: "SCENARIO_ENGINE",
      level: "CRITICAL",
      message: "Virtual CAN replay activity targeted the Brake ECU.",
    });

    logger.log({
      timeMs: clock.timeMs,
      eventType: "SCENARIO_ACTIVATED",
      sourceEcu: "SCENARIO_ENGINE",
      targetEcu: "BRAKE_ECU",
      message: "Replay-attack scenario activated in the isolated digital twin.",
      severity: "CRITICAL",
      isAnomalous: true,
      data: {
        scenario: SCENARIO_NAME,
      },
    });

    canBus.transmit({
      sourceEcu: "REPLAY_BUFFER",
      targetEcu: "BRAKE_ECU",
      messageType: "BRAKE_STATE_OVERRIDE",
      priority: "CRITICAL",
      isAnomalous: true,
      anomalyReason:
        "Previously recorded virtual brake-state message replayed inside the digital twin.",
      data: {
        replayed: true,
        originalSourceEcu: "BRAKE_ECU",
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