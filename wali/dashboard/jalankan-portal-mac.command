#!/bin/zsh
set -u

DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$DIR" || exit 1

PORT="${CAHAYA_PORT:-5500}"
URL="http://127.0.0.1:${PORT}/index.html"
LOG="$DIR/portal-server.log"
PIDFILE="$DIR/.portal-server.pid"

is_ready() {
  /usr/bin/curl -fsS "http://127.0.0.1:${PORT}/__cahaya_health" >/dev/null 2>&1 || \
  /usr/bin/curl -fsS "$URL" >/dev/null 2>&1
}

if is_ready; then
  /usr/bin/open "$URL"
  exit 0
fi

: > "$LOG"
SERVER_KIND=""

if command -v node >/dev/null 2>&1; then
  SERVER_KIND="Node.js"
  nohup node "$DIR/portal-server.js" "$PORT" >>"$LOG" 2>&1 &
elif command -v python3 >/dev/null 2>&1; then
  SERVER_KIND="Python 3"
  nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >>"$LOG" 2>&1 &
elif command -v python >/dev/null 2>&1; then
  SERVER_KIND="Python"
  nohup python -m http.server "$PORT" --bind 127.0.0.1 >>"$LOG" 2>&1 &
elif command -v ruby >/dev/null 2>&1; then
  SERVER_KIND="Ruby"
  nohup ruby -run -e httpd . -p "$PORT" -b 127.0.0.1 >>"$LOG" 2>&1 &
elif command -v php >/dev/null 2>&1; then
  SERVER_KIND="PHP"
  nohup php -S "127.0.0.1:${PORT}" -t "$DIR" >>"$LOG" 2>&1 &
else
  /usr/bin/osascript -e 'display dialog "Portal tidak dapat dijalankan karena Node.js, Python, Ruby, atau PHP tidak ditemukan. Buka folder ini melalui VS Code Live Server." buttons {"OK"} default button "OK" with icon stop'
  exit 1
fi

PID=$!
echo "$PID" > "$PIDFILE"

disown "$PID" 2>/dev/null || true

for attempt in {1..40}; do
  if is_ready; then
    /usr/bin/open "$URL"
    /usr/bin/osascript -e "display notification \"Portal dibuka melalui ${SERVER_KIND} di port ${PORT}\" with title \"CAHAYA APP\"" >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 0.25
done

/usr/bin/osascript -e "display dialog \"Server belum berhasil aktif. Lihat file portal-server.log di folder dashboard.\" buttons {\"OK\"} default button \"OK\" with icon stop"
exit 1
