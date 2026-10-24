import { generateLlmRecommendations } from "./llmRecommender.js";

const MITIGATION_CATALOGUE = {
  GPS_SPOOFING: [
    {
      id: "gps-validation",
      title: "GPS Signal Validation",
      priority: "HIGH",
      description: "Validate GPS position, velocity, and timing against physical limits and vehicle state before use in navigation or ADAS."
    },
    {
      id: "sensor-fusion",
      title: "Multi-Sensor Cross-Validation",
      priority: "HIGH",
      description: "Compare GPS with inertial sensors, wheel speed, and map data to detect location inconsistencies."
    },
    {
      id: "nav-fallback",
      title: "Navigation Safe Fallback",
      priority: "MEDIUM",
      description: "Switch to dead-reckoning or safe navigation mode when GPS spoofing is suspected."
    }
  ],
  CAN_MESSAGE_INJECTION: [
    {
      id: "can-auth",
      title: "CAN Message Authentication",
      priority: "HIGH",
      description: "Implement cryptographic message authentication to verify the source and integrity of CAN frames."
    },
    {
      id: "msg-allowlist",
      title: "ECU Message Allowlisting",
      priority: "HIGH",
      description: "Restrict each ECU to accept only expected arbitration IDs and valid payload formats."
    },
    {
      id: "can-ids",
      title: "CAN Intrusion Detection",
      priority: "HIGH",
      description: "Monitor for unexpected message IDs, abnormal transmission rates, and payload anomalies."
    },
    {
      id: "network-seg",
      title: "Network Segmentation",
      priority: "MEDIUM",
      description: "Isolate safety-critical ECUs from infotainment and external interfaces on separate network segments."
    }
  ],
  REPLAY_ATTACK: [
    {
      id: "freshness",
      title: "Message Freshness Protection",
      priority: "HIGH",
      description: "Implement rolling counters, timestamps, or nonces to reject previously captured valid messages."
    },
    {
      id: "auth-can",
      title: "Authenticated CAN Messages",
      priority: "HIGH",
      description: "Use cryptographic authentication to ensure messages are both genuine and recent."
    },
    {
      id: "replay-detect",
      title: "Replay Detection Rules",
      priority: "MEDIUM",
      description: "Detect and log repeated sequence numbers or stale timestamps that indicate replayed frames."
    }
  ],
  DENIAL_OF_SERVICE: [
    {
      id: "rate-limit",
      title: "CAN Bus Rate Limiting",
      priority: "HIGH",
      description: "Enforce strict rate limits and traffic policing to prevent bus flooding from a single source."
    },
    {
      id: "flood-detect",
      title: "Flood Detection IDS",
      priority: "HIGH",
      description: "Detect abnormal message rates, error frames, and bus congestion indicative of DoS attacks."
    },
    {
      id: "bus-prior",
      title: "Safety-Critical Traffic Prioritization",
      priority: "MEDIUM",
      description: "Ensure safety-critical messages (braking, steering) maintain bus priority during congestion."
    },
    {
      id: "watchdog",
      title: "ECU Watchdog Recovery",
      priority: "MEDIUM",
      description: "Implement watchdog timers and recovery procedures to restore ECU communication after DoS disruption."
    }
  ],
  SENSOR_SPOOFING: [
    {
      id: "sensor-plausibility",
      title: "Sensor Plausibility Checks",
      priority: "HIGH",
      description: "Validate sensor readings against expected physical ranges and current vehicle state constraints."
    },
    {
      id: "cross-validate",
      title: "Sensor Cross-Validation",
      priority: "HIGH",
      description: "Compare independent sensor readings to detect falsified or inconsistent perception data."
    },
    {
      id: "adas-fallback",
      title: "ADAS Safe Degradation",
      priority: "HIGH",
      description: "Safely disable or degrade ADAS functions and alert the driver when sensor data is untrusted."
    },
    {
      id: "firmware-sec",
      title: "Secure ECU Firmware Updates",
      priority: "MEDIUM",
      description: "Apply secure firmware updates to patch sensor-processing vulnerabilities and improve input validation."
    }
  ]
};


export const getCatalogueRecommendations = (attackType) => {
  const specific = MITIGATION_CATALOGUE[attackType] || [];

  const common = [{
    id: "incident-review",
    title: "Incident Review and Evidence Retention",
    priority: "MEDIUM",
    description: "Retain simulation logs, impact analysis, and remediation decisions for security audit and future model training."
  }];

  return [...specific, ...common];
};

const llmEnabled = () => process.env.RECOMMENDATION_LLM_ENABLED !== "false";


export const generateRecommendations = async ({ impactRecord, incidentContext = null }) => {
  const attackType = impactRecord.analysis.attackType;

  if (llmEnabled()) {
    try {
      return await generateLlmRecommendations({ impactRecord, incidentContext });
    } catch (error) {
      console.warn(`[recommendations] Falling back to the catalogue for ${attackType}: ${error.message}`);
      return {
        summary: null,
        recommendations: getCatalogueRecommendations(attackType),
        generation: {
          source: "CATALOGUE",
          reason: "AI generation failed",
          failures: error.failures ?? [error.message],
        },
      };
    }
  }

  return {
    summary: null,
    recommendations: getCatalogueRecommendations(attackType),
    generation: { source: "CATALOGUE", reason: "AI generation disabled (RECOMMENDATION_LLM_ENABLED=false)" },
  };
};