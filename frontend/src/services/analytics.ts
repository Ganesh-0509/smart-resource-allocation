import api from "./api";
import type { DistrictImpactMetrics } from "../types";

export async function getDistrictImpact(): Promise<DistrictImpactMetrics[]> {
  const response = await api.get<DistrictImpactMetrics[]>("/api/analytics/impact/districts");
  return response.data;
}

export async function getResourceEfficiency(): Promise<any> {
  const response = await api.get("/api/analytics/efficiency/resources");
  return response.data;
}
