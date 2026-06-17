import axios from "axios";
import { getSession } from "./services/auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
  withCredentials: true,
});

// Interceptor para injetar o token JWT (e o e-mail como fallback legado)
api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers["Authorization"] = `Bearer ${session.token}`;
  }
  if (session?.user?.email) {
    config.headers["X-User-Email"] = session.user.email;
  }
  return config;
});

// Interceptor para erros globais
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);