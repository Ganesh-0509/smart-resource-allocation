import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";

import { getHeatmapData } from "../api/tasks";
import UrgencyBadge from "../components/UrgencyBadge";
import type { HeatmapPoint, TaskNeedType } from "../types";

type LeafletModule = typeof import("react-leaflet");

type NeedTypeFilter = "all" | TaskNeedType;
type StatusFilter = "open" | "all";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const tamilNaduCenter: LatLngExpression = [10.0, 78.5];

const needTypeFilters: Array<{ value: NeedTypeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "nutrition", label: "Nutrition" },
  { value: "medical", label: "Medical" },
  { value: "shelter", label: "Shelter" },
  { value: "education", label: "Education" },
  { value: "water", label: "Water" },
  { value: "livelihood", label: "Livelihood" },
];

const chartNeedTypes: TaskNeedType[] = [
  "nutrition",
  "medical",
  "shelter",
  "education",
  "water",
  "livelihood",
  "other",
];

function urgencyColor(score: number): string {
  if (score >= 80) {
    return "#E24B4A";
  }
  if (score >= 60) {
    return "#EF9F27";
  }
  if (score >= 40) {
    return "#BA7517";
  }
  return "#6B7280";
}

function markerRadius(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return 10 + (clamped / 100) * 12;
}

function isValidPoint(point: HeatmapPoint): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function toNeedType(value?: string): TaskNeedType {
  const normalized = (value || "other").toLowerCase();
  if (
    normalized === "nutrition" ||
    normalized === "medical" ||
    normalized === "shelter" ||
    normalized === "education" ||
    normalized === "water" ||
    normalized === "livelihood"
  ) {
    return normalized;
  }
  return "other";
}

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function needTypeLabel(value: TaskNeedType | string | undefined): string {
  return titleCase(toNeedType(value));
}

function needTypePillClass(value: TaskNeedType | string | undefined): string {
  const normalized = toNeedType(value);

  const classes: Record<TaskNeedType, string> = {
    nutrition: "bg-emerald-50 text-emerald-700",
    medical: "bg-rose-50 text-rose-700",
    shelter: "bg-amber-50 text-amber-700",
    education: "bg-sky-50 text-sky-700",
    water: "bg-cyan-50 text-cyan-700",
    livelihood: "bg-violet-50 text-violet-700",
    other: "bg-slate-100 text-slate-700",
  };

  return classes[normalized];
}

function needTypeDotClass(value: TaskNeedType): string {
  const classes: Record<TaskNeedType, string> = {
    nutrition: "bg-emerald-500",
    medical: "bg-rose-500",
    shelter: "bg-amber-500",
    education: "bg-sky-500",
    water: "bg-cyan-500",
    livelihood: "bg-violet-500",
    other: "bg-slate-500",
  };

  return classes[value];
}

function normalizedStatus(value: string | undefined): string {
  return (value || "open").toLowerCase();
}

export default function NeedHeatmap() {
  const [leafletModule, setLeafletModule] = useState<LeafletModule | null>(null);
  const [needTypeFilter, setNeedTypeFilter] = useState<NeedTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery<HeatmapPoint[]>({
    queryKey: ["dashboard-heatmap", statusFilter],
    queryFn: () => getHeatmapData(statusFilter),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    let mounted = true;
    import("react-leaflet").then((module) => {
      if (mounted) {
        setLeafletModule(module);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const points = useMemo(() => (data || []).filter(isValidPoint), [data]);

  const filteredPoints = useMemo(() => {
    return points.filter((point) => {
      const normalizedNeedType = toNeedType(point.need_type);
      const pointStatus = normalizedStatus(point.status);

      const passesNeedType = needTypeFilter === "all" ? true : normalizedNeedType === needTypeFilter;
      const passesStatus = statusFilter === "all" ? true : pointStatus === "open";

      return passesNeedType && passesStatus;
    });
  }, [points, needTypeFilter, statusFilter]);

  const openNeedsOnMap = filteredPoints.filter((point) => normalizedStatus(point.status) === "open").length;

  const mostUrgentPoint = useMemo(() => {
    if (!filteredPoints.length) {
      return null;
    }

    return filteredPoints.reduce((current, point) => {
      if (point.urgency_score > current.urgency_score) {
        return point;
      }
      return current;
    });
  }, [filteredPoints]);

  const needBreakdown = useMemo(() => {
    const counts: Record<TaskNeedType, number> = {
      nutrition: 0,
      medical: 0,
      shelter: 0,
      education: 0,
      water: 0,
      livelihood: 0,
      other: 0,
    };

    filteredPoints.forEach((point) => {
      const needType = toNeedType(point.need_type);
      counts[needType] += 1;
    });

    return counts;
  }, [filteredPoints]);

  const maxNeedCount = Math.max(1, ...Object.values(needBreakdown));

  const mapLoading = !leafletModule;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Need Heatmap</h1>
        <p className="mt-2 text-slate-600">Visualize community needs across Tamil Nadu in real time.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {needTypeFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setNeedTypeFilter(filter.value)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  needTypeFilter === filter.value
                    ? "bg-[#1D9E75] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                ].join(" ")}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-md border border-slate-300 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("open")}
              className={[
                "rounded px-3 py-1 transition-colors",
                statusFilter === "open" ? "bg-[#1D9E75] text-white" : "text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              Open only
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={[
                "rounded px-3 py-1 transition-colors",
                statusFilter === "all" ? "bg-[#1D9E75] text-white" : "text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              All
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
            {isFetching ? "Refreshing map..." : `${filteredPoints.length} need points shown`}
          </div>

          {isLoading || mapLoading ? (
            <div className="flex h-[500px] items-center justify-center text-slate-500">Loading map...</div>
          ) : isError ? (
            <div className="flex h-[500px] flex-col items-center justify-center gap-3 p-6 text-center text-red-700">
              <p>{error instanceof Error ? error.message : "Failed to load map data."}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          ) : (
            (() => {
              const { CircleMarker, MapContainer, Popup, TileLayer } = leafletModule;

              return (
                <div style={{ height: "500px", width: "100%" }}>
                  <MapContainer
                    center={tamilNaduCenter}
                    zoom={8}
                    scrollWheelZoom
                    style={{ height: "500px", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {filteredPoints.map((point, index) => {
                      const color = urgencyColor(point.urgency_score);
                      const radius = markerRadius(point.urgency_score);
                      const needType = toNeedType(point.need_type);

                      return (
                        <CircleMarker
                          key={`${point.title}-${point.lat}-${point.lng}-${index}`}
                          center={[point.lat, point.lng]}
                          radius={radius}
                          pathOptions={{ color: "#ffffff", fillColor: color, fillOpacity: 0.8, weight: 2 }}
                        >
                          <Popup>
                            <div className="min-w-[220px] space-y-2">
                              <h3 className="text-sm font-semibold text-slate-900">{point.title || "Untitled Need"}</h3>
                              <p className="text-xs text-slate-600">Ward: {point.ward || "Unknown"}</p>
                              <div className="flex items-center gap-2">
                                <span className={[
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  needTypePillClass(needType),
                                ].join(" ")}
                                >
                                  {needTypeLabel(needType)}
                                </span>
                                <div className="scale-90 origin-left">
                                  <UrgencyBadge score={point.urgency_score} />
                                </div>
                              </div>
                              <div>
                                <Link to="/coordinator" className="text-xs font-semibold text-[#1D9E75] underline">
                                  View in Coordinator →
                                </Link>
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>
                </div>
              );
            })()
          )}
        </article>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h2>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-xs text-slate-500">Total open needs on map</dt>
                <dd className="text-2xl font-bold text-[#1D9E75]">{openNeedsOnMap}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Most urgent ward</dt>
                <dd className="text-base font-semibold text-slate-800">
                  {mostUrgentPoint?.ward || "N/A"}
                  {mostUrgentPoint ? (
                    <span className="ml-2 text-xs font-medium text-slate-500">
                      ({mostUrgentPoint.urgency_score})
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Need Type Breakdown</h2>
            <div className="mt-3 space-y-2">
              {chartNeedTypes.map((type) => {
                const count = needBreakdown[type] || 0;
                const width = Math.max(4, (count / maxNeedCount) * 100);

                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <span className={[
                          "h-2.5 w-2.5 rounded-full",
                          needTypeDotClass(type),
                        ].join(" ")} />
                        {titleCase(type)}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-[#1D9E75] transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
