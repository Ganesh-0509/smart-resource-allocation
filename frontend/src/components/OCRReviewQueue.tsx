import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useContext } from "react";
import type { OCRReviewItem, OCRReviewStats } from "../types";
import { getOCRReviewQueue, reviewOCRUpload, getOCRReviewStats } from "../api/scheduling";
import { RoleContext } from "../context/RoleContext";

export default function OCRReviewQueue() {
  const { currentRole } = useContext(RoleContext) || {};
  const coordinatorId = localStorage.getItem("coordinator_id") || localStorage.getItem("user_id");
  const queryClient = useQueryClient();
  const [minConfidence, setMinConfidence] = useState(0.7);
  const [reviewStatus, setReviewStatus] = useState<"pending" | "needs_correction">("pending");
  const [selectedItem, setSelectedItem] = useState<OCRReviewItem | null>(null);
  const [reviewReason, setReviewReason] = useState("");

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["ocrqueue", minConfidence, reviewStatus],
    queryFn: () => getOCRReviewQueue(minConfidence, reviewStatus),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: stats } = useQuery({
    queryKey: ["ocrstats"],
    queryFn: getOCRReviewStats,
    refetchInterval: 60000, // Refetch every minute
  });

  const reviewMutation = useMutation({
    mutationFn: (data: {
      uploadId: string;
      status: "approved" | "rejected" | "needs_correction";
      corrections?: string;
    }) =>
      reviewOCRUpload(
        data.uploadId,
        data.status,
        data.corrections || undefined,
        coordinatorId || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocrqueue"] });
      queryClient.invalidateQueries({ queryKey: ["ocrstats"] });
      setSelectedItem(null);
      setReviewReason("");
    },
  });

  if (!currentRole || currentRole !== "coordinator") {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Only coordinators can access this page.</p>
      </div>
    );
  }

  const reviewQueue: OCRReviewItem[] = queue?.items || [];
  const typedStats: OCRReviewStats | undefined = stats;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OCR Review Queue</h1>
          <p className="text-gray-600">Review and validate OCR-extracted survey data</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Total</p>
            <p className="text-3xl font-bold text-gray-900">{typedStats?.total || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{typedStats?.pending || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Approved</p>
            <p className="text-3xl font-bold text-green-600">{typedStats?.approved || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Rejected</p>
            <p className="text-3xl font-bold text-red-600">{typedStats?.rejected || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Avg Confidence</p>
            <p className="text-3xl font-bold text-blue-600">
              {typedStats ? (typedStats.average_confidence * 100).toFixed(0) : 0}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Filters */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Confidence
                    </label>
                    <select
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value={0}>All</option>
                      <option value={0.5}>50%+</option>
                      <option value={0.7}>70%+</option>
                      <option value={0.8}>80%+</option>
                      <option value={0.9}>90%+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) =>
                        setReviewStatus(e.target.value as "pending" | "needs_correction")
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="pending">Pending Review</option>
                      <option value="needs_correction">Needs Correction</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Confidence Items
                    </label>
                    <div className="text-sm font-medium text-red-600 mt-2">
                      {typedStats?.low_confidence_count || 0} items
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue Items */}
              {queueLoading ? (
                <div className="text-center py-8 text-gray-500">Loading queue...</div>
              ) : reviewQueue.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No items to review</p>
                  <p className="text-gray-400 text-sm">All caught up! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewQueue.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selectedItem?.id === item.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 truncate">
                            {item.raw_ocr_text.substring(0, 60)}...
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="ml-4 text-right">
                          <div
                            className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                              item.confidence_score >= 0.8
                                ? "bg-green-100 text-green-700"
                                : item.confidence_score >= 0.7
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {(item.confidence_score * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-1">
            {selectedItem ? (
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Review Details</h2>

                {/* Image Preview */}
                <div className="mb-6">
                  <img
                    src={selectedItem.image_url}
                    alt="OCR Image"
                    className="w-full rounded-lg border border-gray-200 mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    Confidence: {(selectedItem.confidence_score * 100).toFixed(1)}%
                  </p>
                </div>

                {/* OCR Text */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Extracted Text</h3>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 max-h-40 overflow-y-auto">
                    {selectedItem.raw_ocr_text || "No text extracted"}
                  </div>
                </div>

                {/* Review Actions */}
                <div className="space-y-3 pt-6 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason / Corrections
                    </label>
                    <textarea
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="Add any corrections or notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                      rows={4}
                    />
                  </div>

                  <button
                    onClick={() =>
                      reviewMutation.mutate({
                        uploadId: selectedItem.id,
                        status: "approved",
                        corrections: reviewReason,
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 font-medium"
                  >
                    {reviewMutation.isPending ? "Processing..." : "✓ Approve"}
                  </button>

                  <button
                    onClick={() =>
                      reviewMutation.mutate({
                        uploadId: selectedItem.id,
                        status: "needs_correction",
                        corrections: reviewReason,
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:bg-gray-400 font-medium"
                  >
                    {reviewMutation.isPending ? "Processing..." : "↻ Needs Correction"}
                  </button>

                  <button
                    onClick={() =>
                      reviewMutation.mutate({
                        uploadId: selectedItem.id,
                        status: "rejected",
                        corrections: reviewReason,
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 font-medium"
                  >
                    {reviewMutation.isPending ? "Processing..." : "✗ Reject"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                <p>Select an item from the queue to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
