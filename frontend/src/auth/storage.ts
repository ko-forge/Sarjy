const TOKEN_KEY = "sarjy.token"
const MODEL_KEY = "sarjy.model"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getSavedModel(): string | null {
  return localStorage.getItem(MODEL_KEY)
}

export function saveModel(modelId: string): void {
  localStorage.setItem(MODEL_KEY, modelId)
}
