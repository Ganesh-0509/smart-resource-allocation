import { useQuery } from "@tanstack/react-query";
import { getAssignmentTimeline, getBreachedAssignments } from "../api/assignments";
import type { Assignment } from "../types";

interface AssignmentTimelineProps {
  days?: number;
  status?: string;
  volunteerId?: string;
  showBreachedOnly?: boolean;
}

export default function AssignmentTimeline({
  days = 7,
  status,
  volunteerId,
  showBreachedOnly = false,
}: AssignmentTimelineProps) {
  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ["assignmentTimeline", days, status, volunteerId, showBreachedOnly],
    queryFn: async () => {
      if (showBreachedOnly) {
        return getBreachedAssignments({ volunteer_id: volunteerId, limit: 100 });
      }
      return getAssignmentTimeline({ days, status, volunteer_id: volunteerId });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-gray-600">Loading timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        Error loading timeline: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="p-4 bg-gray-50 text-gray-600 rounded text-center">
        No assignments found
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "escalated":
        return "bg-orange-100 text-orange-800";
      case "reassigned":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimelineIcon = (status: string, slaBreached: boolean) => {
    if (slaBreached) return "⚠️";
    switch (status) {
      case "completed":
        return "✓";
      case "accepted":
        return "→";
      case "declined":
        return "✗";
      case "escalated":
        return "↑";
      case "reassigned":
        return "⟲";
      default:
        return "•";
    }
  };

  return (
    <div className="space-y-2">
      {assignments.map((assignment: Assignment, index: number) => (
        <div
          key={assignment.id}
          className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-sm font-bold">
              {getTimelineIcon(assignment.status, assignment.sla_breached || false)}
            </div>
            {index < assignments.length - 1 && (
              <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(assignment.status)}`}>
                {assignment.status}
              </span>
              {assignment.sla_breached && (
                <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                  SLA BREACHED
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-900">
              <strong>Task:</strong> {assignment.tasks?.title || "Unknown"}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Volunteer:</strong> {assignment.volunteers?.name || "Unknown"}
            </div>
            {assignment.tasks && (
              <div className="text-sm text-gray-600">
                <strong>Need Type:</strong> {assignment.tasks.need_type} •{" "}
                <strong>District:</strong> {assignment.tasks.district}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              <strong>Assigned:</strong> {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleString() : "N/A"}
              {assignment.sla_deadline && (
                <>
                  {" • "}
                  <strong>SLA Deadline:</strong> {new Date(assignment.sla_deadline).toLocaleString()}
                </>
              )}
              {assignment.check_in_time && (
                <>
                  {" • "}
                  <strong>Check-in:</strong> {new Date(assignment.check_in_time).toLocaleTimeString()}
                </>
              )}
              {assignment.completed_at && (
                <>
                  {" • "}
                  <strong>Completed:</strong> {new Date(assignment.completed_at).toLocaleString()}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
