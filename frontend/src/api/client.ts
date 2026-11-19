import type { AppStatus, Health } from "../types"

export const APP_STATUS_PATHS = [
  "/api/conversations/status/",
  "/api/memory/status/",
  "/api/voice/status/",
  "/api/tools/status/",
] as const

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function getHealth(): Promise<Health> {
  return getJson<Health>("/api/health/")
}

export function getAppStatus(path: string): Promise<AppStatus> {
  return getJson<AppStatus>(path)
}
