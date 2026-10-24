import { addAlert, addAnomaly } from "../core/vehicleState.js";

const ECU_NAME = "BRAKE_ECU";

export const createBrakeEcu = ({ canBus, clock, vehicleState, logger }) => {
  const handleMessage = (message) => {
    if (
      message.targetEcu !== ECU_NAME ||
      message.messageType !== "BRAKE_STATE_OVERRIDE" ||
      !message.isAnomalous
    ) {
      return;
    }

    vehicleState.ecus.BRAKE_ECU.status = "AFFECTED";
    vehicleState.ecus.BRAKE_ECU.safetyAvailable = false;

    addAnomaly(vehicleState, {
      source: ECU_NAME,
      type: "UNAUTHORISED_BRAKE_STATE_EVENT",
      severity: "CRITICAL",
      message: "Brake ECU received an unauthorised virtual state-override event.",
    });

    addAlert(vehicleState, {
      source: ECU_NAME,
      level: "CRITICAL",
      message: "Virtual brake safety availability was reduced after an anomalous network event.",
    });

    logger.log({
      timeMs: clock.timeMs,
      eventType: "BRAKE_ECU_AFFECTED",
      sourceEcu: ECU_NAME,
      message: "Brake ECU changed to AFFECTED state after an anomalous virtual message.",
      severity: "CRITICAL",
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
      messageType: "BRAKE_STATUS",
      priority: "CRITICAL",
      data: {
        status: vehicleState.ecus.BRAKE_ECU.status,
        brakePressure: vehicleState.ecus.BRAKE_ECU.brakePressure,
        safetyAvailable: vehicleState.ecus.BRAKE_ECU.safetyAvailable,
      },
    });
  };

  return {
    name: ECU_NAME,
    tick,
    dispose: unsubscribe,
  };
};