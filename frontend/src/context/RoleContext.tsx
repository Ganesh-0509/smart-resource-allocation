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
  currentRole: Role;
  setRole: (role: Role) => void;
  roleConfig: RoleConfigMap;
};

const ROLE_CONFIG: RoleConfigMap = {
  coordinator: {
    label: "Coordinator",
    description: "Oversees operations, assigns tasks, and tracks platform-wide progress.",
    homeRoute: "/coordinator",
    allowedRoutes: ["/", "/coordinator", "/coordinator/batch-match", "/coordinator/ocr-queue", "/analytics", "/heatmap"],
    color: "bg-green-500",
  },
  volunteer: {
    label: "Volunteer",
    description: "Views personal assignments, updates availability, and completes tasks.",
    homeRoute: "/volunteer/dashboard",
    allowedRoutes: ["/", "/volunteer/register", "/volunteer/dashboard", "/volunteer/schedule", "/volunteer/field-execution", "/tasks/new", "/survey/upload"],
    color: "bg-purple-500",
  },
  fieldworker: {
    label: "Field Worker",
    description: "Collects survey data from communities and submits field reports quickly.",
    homeRoute: "/survey/upload",
    allowedRoutes: ["/", "/survey/upload", "/tasks/new", "/heatmap"],
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

const noopSetRole = (_role: Role): void => {
  // No-op for default context value.
};

export const RoleContext = createContext<RoleContextValue>({
  currentRole: "coordinator",
  setRole: noopSetRole,
  roleConfig: ROLE_CONFIG,
});

/**
 * Returns role metadata and current runtime role state.
 */
export const useRole = (): RoleContextValue => {
  return useContext(RoleContext);
};

type RoleProviderProps = {
  children: ReactNode;
};

/**
 * Provides in-memory role state only. Authentication/authorization is handled server-side.
 */
export const RoleProvider = ({ children }: RoleProviderProps) => {
  const [currentRole, setCurrentRole] = useState<Role>("coordinator");

  const setRole = useCallback((role: Role): void => {
    setCurrentRole(role);
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({
      currentRole,
      setRole,
      roleConfig: ROLE_CONFIG,
    }),
    [currentRole, setRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};
