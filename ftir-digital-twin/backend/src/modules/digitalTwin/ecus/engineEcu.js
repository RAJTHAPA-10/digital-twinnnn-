import { addAlert, addAnomaly } from "../core/vehicleState.js";

const ECU_NAME = "ENGINE_ECU";

export const createEngineEcu = ({ canBus, clock, vehicleState, logger }) => {
  const handleMessage = (message) => {
    if (
      message.targetEcu !== ECU_NAME ||
      message.messageType !== "ENGINE_STATE_OVERRIDE" ||
      !message.isAnomalous
    ) {
      return;
    }

    vehicleState.ecus.ENGINE_ECU.status = "AFFECTED";
    vehicleState.ecus.ENGINE_ECU.powerAvailable = false;

    addAnomaly(vehicleState, {
      source: ECU_NAME,
      type: "UNAUTHORISED_ENGINE_STATE_EVENT",
      severity: "HIGH",
      message: "Engine ECU received an unauthorised virtual state-override event.",
    });

    addAlert(vehicleState, {
      source: ECU_NAME,
      level: "HIGH",
      message: "Virtual engine power availability was reduced after an anomalous network event.",
    });

    logger.log({
      timeMs: clock.timeMs,
      eventType: "ENGINE_ECU_AFFECTED",
      sourceEcu: ECU_NAME,
      message: "Engine ECU changed to AFFECTED state after an anomalous virtual message.",
      severity: "HIGH",
      isAnomalous: true,
      data: {
        messageId: message.messageId,
      },
    });
  };

  const unsubscribe = canBus.subscribe(ECU_NAME, handleMessage);

  const tick = () => {
    if (clock.timeMs % 500 !== 0) {
      return;
    }

    canBus.transmit({
      sourceEcu: ECU_NAME,
      messageType: "ENGINE_STATUS",
      priority: "HIGH",
      data: {
        status: vehicleState.ecus.ENGINE_ECU.status,
        rpm: vehicleState.ecus.ENGINE_ECU.rpm,
        powerAvailable: vehicleState.ecus.ENGINE_ECU.powerAvailable,
      },
    });
  };

  return {
    name: ECU_NAME,
    tick,
    dispose: unsubscribe,
  };
};