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

Sign up and log in with email and password. After signup, the profile asks for a name. City, country, and age are optional. The browser keeps the API token and sends it on later requests.

`GET /api/health/` confirms the API is up. The other apps still expose `GET /api/<app>/status/` until their real behavior is built.

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

1. Conversations: a transcript for the logged-in user, and one chat endpoint.
2. Memory: save and recall facts such as a favorite color.
3. Voice: listen and speak in the browser.
4. Weather tool: one external API, with a short justification.
5. Deep dive: pick one area and go deep.
6. Deploy a URL a reviewer can open.
