import { ChevronDown } from "lucide-react";
import { useAllProfiles } from "../hooks/data";
import { ATTACK_LABEL, humanize } from "../lib/labels";
import { isManualKey, useApp } from "../store/app";

/** Picks the active incident from attack-identified FTIRs. */
export function IncidentSelect({ onlyIdentified = true }: { onlyIdentified?: boolean }) {
  const { data } = useAllProfiles();
  const activeKey = useApp((s) => s.activeKey);
  const setActive = useApp((s) => s.setActive);
  const profiles = (data?.list ?? []).filter((p) => !onlyIdentified || p.identificationStatus === "IDENTIFIED");
  const known = profiles.some((p) => p.report.ftirNumber === activeKey);

  return (
    <label className="relative inline-flex items-center">
      <select
        value={activeKey ?? ""}
        onChange={(e) => setActive(e.target.value || null)}
        className="appearance-none h-9 rounded-full border border-line bg-card pl-4 pr-9 text-[13px] font-mono text-fg outline-none hover:bg-raised cursor-pointer max-w-[320px]"
      >
        <option value="">Choose an incident</option>
        {activeKey && !known && (
          <option value={activeKey}>{isManualKey(activeKey) ? `Manual · ${humanize(activeKey.slice(7))}` : activeKey}</option>
        )}
        {profiles.map((p) => (
          <option key={p.id} value={p.report.ftirNumber}>
            {p.report.ftirNumber} · {ATTACK_LABEL[p.attackType.code]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted" />
    </label>
  );
}
