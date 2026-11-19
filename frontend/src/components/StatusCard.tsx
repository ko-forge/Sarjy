import type { AppStatus } from "../types"

type StatusCardProps = {
  status: AppStatus
}

export function StatusCard({ status }: StatusCardProps) {
  return (
    <article className="card">
      <header>
        <h2>{status.app}</h2>
        <span>{status.status}</span>
      </header>
      <p>{status.responsibility}</p>
    </article>
  )
}
