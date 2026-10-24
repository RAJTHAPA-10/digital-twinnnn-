import type { ApiEnvelope } from "../types/api";

// In dev, Vite proxies /api to the backend, so we use relative URLs.
// In a production build, set VITE_API_BASE_URL to the backend origin.
const BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const DEFAULT_TIMEOUT = 30_000;
export const AI_TIMEOUT = 10 * 60_000;

export class ApiError extends Error {
  status: number;
  details: string[];
  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  form?: FormData;
  timeout?: number;
  query?: Record<string, string | number | undefined | null>;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, form, timeout = DEFAULT_TIMEOUT, query } = options;

  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: form ? undefined : { "Content-Type": "application/json" },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    window.clearTimeout(timer);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The server took too long to answer.", 408);
    }
    throw new ApiError("Can't reach the backend. Is it running?", 0);
  }
  window.clearTimeout(timer);

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const message = payload?.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload?.errors ?? []);
  }

  return payload.data as T;
}
