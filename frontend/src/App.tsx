import type { ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "./auth/AuthContext"
import { HomePage } from "./pages/HomePage"
import { LoginPage } from "./pages/LoginPage"
import { ProfilePage } from "./pages/ProfilePage"
import { SignupPage } from "./pages/SignupPage"

function RequireAuth({ children, requireProfile }: { children: ReactNode; requireProfile?: boolean }) {
  const { user, loading } = useAuth()
  if (loading) return <main><p>Checking your session.</p></main>
  if (!user) return <Navigate to="/login" replace />
  if (requireProfile && !user.profile_complete) return <Navigate to="/profile" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth requireProfile>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
