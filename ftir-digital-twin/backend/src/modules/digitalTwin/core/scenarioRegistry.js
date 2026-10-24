import { createCanMessageInjectionScenario } from "../scenarios/canMessageInjectionScenario.js";
import { createDenialOfServiceScenario } from "../scenarios/denialOfServiceScenario.js";
import { createGpsSpoofingScenario } from "../scenarios/gpsSpoofingScenario.js";
import { createReplayAttackScenario } from "../scenarios/replayAttackScenario.js";
import { createSensorSpoofingScenario } from "../scenarios/sensorSpoofingScenario.js";

const scenarioFactories = {
  GPS_SPOOFING: createGpsSpoofingScenario,
  CAN_MESSAGE_INJECTION: createCanMessageInjectionScenario,
  REPLAY_ATTACK: createReplayAttackScenario,
  DENIAL_OF_SERVICE: createDenialOfServiceScenario,
  SENSOR_SPOOFING: createSensorSpoofingScenario,
};

export const getSupportedScenarioTypes = () => Object.keys(scenarioFactories);

export const isSupportedScenarioType = (scenarioType) =>
  Object.hasOwn(scenarioFactories, scenarioType);

export const createScenario = ({ scenarioType, ...dependencies }) => {
  const scenarioFactory = scenarioFactories[scenarioType];

  if (!scenarioFactory) {
    throw new Error(
      `Unsupported simulation scenario: ${scenarioType}. Supported scenarios: ${getSupportedScenarioTypes().join(", ")}.`,
    );
  }

  return scenarioFactory(dependencies);
};