# Sarjy

A voice assistant. Django serves the API. React and TypeScript render the client.

## Layout

```
backend/
  config/                 Django project: settings, root URLs, health check
  apps/conversations/     Sessions and the transcript
  apps/memory/            Facts and preferences kept across sessions
  apps/voice/             Speech in and speech out
  apps/tools/             External APIs (weather first)
frontend/
  src/api/                Calls the Django API
  src/components/         UI pieces
  src/voice/              Microphone and playback
```

Each app currently exposes `GET /api/<app>/status/`. `GET /api/health/` confirms the API is up. Models and real behavior come in later steps.

A reviewer does not need an account. The client will keep a session id in the browser, and both conversations and memories will be stored against that id.

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

1. Conversations: session id, transcript, one chat endpoint.
2. Memory: save and recall facts such as a favorite color.
3. Voice: listen and speak in the browser.
4. Weather tool: one external API, with a short justification.
5. Deep dive: pick one area and go deep.
6. Deploy a URL a reviewer can open.
