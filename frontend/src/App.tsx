import { useEffect, useState, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
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
import { type Role, useRole } from "./context/RoleContext";
import AdminPanel from "./pages/AdminPanel";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import LandingPage from "./pages/LandingPage";
import NeedHeatmap from "./pages/NeedHeatmap";
import SurveyUpload from "./pages/SurveyUpload";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import VolunteerRegister from "./pages/VolunteerRegister";

type ProtectedRouteProps = {
  allowedRoles: Role[];
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

const roleSwitcherOrder: Role[] = ["fieldworker", "coordinator", "volunteer"];
const allRoles: Role[] = ["coordinator", "volunteer", "fieldworker"];

const roleBannerClasses: Record<Role, string> = {
  coordinator: "bg-green-100 text-green-900 border-green-200",
  volunteer: "bg-purple-100 text-purple-900 border-purple-200",
  fieldworker: "bg-orange-100 text-orange-900 border-orange-200",
};

const rolePillBorderClasses: Record<Role, string> = {
  coordinator: "border-green-500",
  volunteer: "border-purple-500",
  fieldworker: "border-orange-500",
};

const roleDotClasses: Record<Role, string> = {
  coordinator: "bg-green-500",
  volunteer: "bg-purple-500",
  fieldworker: "bg-orange-500",
};

function pageLinkClass(isActive: boolean, isAccessible: boolean): string {
  if (!isAccessible) {
    return "rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400 transition-all duration-300";
  }

  return [
    "rounded-md px-3 py-2 text-sm font-medium transition-all duration-300",
    isActive
      ? "bg-[#1D9E75]/10 text-[#1D9E75]"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

function parseRole(value: string): Role {
  if (value === "coordinator" || value === "volunteer" || value === "fieldworker") {
    return value;
  }
  return "coordinator";
}

function roleNameList(roles: Role[], labels: Record<Role, string>): string {
  const names = roles.map((role) => labels[role]);
  if (names.length <= 1) {
    return names[0] || "selected roles";
  }
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { currentRole, setRole, roleConfig } = useRole();

  if (allowedRoles.includes(currentRole)) {
    return <>{children}</>;
  }

  const labels: Record<Role, string> = {
    coordinator: roleConfig.coordinator.label,
    volunteer: roleConfig.volunteer.label,
    fieldworker: roleConfig.fieldworker.label,
  };

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Role restricted</h1>
      <p className="mt-3 text-slate-600">This section is for {roleNameList(allowedRoles, labels)} only.</p>
      <p className="mt-2 text-sm text-slate-500">Switch role to continue with the matching judge perspective.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {allowedRoles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              setRole(role);
              navigate(roleConfig[role].homeRoute, { preventScrollReset: true });
            }}
            className="rounded-md bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-[#167d5e]"
          >
            Switch to {roleConfig[role].label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, setRole, roleConfig } = useRole();
  const backendHealthQuery = useQuery({
    queryKey: ["backend-health"],
    queryFn: checkBackendHealth,
    refetchInterval: 30_000,
    retry: false,
  });
  const backendConnected = backendHealthQuery.data === true;
  const currentRoleMeta = roleConfig[currentRole];
  const currentRoleAllowedRoutes = currentRoleMeta.allowedRoutes;
  const shouldShowRoleBanner = location.pathname !== "/";

  const switchRole = (role: Role): void => {
    setRole(role);
    navigate(roleConfig[role].homeRoute, { preventScrollReset: true });
  };

  const roleCanAccessRoute = (route: string): boolean => {
    return currentRoleAllowedRoutes.includes(route);
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!shouldShowRoleBanner) {
      setBannerVisible(false);
      return;
    }

    setBannerVisible(false);
    if (typeof window === "undefined") {
      setBannerVisible(true);
      return;
    }

    const frameId = window.requestAnimationFrame(() => setBannerVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [currentRole, shouldShowRoleBanner]);

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

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Viewing as:</p>
              <select
                aria-label="Switch role"
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                value={currentRole}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const selectedRole = parseRole(event.target.value);
                  switchRole(selectedRole);
                }}
              >
                {roleSwitcherOrder.map((role) => (
                  <option key={role} value={role}>
                    {roleConfig[role].label}
                  </option>
                ))}
              </select>
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
            </div>

            <div className="justify-self-center">
              <p className="text-center text-xs font-medium text-slate-500">Viewing as:</p>
              <div className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
                {roleSwitcherOrder.map((role) => {
                  const isActive = role === currentRole;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.preventDefault();
                        switchRole(role);
                      }}
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300",
                        isActive
                          ? `${roleConfig[role].color} border-transparent text-white`
                          : `bg-white text-slate-700 ${rolePillBorderClasses[role]} hover:bg-slate-50`,
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-2.5 w-2.5 rounded-full",
                          roleDotClasses[role],
                          isActive ? "ring-2 ring-white/85" : "",
                        ].join(" ")}
                      />
                      {roleConfig[role].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <nav className="flex items-center justify-end gap-1 justify-self-end">
              {navItems.map((item) => {
                const isAccessible = roleCanAccessRoute(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={(event) => {
                      if (!isAccessible) {
                        event.preventDefault();
                      }
                    }}
                    aria-disabled={!isAccessible}
                    title={!isAccessible ? "Switch role to access this section" : undefined}
                    className={({ isActive }) => pageLinkClass(isActive && isAccessible, isAccessible)}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-2 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isAccessible = roleCanAccessRoute(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={(event) => {
                      if (!isAccessible) {
                        event.preventDefault();
                      }
                    }}
                    aria-disabled={!isAccessible}
                    title={!isAccessible ? "Switch role to access this section" : undefined}
                    className={({ isActive }) => pageLinkClass(isActive && isAccessible, isAccessible)}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}

        {shouldShowRoleBanner && (
          <div
            className={[
              "border-t transition-all duration-300",
              roleBannerClasses[currentRole],
              bannerVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            ].join(" ")}
          >
            <div className="w-full px-4 py-1.5 text-xs font-medium sm:px-6 lg:px-8 sm:text-sm">
              You are viewing as {currentRoleMeta.label} - {currentRoleMeta.description}
            </div>
          </div>
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
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={allRoles}>
              <LandingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator"
          element={
            <ProtectedRoute allowedRoles={["coordinator"]}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteer/register"
          element={
            <ProtectedRoute allowedRoles={["volunteer"]}>
              <VolunteerRegister />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteer/dashboard"
          element={
            <ProtectedRoute allowedRoles={["volunteer"]}>
              <VolunteerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/heatmap"
          element={
            <ProtectedRoute allowedRoles={["coordinator", "fieldworker"]}>
              <NeedHeatmap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/survey/upload"
          element={
            <ProtectedRoute allowedRoles={["coordinator", "fieldworker"]}>
              <SurveyUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["coordinator"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
