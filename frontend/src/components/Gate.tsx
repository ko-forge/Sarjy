import type { ReactNode } from "react"
import { Link } from "react-router-dom"

type GateProps = {
  title: string
  lede: string
  children: ReactNode
}

export function Gate({ title, lede, children }: GateProps) {
  return (
    <main className="gate">
      <aside className="gate-brand">
        <Link to="/" className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          Sarjy
        </Link>
        <p className="brand-title">Ask for a place. The map moves.</p>
        <p className="brand-copy">
          A travel voice that pins the city you name and answers with the weather there.
        </p>
      </aside>
      <section className="gate-card">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
        {children}
      </section>
    </main>
  )
}
