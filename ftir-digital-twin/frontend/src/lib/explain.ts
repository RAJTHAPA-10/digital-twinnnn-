import type { Classification, EvidenceStrength, Explanation } from "../types/api";

/**
 * Cyber indicator dictionary. Each pattern is matched against the FTIR text;
 * the matched slice is taken verbatim from the text, so evidence is never invented.
 */
const INDICATORS: { re: RegExp; strength: EvidenceStrength; indicator: string }[] = [
  { re: /unauthori[sz]ed[\w\s-]{0,24}?(rewriting|access|control|messages?|frames?|activity|commands?)/i, strength: "Strong", indicator: "Unauthorised access or control" },
  { re: /unauthori[sz]ed/i, strength: "Strong", indicator: "Unauthorised activity" },
  { re: /spoof\w*([\s-]+(coordinates|signals?|values|gps|sensor))?/i, strength: "Strong", indicator: "Spoofed signal" },
  { re: /without (the )?driver (command|input|request)/i, strength: "Strong", indicator: "Action without driver command" },
  { re: /unknown (CAN )?(frames?|messages?|app\w*|device)/i, strength: "Strong", indicator: "Unknown frames or software" },
  { re: /replay\w*/i, strength: "Strong", indicator: "Replayed message" },
  { re: /flood( of [\w\s]{0,20}?(frames|messages))?/i, strength: "Strong", indicator: "Message flood" },
  { re: /\b(hack\w*|tamper\w*|rewrit\w*)/i, strength: "Strong", indicator: "Tampering" },
  { re: /\bCAN (bus|frames?|messages?)\b|\bCAN\b/, strength: "High", indicator: "In-vehicle network" },
  { re: /bus load[^.]{0,20}/i, strength: "High", indicator: "Bus overload" },
  { re: /location (deviation|jump\w*)|position (jump\w*|shift\w*)|shifted the vehicle position/i, strength: "High", indicator: "Location manipulation" },
  { re: /(captured|recorded)[\w\s]{0,20}?(signal|frames?|messages?)/i, strength: "High", indicator: "Captured transmission" },
  { re: /\b(OBD( port)?|aftermarket dongle|dongle)\b/i, strength: "High", indicator: "External device access" },
  { re: /phantom|did not exist|obstacle at \d+ ?m/i, strength: "High", indicator: "Phantom sensor reading" },
  { re: /manipulated[\w\s]{0,20}/i, strength: "High", indicator: "Manipulated input" },
  { re: /remote (connectivity|access|software update|update|event)/i, strength: "Medium", indicator: "Remote entry point" },
  { re: /(programs|functions) automatically (changed|working)/i, strength: "Medium", indicator: "Unexpected autonomous behaviour" },
  { re: /timestamps? (were )?older/i, strength: "Medium", indicator: "Stale timestamps" },
  { re: /immobili[sz]er/i, strength: "Medium", indicator: "Immobiliser involvement" },
  { re: /telematics/i, strength: "Medium", indicator: "Connected unit" },
  { re: /(firmware|software) (update|version)/i, strength: "Medium", indicator: "Software change" },
];

const RANK: Record<EvidenceStrength, number> = { Strong: 3, High: 2, Medium: 1 };

export function extractEvidence(text: string): Explanation["evidence"] {
  const found: Explanation["evidence"] = [];
  const covered: [number, number][] = [];

  for (const { re, strength, indicator } of INDICATORS) {
    const match = re.exec(text);
    if (!match) continue;
    const start = match.index;
    const phrase = text.slice(start, start + match[0].length).trim();
    const end = start + phrase.length;
    if (phrase.length < 3) continue;
    // Skip phrases that overlap one we already kept (keeps the strongest, first-listed match).
    if (covered.some(([s, e]) => start < e && end > s)) continue;
    // Safety net: every phrase MUST be an exact substring of the report.
    if (!text.includes(phrase)) continue;
    covered.push([start, end]);
    found.push({ phrase, strength, indicator });
  }

  return found.sort((a, b) => RANK[b.strength] - RANK[a.strength]);
}

/**
 * explainFTIR: why a report was (or wasn't) flagged as cyber.
 * verdict / confidence / explanation come from the real backend classification.
 */
export function explainFTIR(ftirNumber: string, text: string, classification: Classification | null): Explanation {
  // TODO(LLM): replace with POST /api/v1/classification/explain when available.
  // Expected response: { verdict, confidence, explanation, evidence: [{ phrase, strength }] }.
  // Keep the substring filter below even with an LLM so no evidence can be invented.
  const isCyber = classification?.label === "CYBERSECURITY";
  const evidence = isCyber ? extractEvidence(text) : [];

  let verdict = "Not classified yet";
  if (classification) {
    const c = classification.confidenceScore ?? 0;
    verdict = isCyber
      ? c >= 0.9
        ? "This looks like a real attack"
        : "Probably a cyber incident"
      : "Just a regular fault";
  }

  return {
    verdict,
    isCyber,
    confidence: classification?.confidenceScore ?? null,
    explanation: classification?.reason ?? `No AI classification for ${ftirNumber} yet.`,
    text,
    evidence: evidence.filter((e) => text.includes(e.phrase)),
  };
}

/** Splits text into plain and highlighted parts using exact string matches. */
export function highlight(text: string, phrases: { phrase: string; strength: EvidenceStrength }[]) {
  type Part = { text: string; strength?: EvidenceStrength };
  const marks: { start: number; end: number; strength: EvidenceStrength }[] = [];
  phrases.forEach(({ phrase, strength }) => {
    const start = text.indexOf(phrase);
    if (start >= 0) marks.push({ start, end: start + phrase.length, strength });
  });
  marks.sort((a, b) => a.start - b.start);
  const parts: Part[] = [];
  let cursor = 0;
  marks.forEach((m) => {
    if (m.start < cursor) return;
    if (m.start > cursor) parts.push({ text: text.slice(cursor, m.start) });
    parts.push({ text: text.slice(m.start, m.end), strength: m.strength });
    cursor = m.end;
  });
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
