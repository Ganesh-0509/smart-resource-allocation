import api from "./api";

export interface AdminStats {
  total_ngos: number;
  pending_ngos: number;
  approved_ngos: number;
  suspended_ngos: number;
  total_volunteers: number;
  active_volunteers: number;
  total_tasks: number;
  open_tasks: number;
  completed_tasks: number;
}

export interface NGORecord {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "suspended";
  phone?: string;
  description?: string;
  district?: string;
  state?: string;
  address?: string;
  registration_number?: string;
  org_type?: string;
  website?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  user_id?: string;
  user_role?: string;
  ngo_id?: string;
  created_at: string;
}

export const adminLogin = async (email: string, password: string) => {
  const res = await api.post("/api/admin/login", { email, password });
  return res.data;
};

export const getPlatformStats = async (): Promise<AdminStats> => {
  const res = await api.get("/api/admin/ngos/stats");
  return res.data;
};

export const getAllNGOs = async (status?: string): Promise<NGORecord[]> => {
  const params = status ? { status } : {};
  const res = await api.get("/api/admin/ngos", { params });
  return res.data;
};

export const updateNGOStatus = async (
  ngoId: string,
  status: string,
  reason?: string
): Promise<NGORecord> => {
  const res = await api.patch(`/api/admin/ngos/${ngoId}/status`, {
    status,
    reason,
  });
  return res.data;
};

export const getGlobalAuditLogs = async (limit = 50): Promise<AuditLog[]> => {
  const res = await api.get("/api/admin/audit-logs", { params: { limit } });
  return res.data;
};
