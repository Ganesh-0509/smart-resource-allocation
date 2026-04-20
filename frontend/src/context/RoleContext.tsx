import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

export type Role = "coordinator" | "volunteer" | "fieldworker";

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

type InitialRoleState = {
  role: Role;
  hasStoredRole: boolean;
};

const ROLE_CONFIG: RoleConfigMap = {
  coordinator: {
    label: "Coordinator",
    description: "Oversees operations, assigns tasks, and tracks platform-wide progress.",
    homeRoute: "/coordinator",
    allowedRoutes: ["/", "/coordinator", "/heatmap", "/survey/upload", "/admin"],
    color: "bg-green-500",
  },
  volunteer: {
    label: "Volunteer",
    description: "Views personal assignments, updates availability, and completes tasks.",
    homeRoute: "/volunteer/dashboard",
    allowedRoutes: ["/", "/volunteer/register", "/volunteer/dashboard"],
    color: "bg-purple-500",
  },
  fieldworker: {
    label: "Field Worker",
    description: "Collects survey data from communities and submits field reports quickly.",
    homeRoute: "/survey/upload",
    allowedRoutes: ["/", "/survey/upload", "/heatmap"],
    color: "bg-orange-500",
  },
};

const isRole = (value: string | null): value is Role => {
  return value === "coordinator" || value === "volunteer" || value === "fieldworker";
};

const getInitialRoleState = (): InitialRoleState => {
  if (typeof window === "undefined") {
    return { role: "coordinator", hasStoredRole: false };
  }

  const storedRole = window.localStorage.getItem("namma_role");
  if (isRole(storedRole)) {
    return { role: storedRole, hasStoredRole: true };
  }

  return { role: "coordinator", hasStoredRole: false };
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
 * Returns role-switcher state and metadata for the current demo perspective.
 */
export const useRole = (): RoleContextValue => {
  return useContext(RoleContext);
};

type RoleProviderProps = {
  children: ReactNode;
};

/**
 * Provides demo role state, persists it to localStorage, and navigates to each role's home route on role changes.
 */
export const RoleProvider = ({ children }: RoleProviderProps) => {
  const initialRoleStateRef = useRef<InitialRoleState>(getInitialRoleState());
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState<Role>(initialRoleStateRef.current.role);
  const previousRoleRef = useRef<Role>(initialRoleStateRef.current.role);
  const didHandleInitialNavigationRef = useRef<boolean>(false);

  const setRole = useCallback((role: Role): void => {
    setCurrentRole(role);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("namma_role", currentRole);
    }
  }, [currentRole]);

  useEffect(() => {
    if (!initialRoleStateRef.current.hasStoredRole && !didHandleInitialNavigationRef.current) {
      navigate(ROLE_CONFIG.coordinator.homeRoute, { replace: true });
      didHandleInitialNavigationRef.current = true;
      previousRoleRef.current = currentRole;
      return;
    }

    if (previousRoleRef.current !== currentRole) {
      navigate(ROLE_CONFIG[currentRole].homeRoute, { replace: true });
      previousRoleRef.current = currentRole;
    }
  }, [currentRole, navigate]);

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
