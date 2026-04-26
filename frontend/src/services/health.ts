import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

type ApiErrorPayload = {
  detail?: string | { message?: string } | Array<{ msg?: string } | string>;
  message?: string;
};

function toApiError(error: unknown): Error {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;

    if (typeof payload === "string") {
      return new Error(payload);
    }

    if (typeof payload?.detail === "string") {
      return new Error(payload.detail);
    }

    if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
      const first = payload.detail[0];
      if (typeof first === "string") {
        return new Error(first);
      }
      if (typeof first?.msg === "string") {
        return new Error(first.msg);
      }
    }

    if (
      typeof payload?.detail === "object" &&
      payload?.detail !== null &&
      "message" in payload.detail &&
      typeof payload.detail.message === "string"
    ) {
      return new Error(payload.detail.message);
    }

    if (typeof payload?.message === "string") {
      return new Error(payload.message);
    }

    return new Error(error.message || "Request failed");
  }

  if (error instanceof Error) {
    return new Error(error.message);
  }

  return new Error("Request failed");
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await api.get("/");
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    throw toApiError(error);
  }
}
