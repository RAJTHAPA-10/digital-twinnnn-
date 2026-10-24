import { addAlert, addAnomaly } from "../core/vehicleState.js";

const ECU_NAME = "ADAS_ECU";

export const createAdasEcu = ({ canBus, clock, vehicleState, logger }) => {
  const raiseWarning = ({ type, severity, message, sourceEcu, messageId }) => {
    const isAlreadyAffected = vehicleState.ecus.ADAS_ECU.status === "AFFECTED";

    vehicleState.ecus.ADAS_ECU.status = "AFFECTED";
    vehicleState.ecus.ADAS_ECU.warningLevel = severity;

    if (!isAlreadyAffected) {
      addAnomaly(vehicleState, {
        source: ECU_NAME,
        type,
        severity,
        message,
      });

      addAlert(vehicleState, {
        source: ECU_NAME,
        level: severity,
        message,
      });

      logger.log({
        timeMs: clock.timeMs,
        eventType: "ADAS_WARNING_RAISED",
        sourceEcu,
        targetEcu: ECU_NAME,
        message,
        severity,
        isAnomalous: true,
        data: {
          messageId,
          warningType: type,
        },
      });
    }
  };

  const handleMessage = (message) => {
    if (message.messageType === "GPS_POSITION" && message.isAnomalous) {
      raiseWarning({
        type: "UNTRUSTED_NAVIGATION_CONTEXT",
        severity: "HIGH",
        message: "ADAS received untrusted virtual GPS information and raised a navigation-context warning.",
        sourceEcu: message.sourceEcu,
        messageId: message.messageId,
      });
    }

    if (message.messageType === "SENSOR_READING" && message.isAnomalous) {
      raiseWarning({
        type: "SENSOR_DATA_INCONSISTENCY",
        severity: "HIGH",
        message: "ADAS received anomalous virtual sensor information and raised a driver-assistance warning.",
        sourceEcu: message.sourceEcu,
        messageId: message.messageId,
      });
    }
  };

  const unsubscribe = canBus.subscribe(ECU_NAME, handleMessage);

  const tick = () => {
    if (clock.timeMs % 500 !== 0) {
      return;
    }

    canBus.transmit({
      sourceEcu: ECU_NAME,
      messageType: "ADAS_WARNING",
      priority: "HIGH",
      data: {
        status: vehicleState.ecus.ADAS_ECU.status,
        warningLevel: vehicleState.ecus.ADAS_ECU.warningLevel,
        assistanceAvailable: vehicleState.ecus.ADAS_ECU.assistanceAvailable,
      },
      isAnomalous: vehicleState.ecus.ADAS_ECU.status === "AFFECTED",
      anomalyReason:
        vehicleState.ecus.ADAS_ECU.status === "AFFECTED"
          ? "ADAS is operating with a virtual safety warning."
          : null,
    });
  };

  return {
    name: ECU_NAME,
    tick,
    dispose: unsubscribe,
  };
};