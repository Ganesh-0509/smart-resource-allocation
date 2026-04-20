import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import brandLogo from "./assets/namma-connect-logo.svg";
import { checkBackendHealth } from "./api/health";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import LandingPage from "./pages/LandingPage";
import NeedHeatmap from "./pages/NeedHeatmap";
import SurveyUpload from "./pages/SurveyUpload";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import VolunteerRegister from "./pages/VolunteerRegister";

type ProtectedRouteProps = {
  role: "coordinator";
  children: ReactNode;
};

type NavItem = {
  to: string;
  label: string;
};

const navItems: NavItem[] = [
  { to: "/coordinator", label: "Coordinator" },
  { to: "/volunteer/dashboard", label: "Volunteer" },
  { to: "/heatmap", label: "Heatmap" },
  { to: "/survey/upload", label: "Upload Survey" },
];

function pageLinkClass(isActive: boolean): string {
  return [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-[#1D9E75]/10 text-[#1D9E75]"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const currentRole = (localStorage.getItem("role") || localStorage.getItem("userRole") || "").toLowerCase();

  if (currentRole !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const backendHealthQuery = useQuery({
    queryKey: ["backend-health"],
    queryFn: checkBackendHealth,
    refetchInterval: 30_000,
    retry: false,
  });
  const backendConnected = backendHealthQuery.data === true;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <NavLink to="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#1D9E75]">
              <img src={brandLogo} alt="Namma Connect logo" className="h-9 w-9 rounded-xl shadow-sm" />
              <span className="hidden sm:inline">Namma Connect</span>
              <span className="sm:hidden">Namma</span>
            </NavLink>
            <span
              className={[
                "inline-block h-2.5 w-2.5 rounded-full sm:hidden",
                backendConnected ? "bg-emerald-500" : "bg-red-500",
              ].join(" ")}
              aria-label={backendConnected ? "Backend online" : "Backend offline"}
              title={backendConnected ? "Backend online" : "Backend offline"}
            />
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              <span
                className={[
                  "inline-block h-2.5 w-2.5 rounded-full",
                  backendConnected ? "bg-emerald-500" : "bg-red-500",
                ].join(" ")}
                aria-hidden
              />
              {backendConnected ? "Backend online" : "Backend offline"}
            </div>
          </div>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            className="inline-flex items-center rounded-md border border-slate-300 p-2 text-slate-700 md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => pageLinkClass(isActive)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-2 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => pageLinkClass(isActive)}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-emerald-100 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-sm text-slate-600 sm:px-6 lg:px-8">
          Built for India 🇮🇳
        </div>
      </footer>
    </div>
  );
}

function PageShell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-3 text-slate-600">{subtitle}</p>
    </section>
  );
}

function AdminPanel() {
  return <PageShell title="Admin Panel" subtitle="Manage system settings, operational rules, and analytics access." />;
}

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 text-slate-600">The page you are looking for does not exist.</p>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mt-6 rounded-md bg-[#1D9E75] px-4 py-2 font-medium text-white hover:bg-[#167d5e]"
      >
        Go back
      </button>
    </section>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/coordinator"
          element={
            <ProtectedRoute role="coordinator">
              <CoordinatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/volunteer/register" element={<VolunteerRegister />} />
        <Route path="/volunteer/dashboard" element={<VolunteerDashboard />} />
        <Route path="/heatmap" element={<NeedHeatmap />} />
        <Route path="/survey/upload" element={<SurveyUpload />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
