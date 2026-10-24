import { isManualKey, useApp } from "../store/app";
import type { AttackProfile, ScenarioType } from "../types/api";
import { useAllProfiles } from "./data";
import { durationFromSeconds } from "./pipeline";

/** Resolves the active incident into something the digital twin can run. */
export function useActiveIncident(): {
  key: string | null;
  profile: AttackProfile | undefined;
  scenario: ScenarioType | null;
  durationMs: number;
  manual: boolean;
} {
  const key = useApp((s) => s.activeKey);
  const profiles = useAllProfiles();
  const manual = isManualKey(key);
  const profile = key && !manual ? profiles.data?.byFtir.get(key) : undefined;
  const scenario: ScenarioType | null = manual
    ? (key!.slice(7) as ScenarioType)
    : profile && profile.attackType.code !== "UNCLASSIFIED"
      ? profile.attackType.code
      : null;
  return { key, profile, scenario, durationMs: durationFromSeconds(profile?.simulationParameters?.durationSeconds), manual };
}
