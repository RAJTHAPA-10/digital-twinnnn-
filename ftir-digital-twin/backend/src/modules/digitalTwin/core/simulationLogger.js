export class SimulationLogger {
  constructor() {
    this.events = [];
    this.sequence = 0;
  }

  log({
    timeMs,
    eventType,
    sourceEcu = null,
    targetEcu = null,
    message,
    severity = "INFO",
    isAnomalous = false,
    data = {},
  }) {
    this.sequence += 1;

    const event = {
      sequence: this.sequence,
      timeMs,
      eventType,
      sourceEcu,
      targetEcu,
      message,
      severity,
      isAnomalous,
      data,
    };

    this.events.push(event);
    return event;
  }

  getEvents() {
    return structuredClone(this.events);
  }

  getAnomalies() {
    return this.events
      .filter((event) => event.isAnomalous)
      .map((event) => structuredClone(event));
  }

  getSummary() {
    const anomalies = this.getAnomalies();
    const severityCounts = {
      INFO: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const event of this.events) {
      severityCounts[event.severity] =
        (severityCounts[event.severity] || 0) + 1;
    }

    return {
      totalEvents: this.events.length,
      anomalyCount: anomalies.length,
      severityCounts,
      firstEventTimeMs: this.events[0]?.timeMs ?? null,
      lastEventTimeMs: this.events.at(-1)?.timeMs ?? null,
    };
  }
}