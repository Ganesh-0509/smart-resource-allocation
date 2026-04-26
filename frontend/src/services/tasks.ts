import api from "./api";
import type {
  AssignTaskResponse,
  DashboardActivity,
  DashboardStats,
  HeatmapPoint,
  Task,
  TaskCreate,
  VolunteerMatch,
} from "../types";

type HeatmapStatusFilter = "open" | "all";

export async function createTask(data: TaskCreate): Promise<Task> {
    const response = await api.post<Task>("/api/tasks/", data);
    return response.data;
}

export async function getTasks(filters?: {
  status?: string;
  need_type?: string;
}): Promise<Task[]> {
    const response = await api.get<Task[]>("/api/tasks/", {
      params: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.need_type ? { need_type: filters.need_type } : {}),
      },
    });
    return response.data;
}

export async function getTask(id: string): Promise<Task> {
    const response = await api.get<Task>(`/api/tasks/${id}`);
    return response.data;
}

export async function getTaskMatches(taskId: string): Promise<VolunteerMatch[]> {
    const response = await api.get<{ top_matches: VolunteerMatch[] }>(`/api/tasks/${taskId}/match-volunteers`);
    return response.data.top_matches;
}

export async function assignVolunteer(
  taskId: string,
  volunteerId: string,
  assignedBy: string,
): Promise<AssignTaskResponse> {
    const response = await api.post<AssignTaskResponse>(
      `/api/tasks/${taskId}/assign`,
      {
        volunteer_id: volunteerId,
        assigned_by: assignedBy,
      }
    );
    return response.data;
}

export async function completeTask(taskId: string): Promise<Task> {
    const response = await api.patch<Task>(`/api/tasks/${taskId}/complete`, {});
    return response.data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>("/api/dashboard/stats");
    return response.data;
}

export async function getHeatmapData(status: HeatmapStatusFilter = "open"): Promise<HeatmapPoint[]> {
    const response = await api.get<HeatmapPoint[]>("/api/dashboard/heatmap", {
      params: { status },
    });
    return response.data;
}

export async function getDashboardActivity(): Promise<DashboardActivity[]> {
    const response = await api.get<DashboardActivity[]>("/api/dashboard/activity");
    return response.data;
}

export async function reassignTask(taskId: string): Promise<{ status: string }> {
  const response = await api.post<{ status: string }>(`/api/tasks/${taskId}/reassign`);
  return response.data;
}
