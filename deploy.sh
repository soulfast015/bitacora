#!/bin/bash
# ==============================================
# Script de deploy para AAPanel (MySQL)
# ==============================================
# Ejecutar en el servidor después de subir los archivos
# bash deploy.sh

set -e

echo "🚀 Iniciando deploy de Bitácora..."

APP_DIR="/www/wwwroot/bitacora"
cd "$APP_DIR"

# 1. Crear carpetas necesarias
echo "📁 Creando carpetas..."
mkdir -p logs

# 2. Cargar variables de entorno
if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | xargs)
  echo "✅ Variables de entorno cargadas"
else
  echo "❌ ERROR: No se encontró .env.production"
  exit 1
fi

# 3. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# 4. Generar Prisma Client
echo "🔧 Generando Prisma Client..."
npx prisma generate

# 5. Crear tablas en MySQL
echo "🗃️  Configurando base de datos MySQL..."
npx prisma db push

# 6. Ejecutar seed (solo la primera vez)
if [ ! -f "logs/.seeded" ]; then
  echo "🌱 Ejecutando seed inicial..."
  npx tsx prisma/seed.ts
  touch logs/.seeded
  echo "✅ Seed completado"
else
  echo "⏭️  Seed ya ejecutado anteriormente"
fi

# 7. Build de producción
echo "🏗️  Construyendo aplicación..."
npm run build

# 8. Copiar archivos estáticos para standalone
echo "📂 Preparando standalone..."
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp .env.production .next/standalone/ 2>/dev/null || true

# 9. Reiniciar con PM2
echo "🔄 Reiniciando aplicación..."
if pm2 describe bitacora > /dev/null 2>&1; then
  pm2 restart bitacora
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo ""
echo "✅ Deploy completado exitosamente!"
echo "📍 La aplicación está corriendo en el puerto 3000"
echo "🌐 Configura Apache como reverse proxy apuntando a localhost:3000"
echo ""
