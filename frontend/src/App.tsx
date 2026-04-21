import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import brandLogo from "./assets/namma-connect-logo.svg";
import { checkBackendHealth } from "./api/health";
import AdminPanel from "./pages/AdminPanel";
import CoordinatorAssignmentBoard from "./pages/CoordinatorAssignmentBoard";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import LandingPage from "./pages/LandingPage";
import NeedHeatmap from "./pages/NeedHeatmap";
import SurveyUpload from "./pages/SurveyUpload";
import TaskCreate from "./pages/TaskCreate";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import VolunteerRegister from "./pages/VolunteerRegister";
import { useRole, type Role } from "./context/RoleContext";

type NavItem = {
  to: string;
  label: string;
};

const allNavItems: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/coordinator", label: "Coordinator" },
  { to: "/assignments", label: "Assignments" },
  { to: "/tasks/new", label: "New Task" },
  { to: "/volunteer/dashboard", label: "Volunteer Dashboard" },
  { to: "/volunteer/register", label: "Register Volunteer" },
  { to: "/heatmap", label: "Heatmap" },
  { to: "/survey/upload", label: "Upload Survey" },
  { to: "/admin", label: "Admin" },
];

function pageLinkClass(isActive: boolean): string {
  return [
    "rounded-md px-3 py-2 text-xs font-medium transition-all duration-300 sm:text-sm",
    isActive
      ? "bg-[#1D9E75]/10 text-[#1D9E75]"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { currentRole, roleConfig, setRole } = useRole();

  const navItems = allNavItems.filter(item => 
    roleConfig[currentRole].allowedRoutes.includes(item.to)
  );
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
        <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
          <div className="md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <NavLink to="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#1D9E75]">
                  <img src={brandLogo} alt="Namma Connect logo" className="h-9 w-9 rounded-xl shadow-sm" />
                  <span className="truncate">Namma</span>
                </NavLink>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <span
                    className={[
                      "inline-block h-2.5 w-2.5 rounded-full",
                      backendConnected ? "bg-emerald-500" : "bg-red-500",
                    ].join(" ")}
                    aria-hidden
                  />
                  {backendConnected ? "Online" : "Offline"}
                </div>
              </div>

              <button
                type="button"
                aria-label="Toggle navigation menu"
                className="inline-flex items-center rounded-md border border-slate-300 p-2 text-slate-700"
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
            <div className="flex items-center gap-3 justify-self-start">
              <NavLink to="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#1D9E75]">
                <img src={brandLogo} alt="Namma Connect logo" className="h-9 w-9 rounded-xl shadow-sm" />
                <span>Namma Connect</span>
              </NavLink>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                <span
                  className={[
                    "inline-block h-2.5 w-2.5 rounded-full",
                    backendConnected ? "bg-emerald-500" : "bg-red-500",
                  ].join(" ")}
                  aria-hidden
                />
                {backendConnected ? "Backend online" : "Backend offline"}
              </div>
              <select
                value={currentRole}
                onChange={(e) => setRole(e.target.value as Role)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-[#1D9E75] focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
              >
                <option value="coordinator">Coordinator</option>
                <option value="volunteer">Volunteer</option>
                <option value="fieldworker">Field Worker</option>
              </select>
            </div>

            <nav className="flex items-center justify-end gap-1 justify-self-end">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => pageLinkClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-2 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => pageLinkClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-emerald-100 bg-white">
        <div className="w-full px-4 py-4 text-sm text-slate-600 sm:px-6 lg:px-8">
          Built for India 🇮🇳
        </div>
      </footer>
    </div>
  );
}

function ProtectedRoute({ children, path }: { children: React.ReactNode; path: string }) {
  const { currentRole, roleConfig } = useRole();
  const navigate = useNavigate();

  const isAllowed = roleConfig[currentRole].allowedRoutes.includes(path);

  useEffect(() => {
    if (!isAllowed) {
      // Redirect to home route for the current role
      navigate(roleConfig[currentRole].homeRoute, { replace: true });
    }
  }, [isAllowed, navigate, currentRole, roleConfig]);

  if (!isAllowed) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-3 text-slate-600">You don't have permission to access this page.</p>
        <button
          type="button"
          onClick={() => navigate(roleConfig[currentRole].homeRoute)}
          className="mt-6 rounded-md bg-[#1D9E75] px-4 py-2 font-medium text-white hover:bg-[#167d5e]"
        >
          Go to {roleConfig[currentRole].label} Dashboard
        </button>
      </section>
    );
  }

  return <>{children}</>;
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
        <Route path="/coordinator" element={<ProtectedRoute path="/coordinator"><CoordinatorDashboard /></ProtectedRoute>} />
        <Route path="/assignments" element={<ProtectedRoute path="/assignments"><CoordinatorAssignmentBoard /></ProtectedRoute>} />
        <Route path="/volunteer/register" element={<ProtectedRoute path="/volunteer/register"><VolunteerRegister /></ProtectedRoute>} />
        <Route path="/volunteer/dashboard" element={<ProtectedRoute path="/volunteer/dashboard"><VolunteerDashboard /></ProtectedRoute>} />
        <Route path="/heatmap" element={<ProtectedRoute path="/heatmap"><NeedHeatmap /></ProtectedRoute>} />
        <Route path="/survey/upload" element={<ProtectedRoute path="/survey/upload"><SurveyUpload /></ProtectedRoute>} />
        <Route path="/tasks/new" element={<ProtectedRoute path="/tasks/new"><TaskCreate /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute path="/admin"><AdminPanel /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
