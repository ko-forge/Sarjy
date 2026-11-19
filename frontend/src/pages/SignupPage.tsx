import { useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router-dom"
import { ApiError } from "../api/client"
import { useAuth } from "../auth/AuthContext"
import { Field } from "../components/Field"
import { Gate } from "../components/Gate"

export function SignupPage() {
  const { user, loading, signup } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <main className="splash"><p>Opening Sarjy</p></main>
  if (user) return <Navigate to={user.profile_complete ? "/" : "/profile"} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFields({})
    if (password !== confirm) {
      setFields({ confirm: "Passwords do not match." })
      return
    }
    setSubmitting(true)
    try {
      await signup(email, password)
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFields(cause.fields)
        setError(cause.fields.email || cause.fields.password ? null : cause.message)
      } else {
        setError("Could not create the account.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Gate title="Create an account" lede="Use your email and a password. You will add your name on the next screen.">
      <form onSubmit={onSubmit}>
        <Field label="Email" error={fields.email}>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label="Password" error={fields.password}>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password" error={fields.confirm}>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </Field>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account" : "Sign up"}
        </button>
      </form>
      <p className="switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </Gate>
  )
}
