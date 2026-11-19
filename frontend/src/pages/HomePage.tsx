import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { ApiError } from "../api/client"
import { getConversation, getModels, resetConversation, sendChatMessage } from "../api/chat"
import { useAuth } from "../auth/AuthContext"
import { getSavedModel, saveModel } from "../auth/storage"
import { TravelMap } from "../components/TravelMap"
import type { AiModel, ChatMessage, Place } from "../types"
import { canListen, listenOnce, speak, stopSpeaking } from "../voice/speech"

function modelProviders(models: AiModel[]): string[] {
  return [...new Set(models.map((model) => model.provider))]
}

export function HomePage() {
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [place, setPlace] = useState<Place | null>(null)
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [models, setModels] = useState<AiModel[]>([])
  const [modelId, setModelId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    getConversation()
      .then((conversation) => {
        if (cancelled) return
        setMessages(conversation.messages)
        setPlace(conversation.place)
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : "Could not open the trip.")
      })
    getModels()
      .then((list) => {
        if (cancelled) return
        setModels(list.models)
        const saved = getSavedModel()
        const chosen = list.models.some((model) => model.id === saved) ? saved : list.default
        setModelId(chosen ?? "")
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the model list.")
      })
    return () => {
      cancelled = true
      stopSpeaking()
      stopRef.current?.()
    }
  }, [])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages, pending])

  if (!user) return null

  async function send(text: string) {
    const message = text.trim()
    if (!message || pending) return
    setError(null)
    setDraft("")
    setPending(message)
    try {
      const conversation = await sendChatMessage(message, modelId)
      setMessages(conversation.messages)
      setPlace(conversation.place)
      const reply = conversation.messages.at(-1)
      if (voiceOn && reply?.role === "assistant") speak(reply.content)
    } catch (cause) {
      setDraft(message)
      setError(cause instanceof ApiError ? cause.message : "Sarjy could not answer.")
    } finally {
      setPending(null)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void send(draft)
  }

  function onMic() {
    if (listening) {
      stopRef.current?.()
      setListening(false)
      return
    }
    setError(null)
    if (!canListen()) {
      setError("This browser cannot hear you. Type the place instead.")
      return
    }
    setListening(true)
    stopRef.current = listenOnce(
      (text) => {
        setListening(false)
        setDraft(text)
        void send(text)
      },
      (message) => {
        setListening(false)
        setError(message)
      },
    )
  }

  async function onReset() {
    stopSpeaking()
    setError(null)
    const conversation = await resetConversation()
    setMessages(conversation.messages)
    setPlace(conversation.place)
  }

  return (
    <div className="studio">
      <header className="studio-bar">
        <div>
          <p className="eyebrow">Sarjy</p>
          <p className="traveler">{user.profile.name}</p>
        </div>
        <div className="actions">
          <label className="model-picker">
            <span>Model</span>
            <select
              value={modelId}
              onChange={(event) => {
                setModelId(event.target.value)
                saveModel(event.target.value)
              }}
              disabled={models.length === 0}
            >
              {modelProviders(models).map((provider) => (
                <optgroup key={provider} label={provider}>
                  {models
                    .filter((model) => model.provider === provider)
                    .map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button type="button" className="quiet" onClick={() => setVoiceOn((on) => !on)}>
            {voiceOn ? "Voice on" : "Voice off"}
          </button>
          <button type="button" className="quiet" onClick={() => void onReset()}>
            New trip
          </button>
          <Link to="/profile">Profile</Link>
          <button type="button" className="quiet" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>
      <div className="studio-body">
        <section className="chat-pane">
          <div className="thread" ref={threadRef}>
            {messages.length === 0 && !pending ? (
              <p className="hint">
                Tell Sarjy where you want to go. Ask about the weather, or name a city and the pin will move.
              </p>
            ) : null}
            {messages.map((message) => (
              <p key={message.id} className={`bubble ${message.role}`}>
                {message.content}
              </p>
            ))}
            {pending ? (
              <>
                <p className="bubble user">{pending}</p>
                <p className="bubble assistant waiting">Checking the map and the weather.</p>
              </>
            ) : null}
          </div>
          {error ? <p className="error chat-error">{error}</p> : null}
          <form className="composer" onSubmit={onSubmit}>
            <input
              value={draft}
              placeholder={listening ? "Listening" : "Where do you want to go?"}
              onChange={(event) => setDraft(event.target.value)}
              disabled={listening}
            />
            <button type="button" className={listening ? "mic live" : "mic"} onClick={onMic}>
              {listening ? "Stop" : "Mic"}
            </button>
            <button type="submit" disabled={pending !== null || listening || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
        <TravelMap place={place} />
      </div>
    </div>
  )
}
