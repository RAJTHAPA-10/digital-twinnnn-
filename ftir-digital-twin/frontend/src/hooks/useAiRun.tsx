import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ui";
import { errMsg } from "../lib/format";
import type { RunResult } from "../types/api";

/** Wraps Gemini-backed endpoints: confirm first, then run with a progress toast. */
export function useAiRun() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<{ title: string; steps: { label: string; run: () => Promise<RunResult> }[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const ask = (title: string, steps: { label: string; run: () => Promise<RunResult> }[]) => setPending({ title, steps });

  const confirm = async () => {
    if (!pending) return;
    const { steps, title } = pending;
    setPending(null);
    setBusy(title);
    const id = toast.loading(steps.length > 1 ? `Step 1 of ${steps.length}: ${steps[0].label}…` : `${steps[0].label}…`);
    try {
      const results: RunResult[] = [];
      for (let i = 0; i < steps.length; i += 1) {
        if (steps.length > 1) toast.loading(`Step ${i + 1} of ${steps.length}: ${steps[i].label}…`, { id });
        results.push(await steps[i].run());
      }
      const processed = results.reduce((s, r) => s + (Number(r.processedCount) || 0), 0);
      toast.success(processed ? `Done. ${processed} report${processed === 1 ? "" : "s"} processed.` : results.at(-1)?.message ?? "Done.", { id });
    } catch (e) {
      toast.error(errMsg(e), { id });
    } finally {
      setBusy(null);
      qc.invalidateQueries();
    }
  };

  const dialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      title={pending?.title ?? ""}
      body="This calls the AI model and may take a few minutes. You can keep using the app while it runs."
      confirmLabel="Run it"
      onConfirm={confirm}
      onCancel={() => setPending(null)}
    />
  );

  return { ask, busy, dialog };
}
