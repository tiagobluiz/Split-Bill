import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SignInPage } from "./pages/SignInPage";
import { ProtectedRoute, PublicOnlyRoute } from "./routing/RouteGuards";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="events"
            element={<PlaceholderPage title="Events" description="Manage event setup, people, and categories." />}
          />
          <Route
            path="balances"
            element={<PlaceholderPage title="Balances" description="Review who sends, who gets back, and settlement outcomes." />}
          />
          <Route
            path="analytics"
            element={<PlaceholderPage title="Analytics" description="Track daily and category insights with timezone-aware filters." />}
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route index element={<Navigate to="/app/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
