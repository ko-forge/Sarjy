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

export type Place = {
  label: string
  latitude: number
  longitude: number
}

export type ChatMessage = {
  id: number
  role: "user" | "assistant"
  content: string
}

export type Conversation = {
  id: number
  place: Place | null
  messages: ChatMessage[]
}

export type AiModel = {
  id: string
  label: string
  provider: string
}

export type ModelList = {
  default: string
  models: AiModel[]
}
