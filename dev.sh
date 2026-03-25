#!/usr/bin/env bash
# Faz-o-Pix — on-demand dev environment
# Ports: backend=63292, frontend=63293, postgres=63294
# DB container persists across restarts (--restart unless-stopped)
# Usage: ./dev.sh
set -euo pipefail

CONTAINER="fazopix-pg-dev"
PG_PORT=63294
BACKEND_PORT=63292
FRONTEND_PORT=63293
DB_USER="postgres"
DB_PASS="dev_password_123"
DB_NAME="fazopix_dev"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Parando aplicacao..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "  Frontend parado"
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && echo "  Backend parado"
  echo "  PostgreSQL continua rodando (container: $CONTAINER)"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

DIR="$(cd "$(dirname "$0")" && pwd)"
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

# Use sudo for docker if user not in docker group
DOCKER="docker"
if ! $DOCKER ps >/dev/null 2>&1; then
  DOCKER="sudo docker"
fi

# --- PostgreSQL (persistent container) ---
if $DOCKER ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "PostgreSQL ja rodando na porta $PG_PORT"
elif $DOCKER ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Iniciando container PostgreSQL existente..."
  $DOCKER start "$CONTAINER" >/dev/null
  sleep 2
  echo "  PostgreSQL pronto!"
else
  echo "Criando container PostgreSQL na porta $PG_PORT..."
  $DOCKER run -d --name "$CONTAINER" \
    --restart unless-stopped \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -p "${PG_PORT}:5432" \
    postgres:14-alpine >/dev/null

  echo -n "  Aguardando PostgreSQL"
  for i in $(seq 1 30); do
    if $DOCKER exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      echo " pronto!"
      break
    fi
    echo -n "."
    sleep 1
  done
fi

# --- Dependencies ---
echo "Verificando dependencias..."
[ ! -d "$DIR/backend/node_modules" ] && (cd "$DIR/backend" && npm install --silent)
[ ! -d "$DIR/frontend/node_modules" ] && (cd "$DIR/frontend" && npm install --silent)

# --- Prisma ---
echo "Sincronizando banco de dados..."
cd "$DIR/backend"
DATABASE_URL="$DATABASE_URL" npx prisma generate --schema=prisma/schema.prisma 2>/dev/null
DATABASE_URL="$DATABASE_URL" npx prisma db push --skip-generate 2>/dev/null
echo "  Banco de dados pronto!"

# --- Backend ---
echo "Iniciando backend na porta $BACKEND_PORT..."
cd "$DIR/backend"
DATABASE_URL="$DATABASE_URL" \
PORT="$BACKEND_PORT" \
HOST="0.0.0.0" \
JWT_SECRET="dev_jwt_secret_min_32_chars_long_123456789" \
COOKIE_SECRET="dev_cookie_secret_min_32_chars_long_123456789" \
ENCRYPTION_KEY="dev_encryption_key_exactly_32_chars12" \
NODE_ENV="development" \
npx tsx watch src/index.ts &
BACKEND_PID=$!

echo -n "  Aguardando backend"
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    echo " pronto!"
    break
  fi
  echo -n "."
  sleep 1
done

# --- Frontend ---
echo "Iniciando frontend na porta $FRONTEND_PORT..."
cd "$DIR/frontend"
PORT="$FRONTEND_PORT" \
npx next dev -p "$FRONTEND_PORT" &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo "  Faz-o-Pix rodando!"
echo ""
echo "  LAN:        http://${LAN_IP}:${FRONTEND_PORT}"
echo "  Local:      http://localhost:${FRONTEND_PORT}"
echo "  API:        http://${LAN_IP}:${BACKEND_PORT}"
echo "  API Docs:   http://${LAN_IP}:${BACKEND_PORT}/docs"
echo "  PostgreSQL: localhost:${PG_PORT} (persistente)"
echo ""
echo "  Ctrl+C para parar app (DB continua rodando)"
echo "================================================"
echo ""

wait
