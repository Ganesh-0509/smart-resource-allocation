import api from "./api";
import type { SchedulingSlot, VolunteerSchedule } from "../types";

export async function createSchedulingSlot(slot: Partial<SchedulingSlot>): Promise<SchedulingSlot> {
  const response = await api.post<SchedulingSlot>("/api/scheduling/slots", slot);
  return response.data;
}

export async function getVolunteerSchedule(volunteerId: string): Promise<VolunteerSchedule> {
  const response = await api.get<VolunteerSchedule>(`/api/scheduling/volunteer/${volunteerId}`);
  return response.data;
}

export async function updateSchedulingSlot(
  slotId: string, 
  updates: Partial<SchedulingSlot>
): Promise<SchedulingSlot> {
  const response = await api.put<SchedulingSlot>(`/api/scheduling/slots/${slotId}`, updates);
  return response.data;
}

export async function deleteSchedulingSlot(slotId: string): Promise<{ status: string }> {
  const response = await api.delete<{ status: string }>(`/api/scheduling/slots/${slotId}`);
  return response.data;
}

export async function getAvailableVolunteers(dayOfWeek: number): Promise<any> {
  const response = await api.get(`/api/scheduling/availability/${dayOfWeek}`);
  return response.data;
}
