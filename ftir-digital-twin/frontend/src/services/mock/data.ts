import type { AttackCode, ClassificationLabel } from "../../types/api";

export interface MockSeed {
  ftirNumber: string;
  vehicleModel: string;
  mileage: number;
  registrationDate: string;
  ftirReportDate: string;
  incidentDate: string;
  subject: string;
  label: ClassificationLabel;
  confidence: number;
  reason: string;
  reviewRequired?: boolean;
  /** Pending items stay unprocessed until "Run analysis" is pressed in demo mode. */
  pendingClassification?: boolean;
  attack?: {
    code: AttackCode;
    confidence: number;
    rootCause: string;
    description: string;
    durationSeconds: number;
    expectedEffects: string[];
    targetedEcus: string[];
    pending?: boolean;
  };
}

// 26 demo FTIRs, 11 cyber (~42%), covering all five attack types.
export const MOCK_SEEDS: MockSeed[] = [
  {
    ftirNumber: "FTIR-20001", vehicleModel: "SWIFT", mileage: 18420,
    registrationDate: "2023-03-14", ftirReportDate: "2025-02-11", incidentDate: "2025-02-10",
    subject: "Navigation display shifted the vehicle position to a different road after a remote connectivity event. Location deviation of about 3 km while the car was stationary.",
    label: "CYBERSECURITY", confidence: 0.94,
    reason: "Position jumped while stationary right after a remote connectivity event, which points to a manipulated GNSS signal rather than a hardware fault.",
    attack: {
      code: "GPS_SPOOFING", confidence: 0.91,
      rootCause: "Navigation module accepted unauthenticated GNSS position updates after a remote connectivity session.",
      description: "Spoofed satellite signals pushed false coordinates to the GPS ECU, causing the navigation unit to display an incorrect position.",
      durationSeconds: 12, targetedEcus: ["GPS_ECU", "ADAS_ECU"],
      expectedEffects: ["GPS trust score drops", "Navigation marked untrusted", "ADAS raises a warning"],
    },
  },
  {
    ftirNumber: "FTIR-20002", vehicleModel: "GRAND", mileage: 22610,
    registrationDate: "2022-07-02", ftirReportDate: "2025-02-14", incidentDate: "2025-02-13",
    subject: "Customer reports route guidance became unreliable near the airport. GPS location jumped repeatedly and spoofed coordinates were logged by the telematics unit.",
    label: "CYBERSECURITY", confidence: 0.97,
    reason: "Telematics logs show spoofed coordinates and repeated location jumps, a classic GNSS spoofing pattern.",
    attack: {
      code: "GPS_SPOOFING", confidence: 0.95,
      rootCause: "No plausibility check between GNSS position and wheel-speed odometry.",
      description: "A nearby transmitter broadcast fake GNSS signals, causing repeated position jumps in route guidance.",
      durationSeconds: 15, targetedEcus: ["GPS_ECU"],
      expectedEffects: ["Route position jumps", "Navigation trust lowered"],
    },
  },
  {
    ftirNumber: "FTIR-20003", vehicleModel: "BREZZA", mileage: 15280,
    registrationDate: "2023-11-20", ftirReportDate: "2025-02-18", incidentDate: "2025-02-17",
    subject: "Steering assist torque changed without driver command while cruising at 60 kph. Diagnostic tool shows unknown CAN frames from the OBD port.",
    label: "CYBERSECURITY", confidence: 0.96,
    reason: "Steering state changed without driver command and unknown CAN frames were captured, which suggests injected messages on the bus.",
    attack: {
      code: "CAN_MESSAGE_INJECTION", confidence: 0.93,
      rootCause: "OBD port allowed unrestricted write access to the powertrain CAN segment.",
      description: "A device on the OBD port injected steering override frames onto the CAN bus.",
      durationSeconds: 10, targetedEcus: ["STEERING_ECU"],
      expectedEffects: ["Steering ECU moves to affected state", "Unauthorised message logged"],
    },
  },
  {
    ftirNumber: "FTIR-20004", vehicleModel: "SWIFT", mileage: 30110,
    registrationDate: "2021-05-09", ftirReportDate: "2025-02-20", incidentDate: "2025-02-19",
    subject: "Unauthorised control messages observed on the body CAN. Door locks and indicator toggled without driver command after aftermarket dongle installation.",
    label: "CYBERSECURITY", confidence: 0.92,
    reason: "Unauthorised control messages after an aftermarket dongle was fitted is a strong sign of CAN injection.",
    attack: {
      code: "CAN_MESSAGE_INJECTION", confidence: 0.88,
      rootCause: "Aftermarket dongle bridged the body CAN without message authentication.",
      description: "Injected body-control frames toggled actuators without a matching driver request.",
      durationSeconds: 10, targetedEcus: ["STEERING_ECU", "ENGINE_ECU"],
      expectedEffects: ["Unexpected actuator state changes", "Unauthorised CAN frames"],
    },
  },
  {
    ftirNumber: "FTIR-20005", vehicleModel: "BALENO", mileage: 41200,
    registrationDate: "2020-12-01", ftirReportDate: "2025-02-22", incidentDate: "2025-02-21",
    subject: "Brake warning lamp came on and brake pressure status was replayed from an earlier trip. Logged message timestamps were older than ignition time.",
    label: "CYBERSECURITY", confidence: 0.9,
    reason: "Messages with timestamps older than ignition point to previously recorded frames being replayed.",
    attack: {
      code: "REPLAY_ATTACK", confidence: 0.87,
      rootCause: "Brake status frames carry no freshness counter, so recorded frames are accepted later.",
      description: "Previously captured brake-state frames were re-sent on the bus to override the live brake status.",
      durationSeconds: 10, targetedEcus: ["BRAKE_ECU"],
      expectedEffects: ["Brake ECU affected", "Replayed message detected"],
    },
  },
  {
    ftirNumber: "FTIR-20006", vehicleModel: "BALENO", mileage: 39870,
    registrationDate: "2021-01-18", ftirReportDate: "2025-02-25", incidentDate: "2025-02-24",
    subject: "Keyless entry unlocked the car twice while the owner was away. Dealer suspects a captured key fob signal was replayed near the parking lot.",
    label: "CYBERSECURITY", confidence: 0.88,
    reason: "Unlocks with the owner away and a suspected captured key fob signal match a replay attack.",
    reviewRequired: true,
    attack: {
      code: "REPLAY_ATTACK", confidence: 0.79,
      rootCause: "Rolling-code window too wide, accepting previously captured fob codes.",
      description: "A captured key fob transmission was replayed to unlock the vehicle.",
      durationSeconds: 8, targetedEcus: ["BRAKE_ECU"],
      expectedEffects: ["Replayed command accepted", "Body ECU state change"],
    },
  },
  {
    ftirNumber: "FTIR-20007", vehicleModel: "GRAND", mileage: 27340,
    registrationDate: "2022-09-30", ftirReportDate: "2025-03-02", incidentDate: "2025-03-01",
    subject: "Instrument cluster froze and ADAS features became unavailable for two minutes. CAN bus load reached 98% with a flood of diagnostic frames.",
    label: "CYBERSECURITY", confidence: 0.95,
    reason: "Bus load near 100% from a flood of diagnostic frames is a denial-of-service pattern.",
    attack: {
      code: "DENIAL_OF_SERVICE", confidence: 0.92,
      rootCause: "No rate limiting on the diagnostic gateway; one node could saturate the bus.",
      description: "A flood of low-priority diagnostic frames delayed ADAS and cluster traffic.",
      durationSeconds: 10, targetedEcus: ["ADAS_ECU"],
      expectedEffects: ["CAN messages delayed", "Network health drops", "ADAS degraded"],
    },
  },
  {
    ftirNumber: "FTIR-20008", vehicleModel: "SWIFT", mileage: 12050,
    registrationDate: "2024-01-22", ftirReportDate: "2025-03-04", incidentDate: "2025-03-03",
    subject: "Multiple ECUs reported communication timeout at the same moment. Telematics unit was sending a flood of messages after a remote software update.",
    label: "CYBERSECURITY", confidence: 0.89,
    reason: "Simultaneous timeouts while one unit floods the bus suggests a DoS condition after a remote update.",
    attack: {
      code: "DENIAL_OF_SERVICE", confidence: 0.85,
      rootCause: "Compromised remote update left the telematics unit in a message flood loop.",
      description: "The telematics unit flooded the CAN bus, causing communication timeouts.",
      durationSeconds: 12, targetedEcus: ["ADAS_ECU", "ENGINE_ECU"],
      expectedEffects: ["Bus health degraded", "Delayed safety messages"],
    },
  },
  {
    ftirNumber: "FTIR-20009", vehicleModel: "BREZZA", mileage: 20990,
    registrationDate: "2023-06-11", ftirReportDate: "2025-03-08", incidentDate: "2025-03-07",
    subject: "Emergency braking triggered on an empty road. Front radar reported an obstacle at 1 m that did not exist; sensor values looked spoofed.",
    label: "CYBERSECURITY", confidence: 0.93,
    reason: "A phantom obstacle on an empty road with spoofed-looking sensor values indicates sensor spoofing.",
    attack: {
      code: "SENSOR_SPOOFING", confidence: 0.9,
      rootCause: "ADAS fused radar data without cross-checking camera confirmation.",
      description: "False radar returns produced a phantom obstacle, triggering emergency braking.",
      durationSeconds: 10, targetedEcus: ["ADAS_ECU"],
      expectedEffects: ["Phantom obstacle detected", "ADAS warning raised"],
    },
  },
  {
    ftirNumber: "FTIR-20010", vehicleModel: "GRAND", mileage: 33780,
    registrationDate: "2022-02-15", ftirReportDate: "2025-03-11", incidentDate: "2025-03-10",
    subject: "Lane keep assist steered toward the shoulder. Camera received manipulated lane markings and the sensor confidence dropped suddenly.",
    label: "CYBERSECURITY", confidence: 0.86,
    reason: "Manipulated lane markings fed to the camera is an intentional sensor deception.",
    attack: {
      code: "SENSOR_SPOOFING", confidence: 0.84,
      rootCause: "Lane detection trusted a single camera source without plausibility checks.",
      description: "Projected or painted fake lane markings misled the lane-keep function.",
      durationSeconds: 10, targetedEcus: ["ADAS_ECU", "STEERING_ECU"],
      expectedEffects: ["Lane confidence drops", "ADAS warning raised"],
      pending: true,
    },
  },
  {
    ftirNumber: "FTIR-20011", vehicleModel: "BALENO", mileage: 8800,
    registrationDate: "2024-06-03", ftirReportDate: "2025-03-14", incidentDate: "2025-03-13",
    subject: "Infotainment rebooted and an unknown app requested remote access to vehicle settings. Owner did not install anything.",
    label: "CYBERSECURITY", confidence: 0.81,
    reason: "Unknown app requesting remote access without owner action suggests an intrusion attempt.",
    reviewRequired: true,
    pendingClassification: true,
  },
  // ---- Non-cyber (regular faults) ----
  { ftirNumber: "FTIR-20012", vehicleModel: "GRAND", mileage: 57060, registrationDate: "2024-01-31", ftirReportDate: "2025-03-11", incidentDate: "2025-03-10",
    subject: "Vehicle reported at workshop for wireless charger not working. Charging pad stays cold with phone placed.", label: "NON_CYBERSECURITY", confidence: 0.96, reason: "Charging pad failure is an electrical hardware fault." },
  { ftirNumber: "FTIR-20013", vehicleModel: "SWIFT", mileage: 27258, registrationDate: "2020-12-28", ftirReportDate: "2025-02-24", incidentDate: "2025-02-24",
    subject: "Warning light glowing due to body electrical controller assembly not working. Connector found corroded.", label: "NON_CYBERSECURITY", confidence: 0.97, reason: "A corroded connector explains the warning light." },
  { ftirNumber: "FTIR-20014", vehicleModel: "BREZZA", mileage: 45210, registrationDate: "2021-08-19", ftirReportDate: "2025-02-27", incidentDate: "2025-02-26",
    subject: "AC blower makes noise at speed 3 and 4. Debris found inside the blower housing.", label: "NON_CYBERSECURITY", confidence: 0.98, reason: "Mechanical noise from debris." },
  { ftirNumber: "FTIR-20015", vehicleModel: "BALENO", mileage: 61300, registrationDate: "2019-10-05", ftirReportDate: "2025-03-01", incidentDate: "2025-02-28",
    subject: "Engine check light on, misfire on cylinder 3. Spark plug worn out.", label: "NON_CYBERSECURITY", confidence: 0.98, reason: "Worn spark plug causing misfire." },
  { ftirNumber: "FTIR-20016", vehicleModel: "SWIFT", mileage: 15400, registrationDate: "2023-09-14", ftirReportDate: "2025-03-03", incidentDate: "2025-03-02",
    subject: "Power window on driver side moves slowly. Window regulator cable frayed.", label: "NON_CYBERSECURITY", confidence: 0.97, reason: "Frayed regulator cable." },
  { ftirNumber: "FTIR-20017", vehicleModel: "GRAND", mileage: 38800, registrationDate: "2022-04-11", ftirReportDate: "2025-03-05", incidentDate: "2025-03-04",
    subject: "Infotainment screen flickers when hot. Display ribbon cable loose.", label: "NON_CYBERSECURITY", confidence: 0.9, reason: "Loose display cable; no sign of tampering." },
  { ftirNumber: "FTIR-20018", vehicleModel: "BREZZA", mileage: 52100, registrationDate: "2020-06-23", ftirReportDate: "2025-03-06", incidentDate: "2025-03-05",
    subject: "Brake pedal feels spongy. Air found in brake line during inspection.", label: "NON_CYBERSECURITY", confidence: 0.98, reason: "Air in hydraulic brake line." },
  { ftirNumber: "FTIR-20019", vehicleModel: "BALENO", mileage: 23900, registrationDate: "2022-11-30", ftirReportDate: "2025-03-07", incidentDate: "2025-03-06",
    subject: "Rear camera image is blurry. Lens covered with dried mud.", label: "NON_CYBERSECURITY", confidence: 0.99, reason: "Dirty camera lens." },
  { ftirNumber: "FTIR-20020", vehicleModel: "SWIFT", mileage: 70500, registrationDate: "2018-03-12", ftirReportDate: "2025-03-09", incidentDate: "2025-03-08",
    subject: "Battery drains overnight. Glovebox lamp switch stuck on.", label: "NON_CYBERSECURITY", confidence: 0.97, reason: "Parasitic drain from a stuck lamp switch." },
  { ftirNumber: "FTIR-20021", vehicleModel: "GRAND", mileage: 19800, registrationDate: "2023-05-17", ftirReportDate: "2025-03-10", incidentDate: "2025-03-09",
    subject: "Fuel gauge reads empty with half tank. Fuel level sender faulty.", label: "NON_CYBERSECURITY", confidence: 0.96, reason: "Faulty fuel level sender." },
  { ftirNumber: "FTIR-20022", vehicleModel: "BREZZA", mileage: 36400, registrationDate: "2021-12-09", ftirReportDate: "2025-03-12", incidentDate: "2025-03-11",
    subject: "Parking sensor beeps continuously. Sensor cracked after minor impact.", label: "NON_CYBERSECURITY", confidence: 0.95, reason: "Physically damaged parking sensor." },
  { ftirNumber: "FTIR-20023", vehicleModel: "BALENO", mileage: 48700, registrationDate: "2020-08-28", ftirReportDate: "2025-03-13", incidentDate: "2025-03-12",
    subject: "Headlamp low beam not working on left side. Bulb filament broken.", label: "NON_CYBERSECURITY", confidence: 0.99, reason: "Blown bulb." },
  { ftirNumber: "FTIR-20024", vehicleModel: "SWIFT", mileage: 9100, registrationDate: "2024-07-21", ftirReportDate: "2025-03-15", incidentDate: "2025-03-14",
    subject: "Bluetooth pairing fails with new phone. Phone OS update required.", label: "NON_CYBERSECURITY", confidence: 0.88, reason: "Phone compatibility issue, not an attack." },
  { ftirNumber: "FTIR-20025", vehicleModel: "GRAND", mileage: 28800, registrationDate: "2022-10-02", ftirReportDate: "2025-03-16", incidentDate: "2025-03-15",
    subject: "Steering wheel vibrates at highway speed. Front wheels out of balance.", label: "NON_CYBERSECURITY", confidence: 0.98, reason: "Wheel imbalance.", pendingClassification: true },
  { ftirNumber: "FTIR-20026", vehicleModel: "BREZZA", mileage: 14300, registrationDate: "2023-12-12", ftirReportDate: "2025-03-17", incidentDate: "2025-03-16",
    subject: "Horn not working intermittently. Clock spring connector loose.", label: "NON_CYBERSECURITY", confidence: 0.97, reason: "Loose clock spring connector.", pendingClassification: true },
];
