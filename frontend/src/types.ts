export type Health = {
  service: string
  status: string
}

export type AppStatus = {
  app: string
  status: string
  responsibility: string
}

export type Profile = {
  name: string
  city: string
  country: string
  age: number | null
}

export type AuthUser = {
  email: string
  profile_complete: boolean
  profile: Profile
  token?: string
}

export type ProfileInput = {
  name: string
  city: string
  country: string
  age: number | null
}
