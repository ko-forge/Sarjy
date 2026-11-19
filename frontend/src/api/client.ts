import type { AppStatus, Health } from "../types"
import { getToken } from "../auth/storage"

export const APP_STATUS_PATHS = [
  "/api/conversations/status/",
  "/api/memory/status/",
  "/api/voice/status/",
  "/api/tools/status/",
] as const

export class ApiError extends Error {
  fields: Record<string, string>

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = "ApiError"
    this.fields = fields
  }
}

function parseError(data: unknown, status: number): ApiError {
  if (!data || typeof data !== "object") {
    return new ApiError(`Request failed (${status})`)
  }

  const record = data as Record<string, unknown>
  const fields: Record<string, string> = {}
  let message = typeof record.detail === "string" ? record.detail : ""

  for (const [key, value] of Object.entries(record)) {
    if (key === "detail") continue
    const text = Array.isArray(value) ? value.map(String).join(" ") : String(value)
    if (key === "non_field_errors") {
      message = text
    } else {
      fields[key] = text
    }
  }

  if (!message) {
    message = Object.values(fields)[0] ?? `Request failed (${status})`
  }
  return new ApiError(message, fields)
}

function apiUrl(path: string): string {
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")
  const pageIsHttps = typeof window !== "undefined" && window.location.protocol === "https:"
  if (!base || (pageIsHttps && base.startsWith("http://"))) return path
  return `${base}${path}`
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const token = getToken()
  if (token) {
    headers.set("Authorization", `Token ${token}`)
  }

  const response = await fetch(apiUrl(path), { ...options, headers })
  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw parseError(data, response.status)
  }
  return data as T
}

export function getHealth(): Promise<Health> {
  return request<Health>("/api/health/")
}

export function getAppStatus(path: string): Promise<AppStatus> {
  return request<AppStatus>(path)
}
