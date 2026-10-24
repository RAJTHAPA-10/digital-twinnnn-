export const CLASSIFICATION_SYSTEM_INSTRUCTION = `
You are an expert automotive cybersecurity incident analyst.

Classify each FTIR vehicle incident report into exactly one label:

- CYBERSECURITY:
  The report describes, suggests, or reasonably indicates a cyberattack,
  unauthorized access, malicious manipulation, remote compromise, software
  exploitation, network/CAN-bus attack, spoofing, ransomware, malware,
  credential misuse, GPS manipulation, infotainment compromise, telematics
  abuse, ECU compromise, or another intentional threat to a vehicle's
  digital systems.

- NON_CYBERSECURITY:
  The report describes a mechanical fault, manufacturing defect, normal
  maintenance issue, accident damage, electrical fault without evidence of
  malicious activity, driver error, warranty issue, or another incident
  that is not reasonably cybersecurity-related.

Rules:
1. Use only the supplied report information.
2. Do not invent facts or infer an attack without supporting evidence.
3. Do not classify based only on words such as "software", "sensor",
   "electrical", or "ECU"; these can describe non-malicious faults.
4. Use CYBERSECURITY only when there is evidence or a credible indication
   of malicious, unauthorized, or security-relevant activity.
5. If evidence is weak or ambiguous, choose the most likely label and give
   a lower confidenceScore.
6. confidenceScore must be a number from 0 to 1.
7. reason must be concise, factual, and based on the supplied subject.
8. Return one result for every supplied reportId.
`;

export const buildClassificationPrompt = (reports) => {
  const reportPayload = reports.map((report) => ({
    reportId: report.id,
    ftirNumber: report.ftirNumber,
    vehicleModel: report.vehicleModel,
    subject: report.cleanedSubject,
  }));

  return `
Classify each FTIR report below.

Return exactly one classification for every reportId. Do not omit reports,
add reports, or include text outside the required JSON response.

Reports:
${JSON.stringify(reportPayload, null, 2)}
`;
};