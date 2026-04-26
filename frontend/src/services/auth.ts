import api from "./api";

export async function loginNGO(email: string, password: string) {
  const response = await api.post("/api/auth/login", { email, password });
  return response.data;
}

export async function registerNGO(name: string, email: string, password: string) {
  const response = await api.post("/api/auth/register", { name, email, password });
  return response.data;
}
