import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"

export function HomePage() {
  const { user, logout } = useAuth()
  if (!user) return null

  const { profile } = user
  const place = [profile.city, profile.country].filter(Boolean).join(", ")

  return (
    <main>
      <p className="eyebrow">Sarjy</p>
      <h1>Hello, {profile.name}</h1>
      <p className="lede">{user.email}</p>
      <section className="card summary">
        <p>{place || "No location yet."}</p>
        <p>{profile.age == null ? "No age yet." : `Age ${profile.age}`}</p>
      </section>
      <div className="actions">
        <Link to="/profile">Edit profile</Link>
        <button type="button" className="quiet" onClick={() => void logout()}>
          Log out
        </button>
      </div>
    </main>
  )
}
