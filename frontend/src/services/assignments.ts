import type { Assignment } from "../types";

const API_BASE = "/api";

export async function getAssignments(params?: {
  volunteer_id?: string;
  task_id?: string;
  assignment_status?: string;
  active_only?: boolean;
  limit?: number;
}): Promise<Assignment[]> {
  const url = new URL(`${API_BASE}/assignments/`, window.location.origin);
  if (params?.volunteer_id) url.searchParams.set("volunteer_id", params.volunteer_id);
  if (params?.task_id) url.searchParams.set("task_id", params.task_id);
  if (params?.assignment_status) url.searchParams.set("assignment_status", params.assignment_status);
  if (params?.active_only !== undefined) url.searchParams.set("active_only", params.active_only.toString());
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch assignments: ${response.statusText}`);
  }
  return response.json();
}

export async function getAssignment(id: string): Promise<Assignment> {
  const response = await fetch(`${API_BASE}/assignments/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch assignment: ${response.statusText}`);
  }
  return response.json();
}

export async function acceptAssignment(id: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/assignments/${id}/accept`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to accept assignment: ${response.statusText}`);
  }
  return response.json();
}

export async function declineAssignment(id: string, reason: string): Promise<{ message: string; assignment_id: string }> {
  const response = await fetch(`${API_BASE}/assignments/${id}/decline`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw new Error(`Failed to decline assignment: ${response.statusText}`);
  }
  return response.json();
}

export async function reassignAssignment(id: string, newVolunteerId: string, reason?: string): Promise<{ message: string; assignment_id: string }> {
  const response = await fetch(`${API_BASE}/assignments/${id}/reassign`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_volunteer_id: newVolunteerId, reason: reason || "" }),
  });
  if (!response.ok) {
    throw new Error(`Failed to reassign assignment: ${response.statusText}`);
  }
  return response.json();
}

export async function escalateAssignment(id: string, escalatedTo: string, reason: string): Promise<{ message: string; assignment_id: string }> {
  const response = await fetch(`${API_BASE}/assignments/${id}/escalate`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ escalated_to: escalatedTo, reason }),
  });
  if (!response.ok) {
    throw new Error(`Failed to escalate assignment: ${response.statusText}`);
  }
  return response.json();
}

export async function checkInAssignment(id: string, lat: number, lng: number, notes?: string): Promise<{ message: string; assignment_id: string }> {
  const response = await fetch(`${API_BASE}/assignments/${id}/check_in`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, notes: notes || "" }),
  });
  if (!response.ok) {
    throw new Error(`Failed to check in: ${response.statusText}`);
  }
  return response.json();
}

export async function checkOutAssignment(id: string, lat: number, lng: number, outcome?: string, notes?: string): Promise<{ message: string; assignment_id: string }> {
  const response = await fetch(`${API_BASE}/assignments/${id}/check_out`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, outcome: outcome || "Completed", notes: notes || "" }),
  });
  if (!response.ok) {
    throw new Error(`Failed to check out: ${response.statusText}`);
  }
  return response.json();
}

export async function getAssignmentHistory(id: string): Promise<Array<{
  id: string;
  assignment_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  reason: string | null;
  changed_at: string;
}>> {
  const response = await fetch(`${API_BASE}/assignments/${id}/history`);
  if (!response.ok) {
    throw new Error(`Failed to fetch assignment history: ${response.statusText}`);
  }
  return response.json();
}

export async function getBreachedAssignments(params?: {
  volunteer_id?: string;
  task_id?: string;
  limit?: number;
}): Promise<Assignment[]> {
  const url = new URL(`${API_BASE}/assignments/sla/breached`, window.location.origin);
  if (params?.volunteer_id) url.searchParams.set("volunteer_id", params.volunteer_id);
  if (params?.task_id) url.searchParams.set("task_id", params.task_id);
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch breached assignments: ${response.statusText}`);
  }
  return response.json();
}

export async function getAssignmentTimeline(params?: {
  status?: string;
  volunteer_id?: string;
  days?: number;
}): Promise<Assignment[]> {
  const url = new URL(`${API_BASE}/assignments/timeline/dashboard`, window.location.origin);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.volunteer_id) url.searchParams.set("volunteer_id", params.volunteer_id);
  if (params?.days) url.searchParams.set("days", params.days.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch assignment timeline: ${response.statusText}`);
  }
  return response.json();
}
