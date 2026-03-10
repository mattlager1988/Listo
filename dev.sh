#!/bin/bash

# Development server launcher for Listo
# Usage: ./dev.sh start|stop|status|logs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"
LOG_DIR="$SCRIPT_DIR/.dev-logs"

API_DIR="$SCRIPT_DIR/listo/listo-api"
WEB_DIR="$SCRIPT_DIR/listo/listo-web"
MOB_DIR="$SCRIPT_DIR/listo/listo-mobile"

# Kill a process and all its descendants recursively
kill_tree() {
    local pid=$1
    local children
    children=$(pgrep -P "$pid" 2>/dev/null || true)
    for child in $children; do
        kill_tree "$child"
    done
    kill "$pid" 2>/dev/null || true
}

start() {
    if [ -f "$PID_FILE" ]; then
        echo "Dev servers may already be running. Run './dev.sh stop' first or check './dev.sh status'"
        exit 1
    fi

    mkdir -p "$LOG_DIR"

    echo "Starting API server..."
    cd "$API_DIR"
    dotnet run > "$LOG_DIR/api.log" 2>&1 &
    API_PID=$!
    echo "API started with PID $API_PID"

    echo "Starting web frontend..."
    cd "$WEB_DIR"
    npm run dev > "$LOG_DIR/web.log" 2>&1 &
    WEB_PID=$!
    echo "Web started with PID $WEB_PID"

    echo "Starting mobile frontend..."
    cd "$MOB_DIR"
    npm run dev > "$LOG_DIR/mob.log" 2>&1 &
    MOB_PID=$!
    echo "Mobile started with PID $MOB_PID"

    echo "API_PID=$API_PID" > "$PID_FILE"
    echo "WEB_PID=$WEB_PID" >> "$PID_FILE"
    echo "MOB_PID=$MOB_PID" >> "$PID_FILE"

    echo ""
    echo "Both servers started!"
    echo "  API: http://localhost:5286"
    echo "  Web: http://localhost:5173"
    echo "  Mobile: http://localhost:5174"
    echo ""
    echo "View logs: ./dev.sh logs"
    echo "Stop servers: ./dev.sh stop"
}

stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "No PID file found. Servers may not be running."
        exit 0
    fi

    source "$PID_FILE"

    echo "Stopping servers..."

    if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
        kill_tree "$API_PID"
        echo "Stopped API (PID $API_PID and children)"
    else
        echo "API process not found"
    fi

    if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" 2>/dev/null; then
        kill_tree "$WEB_PID"
        echo "Stopped Web (PID $WEB_PID and children)"
    else
        echo "Web process not found"
    fi

    if [ -n "$MOB_PID" ] && kill -0 "$MOB_PID" 2>/dev/null; then
        kill_tree "$MOB_PID"
        echo "Stopped Mobile (PID $MOB_PID and children)"
    else
        echo "Mobile process not found"
    fi

    rm -f "$PID_FILE"
    echo "Done"
}

status() {
    if [ ! -f "$PID_FILE" ]; then
        echo "No PID file found. Servers not running."
        exit 0
    fi

    source "$PID_FILE"

    echo "Server status:"
    if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
        echo "  API: running (PID $API_PID)"
    else
        echo "  API: not running"
    fi

    if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" 2>/dev/null; then
        echo "  Web: running (PID $WEB_PID)"
    else
        echo "  Web: not running"
    fi

    if [ -n "$MOB_PID" ] && kill -0 "$MOB_PID" 2>/dev/null; then
        echo "  Mobile: running (PID $WEB_PID)"
    else
        echo "  Mobile: not running"
    fi
}

logs() {
    if [ ! -d "$LOG_DIR" ]; then
        echo "No log directory found."
        exit 1
    fi

    echo "=== API Log (last 20 lines) ==="
    tail -n 20 "$LOG_DIR/api.log" 2>/dev/null || echo "(no log)"
    echo ""
    echo "=== Web Log (last 20 lines) ==="
    tail -n 20 "$LOG_DIR/web.log" 2>/dev/null || echo "(no log)"
    echo ""
    echo "=== Mobile Log (last 20 lines) ==="
    tail -n 20 "$LOG_DIR/mob.log" 2>/dev/null || echo "(no log)"
    echo ""
    echo "Full logs at: $LOG_DIR/"
}

case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "Usage: $0 {start|stop|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   Start API and web servers in background"
        echo "  stop    Stop running servers"
        echo "  status  Check if servers are running"
        echo "  logs    Show recent log output"
        exit 1
        ;;
esac
