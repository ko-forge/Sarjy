import type { AuthUser, ProfileInput } from "../types"
import { request } from "./client"

export function signup(email: string, password: string): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/signup/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function login(email: string, password: string): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout/", { method: "POST" })
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/me/")
}

export function updateProfile(profile: ProfileInput): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/profile/", {
    method: "PUT",
    body: JSON.stringify(profile),
  })
}
