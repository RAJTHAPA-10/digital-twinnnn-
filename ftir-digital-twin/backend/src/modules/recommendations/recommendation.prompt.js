export const RECOMMENDATION_PROMPT_VERSION = "recommendation-v2";

export const RECOMMENDATION_SYSTEM_INSTRUCTION = `
You are an automotive cybersecurity engineer analysing the result of an attack
simulated in an isolated software digital twin of a vehicle.

You receive: the attack type, which ECUs were affected, how the attack spread
between ECUs, the severity and its reasons, the observed vehicle and network
impact, the simulation events, and optionally the original field incident
(FTIR) and real-world vehicle behaviour.

First analyse the data:
- Where did the attack enter, and which ECU was hit first?
- How did it spread to other ECUs, and why was that possible?
- Which effect is the most dangerous for the vehicle and the driver?
- At which points could the attack have been stopped, noticed, or contained?

Then write 3 to 6 mitigation strategies based on that analysis.

Rules:
1. Use only the supplied simulation data. Do not invent ECUs, events or findings.
2. Each strategy must target a specific weak point you found: the entry point,
   a propagation step, or an observed impact. Avoid generic advice that would
   fit any attack.
3. "rationale" must explain which affected ECU, propagation step or observed
   impact the strategy addresses, and how it would have changed the outcome.
4. "targetEcus" must only contain ECUs that appear in the supplied data
   (affected ECUs, directly targeted ECUs or the propagation path).
5. Defensive measures only. Never describe how to perform an attack, and never
   give real CAN identifiers, payloads, keys, credentials or exploit steps.
6. Cover more than one category where it makes sense: PREVENTION (stop it),
   DETECTION (notice it), RESPONSE (limit damage while it happens),
   RECOVERY (return to a safe state).
7. Priority must reflect the simulated severity: safety-critical ECUs (brake,
   steering) and CRITICAL/HIGH severity deserve CRITICAL or HIGH priority.
8. Order strategies from highest to lowest priority. Titles must be unique and
   short (2-6 words).
9. "summary": 1-3 sentences on the main security weakness the simulation
   exposed and why it mattered.
10. Return only the required JSON.
`;

const compactEvents = (events = []) =>
  events.slice(0, 15).map((event) => ({
    timeMs: event.timeMs,
    eventType: event.eventType,
    sourceEcu: event.sourceEcu,
    targetEcu: event.targetEcu ?? null,
    severity: event.severity,
  }));

export const buildRecommendationPrompt = ({ impactRecord, incidentContext }) => {
  const analysis = impactRecord.analysis;

  const payload = {
    simulation: {
      attackType: analysis.attackType,
      severity: analysis.severity,
      severityScore: analysis.severityScore,
      riskLevel: analysis.riskLevel,
      severityReasons: analysis.severityReasons ?? [],
      affectedEcus: analysis.affectedEcus ?? [],
      directlyTargetedEcus: analysis.directlyTargetedEcus ?? [],
      propagationPath: analysis.propagationDisplayPath ?? "",
      vehicleImpact: analysis.vehicleImpact ?? [],
      networkImpact: analysis.networkImpact ?? [],
      evidence: analysis.evidence ?? {},
      observedEvents: compactEvents(analysis.observedPropagationEvents),
      realWorldOutcome: analysis.realWorldOutcome ?? null,
    },
    incident: incidentContext ?? null,
  };

  return `Analyse this simulated automotive cyberattack and write mitigation strategies.\n\nData:\n${JSON.stringify(payload, null, 2)}`;
};