// Captured from the real backend modules (impact + recommendations) so demo mode matches live output.
/* eslint-disable */
import type { BackendRecommendation, ImpactAnalysis, ScenarioType, VehicleState } from "../../types/api";

export const FIXTURES: Record<ScenarioType, { analysis: ImpactAnalysis; recommendations: BackendRecommendation[]; rootCauseSummary: string; executiveSummary: string; title: string; disclaimer: string; finalState: VehicleState }> = {
 "GPS_SPOOFING": {
  "analysis": {
   "attackType": "GPS_SPOOFING",
   "affectedEcus": [
    "GPS_ECU",
    "ADAS_ECU"
   ],
   "directlyTargetedEcus": [],
   "vehicleImpact": [
    "Virtual navigation information became untrusted.",
    "ADAS raised a high driver-assistance warning."
   ],
   "networkImpact": [
    "Virtual CAN bus remained operational with no recorded degradation."
   ],
   "severity": "HIGH",
   "severityScore": 8,
   "riskLevel": "HIGH",
   "severityReasons": [
    "Virtual navigation information became untrusted.",
    "ADAS was affected by unreliable navigation context."
   ],
   "propagationPath": [
    "SCENARIO_ENGINE",
    "GPS_ECU",
    "ADAS_ECU"
   ],
   "propagationLinks": [
    {
     "source": "SCENARIO_ENGINE",
     "target": "GPS_ECU"
    },
    {
     "source": "GPS_ECU",
     "target": "ADAS_ECU"
    }
   ],
   "propagationDisplayPath": "SCENARIO_ENGINE -> GPS_ECU -> ADAS_ECU",
   "observedPropagationEvents": [
    {
     "timeMs": 5000,
     "eventType": "SCENARIO_ACTIVATED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "GPS_ECU",
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_TRANSMITTED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "GPS_ECU",
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "GPS_ECU_AFFECTED",
     "sourceEcu": "GPS_ECU",
     "targetEcu": null,
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_DELIVERED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "GPS_ECU",
     "severity": "INFO"
    }
   ],
   "evidence": {
    "alertCount": 2,
    "anomalyCount": 2,
    "affectedEcuCount": 2,
    "networkHealthScore": 100
   },
   "summary": "GPS_SPOOFING produced a high virtual impact affecting 2 ECU(s).",
   "disclaimer": "This impact analysis is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation."
  },
  "recommendations": [
   {
    "id": "gps-validation",
    "title": "GPS Signal Validation",
    "priority": "HIGH",
    "description": "Validate GPS position, velocity, and timing against physical limits and vehicle state before use in navigation or ADAS."
   },
   {
    "id": "sensor-fusion",
    "title": "Multi-Sensor Cross-Validation",
    "priority": "HIGH",
    "description": "Compare GPS with inertial sensors, wheel speed, and map data to detect location inconsistencies."
   },
   {
    "id": "nav-fallback",
    "title": "Navigation Safe Fallback",
    "priority": "MEDIUM",
    "description": "Switch to dead-reckoning or safe navigation mode when GPS spoofing is suspected."
   },
   {
    "id": "incident-review",
    "title": "Incident Review and Evidence Retention",
    "priority": "MEDIUM",
    "description": "Retain simulation logs, impact analysis, and remediation decisions for security audit and future model training."
   }
  ],
  "rootCauseSummary": "The simulated gps spoofing attack compromised vehicle safety by affecting GPS_ECU, ADAS_ECU. Impact observed: Virtual navigation information became untrusted.; ADAS raised a high driver-assistance warning.. Severity factors: Virtual navigation information became untrusted.; ADAS was affected by unreliable navigation context..",
  "executiveSummary": "GPS_SPOOFING attack resulted in HIGH severity with HIGH risk level.",
  "title": "Automotive Cybersecurity Final Analysis Report",
  "disclaimer": "This report is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation.",
  "finalState": {
   "simulation": {
    "tick": 100,
    "timeMs": 10000,
    "status": "COMPLETED"
   },
   "vehicle": {
    "speedKph": 48,
    "engineRunning": true,
    "drivingMode": "NORMAL"
   },
   "network": {
    "healthScore": 100,
    "messageCount": 101,
    "delayedMessageCount": 0,
    "droppedMessageCount": 0,
    "replayedMessageCount": 0,
    "unauthorisedMessageCount": 0
   },
   "ecus": {
    "ENGINE_ECU": {
     "status": "NORMAL",
     "rpm": 1800,
     "powerAvailable": true,
     "directlyTargeted": false
    },
    "BRAKE_ECU": {
     "status": "NORMAL",
     "brakePressure": 0,
     "safetyAvailable": true,
     "directlyTargeted": false
    },
    "STEERING_ECU": {
     "status": "NORMAL",
     "steeringAngle": 0,
     "steeringAvailable": true,
     "directlyTargeted": false
    },
    "GPS_ECU": {
     "status": "AFFECTED",
     "routePositionKm": 999.9,
     "trustScore": 0.2,
     "navigationTrusted": false,
     "directlyTargeted": false
    },
    "ADAS_ECU": {
     "status": "AFFECTED",
     "warningLevel": "HIGH",
     "assistanceAvailable": true,
     "directlyTargeted": false
    }
   },
   "sensors": {
    "frontObstacleDistanceM": 55,
    "laneConfidence": 1,
    "speedSensorKph": 48,
    "sensorTrusted": true
   },
   "alerts": [
    {
     "timeMs": 5000,
     "level": "HIGH",
     "source": "GPS_ECU",
     "message": "Virtual navigation information is no longer trusted."
    },
    {
     "timeMs": 5500,
     "level": "HIGH",
     "source": "ADAS_ECU",
     "message": "ADAS received untrusted virtual GPS information and raised a navigation-context warning."
    }
   ],
   "anomalies": [
    {
     "timeMs": 5000,
     "severity": "HIGH",
     "source": "GPS_ECU",
     "type": "GPS_LOCATION_INCONSISTENCY",
     "message": "GPS ECU received an inconsistent virtual location update."
    },
    {
     "timeMs": 5500,
     "severity": "HIGH",
     "source": "ADAS_ECU",
     "type": "UNTRUSTED_NAVIGATION_CONTEXT",
     "message": "ADAS received untrusted virtual GPS information and raised a navigation-context warning."
    }
   ]
  }
 },
 "CAN_MESSAGE_INJECTION": {
  "analysis": {
   "attackType": "CAN_MESSAGE_INJECTION",
   "affectedEcus": [
    "STEERING_ECU"
   ],
   "directlyTargetedEcus": [],
   "vehicleImpact": [
    "Virtual steering availability was reduced."
   ],
   "networkImpact": [
    "Virtual CAN bus remained operational with no recorded degradation."
   ],
   "severity": "CRITICAL",
   "severityScore": 9,
   "riskLevel": "CRITICAL",
   "severityReasons": [
    "Virtual steering availability was reduced."
   ],
   "propagationPath": [
    "SCENARIO_ENGINE",
    "STEERING_ECU"
   ],
   "propagationLinks": [
    {
     "source": "SCENARIO_ENGINE",
     "target": "STEERING_ECU"
    }
   ],
   "propagationDisplayPath": "SCENARIO_ENGINE -> STEERING_ECU",
   "observedPropagationEvents": [
    {
     "timeMs": 5000,
     "eventType": "SCENARIO_ACTIVATED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "STEERING_ECU",
     "severity": "CRITICAL"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_TRANSMITTED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "STEERING_ECU",
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "STEERING_ECU_AFFECTED",
     "sourceEcu": "STEERING_ECU",
     "targetEcu": null,
     "severity": "CRITICAL"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_DELIVERED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "STEERING_ECU",
     "severity": "INFO"
    }
   ],
   "evidence": {
    "alertCount": 1,
    "anomalyCount": 1,
    "affectedEcuCount": 1,
    "networkHealthScore": 100
   },
   "summary": "CAN_MESSAGE_INJECTION produced a critical virtual impact affecting 1 ECU(s).",
   "disclaimer": "This impact analysis is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation."
  },
  "recommendations": [
   {
    "id": "can-auth",
    "title": "CAN Message Authentication",
    "priority": "HIGH",
    "description": "Implement cryptographic message authentication to verify the source and integrity of CAN frames."
   },
   {
    "id": "msg-allowlist",
    "title": "ECU Message Allowlisting",
    "priority": "HIGH",
    "description": "Restrict each ECU to accept only expected arbitration IDs and valid payload formats."
   },
   {
    "id": "can-ids",
    "title": "CAN Intrusion Detection",
    "priority": "HIGH",
    "description": "Monitor for unexpected message IDs, abnormal transmission rates, and payload anomalies."
   },
   {
    "id": "network-seg",
    "title": "Network Segmentation",
    "priority": "MEDIUM",
    "description": "Isolate safety-critical ECUs from infotainment and external interfaces on separate network segments."
   },
   {
    "id": "incident-review",
    "title": "Incident Review and Evidence Retention",
    "priority": "MEDIUM",
    "description": "Retain simulation logs, impact analysis, and remediation decisions for security audit and future model training."
   }
  ],
  "rootCauseSummary": "The simulated can message injection attack compromised vehicle safety by affecting STEERING_ECU. Impact observed: Virtual steering availability was reduced.. Severity factors: Virtual steering availability was reduced..",
  "executiveSummary": "CAN_MESSAGE_INJECTION attack resulted in CRITICAL severity with CRITICAL risk level.",
  "title": "Automotive Cybersecurity Final Analysis Report",
  "disclaimer": "This report is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation.",
  "finalState": {
   "simulation": {
    "tick": 100,
    "timeMs": 10000,
    "status": "COMPLETED"
   },
   "vehicle": {
    "speedKph": 48,
    "engineRunning": true,
    "drivingMode": "NORMAL"
   },
   "network": {
    "healthScore": 100,
    "messageCount": 101,
    "delayedMessageCount": 0,
    "droppedMessageCount": 0,
    "replayedMessageCount": 0,
    "unauthorisedMessageCount": 0
   },
   "ecus": {
    "ENGINE_ECU": {
     "status": "NORMAL",
     "rpm": 1800,
     "powerAvailable": true,
     "directlyTargeted": false
    },
    "BRAKE_ECU": {
     "status": "NORMAL",
     "brakePressure": 0,
     "safetyAvailable": true,
     "directlyTargeted": false
    },
    "STEERING_ECU": {
     "status": "AFFECTED",
     "steeringAngle": 0,
     "steeringAvailable": false,
     "directlyTargeted": false
    },
    "GPS_ECU": {
     "status": "NORMAL",
     "routePositionKm": 12.4,
     "trustScore": 1,
     "navigationTrusted": true,
     "directlyTargeted": false
    },
    "ADAS_ECU": {
     "status": "NORMAL",
     "warningLevel": "NONE",
     "assistanceAvailable": true,
     "directlyTargeted": false
    }
   },
   "sensors": {
    "frontObstacleDistanceM": 55,
    "laneConfidence": 1,
    "speedSensorKph": 48,
    "sensorTrusted": true
   },
   "alerts": [
    {
     "timeMs": 5000,
     "level": "CRITICAL",
     "source": "STEERING_ECU",
     "message": "Virtual steering availability was reduced after an anomalous network event."
    }
   ],
   "anomalies": [
    {
     "timeMs": 5000,
     "severity": "CRITICAL",
     "source": "STEERING_ECU",
     "type": "UNAUTHORISED_STEERING_STATE_EVENT",
     "message": "Steering ECU received an unauthorised virtual state-override event."
    }
   ]
  }
 },
 "REPLAY_ATTACK": {
  "analysis": {
   "attackType": "REPLAY_ATTACK",
   "affectedEcus": [
    "BRAKE_ECU"
   ],
   "directlyTargetedEcus": [
    "BRAKE_ECU"
   ],
   "vehicleImpact": [
    "Virtual brake safety availability was reduced."
   ],
   "networkImpact": [
    "1 virtual CAN message(s) were replayed.",
    "1 unauthorised virtual CAN message(s) were detected."
   ],
   "severity": "CRITICAL",
   "severityScore": 10,
   "riskLevel": "CRITICAL",
   "severityReasons": [
    "Virtual brake safety availability was reduced."
   ],
   "propagationPath": [
    "REPLAY_BUFFER",
    "BRAKE_ECU"
   ],
   "propagationLinks": [
    {
     "source": "REPLAY_BUFFER",
     "target": "BRAKE_ECU"
    }
   ],
   "propagationDisplayPath": "REPLAY_BUFFER -> BRAKE_ECU",
   "observedPropagationEvents": [
    {
     "timeMs": 5000,
     "eventType": "SCENARIO_ACTIVATED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "BRAKE_ECU",
     "severity": "CRITICAL"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_TRANSMITTED",
     "sourceEcu": "REPLAY_BUFFER",
     "targetEcu": "BRAKE_ECU",
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "BRAKE_ECU_AFFECTED",
     "sourceEcu": "BRAKE_ECU",
     "targetEcu": null,
     "severity": "CRITICAL"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_DELIVERED",
     "sourceEcu": "REPLAY_BUFFER",
     "targetEcu": "BRAKE_ECU",
     "severity": "INFO"
    }
   ],
   "evidence": {
    "alertCount": 2,
    "anomalyCount": 2,
    "affectedEcuCount": 1,
    "networkHealthScore": 100
   },
   "summary": "REPLAY_ATTACK produced a critical virtual impact affecting 1 ECU(s).",
   "disclaimer": "This impact analysis is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation."
  },
  "recommendations": [
   {
    "id": "freshness",
    "title": "Message Freshness Protection",
    "priority": "HIGH",
    "description": "Implement rolling counters, timestamps, or nonces to reject previously captured valid messages."
   },
   {
    "id": "auth-can",
    "title": "Authenticated CAN Messages",
    "priority": "HIGH",
    "description": "Use cryptographic authentication to ensure messages are both genuine and recent."
   },
   {
    "id": "replay-detect",
    "title": "Replay Detection Rules",
    "priority": "MEDIUM",
    "description": "Detect and log repeated sequence numbers or stale timestamps that indicate replayed frames."
   },
   {
    "id": "incident-review",
    "title": "Incident Review and Evidence Retention",
    "priority": "MEDIUM",
    "description": "Retain simulation logs, impact analysis, and remediation decisions for security audit and future model training."
   }
  ],
  "rootCauseSummary": "The simulated replay attack attack compromised vehicle safety by affecting BRAKE_ECU. Impact observed: Virtual brake safety availability was reduced.. Severity factors: Virtual brake safety availability was reduced..",
  "executiveSummary": "REPLAY_ATTACK attack resulted in CRITICAL severity with CRITICAL risk level.",
  "title": "Automotive Cybersecurity Final Analysis Report",
  "disclaimer": "This report is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation.",
  "finalState": {
   "simulation": {
    "tick": 100,
    "timeMs": 10000,
    "status": "COMPLETED"
   },
   "vehicle": {
    "speedKph": 48,
    "engineRunning": true,
    "drivingMode": "NORMAL"
   },
   "network": {
    "healthScore": 100,
    "messageCount": 101,
    "delayedMessageCount": 0,
    "droppedMessageCount": 0,
    "replayedMessageCount": 1,
    "unauthorisedMessageCount": 1
   },
   "ecus": {
    "ENGINE_ECU": {
     "status": "NORMAL",
     "rpm": 1800,
     "powerAvailable": true,
     "directlyTargeted": false
    },
    "BRAKE_ECU": {
     "status": "AFFECTED",
     "brakePressure": 0,
     "safetyAvailable": false,
     "directlyTargeted": true
    },
    "STEERING_ECU": {
     "status": "NORMAL",
     "steeringAngle": 0,
     "steeringAvailable": true,
     "directlyTargeted": false
    },
    "GPS_ECU": {
     "status": "NORMAL",
     "routePositionKm": 12.4,
     "trustScore": 1,
     "navigationTrusted": true,
     "directlyTargeted": false
    },
    "ADAS_ECU": {
     "status": "NORMAL",
     "warningLevel": "NONE",
     "assistanceAvailable": true,
     "directlyTargeted": false
    }
   },
   "sensors": {
    "frontObstacleDistanceM": 55,
    "laneConfidence": 1,
    "speedSensorKph": 48,
    "sensorTrusted": true
   },
   "alerts": [
    {
     "timeMs": 5000,
     "level": "CRITICAL",
     "source": "SCENARIO_ENGINE",
     "message": "Virtual CAN replay activity targeted the Brake ECU."
    },
    {
     "timeMs": 5000,
     "level": "CRITICAL",
     "source": "BRAKE_ECU",
     "message": "Virtual brake safety availability was reduced after an anomalous network event."
    }
   ],
   "anomalies": [
    {
     "timeMs": 5000,
     "severity": "CRITICAL",
     "source": "SCENARIO_ENGINE",
     "type": "REPLAYED_BRAKE_STATE_MESSAGE",
     "message": "A previously recorded virtual brake-state message was replayed."
    },
    {
     "timeMs": 5000,
     "severity": "CRITICAL",
     "source": "BRAKE_ECU",
     "type": "UNAUTHORISED_BRAKE_STATE_EVENT",
     "message": "Brake ECU received an unauthorised virtual state-override event."
    }
   ]
  }
 },
 "DENIAL_OF_SERVICE": {
  "analysis": {
   "attackType": "DENIAL_OF_SERVICE",
   "affectedEcus": [],
   "directlyTargetedEcus": [
    "ADAS_ECU"
   ],
   "vehicleImpact": [
    "Virtual CAN communication experienced message delays."
   ],
   "networkImpact": [
    "Virtual CAN-bus health decreased to 55.",
    "100 virtual CAN message(s) were delayed."
   ],
   "severity": "HIGH",
   "severityScore": 7,
   "riskLevel": "HIGH",
   "severityReasons": [
    "Virtual CAN-bus health was degraded.",
    "Virtual CAN messages experienced delivery delays."
   ],
   "propagationPath": [
    "VIRTUAL_FLOOD_SOURCE",
    "VIRTUAL_CAN_BUS",
    "ADAS_ECU"
   ],
   "propagationLinks": [
    {
     "source": "VIRTUAL_FLOOD_SOURCE",
     "target": "VIRTUAL_CAN_BUS"
    },
    {
     "source": "VIRTUAL_CAN_BUS",
     "target": "ADAS_ECU"
    }
   ],
   "propagationDisplayPath": "VIRTUAL_FLOOD_SOURCE -> VIRTUAL_CAN_BUS -> ADAS_ECU",
   "observedPropagationEvents": [
    {
     "timeMs": 5000,
     "eventType": "SCENARIO_ACTIVATED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "ADAS_ECU",
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_TRANSMITTED",
     "sourceEcu": "VIRTUAL_FLOOD_SOURCE",
     "targetEcu": "ADAS_ECU",
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_DELIVERED",
     "sourceEcu": "VIRTUAL_FLOOD_SOURCE",
     "targetEcu": "ADAS_ECU",
     "severity": "INFO"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_TRANSMITTED",
     "sourceEcu": "VIRTUAL_FLOOD_SOURCE",
     "targetEcu": "ADAS_ECU",
     "severity": "HIGH"
    }
   ],
   "evidence": {
    "alertCount": 1,
    "anomalyCount": 1,
    "affectedEcuCount": 0,
    "networkHealthScore": 55
   },
   "summary": "DENIAL_OF_SERVICE produced a high virtual impact affecting 0 ECU(s).",
   "disclaimer": "This impact analysis is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation."
  },
  "recommendations": [
   {
    "id": "rate-limit",
    "title": "CAN Bus Rate Limiting",
    "priority": "HIGH",
    "description": "Enforce strict rate limits and traffic policing to prevent bus flooding from a single source."
   },
   {
    "id": "flood-detect",
    "title": "Flood Detection IDS",
    "priority": "HIGH",
    "description": "Detect abnormal message rates, error frames, and bus congestion indicative of DoS attacks."
   },
   {
    "id": "bus-prior",
    "title": "Safety-Critical Traffic Prioritization",
    "priority": "MEDIUM",
    "description": "Ensure safety-critical messages (braking, steering) maintain bus priority during congestion."
   },
   {
    "id": "watchdog",
    "title": "ECU Watchdog Recovery",
    "priority": "MEDIUM",
    "description": "Implement watchdog timers and recovery procedures to restore ECU communication after DoS disruption."
   },
   {
    "id": "incident-review",
    "title": "Incident Review and Evidence Retention",
    "priority": "MEDIUM",
    "description": "Retain simulation logs, impact analysis, and remediation decisions for security audit and future model training."
   }
  ],
  "rootCauseSummary": "The simulated denial of service attack compromised vehicle safety by affecting no ECUs. Impact observed: Virtual CAN communication experienced message delays.. Severity factors: Virtual CAN-bus health was degraded.; Virtual CAN messages experienced delivery delays..",
  "executiveSummary": "DENIAL_OF_SERVICE attack resulted in HIGH severity with HIGH risk level.",
  "title": "Automotive Cybersecurity Final Analysis Report",
  "disclaimer": "This report is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation.",
  "finalState": {
   "simulation": {
    "tick": 100,
    "timeMs": 10000,
    "status": "COMPLETED"
   },
   "vehicle": {
    "speedKph": 48,
    "engineRunning": true,
    "drivingMode": "NORMAL"
   },
   "network": {
    "healthScore": 55,
    "messageCount": 200,
    "delayedMessageCount": 100,
    "droppedMessageCount": 0,
    "replayedMessageCount": 0,
    "unauthorisedMessageCount": 0
   },
   "ecus": {
    "ENGINE_ECU": {
     "status": "NORMAL",
     "rpm": 1800,
     "powerAvailable": true,
     "directlyTargeted": false
    },
    "BRAKE_ECU": {
     "status": "NORMAL",
     "brakePressure": 0,
     "safetyAvailable": true,
     "directlyTargeted": false
    },
    "STEERING_ECU": {
     "status": "NORMAL",
     "steeringAngle": 0,
     "steeringAvailable": true,
     "directlyTargeted": false
    },
    "GPS_ECU": {
     "status": "NORMAL",
     "routePositionKm": 12.4,
     "trustScore": 1,
     "navigationTrusted": true,
     "directlyTargeted": false
    },
    "ADAS_ECU": {
     "status": "NORMAL",
     "warningLevel": "NONE",
     "assistanceAvailable": true,
     "directlyTargeted": true
    }
   },
   "sensors": {
    "frontObstacleDistanceM": 55,
    "laneConfidence": 1,
    "speedSensorKph": 48,
    "sensorTrusted": true
   },
   "alerts": [
    {
     "timeMs": 5000,
     "level": "HIGH",
     "source": "SCENARIO_ENGINE",
     "message": "Virtual CAN-bus health is degraded by a denial-of-service scenario."
    }
   ],
   "anomalies": [
    {
     "timeMs": 5000,
     "severity": "HIGH",
     "source": "SCENARIO_ENGINE",
     "type": "VIRTUAL_CAN_BUS_CONGESTION",
     "message": "A controlled virtual message flood is causing CAN-bus congestion."
    }
   ]
  }
 },
 "SENSOR_SPOOFING": {
  "analysis": {
   "attackType": "SENSOR_SPOOFING",
   "affectedEcus": [
    "ADAS_ECU"
   ],
   "directlyTargetedEcus": [],
   "vehicleImpact": [
    "Virtual sensor information became untrusted.",
    "ADAS raised a high driver-assistance warning."
   ],
   "networkImpact": [
    "Virtual CAN bus remained operational with no recorded degradation."
   ],
   "severity": "HIGH",
   "severityScore": 7,
   "riskLevel": "HIGH",
   "severityReasons": [
    "Virtual sensor information became untrusted.",
    "ADAS raised a warning after receiving inconsistent sensor data."
   ],
   "propagationPath": [
    "VIRTUAL_SENSOR_ECU",
    "VIRTUAL_CAN_BUS",
    "ADAS_ECU"
   ],
   "propagationLinks": [
    {
     "source": "VIRTUAL_SENSOR_ECU",
     "target": "VIRTUAL_CAN_BUS"
    },
    {
     "source": "VIRTUAL_CAN_BUS",
     "target": "ADAS_ECU"
    }
   ],
   "propagationDisplayPath": "VIRTUAL_SENSOR_ECU -> VIRTUAL_CAN_BUS -> ADAS_ECU",
   "observedPropagationEvents": [
    {
     "timeMs": 5000,
     "eventType": "SCENARIO_ACTIVATED",
     "sourceEcu": "SCENARIO_ENGINE",
     "targetEcu": "ADAS_ECU",
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_TRANSMITTED",
     "sourceEcu": "VIRTUAL_SENSOR_ECU",
     "targetEcu": null,
     "severity": "HIGH"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_DELIVERED",
     "sourceEcu": "VIRTUAL_SENSOR_ECU",
     "targetEcu": "ENGINE_ECU",
     "severity": "INFO"
    },
    {
     "timeMs": 5000,
     "eventType": "CAN_MESSAGE_DELIVERED",
     "sourceEcu": "VIRTUAL_SENSOR_ECU",
     "targetEcu": "BRAKE_ECU",
     "severity": "INFO"
    }
   ],
   "evidence": {
    "alertCount": 1,
    "anomalyCount": 1,
    "affectedEcuCount": 1,
    "networkHealthScore": 100
   },
   "summary": "SENSOR_SPOOFING produced a high virtual impact affecting 1 ECU(s).",
   "disclaimer": "This impact analysis is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation."
  },
  "recommendations": [
   {
    "id": "sensor-plausibility",
    "title": "Sensor Plausibility Checks",
    "priority": "HIGH",
    "description": "Validate sensor readings against expected physical ranges and current vehicle state constraints."
   },
   {
    "id": "cross-validate",
    "title": "Sensor Cross-Validation",
    "priority": "HIGH",
    "description": "Compare independent sensor readings to detect falsified or inconsistent perception data."
   },
   {
    "id": "adas-fallback",
    "title": "ADAS Safe Degradation",
    "priority": "HIGH",
    "description": "Safely disable or degrade ADAS functions and alert the driver when sensor data is untrusted."
   },
   {
    "id": "firmware-sec",
    "title": "Secure ECU Firmware Updates",
    "priority": "MEDIUM",
    "description": "Apply secure firmware updates to patch sensor-processing vulnerabilities and improve input validation."
   },
   {
    "id": "incident-review",
    "title": "Incident Review and Evidence Retention",
    "priority": "MEDIUM",
    "description": "Retain simulation logs, impact analysis, and remediation decisions for security audit and future model training."
   }
  ],
  "rootCauseSummary": "The simulated sensor spoofing attack compromised vehicle safety by affecting ADAS_ECU. Impact observed: Virtual sensor information became untrusted.; ADAS raised a high driver-assistance warning.. Severity factors: Virtual sensor information became untrusted.; ADAS raised a warning after receiving inconsistent sensor data..",
  "executiveSummary": "SENSOR_SPOOFING attack resulted in HIGH severity with HIGH risk level.",
  "title": "Automotive Cybersecurity Final Analysis Report",
  "disclaimer": "This report is based on an isolated software simulation and is indicative only; it does not replace certified physical safety validation.",
  "finalState": {
   "simulation": {
    "tick": 100,
    "timeMs": 10000,
    "status": "COMPLETED"
   },
   "vehicle": {
    "speedKph": 48,
    "engineRunning": true,
    "drivingMode": "NORMAL"
   },
   "network": {
    "healthScore": 100,
    "messageCount": 101,
    "delayedMessageCount": 0,
    "droppedMessageCount": 0,
    "replayedMessageCount": 0,
    "unauthorisedMessageCount": 0
   },
   "ecus": {
    "ENGINE_ECU": {
     "status": "NORMAL",
     "rpm": 1800,
     "powerAvailable": true,
     "directlyTargeted": false
    },
    "BRAKE_ECU": {
     "status": "NORMAL",
     "brakePressure": 0,
     "safetyAvailable": true,
     "directlyTargeted": false
    },
    "STEERING_ECU": {
     "status": "NORMAL",
     "steeringAngle": 0,
     "steeringAvailable": true,
     "directlyTargeted": false
    },
    "GPS_ECU": {
     "status": "NORMAL",
     "routePositionKm": 12.4,
     "trustScore": 1,
     "navigationTrusted": true,
     "directlyTargeted": false
    },
    "ADAS_ECU": {
     "status": "AFFECTED",
     "warningLevel": "HIGH",
     "assistanceAvailable": true,
     "directlyTargeted": false
    }
   },
   "sensors": {
    "frontObstacleDistanceM": 1.2,
    "laneConfidence": 1,
    "speedSensorKph": 48,
    "sensorTrusted": false
   },
   "alerts": [
    {
     "timeMs": 5000,
     "level": "HIGH",
     "source": "ADAS_ECU",
     "message": "ADAS received anomalous virtual sensor information and raised a driver-assistance warning."
    }
   ],
   "anomalies": [
    {
     "timeMs": 5000,
     "severity": "HIGH",
     "source": "ADAS_ECU",
     "type": "SENSOR_DATA_INCONSISTENCY",
     "message": "ADAS received anomalous virtual sensor information and raised a driver-assistance warning."
    }
   ]
  }
 }
};
