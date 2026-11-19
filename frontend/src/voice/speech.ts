type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type RecognitionEvent = {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

function recognitionConstructor(): (new () => Recognition) | null {
  const browser = window as Window & {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null
}

export function canListen(): boolean {
  return recognitionConstructor() !== null
}

export function listenOnce(
  onText: (text: string) => void,
  onError: (message: string) => void,
): () => void {
  const Constructor = recognitionConstructor()
  if (!Constructor) {
    onError("This browser cannot hear you. Type the place instead.")
    return () => undefined
  }

  const recognition = new Constructor()
  recognition.lang = "en-US"
  recognition.interimResults = false
  recognition.continuous = false
  let transcript = ""
  let failed = false

  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      if (result?.isFinal) transcript += result[0]?.transcript ?? ""
    }
  }
  recognition.onerror = () => {
    failed = true
    onError("I could not hear that. Try again.")
  }
  recognition.onend = () => {
    const text = transcript.trim()
    if (!failed && text) onText(text)
  }

  try {
    recognition.start()
  } catch {
    onError("The microphone is already in use.")
    return () => undefined
  }
  return () => recognition.stop()
}

export function speak(text: string): void {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""))
  utterance.rate = 1
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel()
}
