#!/usr/bin/env bash
# auto-hd.sh — vigía de integración automática (política del grupo, owncoding-ui v0.14.x).
#
# Cuenta los commits nuevos de las ramas de slots respecto del main del integrador y,
# al llegar al umbral (default 15) con el integrador libre y cooldown cumplido,
# dispara el ciclo completo `hd`: merge → suite → push → NOVEDADES → release + smoke.
#
# Uso:  auto-hd.sh start|stop|status|check|run|force
#   start  → lanza el vigía en segundo plano (nohup) y guarda PID
#   stop   → lo detiene
#   status → PID, último disparo, commits contados y estado del integrador
#   check  → una pasada en seco, sin disparar (diagnóstico)
#   run    → loop en primer plano (lo usa start)
#   force  → dispara el ciclo una vez, sin importar umbral/cooldown (manual)
#
# Overrides por entorno: AUTO_HD_REPO, AUTO_HD_MAIN, AUTO_HD_BRANCHES (regex),
# AUTO_HD_THRESHOLD, AUTO_HD_COOLDOWN (seg), AUTO_HD_INTERVAL (seg), AUTO_HD_AGENT,
# AUTO_HD_HERDR, AUTO_HD_BRIEF. Pausa: `touch auto-hd.pause` (y borrar para reanudar).
set -u

REPO="${AUTO_HD_REPO:-/Users/fredd/Documents/GitHub/scale-os}"
MAIN_REF="${AUTO_HD_MAIN:-origin/main}"
BRANCH_PATTERN="${AUTO_HD_BRANCHES:-^(SOS-|slot/)}"
THRESHOLD="${AUTO_HD_THRESHOLD:-15}"
COOLDOWN="${AUTO_HD_COOLDOWN:-1200}"
INTERVAL="${AUTO_HD_INTERVAL:-120}"
AGENT="${AUTO_HD_AGENT:-sos-integ}"
HERDR="${AUTO_HD_HERDR:-/Users/fredd/.local/bin/herdr}"

DIR="$(cd "$(dirname "$0")" && pwd)"
BRIEF="${AUTO_HD_BRIEF:-$DIR/auto-hd-brief.md}"
LOG="$DIR/auto-hd.log"
STATE="$DIR/auto-hd.last"
PIDFILE="$DIR/auto-hd.pid"
PAUSE="$DIR/auto-hd.pause"

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

rotate_log() { [ -f "$LOG" ] && [ "$(wc -c < "$LOG" | tr -d ' ')" -gt 524288 ] && mv "$LOG" "$LOG.1"; }

branch_counts() {
  local b n
  git -C "$REPO" for-each-ref --format='%(refname:short)' refs/remotes/origin 2>/dev/null \
    | sed 's|^origin/||' | grep -E "$BRANCH_PATTERN" | grep -v '^HEAD$' \
    | while read -r b; do
        n=$(git -C "$REPO" rev-list --count "$MAIN_REF..origin/$b" 2>/dev/null || echo 0)
        printf '%s %s\n' "$b" "$n"
      done
}

agent_status() {
  "$HERDR" agent get "$AGENT" 2>/dev/null \
    | grep -o '"agent_status":"[a-z]*"' | head -1 | cut -d'"' -f4
}

repo_busy() {
  local gitdir head porcelain
  gitdir=$(git -C "$REPO" rev-parse --git-dir 2>/dev/null) || return 1
  head=$(git -C "$REPO" symbolic-ref --short HEAD 2>/dev/null)
  [ "$head" = "main" ] || return 0
  [ -f "$gitdir/MERGE_HEAD" ] && return 0
  porcelain=$(git -C "$REPO" status --porcelain 2>/dev/null | head -1)
  [ -n "$porcelain" ] && return 0
  return 1
}

cooldown_left() {
  local now last
  now=$(date +%s)
  last=$(cat "$STATE" 2>/dev/null || echo 0)
  [ "$last" -le 0 ] && { echo 0; return; }
  local left=$((COOLDOWN - (now - last)))
  [ "$left" -lt 0 ] && left=0
  echo "$left"
}

snapshot() {
  git -C "$REPO" fetch origin --prune >/dev/null 2>&1
  local total=0 detalle="" b n
  while read -r b n; do
    [ -z "${b:-}" ] && continue
    total=$((total + n))
    [ "$n" -gt 0 ] && detalle="$detalle $b:$n"
  done < <(branch_counts)
  printf '%s|%s|%s|%s|%s|%s\n' "$total" "${detalle# }" "$(cooldown_left)" "$(agent_status)" "$(repo_busy && echo busy || echo libre)" "$( [ -f "$PAUSE" ] && echo pausado || echo activo )"
}

trigger() {
  local motivo="$1" brief extra total
  [ -f "$BRIEF" ] || { log "ERROR: no existe el brief $BRIEF"; return 1; }
  brief="$(cat "$BRIEF")"
  [ -f "$DIR/auto-hd-notas.md" ] && extra="$(cat "$DIR/auto-hd-notas.md")" && brief="$brief

$extra"
  total=$(snapshot | cut -d'|' -f1)
  "$HERDR" agent prompt "$AGENT" "$brief" >/dev/null 2>&1 || { log "ERROR: no se pudo enviar el prompt a $AGENT"; return 1; }
  date +%s > "$STATE"
  log "HD DISPARADO ($motivo) — commits=$total; agente=$AGENT"
}

cmd_check() {
  local line total detalle cd agent busy paused
  line=$(snapshot)
  IFS='|' read -r total detalle cd agent busy paused <<<"$line"
  printf 'commits sin integrar: %s (umbral %s)\n' "$total" "$THRESHOLD"
  [ -n "$detalle" ] && printf 'detalle: %s\n' "$detalle"
  printf 'integrador (%s): %s | repo: %s | vigía: %s | cooldown restante: %ss\n' "$AGENT" "${agent:-desconocido}" "$busy" "$paused" "$cd"
}

cmd_run() {
  rotate_log
  log "vigía iniciado (pid $$, repo=$REPO, umbral=$THRESHOLD, cooldown=${COOLDOWN}s, agente=$AGENT)"
  while :; do
    rotate_log
    local line total detalle cd agent busy paused
    line=$(snapshot)
    IFS='|' read -r total detalle cd agent busy paused <<<"$line"

    if [ "$paused" = "pausado" ]; then
      log "pausado (auto-hd.pause presente)"
    elif [ "$total" -lt "$THRESHOLD" ]; then
      log "espera: $total/$THRESHOLD commits sin integrar${detalle:+ ($detalle)}"
    elif [ "$cd" != "0" ]; then
      log "espera: cooldown ${cd}s (total=$total)"
    elif [ "$agent" != "idle" ] && [ "$agent" != "done" ]; then
      log "espera: integrador no libre (estado=${agent:-desconocido}, total=$total)"
    elif [ "$busy" = "busy" ]; then
      log "espera: merge o trabajo en curso en el checkout de main (total=$total)"
    else
      trigger "automático ≥$THRESHOLD"
    fi
    sleep "$INTERVAL"
  done
}

cmd_start() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "ya está corriendo (pid $(cat "$PIDFILE"))"
    return 0
  fi
  nohup "$0" run >> "$LOG" 2>&1 &
  echo $! > "$PIDFILE"
  echo "vigía lanzado (pid $(cat "$PIDFILE")) — log: $LOG"
}

cmd_stop() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    kill "$(cat "$PIDFILE")" && rm -f "$PIDFILE" && echo "vigía detenido"
  else
    echo "no estaba corriendo"
  fi
}

cmd_status() {
  local pid="—"
  [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null && pid=$(cat "$PIDFILE")
  printf 'vigía: pid %s\n' "$pid"
  [ -f "$STATE" ] && printf 'último HD automático: %s\n' "$(date -r "$(cat "$STATE")" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo '—')"
  cmd_check
  printf 'log: %s\n' "$LOG"
}

case "${1:-status}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  check) cmd_check ;;
  run) cmd_run ;;
  force) trigger "manual (force)" ;;
  *) echo "uso: $0 {start|stop|status|check|run|force}"; exit 2 ;;
esac
