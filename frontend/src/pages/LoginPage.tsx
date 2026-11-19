import { useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router-dom"
import { ApiError } from "../api/client"
import { useAuth } from "../auth/AuthContext"
import { Field } from "../components/Field"

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <main><p>Checking your session.</p></main>
  if (user) return <Navigate to={user.profile_complete ? "/" : "/profile"} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not log in.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main>
      <p className="eyebrow">Sarjy</p>
      <h1>Log in</h1>
      <p className="lede">Use the email and password from your account.</p>
      <form onSubmit={onSubmit}>
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in" : "Log in"}
        </button>
      </form>
      <p className="switch">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </main>
  )
}
