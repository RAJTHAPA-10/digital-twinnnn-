import { Activity, Cpu, FileText, Filter, GitBranch, ShieldAlert } from "lucide-react";

export const NAV = [
  { to: "/reports", label: "FTIR Reports", icon: FileText },
  { to: "/cyber-filter", label: "AI Cyber Filter", icon: Filter },
  { to: "/threats", label: "Threat Correlation", icon: GitBranch },
  { to: "/digital-twin", label: "Digital Twin", icon: Cpu },
  { to: "/impact", label: "Impact Analysis", icon: Activity },
  { to: "/final-report", label: "Final Report", icon: ShieldAlert },
] as const;