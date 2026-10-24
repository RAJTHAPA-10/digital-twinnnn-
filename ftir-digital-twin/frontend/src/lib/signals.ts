import type { SimEvent } from "../types/api";

const ECUS = ["ENGINE_ECU", "BRAKE_ECU", "STEERING_ECU", "GPS_ECU", "ADAS_ECU"];

export interface SignalPoint {
  t: number;
  ecuHealth: number;
  ecuHealthNormal: number;
  busLoad: number;
  busLoadNormal: number;
}

export const firstAnomalyTime = (events: SimEvent[]) => events.find((e) => e.isAnomalous)?.timeMs ?? null;

/**
 * Builds chart series ONLY from values present in the simulation events:
 * - ecuHealth: % of ECUs whose latest broadcast status is NORMAL
 * - busLoad: CAN frames transmitted per 500 ms window
 * "Normal" = the average value before the first anomalous event.
 */
export function buildSignals(events: SimEvent[], durationMs: number, bucketMs = 500): SignalPoint[] {
  const latestStatus: Record<string, string> = {};
  const points: { t: number; ecuHealth: number; busLoad: number }[] = [];
  let i = 0;
  const sorted = [...events].sort((a, b) => a.timeMs - b.timeMs || a.sequence - b.sequence);

  for (let t = bucketMs; t <= durationMs; t += bucketMs) {
    let frames = 0;
    while (i < sorted.length && sorted[i].timeMs <= t) {
      const e = sorted[i];
      if (e.eventType === "CAN_MESSAGE_TRANSMITTED") {
        frames += 1;
        const inner = (e.data?.data ?? null) as Record<string, unknown> | null;
        if (e.sourceEcu && ECUS.includes(e.sourceEcu) && inner && typeof inner.status === "string") {
          latestStatus[e.sourceEcu] = inner.status;
        }
      }
      if (e.eventType.endsWith("_ECU_AFFECTED") && e.sourceEcu) latestStatus[e.sourceEcu] = "AFFECTED";
      i += 1;
    }
    const known = ECUS.filter((ecu) => latestStatus[ecu]);
    const healthy = known.filter((ecu) => latestStatus[ecu] === "NORMAL").length;
    points.push({ t, ecuHealth: known.length ? Math.round((healthy / known.length) * 100) : 100, busLoad: frames });
  }

  const attackAt = firstAnomalyTime(sorted) ?? durationMs;
  const before = points.filter((p) => p.t < attackAt);
  const avg = (key: "ecuHealth" | "busLoad") =>
    before.length ? Math.round(before.reduce((s, p) => s + p[key], 0) / before.length) : points[0]?.[key] ?? 0;
  const healthNormal = avg("ecuHealth");
  const busNormal = avg("busLoad");

  return points.map((p) => ({ ...p, ecuHealthNormal: healthNormal, busLoadNormal: busNormal }));
}
