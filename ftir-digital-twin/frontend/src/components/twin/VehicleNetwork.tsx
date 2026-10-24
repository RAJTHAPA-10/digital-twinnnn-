import { useColors } from "../../hooks/useColors";
import { ecuLabel } from "../../lib/labels";

interface NodeDef {
  id: string;
  x: number;
  y: number;
  simulated: boolean;
}

const BUS_Y = 160;
const W = 112;
const H = 46;

const NODES: NodeDef[] = [
  { id: "ENGINE_ECU", x: 190, y: 56, simulated: true },
  { id: "BRAKE_ECU", x: 330, y: 56, simulated: true },
  { id: "STEERING_ECU", x: 470, y: 56, simulated: true },
  { id: "GPS_ECU", x: 610, y: 56, simulated: true },
  { id: "ADAS_ECU", x: 260, y: 264, simulated: true },
  { id: "INFOTAINMENT_ECU", x: 400, y: 264, simulated: false },
  { id: "TELEMATICS_ECU", x: 540, y: 264, simulated: false },
  { id: "GATEWAY_ECU", x: 690, y: 264, simulated: false },
];

const ATTACKER = { x: 80, y: 264 };

export interface NetworkState {
  affected: Set<string>;
  transmitting: Set<string>;
  attackActive: boolean;
  attacker: string | null;
  target: string | null;
}

/** hideAttacker: draw the car without the attacker node (used for the "normal behaviour" view). */
export function VehicleNetwork({ state, hideAttacker = false }: { state: NetworkState; hideAttacker?: boolean }) {
  const c = useColors();
  const target = NODES.find((n) => n.id === state.target);

  return (
    <svg viewBox="0 0 760 320" className="w-full h-auto select-none" role="img" aria-label="Vehicle CAN network">
      {/* Bus */}
      <line x1={40} y1={BUS_Y} x2={740} y2={BUS_Y} stroke={c.line} strokeWidth={6} strokeLinecap="round" />
      <line x1={40} y1={BUS_Y} x2={740} y2={BUS_Y} stroke={c.accent} strokeWidth={2} opacity={0.5} className="bus-flow" />
      <text x={40} y={BUS_Y - 12} fontSize={10} fill={c.muted}>CAN bus</text>

      {/* Attack path */}
      {!hideAttacker && state.attackActive && state.attacker && (
        <g>
          <path d={`M ${ATTACKER.x} ${ATTACKER.y - H / 2} L ${ATTACKER.x} ${BUS_Y}`} stroke={c.danger} strokeWidth={2.5} fill="none" className="bus-flow" />
          {target && (
            <path d={`M ${ATTACKER.x} ${BUS_Y} L ${target.x} ${BUS_Y}`} stroke={c.danger} strokeWidth={3} fill="none" className="bus-flow" />
          )}
        </g>
      )}

      {/* Attacker node */}
      <g opacity={state.attackActive ? 1 : 0.35} display={hideAttacker ? "none" : undefined}>
        <line x1={ATTACKER.x} y1={ATTACKER.y - H / 2} x2={ATTACKER.x} y2={BUS_Y} stroke={c.line} strokeWidth={2} strokeDasharray="3 4" opacity={state.attackActive ? 0 : 1} />
        <rect x={ATTACKER.x - 52} y={ATTACKER.y - H / 2} width={104} height={H} rx={12}
          fill={state.attackActive ? c.danger : c.card} fillOpacity={state.attackActive ? 0.15 : 1}
          stroke={state.attackActive ? c.danger : c.line} strokeDasharray={state.attackActive ? undefined : "4 4"} />
        <text x={ATTACKER.x} y={ATTACKER.y - 3} textAnchor="middle" fontSize={12} fontWeight={500} fill={state.attackActive ? c.danger : c.muted}>
          {state.attacker ? ecuLabel(state.attacker) : "Attacker"}
        </text>
        <text x={ATTACKER.x} y={ATTACKER.y + 13} textAnchor="middle" fontSize={9} fill={c.muted}>{state.attackActive ? "injecting" : "idle"}</text>
      </g>

      {/* ECUs */}
      {NODES.map((n) => {
        const affected = n.simulated && state.affected.has(n.id);
        const tx = n.simulated && state.transmitting.has(n.id);
        const targeted = state.attackActive && state.target === n.id;
        const above = n.y < BUS_Y;
        const stubFrom = above ? n.y + H / 2 : n.y - H / 2;
        const stroke = affected ? c.danger : tx ? c.accent : c.line;
        return (
          <g key={n.id} opacity={n.simulated ? 1 : 0.55}>
            {!n.simulated && <title>Not simulated yet</title>}
            <line x1={n.x} y1={stubFrom} x2={n.x} y2={BUS_Y} stroke={affected || targeted ? c.danger : tx ? c.accent : c.line} strokeWidth={targeted ? 3 : 2}
              strokeDasharray={n.simulated ? undefined : "3 4"} style={{ transition: "stroke 200ms" }} />
            <circle cx={n.x} cy={BUS_Y} r={4} fill={affected ? c.danger : c.card} stroke={stroke} strokeWidth={2} />
            <rect x={n.x - W / 2} y={n.y - H / 2} width={W} height={H} rx={12}
              fill={affected ? c.danger : c.card} fillOpacity={affected ? 0.14 : 1}
              stroke={stroke} strokeWidth={affected || tx ? 1.5 : 1} strokeDasharray={n.simulated ? undefined : "4 4"}
              style={{ transition: "all 200ms" }} />
            <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize={12} fontWeight={500} fill={affected ? c.danger : n.simulated ? c.fg : c.muted}>
              {ecuLabel(n.id)}
            </text>
            <text x={n.x} y={n.y + 13} textAnchor="middle" fontSize={9} fill={affected ? c.danger : c.muted}>
              {!n.simulated ? "not simulated" : affected ? "affected" : targeted ? "under attack" : "normal"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}