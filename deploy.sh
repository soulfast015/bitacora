#!/bin/bash
# ==============================================
# Script de deploy con Docker (contenedor único + SQLite)
# Pensado para un LXC de Proxmox. Ejecutar dentro del contenedor:
#   bash deploy.sh
# ==============================================

set -e

echo "🚀 Iniciando deploy de Bitácora (Docker)..."

# 1. Verificar Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ ERROR: Docker no está instalado."
  echo "   Instálalo con: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ ERROR: El plugin 'docker compose' no está disponible."
  exit 1
fi

# 2. Verificar variables de entorno
if [ ! -f .env.production ]; then
  echo "⚠️  No se encontró .env.production. Creándolo desde el ejemplo..."
  cp env.production.example .env.production
  echo ""
  echo "❗ Edita .env.production y ajusta NEXTAUTH_SECRET y NEXTAUTH_URL antes de continuar."
  echo "   Genera un secret con: openssl rand -base64 32"
  exit 1
fi

# 3. Construir y levantar (app + SQLite en volumen persistente)
echo "🏗️  Construyendo imagen y levantando contenedor..."
docker compose up -d --build

# El entrypoint del contenedor ejecuta automáticamente:
#   - prisma db push  (crea las tablas en el SQLite del volumen)
#   - seed            (usuarios/roles iniciales, solo la primera vez)
#   - node server.js  (servidor Next.js en el puerto 3000)

echo ""
echo "✅ Deploy completado."
echo "📍 La app corre en el puerto 3000 (path /bitacora)."
echo "🌐 Accede en: http://IP-DEL-LXC:3000/bitacora"
echo ""
echo "Comandos útiles:"
echo "  docker compose logs -f      # ver logs"
echo "  docker compose ps           # estado"
echo "  docker compose restart      # reiniciar"
echo ""
