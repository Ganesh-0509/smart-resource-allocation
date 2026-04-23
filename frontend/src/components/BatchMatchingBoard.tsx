import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Task, BatchMatchSuggestion } from "../types";
import {
  suggestBatchMatches,
  getTaskMatchSuggestions,
  acceptMatchSuggestion,
  rejectMatchSuggestion,
  applyBatchAssignments,
  getBatchAssignmentHistory,
} from "../api/analytics";
import { getTasks } from "../api/tasks";

export default function BatchMatchingBoard() {
  const queryClient = useQueryClient();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [acceptedMatches, setAcceptedMatches] = useState<Map<string, string>>(new Map());

  // Get all open tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["open-tasks"],
    queryFn: async () => {
      const response = await getTasks();
      return response.filter((t: Task) => t.status === "open");
    },
  });

  const tasks: Task[] = tasksData || [];

  // Get task suggestions
  const { data: suggestionsData } = useQuery({
    queryKey: ["batch-suggestions", selectedTask?.id],
    queryFn: () => getTaskMatchSuggestions(selectedTask?.id!),
    enabled: !!selectedTask,
  });

  const suggestions: BatchMatchSuggestion[] = suggestionsData?.suggestions || [];

  // Get batch history
  const { data: historyData } = useQuery({
    queryKey: ["batch-history"],
    queryFn: getBatchAssignmentHistory,
  });

  // Mutations
  const suggestMutation = useMutation({
    mutationFn: () => suggestBatchMatches(selectedTaskIds),
    onSuccess: () => {
      setShowSuggestions(true);
      toast.success("Match suggestions generated!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate suggestions");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (suggestionId: string) => acceptMatchSuggestion(suggestionId),
    onSuccess: (data) => {
      toast.success("Assignment created!");
      queryClient.invalidateQueries({ queryKey: ["batch-suggestions"] });
      setAcceptedMatches(
        new Map(acceptedMatches.set(data.suggestion_id, data.assignment_id))
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to accept suggestion");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (suggestionId: string) => rejectMatchSuggestion(suggestionId),
    onSuccess: () => {
      toast.success("Suggestion rejected");
      queryClient.invalidateQueries({ queryKey: ["batch-suggestions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reject suggestion");
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      const volunteerMatches: Record<string, string[]> = {};
      acceptedMatches.forEach((volunteerId, suggestionId) => {
        const suggestion = suggestions.find((s) => s.id === suggestionId);
        if (suggestion) {
          if (!volunteerMatches[suggestion.task_id]) {
            volunteerMatches[suggestion.task_id] = [];
          }
          volunteerMatches[suggestion.task_id].push(volunteerId);
        }
      });
      return applyBatchAssignments(selectedTaskIds, volunteerMatches);
    },
    onSuccess: () => {
      toast.success("Batch assignments applied!");
      queryClient.invalidateQueries({ queryKey: ["open-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["batch-history"] });
      setSelectedTaskIds([]);
      setShowSuggestions(false);
      setAcceptedMatches(new Map());
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to apply assignments");
    },
  });

  const handleTaskSelect = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const history = historyData?.batches || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Batch Matching Board</h1>
          <p className="text-gray-600">Match multiple volunteers to tasks in one operation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Task Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Open Tasks ({selectedTaskIds.length} selected)
                </h2>
                <button
                  onClick={() => setSelectedTaskIds(tasks.map((t) => t.id))}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
              </div>

              {tasksLoading ? (
                <div className="text-center py-8 text-gray-500">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No open tasks available</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.includes(task.id)}
                        onChange={() => handleTaskSelect(task.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        <p className="text-sm text-gray-600">
                          {task.ward}, {task.district} • Urgency: {task.urgency_score}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => suggestMutation.mutate()}
                  disabled={selectedTaskIds.length === 0 || suggestMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {suggestMutation.isPending ? "Generating..." : "Generate Suggestions"}
                </button>
              </div>
            </div>

            {/* Suggestions */}
            {showSuggestions && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Match Suggestions</h2>

                <div className="space-y-4">
                  {tasks
                    .filter((t) => selectedTaskIds.includes(t.id))
                    .map((task) => {
                      const taskSuggestions = suggestionsData?.suggestions?.filter(
                        (s: BatchMatchSuggestion) => s.task_id === task.id
                      ) || [];

                      return (
                        <div
                          key={task.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                        >
                          <button
                            onClick={() =>
                              setSelectedTask(selectedTask?.id === task.id ? null : task)
                            }
                            className="w-full text-left"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{task.title}</p>
                                <p className="text-sm text-gray-600">{taskSuggestions.length} suggestions</p>
                              </div>
                              <span className={`text-sm px-2 py-1 rounded ${
                                taskSuggestions.length > 0
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {taskSuggestions.length} matches
                              </span>
                            </div>
                          </button>

                          {selectedTask?.id === task.id && taskSuggestions.length > 0 && (
                            <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                              {taskSuggestions.map((suggestion: BatchMatchSuggestion) => (
                                <div
                                  key={suggestion.id}
                                  className="flex items-center justify-between bg-gray-50 p-3 rounded"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 text-sm">
                                      Score: {suggestion.match_score.toFixed(1)}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Skills: {(suggestion.skill_score || 0).toFixed(0)} | Distance:{" "}
                                      {(suggestion.distance_score || 0).toFixed(0)}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => acceptMutation.mutate(suggestion.id)}
                                      disabled={acceptMutation.isPending || acceptedMatches.has(suggestion.id)}
                                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-gray-400"
                                    >
                                      ✓ Accept
                                    </button>
                                    <button
                                      onClick={() => rejectMutation.mutate(suggestion.id)}
                                      disabled={rejectMutation.isPending}
                                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition disabled:bg-gray-400"
                                    >
                                      ✗ Reject
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => applyMutation.mutate()}
                    disabled={acceptedMatches.size === 0 || applyMutation.isPending}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 font-medium"
                  >
                    {applyMutation.isPending ? "Applying..." : "Apply All Assignments"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: History */}
          <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment History</h3>

            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No batch assignments yet</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 10).map((batch: any) => (
                  <div key={batch.id} className="border border-gray-200 rounded p-3">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{batch.matched_count} matched</p>
                      <p className="text-xs text-gray-600">
                        {batch.task_count} tasks • {batch.volunteer_count} volunteers
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
