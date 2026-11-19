import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ApiError } from "../api/client"
import { useAuth } from "../auth/AuthContext"
import { Field } from "../components/Field"
import { Gate } from "../components/Gate"

export function ProfilePage() {
  const { user, saveProfile, logout } = useAuth()
  const navigate = useNavigate()
  const profile = user?.profile
  const [name, setName] = useState(profile?.name ?? "")
  const [city, setCity] = useState(profile?.city ?? "")
  const [country, setCountry] = useState(profile?.country ?? "")
  const [age, setAge] = useState(profile?.age == null ? "" : String(profile.age))
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const complete = user?.profile_complete ?? false

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFields({})
    const trimmedName = name.trim()
    if (!trimmedName) {
      setFields({ name: "Name is required." })
      return
    }
    const parsedAge = age.trim() === "" ? null : Number(age)
    if (parsedAge != null && (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
      setFields({ age: "Age must be a whole number from 1 to 120." })
      return
    }
    setSubmitting(true)
    try {
      await saveProfile({
        name: trimmedName,
        city: city.trim(),
        country: country.trim(),
        age: parsedAge,
      })
      navigate("/")
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFields(cause.fields)
        setError(cause.fields.name || cause.fields.age ? null : cause.message)
      } else {
        setError("Could not save your profile.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Gate
      title={complete ? "Your profile" : "Set up your profile"}
      lede={
        complete
          ? "Name is required. City, country, and age can stay blank."
          : "Add your name so Sarjy knows who it is talking to. The rest can wait."
      }
    >
      <form onSubmit={onSubmit}>
        <Field label="Name" hint="Required" error={fields.name}>
          <input
            value={name}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <div className="place-row">
          <Field label="City" hint="Optional" error={fields.city}>
            <input value={city} autoComplete="address-level2" onChange={(event) => setCity(event.target.value)} />
          </Field>
          <Field label="Country" hint="Optional" error={fields.country}>
            <input value={country} autoComplete="country-name" onChange={(event) => setCountry(event.target.value)} />
          </Field>
        </div>
        <Field label="Age" hint="Optional" error={fields.age}>
          <input
            inputMode="numeric"
            value={age}
            onChange={(event) => setAge(event.target.value)}
          />
        </Field>
        {error ? <p className="error">{error}</p> : null}
        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving" : "Save profile"}
          </button>
          {complete ? <Link to="/">Back home</Link> : null}
          <button type="button" className="quiet" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </form>
    </Gate>
  )
}
