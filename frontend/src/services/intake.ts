import api from "./api";
import type { IntakeReport, IntakeReportCreate, TaskCreate } from "../types";

export async function createIntakeReport(data: IntakeReportCreate): Promise<IntakeReport> {
  const response = await api.post<IntakeReport>("/api/intake-reports/", data);
  return response.data;
}

export async function getIntakeReports(params?: {
  status?: string;
  urgency?: string;
}): Promise<IntakeReport[]> {
  const response = await api.get<IntakeReport[]>("/api/intake-reports/", { params });
  return response.data;
}

export async function getIntakeReport(id: string): Promise<IntakeReport> {
  const response = await api.get<IntakeReport>(`/api/intake-reports/${id}`);
  return response.data;
}

export async function getDuplicates(id: string): Promise<IntakeReport[]> {
  const response = await api.get<IntakeReport[]>(`/api/intake-reports/${id}/duplicates`);
  return response.data;
}

export async function reviewIntakeReport(
  id: string, 
  data: { status: string; notes?: string }
): Promise<IntakeReport> {
  const response = await api.patch<IntakeReport>(`/api/intake-reports/${id}/review`, data);
  return response.data;
}

export async function convertToTask(id: string, taskData: TaskCreate): Promise<{ task_id: string }> {
  const response = await api.post<{ task_id: string }>(`/api/intake-reports/${id}/convert-to-task`, taskData);
  return response.data;
}
