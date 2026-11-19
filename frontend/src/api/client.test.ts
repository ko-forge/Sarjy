import { afterEach, describe, expect, it, vi } from "vitest"
import { apiUrl, request } from "./client"
import { clearToken, setToken } from "../auth/storage"

afterEach(() => {
  clearToken()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function useLocalApi() {
  vi.stubEnv("VITE_API_BASE_URL", "")
}

describe("apiUrl", () => {
  it("uses the path when no base is configured", () => {
    vi.stubEnv("VITE_API_BASE_URL", "")
    expect(apiUrl("/api/auth/login/")).toBe("/api/auth/login/")
  })

  it("prefixes an https API", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com/")
    expect(apiUrl("/api/health/")).toBe("https://api.example.com/api/health/")
  })

  it("ignores an http API while the page itself is https", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://83.147.38.240:8000")
    vi.stubGlobal("location", { protocol: "https:" })
    expect(apiUrl("/api/auth/login/")).toBe("/api/auth/login/")
  })
})

describe("request", () => {
  it("sends the saved token and JSON body", async () => {
    useLocalApi()
    setToken("session-token")
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ email: "nia@example.com" }), { status: 200 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await request("/api/auth/me/")

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/auth/me/")
    const headers = new Headers(init.headers)
    expect(headers.get("Authorization")).toBe("Token session-token")
  })

  it("turns field errors into an ApiError", async () => {
    useLocalApi()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ email: ["Already registered."] }), { status: 400 })),
    )

    await expect(request("/api/auth/signup/", { method: "POST", body: "{}" })).rejects.toMatchObject({
      name: "ApiError",
      fields: { email: "Already registered." },
    })
  })

  it("returns nothing for an empty response", async () => {
    useLocalApi()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })))
    await expect(request("/api/auth/logout/", { method: "POST" })).resolves.toBeUndefined()
  })
})
