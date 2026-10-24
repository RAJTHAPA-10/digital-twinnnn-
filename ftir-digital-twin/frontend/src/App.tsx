import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";

const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const CyberFilterPage = lazy(() => import("./pages/CyberFilterPage"));
const ThreatsPage = lazy(() => import("./pages/ThreatsPage"));
const DigitalTwinPage = lazy(() => import("./pages/DigitalTwinPage"));
const ImpactPage = lazy(() => import("./pages/ImpactPage"));
const FinalReportPage = lazy(() => import("./pages/FinalReportPage"));

const Fallback = () => <div className="p-3"><div className="skeleton h-[60vh] rounded-card" /></div>;

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/reports" replace />} />
        {[
          ["/reports", ReportsPage],
          ["/cyber-filter", CyberFilterPage],
          ["/threats", ThreatsPage],
          ["/digital-twin", DigitalTwinPage],
          ["/impact", ImpactPage],
          ["/final-report", FinalReportPage],
        ].map(([path, Page]) => {
          const C = Page as React.ComponentType;
          return <Route key={path as string} path={path as string} element={<Suspense fallback={<Fallback />}><C /></Suspense>} />;
        })}
        {/* Recommendations now live on the Impact Analysis page; keep old links working. */}
        <Route path="/recommendations" element={<Navigate to="/impact" replace />} />
        <Route path="*" element={<Navigate to="/reports" replace />} />
      </Route>
    </Routes>
  );
}