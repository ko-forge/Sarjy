import type { Conversation, ModelList } from "../types"
import { request } from "./client"

export function getConversation(): Promise<Conversation> {
  return request<Conversation>("/api/conversations/current/")
}

export function getModels(): Promise<ModelList> {
  return request<ModelList>("/api/conversations/models/")
}

export function sendChatMessage(message: string, model: string): Promise<Conversation> {
  return request<Conversation>("/api/conversations/current/messages/", {
    method: "POST",
    body: JSON.stringify({ message, model }),
  })
}

export function resetConversation(): Promise<Conversation> {
  return request<Conversation>("/api/conversations/current/reset/", { method: "POST" })
}
