import type { ReactNode } from "react"

type FieldProps = {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label>
      <span>
        {label}
        {hint ? <em>{hint}</em> : null}
      </span>
      {children}
      {error ? <small className="error">{error}</small> : null}
    </label>
  )
}
