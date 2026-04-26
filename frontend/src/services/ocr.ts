import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface OCRScanResult {
  title: string;
  need_type: string;
  urgency: "low" | "medium" | "high";
  ward: string;
  district: string;
  lat: number;
  lng: number;
  household_count: number;
  required_skills: string[];
  description: string;
  confidence_score: number;
  image_url: string;
}

export async function scanSurvey(imageFile: File): Promise<OCRScanResult> {
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await axios.post(`${API_URL}/api/ocr/scan`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
