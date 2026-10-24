import { addAlert, addAnomaly } from "../core/vehicleState.js";

const ECU_NAME = "GPS_ECU";

export const createGpsEcu = ({ canBus, clock, vehicleState, logger }) => {
  const handleMessage = (message) => {
    if (
      message.targetEcu !== ECU_NAME ||
      message.messageType !== "GPS_LOCATION_UPDATE" ||
      !message.isAnomalous
    ) {
      return;
    }

    vehicleState.ecus.GPS_ECU.status = "AFFECTED";
    vehicleState.ecus.GPS_ECU.trustScore = 0.2;
    vehicleState.ecus.GPS_ECU.navigationTrusted = false;
    vehicleState.ecus.GPS_ECU.routePositionKm =
      message.data.virtualRoutePositionKm ??
      vehicleState.ecus.GPS_ECU.routePositionKm;

    addAnomaly(vehicleState, {
      source: ECU_NAME,
      type: "GPS_LOCATION_INCONSISTENCY",
      severity: "HIGH",
      message: "GPS ECU received an inconsistent virtual location update.",
    });

    addAlert(vehicleState, {
      source: ECU_NAME,
      level: "HIGH",
      message: "Virtual navigation information is no longer trusted.",
    });

    logger.log({
      timeMs: clock.timeMs,
      eventType: "GPS_ECU_AFFECTED",
      sourceEcu: ECU_NAME,
      message: "GPS ECU marked navigation data as untrusted after an anomalous location update.",
      severity: "HIGH",
      isAnomalous: true,
      data: {
        messageId: message.messageId,
        trustScore: vehicleState.ecus.GPS_ECU.trustScore,
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
      messageType: "GPS_POSITION",
      priority: "NORMAL",
      data: {
        status: vehicleState.ecus.GPS_ECU.status,
        routePositionKm: vehicleState.ecus.GPS_ECU.routePositionKm,
        trustScore: vehicleState.ecus.GPS_ECU.trustScore,
        navigationTrusted: vehicleState.ecus.GPS_ECU.navigationTrusted,
      },
      isAnomalous: !vehicleState.ecus.GPS_ECU.navigationTrusted,
      anomalyReason: vehicleState.ecus.GPS_ECU.navigationTrusted
        ? null
        : "Virtual GPS location is marked as untrusted.",
    });
  };

  return {
    name: ECU_NAME,
    tick,
    dispose: unsubscribe,
  };
};