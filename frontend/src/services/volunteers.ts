import api from "./api";
import type { 
  Volunteer, 
  VolunteerCreate, 
  VolunteerStatus, 
  DeleteVolunteerResponse,
  VolunteerImpactMetrics,
  Assignment
} from "../types";

export async function registerVolunteer(data: VolunteerCreate): Promise<Volunteer> {
  const response = await api.post<Volunteer>("/api/volunteers/register", data);
  return response.data;
}

export async function getVolunteers(filters?: { status?: VolunteerStatus }): Promise<Volunteer[]> {
  const response = await api.get<Volunteer[]>("/api/volunteers/", {
    params: filters
  });
  return response.data;
}

export async function getVolunteer(id: string): Promise<Volunteer> {
  const response = await api.get<Volunteer>(`/api/volunteers/${id}`);
  return response.data;
}

export async function getVolunteerTasks(id: string): Promise<Assignment[]> {
  const response = await api.get<Assignment[]>(`/api/volunteers/${id}/tasks`);
  return response.data;
}

export async function updateVolunteerStatus(id: string, status: VolunteerStatus): Promise<Volunteer> {
  const endpoint = `/api/volunteers/${id}/${status}`;
  const response = await api.patch<Volunteer>(endpoint, {});
  return response.data;
}

export async function approveVolunteer(id: string): Promise<Volunteer> {
  const response = await api.patch<Volunteer>(`/api/volunteers/${id}/approve`, {});
  return response.data;
}

export async function rejectVolunteer(id: string): Promise<Volunteer> {
  const response = await api.patch<Volunteer>(`/api/volunteers/${id}/reject`, {});
  return response.data;
}

export async function activateVolunteer(id: string): Promise<Volunteer> {
  const response = await api.patch<Volunteer>(`/api/volunteers/${id}/activate`, {});
  return response.data;
}

export async function deactivateVolunteer(id: string): Promise<Volunteer> {
  const response = await api.patch<Volunteer>(`/api/volunteers/${id}/deactivate`, {});
  return response.data;
}

export async function updateVolunteerAvailability(id: string, availability: boolean): Promise<Volunteer> {
  const response = await api.patch<Volunteer>(`/api/volunteers/${id}/availability`, { availability });
  return response.data;
}

export async function deleteVolunteer(id: string): Promise<DeleteVolunteerResponse> {
  const response = await api.delete<DeleteVolunteerResponse>(`/api/volunteers/${id}`);
  return response.data;
}

export async function getVolunteerImpact(volunteerId: string): Promise<VolunteerImpactMetrics> {
  const response = await api.get<VolunteerImpactMetrics>(`/api/volunteers/${volunteerId}/impact`);
  return response.data;
}

export async function bulkUploadVolunteers(file: File): Promise<{ count: number; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await api.post("/api/volunteers/bulk-upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
