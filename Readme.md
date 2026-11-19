# Sarjy

A voice assistant. Django serves the API. React and TypeScript render the client.

## Layout

```
backend/
  config/                 Django project: settings, root URLs, health check
  apps/accounts/          Email login and the user profile
  apps/conversations/     Sessions and the transcript
  apps/memory/            Facts and preferences kept across sessions
  apps/voice/             Speech in and speech out
  apps/tools/             External APIs (weather first)
frontend/
  src/api/                Calls the Django API
  src/components/         UI pieces
  src/voice/              Microphone and playback
```

Sign up and log in with email and password. After signup, the profile asks for a name. City, country, and age are optional. The home screen is the travel agent: say or type a destination, and Sarjy answers. A Leaflet map uses OpenStreetMap tiles. When a place is named, Nominatim turns it into coordinates and the pin moves. Weather answers come from Open-Meteo, and only those numbers are spoken.

Open-Meteo is the external API because a trip question is usually "what is the weather there", and it needs no key. Nominatim and OpenStreetMap are the map pair because the reviewer can watch the pin move without a Google billing account. The model itself is OpenAI-compatible, so the same code calls OpenAI or Z.ai GLM. Set these in `backend/.env`:

```
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.z.ai/api/paas/v4
LLM_MODEL=glm-4.5-flash
```

For OpenAI, set `OPENAI_API_KEY` as well. The header then lists both Z.ai and OpenAI models, and the choice is remembered in the browser. The browser speaks replies with the Web Speech API and can listen when the mic button is available.

## Run locally

Backend:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver
```

Frontend, in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to Django on port 8000.

## Next steps

1. Memory: save and recall facts such as a favorite color across sessions.
2. Deep dive: pick one area and go deep.
3. Deploy a URL a reviewer can open.
