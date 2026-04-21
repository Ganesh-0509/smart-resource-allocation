import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  declineAssignment,
  reassignAssignment,
  escalateAssignment,
  getAssignmentHistory,
} from "../api/assignments";
import type { Assignment } from "../types";

interface AssignmentOperationsCardProps {
  assignment: Assignment;
  onStatusChange?: () => void;
}

export default function AssignmentOperationsCard({
  assignment,
  onStatusChange,
}: AssignmentOperationsCardProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [selectedVolunteer, setSelectedVolunteer] = useState("");

  // Fetch history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["assignmentHistory", assignment.id],
    queryFn: () => getAssignmentHistory(assignment.id),
  });

  // Fetch volunteers for reassign
  const { data: volunteers = [] } = useQuery({
    queryKey: ["volunteers"],
    queryFn: async () => {
      const response = await fetch("/api/volunteers/?availability=true&limit=100");
      if (!response.ok) throw new Error("Failed to fetch volunteers");
      return response.json();
    },
    enabled: selectedAction === "reassign",
  });

  // Mutations
  const declineMutation = useMutation({
    mutationFn: () => declineAssignment(assignment.id, reason),
    onSuccess: () => {
      setSelectedAction(null);
      setReason("");
      onStatusChange?.();
    },
  });

  const reassignMutation = useMutation({
    mutationFn: () => reassignAssignment(assignment.id, selectedVolunteer, reason),
    onSuccess: () => {
      setSelectedAction(null);
      setReason("");
      setSelectedVolunteer("");
      onStatusChange?.();
    },
  });

  const escalateMutation = useMutation({
    mutationFn: () => escalateAssignment(assignment.id, selectedVolunteer, reason),
    onSuccess: () => {
      setSelectedAction(null);
      setReason("");
      setSelectedVolunteer("");
      onStatusChange?.();
    },
  });

  const isLoading =
    declineMutation.isPending ||
    reassignMutation.isPending ||
    escalateMutation.isPending;

  if (assignment.status === "declined" || assignment.status === "completed") {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">Assignment Operations</h3>
        <p className="text-sm text-gray-600">Status: {assignment.status}</p>
        {assignment.sla_deadline && (
          <p className="text-sm text-gray-600">
            SLA Deadline: {new Date(assignment.sla_deadline).toLocaleString()}
            {assignment.sla_breached && (
              <span className="ml-2 inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                BREACHED
              </span>
            )}
          </p>
        )}
      </div>

      {selectedAction === null ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {assignment.status === "assigned" && (
            <button
              onClick={() => setSelectedAction("decline")}
              className="px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm font-medium"
            >
              Decline
            </button>
          )}
          <button
            onClick={() => setSelectedAction("reassign")}
            className="px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm font-medium"
          >
            Reassign
          </button>
          <button
            onClick={() => setSelectedAction("escalate")}
            className="px-3 py-2 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 text-sm font-medium"
          >
            Escalate
          </button>
          <button
            onClick={() => setSelectedAction("timeline")}
            className="px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm font-medium"
          >
            Timeline
          </button>
        </div>
      ) : selectedAction === "timeline" ? (
        <div className="space-y-2">
          <button
            onClick={() => setSelectedAction(null)}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            ← Back
          </button>
          {historyLoading ? (
            <p className="text-sm text-gray-600">Loading timeline...</p>
          ) : history && history.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="text-xs bg-gray-50 p-2 rounded border border-gray-100"
                >
                  <div className="font-semibold">
                    {entry.old_status} → {entry.new_status}
                  </div>
                  <div className="text-gray-600">Changed by: {entry.changed_by}</div>
                  {entry.reason && <div className="text-gray-600">Reason: {entry.reason}</div>}
                  <div className="text-gray-500">
                    {new Date(entry.changed_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No history available</p>
          )}
        </div>
      ) : selectedAction === "decline" ? (
        <div className="space-y-2">
          <textarea
            placeholder="Reason for declining"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedAction(null)}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => declineMutation.mutate()}
              disabled={isLoading || !reason.trim()}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {isLoading ? "Processing..." : "Confirm Decline"}
            </button>
          </div>
        </div>
      ) : selectedAction === "reassign" ? (
        <div className="space-y-2">
          <select
            value={selectedVolunteer}
            onChange={(e) => setSelectedVolunteer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">Select volunteer</option>
            {volunteers.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Reason for reassignment"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedAction(null)}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => reassignMutation.mutate()}
              disabled={isLoading || !selectedVolunteer}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {isLoading ? "Processing..." : "Confirm Reassign"}
            </button>
          </div>
        </div>
      ) : selectedAction === "escalate" ? (
        <div className="space-y-2">
          <select
            value={selectedVolunteer}
            onChange={(e) => setSelectedVolunteer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">Select senior volunteer</option>
            {volunteers
              .filter((v: any) => v.performance_score > 80)
              .map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name} (Score: {v.performance_score})
                </option>
              ))}
          </select>
          <textarea
            placeholder="Reason for escalation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            rows={2}
            required
          />
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedAction(null)}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => escalateMutation.mutate()}
              disabled={isLoading || !selectedVolunteer || !reason.trim()}
              className="flex-1 px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {isLoading ? "Processing..." : "Confirm Escalate"}
            </button>
          </div>
        </div>
      ) : null}

      {(declineMutation.isError ||
        reassignMutation.isError ||
        escalateMutation.isError) && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
          {declineMutation.error?.message ||
            reassignMutation.error?.message ||
            escalateMutation.error?.message}
        </div>
      )}
    </div>
  );
}
