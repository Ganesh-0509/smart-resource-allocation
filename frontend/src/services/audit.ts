import api from "./api";
import type { AuditLog } from "../types";

export async function getAuditLogs(params?: {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const response = await api.get<AuditLog[]>("/api/audit-logs/", { params });
  return response.data;
}

export async function getEntityHistory(entity_type: string, entity_id: string): Promise<AuditLog[]> {
  const response = await api.get<AuditLog[]>(`/api/audit-logs/${entity_type}/${entity_id}`);
  return response.data;
}
