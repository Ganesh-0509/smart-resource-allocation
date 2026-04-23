import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getAllDistrictMetrics, getVolunteerImpactMetrics } from "../api/analytics";
import type { DistrictImpactMetrics, VolunteerImpactMetrics } from "../types";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

interface ImpactDashboardProps {
  volunteerId?: string;
}

export default function ImpactDashboard({ volunteerId }: ImpactDashboardProps) {
  const { data: volunteerMetrics } = useQuery({
    queryKey: ["volunteer-impact", volunteerId],
    queryFn: () => getVolunteerImpactMetrics(volunteerId!),
    enabled: !!volunteerId,
  });

  const { data: districtData } = useQuery({
    queryKey: ["all-district-metrics"],
    queryFn: getAllDistrictMetrics,
  });

  const districts: DistrictImpactMetrics[] = districtData?.districts || [];
  const metrics: VolunteerImpactMetrics | undefined = volunteerMetrics;

  // Prepare chart data
  const districtChartData = districts.map((d) => ({
    name: d.district,
    households: d.total_households_served,
    tasks: d.total_tasks_completed,
    volunteers: d.active_volunteers,
  }));

  const impactChartData = districts.map((d) => ({
    name: d.district,
    completionRate: (d.avg_task_completion_rate * 100).toFixed(1),
    avgHours: d.total_volunteer_hours > 0 ? (d.total_volunteer_hours / d.active_volunteers).toFixed(1) : 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Impact Analytics Dashboard</h1>
          <p className="text-gray-600">Track volunteer impact and district-level metrics</p>
        </div>

        {/* Volunteer Metrics (if volunteerId provided) */}
        {volunteerId && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
              <p className="text-gray-600 text-sm font-medium">Tasks Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.tasks_completed}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
              <p className="text-gray-600 text-sm font-medium">Hours Worked</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.total_hours_worked}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
              <p className="text-gray-600 text-sm font-medium">Households Served</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.households_served}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
              <p className="text-gray-600 text-sm font-medium">Avg Completion Time</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics.avg_completion_time_hours ? metrics.avg_completion_time_hours.toFixed(1) : "N/A"} h
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
              <p className="text-gray-600 text-sm font-medium">Impact Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.impact_score.toFixed(0)}</p>
            </div>
          </div>
        )}

        {/* District Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Districts Overview</h3>
            <div className="space-y-2">
              {districts.length === 0 ? (
                <p className="text-gray-500">No district data available</p>
              ) : (
                districts.map((d) => (
                  <div key={d.district} className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">{d.district}</span>
                    <span className="text-sm text-gray-600">{d.total_households_served} households</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Metrics</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Households Served</p>
                <p className="text-2xl font-bold text-green-600">
                  {districts.reduce((sum, d) => sum + d.total_households_served, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tasks Completed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {districts.reduce((sum, d) => sum + d.total_tasks_completed, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Volunteers</p>
                <p className="text-2xl font-bold text-purple-600">
                  {districts.reduce((sum, d) => sum + d.active_volunteers, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Avg Completion Rate</h3>
            {districts.length > 0 ? (
              <div className="space-y-2">
                {districts.slice(0, 5).map((d) => (
                  <div key={d.district} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{d.district}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(d.avg_task_completion_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Charts */}
        {districtChartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Households & Tasks by District */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Households & Tasks by District</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={districtChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="households" fill="#10B981" name="Households" />
                  <Bar dataKey="tasks" fill="#3B82F6" name="Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Task Completion Rate */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Rate Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={impactChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#10B981"
                    name="Completion Rate (%)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Active Volunteers by District */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Volunteers by District</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={districtChartData}
                    dataKey="volunteers"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {districtChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Avg Hours per Volunteer */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Avg Hours per Volunteer</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={impactChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgHours" fill="#F59E0B" name="Avg Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {districtChartData.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p>No district data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
