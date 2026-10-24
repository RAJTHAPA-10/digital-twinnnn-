import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const attackTypes = [
  {
    code: "GPS_SPOOFING",
    name: "GPS Spoofing",
    description:
      "Manipulation of vehicle GPS or GNSS location information to create false navigation or location data.",
  },
  {
    code: "CAN_MESSAGE_INJECTION",
    name: "CAN Message Injection",
    description:
      "Injection of unauthorised or malicious messages into the virtual vehicle CAN communication network.",
  },
  {
    code: "REPLAY_ATTACK",
    name: "Replay Attack",
    description:
      "Capture and retransmission of previously valid vehicle-network messages at an inappropriate time.",
  },
  {
    code: "DENIAL_OF_SERVICE",
    name: "Denial of Service",
    description:
      "Disruption of vehicle communication by simulating message flooding, delay, or loss of availability.",
  },
  {
    code: "SENSOR_SPOOFING",
    name: "Sensor Spoofing",
    description:
      "Manipulation of simulated vehicle sensor readings, such as radar, camera, speed, distance, or proximity data.",
  },
  {
    code: "UNCLASSIFIED",
    name: "Unclassified Cybersecurity Incident",
    description:
      "A cybersecurity-related FTIR that does not match one of the currently supported attack simulation scenarios with sufficient confidence.",
  },
];

const seedAttackTypes = async () => {
  for (const attackType of attackTypes) {
    await prisma.attackType.upsert({
      where: {
        code: attackType.code,
      },
      update: {
        name: attackType.name,
        description: attackType.description,
        isActive: true,
      },
      create: {
        ...attackType,
        isActive: true,
      },
    });
  }

  console.log(`Successfully seeded ${attackTypes.length} attack types.`);
};

seedAttackTypes()
  .catch((error) => {
    console.error("Attack-type seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });