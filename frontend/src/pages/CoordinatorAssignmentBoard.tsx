import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAssignmentTimeline, getBreachedAssignments } from "../api/assignments";
import AssignmentOperationsCard from "../components/AssignmentOperationsCard";
import AssignmentTimeline from "../components/AssignmentTimeline";
import type { Assignment } from "../types";

export default function CoordinatorAssignmentBoard() {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDays, setFilterDays] = useState(7);
  const [showBreachedOnly, setShowBreachedOnly] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const queryClient = useQueryClient();

  const { data: breachedAssignments = [] } = useQuery({
    queryKey: ["breachedAssignments"],
    queryFn: () => getBreachedAssignments({ limit: 50 }),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: allAssignments = [], isLoading } = useQuery({
    queryKey: ["assignmentTimeline", filterStatus, filterDays],
    queryFn: () =>
      getAssignmentTimeline({
        status: filterStatus || undefined,
        days: filterDays,
      }),
    refetchInterval: 30000,
  });

  const handleStatusChange = () => {
    queryClient.invalidateQueries({ queryKey: ["assignmentTimeline"] });
    queryClient.invalidateQueries({ queryKey: ["breachedAssignments"] });
    setSelectedAssignment(null);
  };

  const breachedCount = breachedAssignments.length;
  const completedCount = allAssignments.filter(
    (a: Assignment) => a.status === "completed"
  ).length;
  const activeCount = allAssignments.filter(
    (a: Assignment) => a.status !== "completed" && a.status !== "declined"
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Assignment Operations Board
        </h1>
        <p className="text-gray-600">
          Manage volunteer assignments, track SLAs, and handle escalations
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Active Assignments</div>
          <div className="text-3xl font-bold text-blue-600">{activeCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Completed</div>
          <div className="text-3xl font-bold text-green-600">{completedCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">SLA Breached</div>
          <div className={`text-3xl font-bold ${breachedCount > 0 ? "text-red-600" : "text-gray-600"}`}>
            {breachedCount}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-3xl font-bold text-gray-900">{allAssignments.length}</div>
        </div>
      </div>

      {/* Breached SLA Alert */}
      {breachedCount > 0 && (
        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <h3 className="font-semibold text-red-900 mb-2">⚠️ {breachedCount} SLA Breaches</h3>
          <p className="text-sm text-red-700 mb-3">
            These assignments have exceeded their SLA deadlines and need immediate attention.
          </p>
          <button
            onClick={() => setShowBreachedOnly(!showBreachedOnly)}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
          >
            {showBreachedOnly ? "Show All" : "Show Breached Only"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="accepted">Accepted</option>
              <option value="escalated">Escalated</option>
              <option value="reassigned">Reassigned</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={filterDays}
              onChange={(e) => setFilterDays(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actions
            </label>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["assignmentTimeline"] })}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Timeline</h2>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <p className="text-gray-600">Loading assignments...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(showBreachedOnly ? breachedAssignments : allAssignments).length > 0 ? (
                  <AssignmentTimeline
                    days={filterDays}
                    status={filterStatus || undefined}
                    showBreachedOnly={showBreachedOnly}
                  />
                ) : (
                  <p className="text-center text-gray-600 py-8">No assignments found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Operations Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            {selectedAssignment ? (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-1">Selected Assignment</div>
                  <div className="text-xs text-blue-700">
                    {selectedAssignment.tasks?.title || "Unknown Task"}
                  </div>
                  <div className="text-xs text-blue-700">
                    Volunteer: {selectedAssignment.volunteers?.name || "Unknown"}
                  </div>
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-900 underline"
                  >
                    Deselect
                  </button>
                </div>
                <AssignmentOperationsCard
                  assignment={selectedAssignment}
                  onStatusChange={handleStatusChange}
                />
              </>
            ) : (
              <div className="p-4 bg-gray-50 rounded text-center text-sm text-gray-600">
                <p>Click on an assignment in the timeline to manage it</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Details Modal Alternative: Show on selection */}
      {selectedAssignment && (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Assignment Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Task</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedAssignment.tasks?.title}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Volunteer</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedAssignment.volunteers?.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Status</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedAssignment.status}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Assigned On</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedAssignment.assigned_at
                  ? new Date(selectedAssignment.assigned_at).toLocaleString()
                  : "N/A"}
              </p>
            </div>
            {selectedAssignment.sla_deadline && (
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">SLA Deadline</p>
                <p className={`text-sm font-medium ${selectedAssignment.sla_breached ? "text-red-600" : "text-gray-900"}`}>
                  {new Date(selectedAssignment.sla_deadline).toLocaleString()}
                  {selectedAssignment.sla_breached && " (BREACHED)"}
                </p>
              </div>
            )}
            {selectedAssignment.check_in_time && (
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Check-in</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(selectedAssignment.check_in_time).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          {selectedAssignment.notes && (
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Notes</p>
              <p className="text-sm text-gray-900">{selectedAssignment.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
