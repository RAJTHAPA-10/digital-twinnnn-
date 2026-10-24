import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const syntheticReports = [
  {
    ftirNumber: "SYN-GPS-001",
    vehicleModel: "Astra EV Prototype",
    mileage: 18420,
    rawSubject:
      "Navigation display repeatedly shifted the vehicle position to an incorrect road after a remote connectivity event. Physical vehicle location did not match the displayed route.",
    expectedAttackCode: "GPS_SPOOFING",
    scenarioType: "GPS spoofing test scenario",
    confidenceScore: 0.98,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-GPS-002",
    vehicleModel: "Orion Hybrid Prototype",
    mileage: 22610,
    rawSubject:
      "Vehicle navigation recorded an unexpected location deviation while stationary. Location updates were inconsistent with trusted map coordinates and route guidance became unreliable.",
    expectedAttackCode: "GPS_SPOOFING",
    scenarioType: "GPS spoofing test scenario",
    confidenceScore: 0.96,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-CAN-001",
    vehicleModel: "Astra EV Prototype",
    mileage: 15280,
    rawSubject:
      "The internal vehicle network reported unauthorised control-message activity. ECU state changes were observed without a matching driver command or normal vehicle event.",
    expectedAttackCode: "CAN_MESSAGE_INJECTION",
    scenarioType: "CAN message injection test scenario",
    confidenceScore: 0.98,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-CAN-002",
    vehicleModel: "Orion Hybrid Prototype",
    mileage: 19350,
    rawSubject:
      "Unexpected messages appeared on the vehicle communication network and caused inconsistent dashboard and subsystem states. The message origin could not be validated.",
    expectedAttackCode: "CAN_MESSAGE_INJECTION",
    scenarioType: "CAN message injection test scenario",
    confidenceScore: 0.97,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-REPLAY-001",
    vehicleModel: "Astra EV Prototype",
    mileage: 12740,
    rawSubject:
      "Previously observed valid control activity appeared again after the original event had ended. The repeated communication caused an outdated vehicle state to be applied.",
    expectedAttackCode: "REPLAY_ATTACK",
    scenarioType: "Replay attack test scenario",
    confidenceScore: 0.97,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-REPLAY-002",
    vehicleModel: "Orion Hybrid Prototype",
    mileage: 21100,
    rawSubject:
      "A historic vehicle-network command was unexpectedly repeated at a later time. The system accepted the stale message even though current vehicle conditions had changed.",
    expectedAttackCode: "REPLAY_ATTACK",
    scenarioType: "Replay attack test scenario",
    confidenceScore: 0.96,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-DOS-001",
    vehicleModel: "Astra EV Prototype",
    mileage: 16590,
    rawSubject:
      "Multiple vehicle functions experienced delayed communication at the same time. Important internal messages were delayed or unavailable during a period of unusually high network activity.",
    expectedAttackCode: "DENIAL_OF_SERVICE",
    scenarioType: "Denial of service test scenario",
    confidenceScore: 0.97,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-DOS-002",
    vehicleModel: "Orion Hybrid Prototype",
    mileage: 24830,
    rawSubject:
      "The vehicle communication network became unresponsive and several ECU updates were missed. The incident resembles an availability disruption rather than an individual component failure.",
    expectedAttackCode: "DENIAL_OF_SERVICE",
    scenarioType: "Denial of service test scenario",
    confidenceScore: 0.96,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-SENSOR-001",
    vehicleModel: "Astra EV Prototype",
    mileage: 13850,
    rawSubject:
      "The driver-assistance system reported an obstacle that was not present. The warning was traced to inconsistent virtual distance-sensor information rather than a physical obstruction.",
    expectedAttackCode: "SENSOR_SPOOFING",
    scenarioType: "Sensor spoofing test scenario",
    confidenceScore: 0.98,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-SENSOR-002",
    vehicleModel: "Orion Hybrid Prototype",
    mileage: 17720,
    rawSubject:
      "Vehicle assistance warnings were activated by abnormal sensor readings despite normal external driving conditions. Sensor data did not match the expected environment.",
    expectedAttackCode: "SENSOR_SPOOFING",
    scenarioType: "Sensor spoofing test scenario",
    confidenceScore: 0.97,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-UNKNOWN-001",
    vehicleModel: "Astra EV Prototype",
    mileage: 20110,
    rawSubject:
      "An unknown paired mobile device gained unauthorised access to infotainment functions and changed vehicle media preferences. The incident is cybersecurity-related but does not match a supported CAN, GPS, replay, denial-of-service, or sensor scenario.",
    expectedAttackCode: "UNCLASSIFIED",
    scenarioType: "Out-of-scope cybersecurity test scenario",
    confidenceScore: 0.95,
    reviewRequired: false,
  },
  {
    ftirNumber: "SYN-AMBIGUOUS-001",
    vehicleModel: "Orion Hybrid Prototype",
    mileage: 15640,
    rawSubject:
      "Intermittent driver-assistance alerts occurred during normal travel. The available evidence does not determine whether the cause was a sensor fault, environmental interference, or deliberate manipulation.",
    expectedAttackCode: "UNCLASSIFIED",
    scenarioType: "Ambiguous cybersecurity review test scenario",
    confidenceScore: 0.6,
    reviewRequired: true,
  },
];

const seedSyntheticReports = async () => {
  for (const item of syntheticReports) {
    const report = await prisma.report.upsert({
      where: {
        ftirNumber: item.ftirNumber,
      },
      update: {
        vehicleModel: item.vehicleModel,
        mileage: item.mileage,
        rawSubject: item.rawSubject,
        cleanedSubject: item.rawSubject,
        sourceType: "SYNTHETIC",
      },
      create: {
        ftirNumber: item.ftirNumber,
        vehicleModel: item.vehicleModel,
        mileage: item.mileage,
        rawSubject: item.rawSubject,
        cleanedSubject: item.rawSubject,
        sourceType: "SYNTHETIC",
        processingStatus: "CLASSIFIED",
      },
    });

    await prisma.classification.upsert({
      where: {
        reportId: report.id,
      },
      update: {
        label: "CYBERSECURITY",
        confidenceScore: item.confidenceScore,
        reason: `Synthetic test data prepared for ${item.scenarioType}.`,
        modelName: "SYNTHETIC_TEST_DATA",
        rawAiResponse: {
          source: "SYNTHETIC_SCENARIO_SEED",
          expectedAttackCode: item.expectedAttackCode,
          scenarioType: item.scenarioType,
        },
        promptVersion: "synthetic-seed-v1",
        reviewRequired: item.reviewRequired,
        reviewReason: item.reviewRequired
          ? "Synthetic ambiguous scenario intentionally requires manual review."
          : null,
      },
      create: {
        reportId: report.id,
        label: "CYBERSECURITY",
        confidenceScore: item.confidenceScore,
        reason: `Synthetic test data prepared for ${item.scenarioType}.`,
        modelName: "SYNTHETIC_TEST_DATA",
        rawAiResponse: {
          source: "SYNTHETIC_SCENARIO_SEED",
          expectedAttackCode: item.expectedAttackCode,
          scenarioType: item.scenarioType,
        },
        promptVersion: "synthetic-seed-v1",
        reviewRequired: item.reviewRequired,
        reviewReason: item.reviewRequired
          ? "Synthetic ambiguous scenario intentionally requires manual review."
          : null,
      },
    });
  }

  console.log(`Successfully seeded ${syntheticReports.length} synthetic FTIR reports.`);
};

seedSyntheticReports()
  .catch((error) => {
    console.error("Synthetic FTIR seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });