import { Navigate, Route, Routes } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { FilterProvider } from "./FilterContext";
import { ExecutiveDashboard } from "./pages/ExecutiveDashboard";
import { MaturityDashboard } from "./pages/MaturityDashboard";
import { ProductivityDashboard } from "./pages/ProductivityDashboard";
import { QualityDashboard } from "./pages/QualityDashboard";

export function App() {
  return (
    <FilterProvider>
      <Routes>
        <Route element={<Dashboard />}>
          <Route path="/" element={<ExecutiveDashboard />} />
          <Route path="/productivity" element={<ProductivityDashboard />} />
          <Route path="/quality" element={<QualityDashboard />} />
          <Route path="/maturity" element={<MaturityDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FilterProvider>
  );
}
