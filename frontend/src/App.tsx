import { useEffect, useState } from "react"
import { APP_STATUS_PATHS, getAppStatus, getHealth } from "./api/client"
import { StatusCard } from "./components/StatusCard"
import type { AppStatus, Health } from "./types"
import { voiceLayer } from "./voice"

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [apps, setApps] = useState<AppStatus[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [healthResponse, appResponses] = await Promise.all([
          getHealth(),
          Promise.all(APP_STATUS_PATHS.map((path) => getAppStatus(path))),
        ])
        if (!cancelled) {
          setHealth(healthResponse)
          setApps(appResponses)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not reach the API")
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main>
      <p className="eyebrow">Sarjy</p>
      <h1>Voice assistant</h1>
      <p className="lede">
        Django API and React client. Voice will run in the {voiceLayer}.
        {health ? `The API is ${health.status}.` : "Checking the API."}
      </p>

      {error ? <p className="error">{error}</p> : null}

      <section className="grid">
        {apps.map((status) => (
          <StatusCard key={status.app} status={status} />
        ))}
      </section>
    </main>
  )
}
