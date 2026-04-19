import axios from "axios";

import type {
  DashboardActivity,
  DashboardStats,
  HeatmapPoint,
  Task,
  TaskCreate,
  VolunteerMatch,
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

type ApiErrorPayload = {
  detail?: string | { message?: string } | Array<{ msg?: string } | string>;
  message?: string;
};

function toApiError(error: unknown): Error {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;

    if (typeof payload === "string") {
      return new Error(payload);
    }

    if (typeof payload?.detail === "string") {
      return new Error(payload.detail);
    }

    if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
      const first = payload.detail[0];
      if (typeof first === "string") {
        return new Error(first);
      }
      if (typeof first?.msg === "string") {
        return new Error(first.msg);
      }
    }

    if (
      typeof payload?.detail === "object" &&
      payload?.detail !== null &&
      "message" in payload.detail &&
      typeof payload.detail.message === "string"
    ) {
      return new Error(payload.detail.message);
    }

    if (typeof payload?.message === "string") {
      return new Error(payload.message);
    }

    return new Error(error.message || "Request failed");
  }

  if (error instanceof Error) {
    return new Error(error.message);
  }

  return new Error("Request failed");
}

export async function createTask(data: TaskCreate): Promise<Task> {
  try {
    const response = await api.post<Task>("/api/tasks/", data);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getTasks(filters?: {
  status?: string;
  need_type?: string;
}): Promise<Task[]> {
  try {
    const response = await api.get<Task[]>("/api/tasks/", {
      params: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.need_type ? { need_type: filters.need_type } : {}),
      },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getTask(id: string): Promise<Task> {
  try {
    const response = await api.get<Task>(`/api/tasks/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getTaskMatches(taskId: string): Promise<VolunteerMatch[]> {
  try {
    const response = await api.get<VolunteerMatch[]>(`/api/tasks/${taskId}/matches`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function assignVolunteer(
  taskId: string,
  volunteerId: string,
  assignedBy: string,
): Promise<{ message: string; task: Task; sms_sent?: boolean }> {
  try {
    const response = await api.post<{ message: string; task: Task; sms_sent?: boolean }>(
      `/api/tasks/${taskId}/assign`,
      {
        volunteer_id: volunteerId,
        assigned_by: assignedBy,
      },
    );
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function completeTask(taskId: string): Promise<{ message: string; task: Task }> {
  try {
    const response = await api.patch<{ message: string; task: Task }>(`/api/tasks/${taskId}/complete`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await api.get<DashboardStats>("/api/dashboard/stats");
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getHeatmapData(): Promise<HeatmapPoint[]> {
  try {
    const response = await api.get<HeatmapPoint[]>("/api/dashboard/heatmap");
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getDashboardActivity(): Promise<DashboardActivity[]> {
  try {
    const response = await api.get<DashboardActivity[]>("/api/dashboard/activity");
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}
