import { Zap } from "lucide-react";
import { toast } from "sonner";
import { useActiveIncident } from "../hooks/incident";
import { useRunPipeline } from "../hooks/pipeline";
import { errMsg } from "../lib/format";
import { Button, Card, EmptyState } from "./ui";

/** Shown on Impact / Recommendations / Final Report before the incident has been simulated. */
export function RunChainPrompt({ what }: { what: string }) {
  const { key, scenario, durationMs } = useActiveIncident();
  const run = useRunPipeline();

  if (!key) {
    return <Card><EmptyState title="Pick an incident first" body="Choose an attack-identified FTIR from the picker above." /></Card>;
  }
  if (!scenario) {
    return <Card><EmptyState title="Nothing to simulate for this incident" body="It has no identified attack type yet. Run Threat Correlation first." /></Card>;
  }
  return (
    <Card>
      <EmptyState
        icon={<Zap className="h-5 w-5" />}
        title={`No ${what} yet`}
        body="Run the digital twin simulation for this incident. Impact and mitigations are generated right after."
        action={
          <Button
            variant="primary"
            loading={run.isPending}
            onClick={() => run.mutateAsync({ key, scenarioType: scenario, durationMs }).catch((e) => toast.error(errMsg(e)))}
          >
            Simulate and analyse
          </Button>
        }
      />
    </Card>
  );
}
