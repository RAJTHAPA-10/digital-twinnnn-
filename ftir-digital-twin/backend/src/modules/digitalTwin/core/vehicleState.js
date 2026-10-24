export const createInitialVehicleState = () => ({
  simulation: {
    tick: 0,
    timeMs: 0,
    status: "READY",
  },

  vehicle: {
    speedKph: 48,
    engineRunning: true,
    drivingMode: "NORMAL",
  },

  network: {
    healthScore: 100,
    messageCount: 0,
    delayedMessageCount: 0,
    droppedMessageCount: 0,
    replayedMessageCount: 0,
    unauthorisedMessageCount: 0,
  },

  ecus: {
    ENGINE_ECU: {
      status: "NORMAL",
      rpm: 1800,
      powerAvailable: true,
      directlyTargeted: false,
    },
    BRAKE_ECU: {
      status: "NORMAL",
      brakePressure: 0,
      safetyAvailable: true,
      directlyTargeted: false,
    },
    STEERING_ECU: {
      status: "NORMAL",
      steeringAngle: 0,
      steeringAvailable: true,
      directlyTargeted: false,
    },
    GPS_ECU: {
      status: "NORMAL",
      routePositionKm: 12.4,
      trustScore: 1,
      navigationTrusted: true,
      directlyTargeted: false,
    },
    ADAS_ECU: {
      status: "NORMAL",
      warningLevel: "NONE",
      assistanceAvailable: true,
      directlyTargeted: false,
    },
  },

  sensors: {
    frontObstacleDistanceM: 55,
    laneConfidence: 1,
    speedSensorKph: 48,
    sensorTrusted: true,
  },

  alerts: [],
  anomalies: [],
});

export const cloneVehicleState = (state) => structuredClone(state);

export const addAlert = (state, alert) => {
  state.alerts.push({
    timeMs: state.simulation.timeMs,
    level: "INFO",
    ...alert,
  });
};

export const addAnomaly = (state, anomaly) => {
  state.anomalies.push({
    timeMs: state.simulation.timeMs,
    severity: "MEDIUM",
    ...anomaly,
  });
};

export const getVehicleSnapshot = (state) => ({
  simulation: cloneVehicleState(state.simulation),
  vehicle: cloneVehicleState(state.vehicle),
  network: cloneVehicleState(state.network),
  ecus: cloneVehicleState(state.ecus),
  sensors: cloneVehicleState(state.sensors),
  alerts: cloneVehicleState(state.alerts),
  anomalies: cloneVehicleState(state.anomalies),
});