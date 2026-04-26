import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "coordinator" | "volunteer" | "fieldworker" | "admin";

type RoleDisplayConfig = {
  label: string;
  description: string;
  homeRoute: string;
  allowedRoutes: readonly string[];
  color: string;
};

type RoleConfigMap = Record<Role, RoleDisplayConfig>;

type RoleContextValue = {
  roleConfig: RoleConfigMap;
};

const ROLE_CONFIG: RoleConfigMap = {
  coordinator: {
    label: "Coordinator",
    description: "Oversees operations, assigns tasks, and tracks platform-wide progress.",
    homeRoute: "/ngo/dashboard",
    allowedRoutes: ["/", "/ngo/dashboard", "/ngo/batch-match", "/ngo/triage", "/analytics", "/heatmap"],
    color: "bg-green-500",
  },
  volunteer: {
    label: "Volunteer",
    description: "Views personal assignments, updates availability, and completes tasks.",
    homeRoute: "/volunteer/dashboard",
    allowedRoutes: ["/", "/volunteer/register", "/volunteer/dashboard", "/volunteer/schedule", "/volunteer/execution", "/field/manual-report", "/field/report"],
    color: "bg-purple-500",
  },
  fieldworker: {
    label: "Field Worker",
    description: "Collects survey data from communities and submits field reports quickly.",
    homeRoute: "/field/report",
    allowedRoutes: ["/", "/field/report", "/field/manual-report", "/heatmap"],
    color: "bg-orange-500",
  },
  admin: {
    label: "Admin",
    description: "Full system access for management and audit logs.",
    homeRoute: "/admin",
    allowedRoutes: ["/", "/admin"],
    color: "bg-slate-900",
  },
};

export const RoleContext = createContext<RoleContextValue>({
  roleConfig: ROLE_CONFIG,
});

/**
 * Returns role metadata.
 */
export const useRole = (): RoleContextValue => {
  return useContext(RoleContext);
};

type RoleProviderProps = {
  children: ReactNode;
};

/**
 * Provides static role configuration.
 */
export const RoleProvider = ({ children }: RoleProviderProps) => {
  const value = useMemo<RoleContextValue>(
    () => ({
      roleConfig: ROLE_CONFIG,
    }),
    [],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

