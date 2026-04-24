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

import { checkBackendHealth } from "./api/health";
import AdminPanel from "./pages/AdminPanel";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import LandingPage from "./pages/LandingPage";
import NeedHeatmap from "./pages/NeedHeatmap";
import SurveyUpload from "./pages/SurveyUpload";
import TaskCreate from "./pages/TaskCreate";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import VolunteerRegister from "./pages/VolunteerRegister";
import LoginPage from "./pages/LoginPage";
import VolunteerSchedulePage from "./pages/VolunteerSchedulePage";
import VolunteerExecutionPage from "./pages/VolunteerExecutionPage";
import VolunteerUpload from "./pages/VolunteerUpload";
import OCRReviewQueue from "./components/OCRReviewQueue";
import ImpactDashboard from "./components/ImpactDashboard";
import BatchMatchingBoard from "./components/BatchMatchingBoard";
import { useRole } from "./context/RoleContext";
import NGOLogin from "./pages/NGOLogin";
import NGORegister from "./pages/NGORegister";
import AuthGuard from "./components/AuthGuard";

type NavItem = {
  to: string;
  label: string;
};

const allNavItems: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/coordinator", label: "Coordinator" },
  { to: "/coordinator/batch-match", label: "Batch Matching" },
  { to: "/coordinator/ocr-queue", label: "OCR Queue" },
  { to: "/analytics", label: "Impact Analytics" },
  { to: "/volunteer/dashboard", label: "Volunteer Profile" },
  { to: "/volunteer/schedule", label: "Weekly Schedule" },
  { to: "/volunteer/field-execution", label: "Field Execution" },
  { to: "/heatmap", label: "Need Heatmap" },
  { to: "/admin", label: "Admin" },
];

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, roleConfig } = useRole();

  const isLandingPage = location.pathname === "/";
  const isLoginPage = location.pathname === "/login";
  const isPublicPage = isLandingPage || isLoginPage;

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
    <div className="flex min-h-screen flex-col bg-[#F9F7F2] text-slate-900 font-inter">
      {/* SECTION 1: Navabr */}
      <style>{`
        header nav a { color: var(--slate); transition: color 0.2s; }
        header nav a:hover { color: var(--forest); }
      `}</style>
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-[#FAF8F3]/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-8 py-4">
          <div className="flex items-center justify-between gap-8">
            {/* Logo Left */}
            <NavLink to="/" className="flex items-center gap-2.5 text-[22px] font-black text-[#1A3C2E] font-['Instrument_Serif']">
              <div className="w-2 h-2 rounded-full bg-[#E8712A] animate-pulse"></div>
              <span>Namma Connect {localStorage.getItem('ngo_name') ? `— ${localStorage.getItem('ngo_name')}` : ''}</span>
            </NavLink>
            {/* Nav Links Center */}
            <nav className="hidden lg:flex flex-1 items-center justify-center gap-10">
              {isLandingPage ? (
                <>
                  <a href="#features" className="text-sm font-medium">Features</a>
                  <a href="#how-it-works" className="text-sm font-medium">How it works</a>
                  <a href="#impact" className="text-sm font-medium">Impact</a>
                </>
              ) : !isPublicPage && (
                <div className="flex items-center gap-1">
                  {navItems
                    .filter(item => ["Coordinator", "Volunteer Profile", "Impact Analytics", "Heatmap"].includes(item.label))
                    .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => 
                        `rounded-lg px-4 py-2 text-sm font-bold transition-all duration-300 ${
                          isActive ? "bg-[#EAF4EE] text-[#1A3C2E]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  <UrgentBadge />
                  {navItems
                    .filter(item => !["Home", "Coordinator", "Volunteer Profile", "Impact Analytics", "Heatmap"].includes(item.label))
                    .length > 0 && (
                    <div className="h-4 w-[1px] bg-slate-200 mx-3"></div>
                  )}
                  {navItems
                    .filter(item => !["Home", "Coordinator", "Volunteer Profile", "Impact Analytics", "Heatmap"].includes(item.label))
                    .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => 
                        `rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-300 ${
                          isActive ? "text-[#1A3C2E] underline underline-offset-4" : "text-slate-400 hover:text-slate-700"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </nav>

            {/* CTA Right */}
            <div className="flex items-center gap-6">
              {!isPublicPage && localStorage.getItem('ngo_name') && (
                <div className="hidden xl:block text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organization</p>
                  <p className="text-sm font-bold text-[#1A3C2E]">{localStorage.getItem('ngo_name')}</p>
                </div>
              )}

              <div className="hidden lg:flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                <span className={`h-1.5 w-1.5 rounded-full ${backendConnected ? "bg-[#10b981]" : "bg-red-500"} animate-pulse`} />
                {backendConnected ? "Live" : "Down"}
              </div>
              
              {!isLoginPage && (
                <button
                  onClick={() => {
                    if (isLandingPage) {
                      navigate("/login");
                    } else {
                      localStorage.clear();
                      navigate("/ngo/login");
                    }
                  }}
                  className="rounded-full bg-[#1A3C2E] px-6 py-2.5 text-sm font-bold text-white shadow-xl shadow-[#1A3C2E]/10 transition-all hover:bg-[#2D5E47] hover:-translate-y-0.5 active:scale-95"
                >
                  {isLandingPage ? "Enter Dashboard →" : "Sign Out"}
                </button>
              )}
              
              <button
                className="lg:hidden text-slate-700"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-slate-100 bg-white p-6 lg:hidden">
            <div className="flex flex-col gap-4">
              {isLandingPage ? (
                <>
                  <a href="#features" className="text-sm font-medium">Features</a>
                  <a href="#how-it-works" className="text-sm font-medium">How it works</a>
                  <a href="#impact" className="text-sm font-medium">Impact</a>
                </>
              ) : !isLoginPage ? (
                navItems.filter(item => item.to !== "/").map((item) => (
                  <NavLink key={item.to} to={item.to} className="text-sm font-medium">{item.label}</NavLink>
                ))
              ) : null}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        {isLandingPage ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-[1200px] px-6 py-10">
            {location.pathname === "/coordinator" && <PlatformStats />}
            <Outlet />
          </div>
        )}
      </main>

      {/* SECTION 10: Footer */}
      <footer className="border-t border-slate-100 bg-white p-8 px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-lg font-black text-[#1A3C2E] font-['Instrument_Serif']">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E8712A]"></div>
          Namma Connect
        </div>
        <div className="text-xs font-medium text-slate-400 tracking-tight">
          Built for India 🇮🇳 · Smart Resource Allocation · 2026
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
          className="mt-6 rounded-2xl bg-[#114B3B] px-8 py-4 font-bold text-white hover:bg-[#0d3a2e] shadow-2xl shadow-[#114B3B]/10 transition-all"
        >
          Go to {roleConfig[currentRole].label} Dashboard
        </button>
      </section>
    );
  }

  return <>{children}</>;
}

function UrgentBadge() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const { data: count = 0 } = useQuery({
    queryKey: ["urgent-tasks-count"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/tasks/?status=open`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return 0;
      const tasks = await res.json();
      return tasks.filter((t: any) => t.urgency_score >= 60).length;
    },
    refetchInterval: 60_000,
  });

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-red-600 border border-red-100 animate-pulse">
      <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
      {count} Urgent Needs
    </div>
  );
}

function PlatformStats() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 30_000,
  });

  if (!stats) return null;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
      {[
        { label: "Active NGOs", value: stats.active_ngos || 3, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Total Volunteers", value: stats.active_volunteers, color: "text-teal-600", bg: "bg-teal-50" },
        { label: "Completed Today", value: stats.completed_today, color: "text-emerald-600", bg: "bg-emerald-50" },
      ].map((stat, i) => (
        <div key={i} className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{stat.label}</p>
          <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ngo/login" element={<NGOLogin />} />
        <Route path="/ngo/register" element={<NGORegister />} />
        <Route path="/coordinator" element={<AuthGuard><ProtectedRoute path="/coordinator"><CoordinatorDashboard /></ProtectedRoute></AuthGuard>} />
        <Route path="/volunteers/upload" element={<AuthGuard><ProtectedRoute path="/coordinator"><VolunteerUpload /></ProtectedRoute></AuthGuard>} />
        <Route path="/coordinator/batch-match" element={<AuthGuard><ProtectedRoute path="/coordinator/batch-match"><BatchMatchingBoard /></ProtectedRoute></AuthGuard>} />
        <Route path="/coordinator/ocr-queue" element={<AuthGuard><ProtectedRoute path="/coordinator/ocr-queue"><OCRReviewQueue /></ProtectedRoute></AuthGuard>} />
        <Route path="/analytics" element={<ProtectedRoute path="/analytics"><ImpactDashboard /></ProtectedRoute>} />
        <Route path="/volunteer/dashboard" element={<ProtectedRoute path="/volunteer/dashboard"><VolunteerDashboard /></ProtectedRoute>} />
        <Route path="/volunteer/schedule" element={<ProtectedRoute path="/volunteer/schedule"><VolunteerSchedulePage /></ProtectedRoute>} />
        <Route path="/volunteer/field-execution" element={<ProtectedRoute path="/volunteer/field-execution"><VolunteerExecutionPage /></ProtectedRoute>} />
        <Route path="/volunteer/register" element={<ProtectedRoute path="/volunteer/register"><VolunteerRegister /></ProtectedRoute>} />
        <Route path="/heatmap" element={<ProtectedRoute path="/heatmap"><NeedHeatmap /></ProtectedRoute>} />
        <Route path="/survey/upload" element={<ProtectedRoute path="/survey/upload"><SurveyUpload /></ProtectedRoute>} />
        <Route path="/tasks/new" element={<ProtectedRoute path="/tasks/new"><TaskCreate /></ProtectedRoute>} />
        <Route path="/admin" element={<AuthGuard><ProtectedRoute path="/admin"><AdminPanel /></ProtectedRoute></AuthGuard>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
