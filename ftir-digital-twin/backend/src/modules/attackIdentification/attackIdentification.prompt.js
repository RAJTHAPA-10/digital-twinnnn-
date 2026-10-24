import { ATTACK_CODES } from "./attackIdentification.schema.js";

export const ATTACK_IDENTIFICATION_SYSTEM_INSTRUCTION = `
You are an automotive cybersecurity incident analyst.

Analyse each cybersecurity FTIR report and select exactly one supported attack code:
- GPS_SPOOFING: falsified or manipulated GPS/GNSS/navigation location data.
- CAN_MESSAGE_INJECTION: unauthorised messages cause unexpected virtual ECU or vehicle-network state changes.
- REPLAY_ATTACK: previously valid messages or commands are repeated at an incorrect time.
- DENIAL_OF_SERVICE: vehicle-network communication is delayed, flooded, unavailable, or disrupted.
- SENSOR_SPOOFING: false or manipulated camera, radar, distance, speed, proximity, or ADAS sensor information.
- UNCLASSIFIED: cybersecurity-related but insufficient evidence exists, or the incident is outside these five supported scenarios.

Rules:
1. Use only the supplied FTIR information.
2. Never invent technical evidence.
3. Do not force a report into a supported type. Use UNCLASSIFIED when appropriate.
4. For a known attackCode use identificationStatus IDENTIFIED.
5. For UNCLASSIFIED use identificationStatus UNCLASSIFIED.
6. confidenceScore must be from 0 to 1.
7. targetedEcus must use only the supplied ECU codes.
8. simulationParameters describe only safe, high-level virtual simulation behaviour; do not provide real-world exploit instructions, real CAN identifiers, payloads, credentials, or hardware commands.
9. Return one attack profile for every reportId and no text outside the required JSON.
`;

export const buildAttackIdentificationPrompt = (reports) => {
  const payload = reports.map((report) => ({
    reportId: report.id,
    ftirNumber: report.ftirNumber,
    vehicleModel: report.vehicleModel,
    subject: report.cleanedSubject,
  }));

  return `Identify the likely automotive cyberattack profile for every report below.\n\nSupported attack codes: ${ATTACK_CODES.join(", ")}\n\nReports:\n${JSON.stringify(payload, null, 2)}`;
};