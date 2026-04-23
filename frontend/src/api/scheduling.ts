import type { SchedulingSlot } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function createSchedulingSlot(
  volunteerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  isRecurring: boolean = true
): Promise<SchedulingSlot> {
  const response = await fetch(`${API_URL}/api/scheduling/slots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      volunteer_id: volunteerId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_recurring: isRecurring,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create scheduling slot");
  }

  return response.json();
}

export async function getVolunteerSchedule(volunteerId: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/scheduling/volunteer/${volunteerId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get volunteer schedule");
  }

  return response.json();
}

export async function updateSchedulingSlot(
  slotId: string,
  updates: Partial<SchedulingSlot>
): Promise<SchedulingSlot> {
  const response = await fetch(`${API_URL}/api/scheduling/slots/${slotId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      start_time: updates.start_time,
      end_time: updates.end_time,
      is_available: updates.is_available,
      is_recurring: updates.is_recurring,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update scheduling slot");
  }

  return response.json();
}

export async function deleteSchedulingSlot(slotId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/scheduling/slots/${slotId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete scheduling slot");
  }
}

export async function getAvailableVolunteers(dayOfWeek: number): Promise<any> {
  const response = await fetch(`${API_URL}/api/scheduling/availability/${dayOfWeek}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get available volunteers");
  }

  return response.json();
}

export async function getOCRReviewQueue(minConfidence: number = 0.0, status: string = "pending"): Promise<any> {
  const params = new URLSearchParams({
    min_confidence: minConfidence.toString(),
    status,
  });

  const response = await fetch(`${API_URL}/api/ocr/review/queue?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get OCR review queue");
  }

  return response.json();
}

export async function reviewOCRUpload(
  uploadId: string,
  reviewStatus: "approved" | "rejected" | "needs_correction",
  corrections?: string,
  reviewerId?: string
): Promise<any> {
  const params = new URLSearchParams();
  if (reviewerId) {
    params.append("reviewer_id", reviewerId);
  }

  const response = await fetch(`${API_URL}/api/ocr/review/${uploadId}?${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      review_status: reviewStatus,
      corrections: corrections || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to review OCR upload");
  }

  return response.json();
}

export async function getOCRReviewStats(): Promise<any> {
  const response = await fetch(`${API_URL}/api/ocr/review/stats`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get OCR review stats");
  }

  return response.json();
}
