import api from "./api";

export async function loginNGO(email: string, password: string) {
  const response = await api.post("/api/auth/login", { email, password });
  return response.data;
}

export interface NGORegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  registration_number: string;
  org_type: string;
  district: string;
  state: string;
  address: string;
  description: string;
  website?: string;
}

export async function registerNGO(payload: NGORegisterPayload) {
  const response = await api.post("/api/auth/register", payload);
  return response.data;
}

export async function loginFieldWorker(phone: string, pin: string) {
  const response = await api.post("/api/auth/field/login", { phone, pin });
  return response.data;
}

export async function registerFieldWorker(payload: any) {
  const response = await api.post("/api/auth/field/register", payload);
  return response.data;
}

export async function getPublicNGOs() {
  const response = await api.get("/api/auth/ngos/public");
  return response.data;
}
