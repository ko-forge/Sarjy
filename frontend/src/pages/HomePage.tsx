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

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2z"
      />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="14" height="14" x="5" y="5" rx="2" fill="currentColor" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3.4 11.2 20 4.2c.8-.3 1.6.5 1.3 1.3l-7 16.6c-.3.8-1.5.8-1.8 0l-2.4-6.1-6.1-2.4c-.8-.3-.8-1.5 0-1.8z" />
    </svg>
  )
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

  const ideas = [
    "What's the weather in Lisbon?",
    "I want to go to Kyoto",
    "Show me Accra",
  ]

  return (
    <div className="studio">
      <TravelMap place={place} />
      <header className="studio-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="eyebrow">Sarjy</p>
            <p className="traveler">{user.profile.name}</p>
          </div>
        </div>
        <div className="actions">
          <label className="model-picker">
            <span>Model</span>
            <select
              aria-label="Model"
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
          <button type="button" className={voiceOn ? "tool on" : "tool"} onClick={() => setVoiceOn((on) => !on)}>
            {voiceOn ? "Voice on" : "Voice off"}
          </button>
          <button type="button" className="tool" onClick={() => void onReset()}>
            New trip
          </button>
          <Link to="/profile">Profile</Link>
          <button type="button" className="tool" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>
      <section className="chat-pane">
        <div className="chat-head">
          <p className="eyebrow">Trip</p>
          <h1>Where next?</h1>
        </div>
        <div className="thread" ref={threadRef}>
          {messages.length === 0 && !pending ? (
            <div className="empty-trip">
              <p className="hint">Name a city, or ask what the weather is like when you get there.</p>
              <div className="ideas">
                {ideas.map((idea) => (
                  <button key={idea} type="button" className="chip" onClick={() => void send(idea)}>
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <p key={message.id} className={`bubble ${message.role}`}>
              {message.role === "assistant" ? <span className="who">Sarjy</span> : null}
              {message.content}
            </p>
          ))}
          {pending ? (
            <>
              <p className="bubble user">{pending}</p>
              <p className="bubble assistant waiting">
                <span className="who">Sarjy</span>
                Checking the map and the weather.
              </p>
            </>
          ) : null}
        </div>
        {error ? <p className="error chat-error">{error}</p> : null}
        <form className="composer" onSubmit={onSubmit}>
          <input
            value={draft}
            placeholder={listening ? "Listening…" : "Where do you want to go?"}
            onChange={(event) => setDraft(event.target.value)}
            disabled={listening}
          />
          <button type="button" className={listening ? "mic live" : "mic"} onClick={onMic} aria-label={listening ? "Stop listening" : "Speak"}>
            {listening ? <StopIcon /> : <MicIcon />}
          </button>
          <button type="submit" className="send" disabled={pending !== null || listening || !draft.trim()} aria-label="Send">
            <SendIcon />
          </button>
        </form>
      </section>
    </div>
  )
}
