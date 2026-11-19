# Sarjy

A voice travel assistant. Django serves the API. React and TypeScript render the client.

Sign up and log in with email and password. After signup, the profile asks for a name. City, country, and age are optional. The home screen is the travel agent: say or type a destination, and Sarjy answers. A Leaflet map uses OpenStreetMap tiles. When a place is named, Nominatim turns it into coordinates and the pin moves. Weather answers come from Open-Meteo, and only those numbers are spoken.

Open-Meteo is the external API because a trip question is usually "what is the weather there", and it needs no key. Nominatim and OpenStreetMap are the map pair because the pin can move without a Google billing account. The model itself is OpenAI-compatible, so the same code calls OpenAI or Z.ai GLM.

## What it does

- **Travel answers.** The agent can geocode a place and fetch the weather, then reply in text. The browser speaks replies with the Web Speech API and can listen when the mic button is available.
- **Grounded weather.** Temperatures, wind, and percentages in a reply must match the weather tool. If they do not, the reply is replaced with a sentence built only from that tool.
- **Guardrails.** Jailbreak attempts and prohibited topics are refused before the model is called.
- **Trip plan.** "Plan a trip" walks through destination, dates, and pace. The steps live on the conversation, and a side question does not advance them.
- **Model choice.** The header lists Z.ai models. Set `OPENAI_API_KEY` to add GPT models. The choice is remembered in the browser.

## Layout

```
backend/
  config/                 Django project: settings, root URLs, health check
  apps/accounts/          Email login and the user profile
  apps/conversations/     Sessions, the transcript, guardrails, and the trip plan
  apps/memory/            Memory status endpoint
  apps/voice/             Speech in and speech out
  apps/tools/             External APIs (geocoding and weather)
frontend/
  src/api/                Calls the Django API
  src/components/         UI pieces
  src/voice/              Microphone and playback
  api/index.js            Vercel function that proxies /api to the VPS
docker-compose.yml        Runs the API in Docker
```

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

Set the model in `backend/.env`:

```
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.z.ai/api/paas/v4
LLM_MODEL=glm-4.5-flash
```

For OpenAI, set `OPENAI_API_KEY` as well. `backend/.env` stays out of git.

Frontend, in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to Django on port 8000. If that port is taken, start Django on another port and point the proxy at it:

```bash
VITE_API_PROXY=http://127.0.0.1:8001 npm run dev
```

Leave `VITE_API_BASE_URL` empty for local development.

## Tests

Backend, from `backend/`:

```bash
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest
```

Frontend, from `frontend/`:

```bash
npm test
```

Pytest covers accounts, tools, conversations, voice, the agent, guardrails, and the trip plan. Vitest covers the API client and the plan steps. The Docker image does not install the test dependencies.

## Deploy

The API runs on a VPS with Docker. The site runs on Vercel and proxies `/api` to the VPS, because an HTTPS page cannot call `http://` on the VPS directly.

**API.** On the VPS, clone the `Main` branch, then create `backend/.env` from `backend/.env.example`:

- `DJANGO_ALLOWED_HOSTS` includes the public IP with no port, plus `localhost`.
- `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173` and the Vercel origin, for example `https://sarjy-nine.vercel.app`.
- `LLM_API_KEY` and the model settings are filled in.

From the repo root:

```bash
docker compose up -d --build
```

Compose stores SQLite at `/data/db.sqlite3` in the `sarjy-data` volume, listens on port 8000, and checks `GET /api/health/`. That database is separate from a local `db.sqlite3`, so accounts created on a laptop are not on the VPS.

**Site.** In the Vercel project, set the root directory to `frontend`. Leave `VITE_API_BASE_URL` empty. `frontend/vercel.json` sends every `/api/...` path to `frontend/api/index.js`, which forwards the request to `API_UPSTREAM` (default `http://83.147.38.240:8000`). Set `API_UPSTREAM` if that address changes. After a push to `Main`, sign up on the live site. The VPS starts with an empty database.
