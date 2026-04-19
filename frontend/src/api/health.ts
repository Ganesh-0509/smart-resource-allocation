import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await api.get("/");
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}
