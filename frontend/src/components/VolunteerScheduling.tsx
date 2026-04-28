import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { VolunteerSchedule, SchedulingSlot } from "../types";
import {
  createSchedulingSlot,
  deleteSchedulingSlot,
  getVolunteerSchedule,
  updateSchedulingSlot,
} from "../services/scheduling";

interface VolunteerSchedulingProps {
  volunteerId: string;
  volunteerName?: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

export default function VolunteerScheduling({ volunteerId, volunteerName }: VolunteerSchedulingProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "17:00",
    isRecurring: true,
  });

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["volunteerschedule", volunteerId],
    queryFn: () => getVolunteerSchedule(volunteerId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSchedulingSlot({
        volunteer_id: volunteerId,
        day_of_week: newSlot.dayOfWeek,
        start_time: newSlot.startTime,
        end_time: newSlot.endTime,
        is_recurring: newSlot.isRecurring,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteerschedule", volunteerId] });
      setShowAddForm(false);
      setNewSlot({
        dayOfWeek: 0,
        startTime: "09:00",
        endTime: "17:00",
        isRecurring: true,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (slot: SchedulingSlot) => updateSchedulingSlot(slot.id, slot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteerschedule", volunteerId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => deleteSchedulingSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteerschedule", volunteerId] });
    },
  });

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading schedule...</div>;
  }

  const typedSchedule = schedule as VolunteerSchedule;
  const slots = typedSchedule?.slots || [];
  const slotsByDay = Array(7)
    .fill(null)
    .map(() => [] as SchedulingSlot[]);

  slots.forEach((slot) => {
    slotsByDay[slot.day_of_week].push(slot);
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weekly Schedule</h2>
          {volunteerName && <p className="text-gray-600">{volunteerName}</p>}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showAddForm ? "Cancel" : "Add Time Slot"}
        </button>
      </div>

      {/* Add Slot Form */}
      {showAddForm && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6 border-l-4 border-blue-600">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <select
                value={newSlot.dayOfWeek}
                onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {DAYS_OF_WEEK.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <select
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {TIME_SLOTS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <select
                value={newSlot.endTime}
                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {TIME_SLOTS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSlot.isRecurring}
                  onChange={(e) => setNewSlot({ ...newSlot, isRecurring: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Recurring</span>
              </label>
            </div>

            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
            >
              {createMutation.isPending ? "Creating..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="space-y-6">
        {DAYS_OF_WEEK.map((day, dayIdx) => (
          <div key={dayIdx} className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{day}</h3>

            {slotsByDay[dayIdx].length === 0 ? (
              <p className="text-gray-400 text-sm">No slots scheduled</p>
            ) : (
              <div className="space-y-2">
                {slotsByDay[dayIdx].map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {slot.start_time} - {slot.end_time}
                      </div>
                      <div className="text-xs text-gray-500">
                        {slot.is_recurring ? "Recurring" : "One-time"} •{" "}
                        {slot.is_available ? "Available" : "Not available"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            ...slot,
                            is_available: !slot.is_available,
                          })
                        }
                        className={`px-3 py-1 text-xs rounded transition ${
                          slot.is_available
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {slot.is_available ? "Available" : "Unavailable"}
                      </button>

                      <button
                        onClick={() => deleteMutation.mutate(slot.id)}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {slots.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-3">No schedule defined yet</p>
          <p className="text-gray-400 text-sm">
            Add time slots to let coordinators know when you're available
          </p>
        </div>
      )}
    </div>
  );
}
