import { addAlert, addAnomaly } from "../core/vehicleState.js";

const ECU_NAME = "STEERING_ECU";

export const createSteeringEcu = ({ canBus, clock, vehicleState, logger }) => {
  const handleMessage = (message) => {
    if (
      message.targetEcu !== ECU_NAME ||
      message.messageType !== "STEERING_STATE_OVERRIDE" ||
      !message.isAnomalous
    ) {
      return;
    }

    vehicleState.ecus.STEERING_ECU.status = "AFFECTED";
    vehicleState.ecus.STEERING_ECU.steeringAvailable = false;

    addAnomaly(vehicleState, {
      source: ECU_NAME,
      type: "UNAUTHORISED_STEERING_STATE_EVENT",
      severity: "CRITICAL",
      message: "Steering ECU received an unauthorised virtual state-override event.",
    });

    addAlert(vehicleState, {
      source: ECU_NAME,
      level: "CRITICAL",
      message: "Virtual steering availability was reduced after an anomalous network event.",
    });

    logger.log({
      timeMs: clock.timeMs,
      eventType: "STEERING_ECU_AFFECTED",
      sourceEcu: ECU_NAME,
      message: "Steering ECU changed to AFFECTED state after an anomalous virtual message.",
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
      messageType: "STEERING_STATUS",
      priority: "CRITICAL",
      data: {
        status: vehicleState.ecus.STEERING_ECU.status,
        steeringAngle: vehicleState.ecus.STEERING_ECU.steeringAngle,
        steeringAvailable: vehicleState.ecus.STEERING_ECU.steeringAvailable,
      },
    });
  };

  return {
    name: ECU_NAME,
    tick,
    dispose: unsubscribe,
  };
};