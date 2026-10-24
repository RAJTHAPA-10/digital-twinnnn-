import { ArrowRight, CheckCircle2, ChevronDown, FastForward, Pause, Play, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { IncidentSelect } from "../components/IncidentSelect";
import { PageFrame } from "../components/layout/PageFrame";
import { VehicleNetwork, type NetworkState } from "../components/twin/VehicleNetwork";
import { Button, Card, EmptyState, ErrorState, Pill, Segmented, cx } from "../components/ui";
import { useActiveIncident } from "../hooks/incident";
import { useRunPipeline, useSimulation } from "../hooks/pipeline";
import { errMsg, fmtMs } from "../lib/format";
import { ATTACK_LABEL, ecuLabel, prettyText } from "../lib/labels";
import { isManualKey, useApp } from "../store/app";
import { SCENARIO_TYPES, type SimEvent, type SimulationRun } from "../types/api";

const SIMULATED = ["ENGINE_ECU", "BRAKE_ECU", "STEERING_ECU", "GPS_ECU", "ADAS_ECU"];
const IDLE: NetworkState = { affected: new Set(), transmitting: new Set(), attackActive: false, attacker: null, target: null };

/** Replays backend events against a virtual clock (the backend finishes instantly). */
function usePlayback(run: SimulationRun | null | undefined) {
  const duration = run?.input.durationMs ?? 10_000;
  const [time, setTime] = useState(duration);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const raf = useRef<number>();
  const last = useRef<number>();

  useEffect(() => {
    setTime(run ? run.input.durationMs : 10_000);
    setPlaying(false);
  }, [run?.runId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return;
    const step = (now: number) => {
      const dt = last.current ? now - last.current : 0;
      last.current = now;
      setTime((t) => {
        const next = Math.min(duration, t + dt * speed);
        if (next >= duration) setPlaying(false);
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = undefined;
    };
  }, [playing, speed, duration]);

  const play = useCallback(() => {
    setTime((t) => (t >= duration ? 0 : t));
    setPlaying(true);
  }, [duration]);

  return { time, setTime, playing, setPlaying, play, speed, setSpeed, duration };
}

/** One side of the comparison: a title, the vehicle network, and a short plain-English list. */
function ScenarioPanel({ tone, title, subtitle, state, hideAttacker, points }: {
  tone: "safe" | "danger";
  title: string;
  subtitle: string;
  state: NetworkState;
  hideAttacker?: boolean;
  points: string[];
}) {
  const Icon = tone === "safe" ? ShieldCheck : ShieldAlert;
  return (
    <div className={cx("rounded-2xl border p-4 flex flex-col gap-3 min-w-0", tone === "safe" ? "border-safe/25" : "border-danger/30")}>
      <div className="flex items-center gap-2.5">
        <span className={cx("h-8 w-8 rounded-full grid place-items-center shrink-0", tone === "safe" ? "bg-safe-soft text-safe" : "bg-danger-soft text-danger")}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-tight">{title}</p>
          <p className="text-[11px] text-muted truncate">{subtitle}</p>
        </div>
      </div>
      <VehicleNetwork state={state} hideAttacker={hideAttacker} />
      <ul className="flex flex-col gap-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-[13px] leading-relaxed">
            <span className={cx("mt-[7px] h-1.5 w-1.5 rounded-full shrink-0", tone === "safe" ? "bg-safe" : "bg-danger")} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DigitalTwinPage() {
  const navigate = useNavigate();
  const setActive = useApp((s) => s.setActive);
  const { key: activeKey, scenario, durationMs } = useActiveIncident();
  const sim = useSimulation(activeKey);
  const runPipeline = useRunPipeline();
  const [manualOpen, setManualOpen] = useState(false);

  const run = sim.data ?? null;
  const pb = usePlayback(run);

  const events = useMemo(() => [...(run?.result.events ?? [])].sort((a, b) => a.timeMs - b.timeMs || a.sequence - b.sequence), [run]);
  const seen = useMemo(() => events.filter((e) => e.timeMs <= pb.time), [events, pb.time]);
  const done = Boolean(run) && pb.time >= pb.duration;

  /** Normal behaviour: the same car, but only the regular ECU traffic (attack removed). */
  const normal: NetworkState = useMemo(() => {
    const window = seen.filter((e) => e.eventType === "CAN_MESSAGE_TRANSMITTED" && !e.isAnomalous && SIMULATED.includes(e.sourceEcu ?? "") && e.timeMs > pb.time - 250);
    return { ...IDLE, transmitting: new Set(window.map((e) => e.sourceEcu ?? "")) };
  }, [seen, pb.time]);

  /** Under attack: everything the backend simulation recorded. */
  const attacked: NetworkState = useMemo(() => {
    const affected = new Set<string>();
    let attacker: string | null = null;
    let target: string | null = null;
    seen.forEach((e: SimEvent) => {
      if (e.eventType.endsWith("_ECU_AFFECTED") && e.sourceEcu) affected.add(e.sourceEcu);
      if (e.eventType === "ADAS_WARNING_RAISED") affected.add("ADAS_ECU");
      if (e.eventType === "SCENARIO_ACTIVATED") target = e.targetEcu;
      if (e.isAnomalous && e.eventType === "CAN_MESSAGE_TRANSMITTED" && e.sourceEcu && !SIMULATED.includes(e.sourceEcu)) attacker ??= e.sourceEcu;
    });
    if (run && done) {
      Object.entries(run.result.vehicleState.ecus).forEach(([id, ecu]) => ecu.status === "AFFECTED" && affected.add(id));
    }
    const window = seen.filter((e) => e.eventType === "CAN_MESSAGE_TRANSMITTED" && e.timeMs > pb.time - 250);
    return {
      affected,
      transmitting: new Set(window.map((e) => e.sourceEcu ?? "")),
      attackActive: seen.some((e) => e.eventType === "SCENARIO_ACTIVATED"),
      attacker,
      target,
    };
  }, [seen, run, pb.time, done]);

  const attackAt = events.find((e) => e.isAnomalous)?.timeMs ?? null;
  const attackStarted = attackAt !== null && pb.time >= attackAt;

  const normalPoints = useMemo(() => {
    const frames = seen.filter((e) => e.eventType === "CAN_MESSAGE_TRANSMITTED" && !e.isAnomalous && SIMULATED.includes(e.sourceEcu ?? "")).length;
    return [
      "Engine, Brake, Steering, GPS and ADAS each send a status message on the CAN bus every 0.5 s.",
      `Every message is delivered on time and trusted${run ? ` (${frames} normal messages so far).` : "."}`,
      "All parts stay in their normal state. The car drives as expected.",
    ];
  }, [seen, run]);

  const attackPoints = useMemo(() => {
    if (!run) return ["Press Simulate attack to see how the car reacts."];
    if (!attackStarted) return [`Everything looks normal until the attack starts at ${fmtMs(attackAt ?? 0)}.`];
    const items = new Set<string>();
    seen
      .filter((e) => e.isAnomalous && e.eventType !== "CAN_MESSAGE_DELIVERED" && e.eventType !== "CAN_MESSAGE_TRANSMITTED")
      .forEach((e) => items.add(prettyText(e.message)));
    if (done) run.result.vehicleState.alerts.forEach((a) => items.add(prettyText(a.message)));
    const list = [...items].slice(0, 4);
    if (attacked.affected.size) list.push(`Affected: ${[...attacked.affected].map(ecuLabel).join(", ")}.`);
    return list;
  }, [run, seen, done, attackStarted, attackAt, attacked.affected]);

  const simulate = async () => {
    if (!activeKey || !scenario) return;
    try {
      await runPipeline.mutateAsync({ key: activeKey, scenarioType: scenario, durationMs });
      pb.setTime(0);
      pb.setPlaying(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const progress = Math.min(100, (pb.time / pb.duration) * 100);

  return (
    <PageFrame
      title="Digital Twin"
      subtitle="How the car behaves normally, and what changes during the attack"
      actions={
        <>
          <IncidentSelect />
          <div className="relative">
            <Button size="sm" variant="quiet" onClick={() => setManualOpen((o) => !o)}>
              Or pick a scenario <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {manualOpen && (
              <div className="absolute z-30 mt-1 card p-1.5 w-52">
                {SCENARIO_TYPES.map((s) => (
                  <button key={s} onClick={() => { setActive(`manual:${s}`); setManualOpen(false); }}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-raised">{ATTACK_LABEL[s]}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1" />
          <Pill tone="indigo"><ShieldCheck className="h-3 w-3" /> Simulated environment, no real vehicle involved</Pill>
          <Button variant="primary" onClick={simulate} loading={runPipeline.isPending} disabled={!scenario} icon={<Zap className="h-3.5 w-3.5" />}>
            Simulate attack
          </Button>
        </>
      }
    >
      {!activeKey || !scenario ? (
        <Card>
          <EmptyState
            title={activeKey && !scenario ? "This incident has no attack type to simulate" : "Pick an incident to simulate"}
            body="Choose an attack-identified FTIR above, or run one of the five scenarios directly."
          />
        </Card>
      ) : (
        <Card
          title={
            <span className="flex items-center gap-2">
              {isManualKey(activeKey) ? "Manual run" : <span className="ftir-id">{activeKey}</span>}
              <span className="text-muted font-normal">· {ATTACK_LABEL[scenario]}</span>
            </span>
          }
          action={
            run && (
              <div className="flex items-center gap-2">
                <Segmented<"1" | "2" | "4">
                  value={String(pb.speed) as "1" | "2" | "4"}
                  onChange={(v) => pb.setSpeed(Number(v) as 1 | 2 | 4)}
                  options={[{ value: "1", label: "1x" }, { value: "2", label: "2x" }, { value: "4", label: "4x" }]}
                />
                <Button size="sm" variant="ghost" onClick={() => (pb.playing ? pb.setPlaying(false) : pb.play())}
                  icon={pb.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}>
                  {pb.playing ? "Pause" : "Replay"}
                </Button>
                <Button size="sm" variant="quiet" onClick={() => { pb.setPlaying(false); pb.setTime(pb.duration); }} icon={<FastForward className="h-3.5 w-3.5" />}>
                  Skip
                </Button>
              </div>
            )
          }
        >
          {sim.isLoading || runPipeline.isPending ? (
            <div className="grid gap-[10px] lg:grid-cols-2"><div className="skeleton h-[380px] rounded-2xl" /><div className="skeleton h-[380px] rounded-2xl" /></div>
          ) : sim.isError ? (
            <ErrorState error={sim.error} onRetry={() => sim.refetch()} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-[10px] lg:grid-cols-2">
                <ScenarioPanel
                  tone="safe"
                  title="Normal behaviour"
                  subtitle="The same car with no attack"
                  state={run ? normal : IDLE}
                  hideAttacker
                  points={normalPoints}
                />
                <ScenarioPanel
                  tone="danger"
                  title={`Under attack · ${ATTACK_LABEL[scenario]}`}
                  subtitle={attackStarted ? "The attacker is active" : "Waiting for the attack to start"}
                  state={run ? attacked : IDLE}
                  points={attackPoints}
                />
              </div>

              {run ? (
                <div className="flex items-center gap-3">
                  <span className="num text-xs text-muted w-12">{fmtMs(pb.time)}</span>
                  <div className="relative flex-1 h-1.5 rounded-full bg-raised overflow-hidden">
                    {attackAt !== null && <div className="absolute top-0 h-full w-0.5 bg-danger z-10" style={{ left: `${(attackAt / pb.duration) * 100}%` }} title="Attack starts" />}
                    <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="num text-xs text-muted w-12 text-right">{fmtMs(pb.duration)}</span>
                </div>
              ) : (
                <div className="flex justify-center">
                  <Button variant="primary" onClick={simulate} icon={<Zap className="h-3.5 w-3.5" />}>Simulate attack</Button>
                </div>
              )}

              {done && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
                  <span className="text-xs text-muted flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-safe" /> Simulation finished</span>
                  <Button variant="ghost" onClick={() => navigate(`/impact?ftir=${encodeURIComponent(activeKey)}`)}>
                    See impact analysis <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </PageFrame>
  );
}