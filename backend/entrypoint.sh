#!/bin/sh
set -eu

if [ -n "${SQLITE_PATH:-}" ]; then
  mkdir -p "$(dirname "$SQLITE_PATH")"
fi

python manage.py migrate --noinput

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 1 \
  --threads 4 \
  --timeout 120
