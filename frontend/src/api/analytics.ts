const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Analytics APIs
export async function getVolunteerImpactMetrics(volunteerId: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/analytics/volunteer/${volunteerId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get volunteer impact metrics");
  }

  return response.json();
}

export async function getDistrictImpactMetrics(districtName: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/analytics/district/${districtName}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get district impact metrics");
  }

  return response.json();
}

export async function getAllDistrictMetrics(): Promise<any> {
  const response = await fetch(`${API_URL}/api/analytics/all-districts`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get all district metrics");
  }

  return response.json();
}

// Task Template APIs
export async function createTaskTemplate(
  name: string,
  needType: string,
  baseUrgencyScore: number = 50,
  requiredSkills: string[] = [],
  estimatedHours: number = 2,
  description?: string
): Promise<any> {
  const response = await fetch(`${API_URL}/api/analytics/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name,
      need_type: needType,
      description: description || null,
      base_urgency_score: baseUrgencyScore,
      required_skills: requiredSkills,
      estimated_hours: estimatedHours,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create task template");
  }

  return response.json();
}

export async function getTaskTemplates(activeOnly: boolean = true): Promise<any> {
  const params = new URLSearchParams({
    active_only: activeOnly.toString(),
  });

  const response = await fetch(`${API_URL}/api/analytics/templates?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get task templates");
  }

  return response.json();
}

export async function createTaskFromTemplate(
  templateId: string,
  district: string,
  ward: string,
  lat: number,
  lng: number
): Promise<any> {
  const params = new URLSearchParams({
    district,
    ward,
    lat: lat.toString(),
    lng: lng.toString(),
  });

  const response = await fetch(`${API_URL}/api/analytics/templates/${templateId}/use?${params}`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create task from template");
  }

  return response.json();
}

// Batch Matching APIs
export async function suggestBatchMatches(taskIds: string[]): Promise<any> {
  const response = await fetch(`${API_URL}/api/batch-matching/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      open_task_ids: taskIds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to suggest batch matches");
  }

  return response.json();
}

export async function getTaskMatchSuggestions(taskId: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/batch-matching/suggestions/${taskId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get match suggestions");
  }

  return response.json();
}

export async function acceptMatchSuggestion(suggestionId: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/batch-matching/accept-suggestion/${suggestionId}`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to accept match suggestion");
  }

  return response.json();
}

export async function rejectMatchSuggestion(suggestionId: string, reason?: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/batch-matching/reject-suggestion/${suggestionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      reason: reason || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to reject match suggestion");
  }

  return response.json();
}

export async function applyBatchAssignments(
  taskIds: string[],
  volunteerMatches: Record<string, string[]>,
  notes?: string
): Promise<any> {
  const response = await fetch(`${API_URL}/api/batch-matching/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      task_ids: taskIds,
      volunteer_matches: volunteerMatches,
      notes: notes || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to apply batch assignments");
  }

  return response.json();
}

export async function getBatchAssignmentHistory(): Promise<any> {
  const response = await fetch(`${API_URL}/api/batch-matching/history`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get batch assignment history");
  }

  return response.json();
}
