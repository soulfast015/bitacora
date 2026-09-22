# Guía de Deploy en Proxmox (LXC + Docker, contenedor único con SQLite)

La app corre en **un solo contenedor Docker** con base de datos **SQLite** guardada en un
volumen persistente. No requiere ningún servicio de base de datos aparte.

```
Proxmox (nodo)
 └─ Contenedor LXC (Debian 12)
     └─ Docker
         └─ contenedor "bitacora"  (Next.js, puerto 3000)
             └─ volumen "bitacora-data"  →  /app/data/prod.db  (SQLite)
```

---

## Paso 1 — Crear el contenedor LXC en Proxmox

En la **shell del nodo Proxmox** (o desde la UI):

1. Descargar la plantilla de Debian 12 si no la tienes:
   ```bash
   pveam update
   pveam available | grep debian-12
   pveam download local debian-12-standard_12.7-1_amd64.tar.zst
   ```
2. Crear el LXC (ajusta `--vmid`, `--storage`, el puente de red y la contraseña):
   ```bash
   pct create 110 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
     --hostname bitacora \
     --cores 2 --memory 2048 --swap 512 \
     --rootfs local-lvm:10 \
     --net0 name=eth0,bridge=vmbr0,ip=dhcp \
     --features nesting=1 \
     --unprivileged 1 \
     --password
   ```
   > **`nesting=1` es obligatorio** para poder correr Docker dentro del LXC.
3. Arrancar y entrar:
   ```bash
   pct start 110
   pct enter 110
   ```

> Alternativa por la UI: al crear el CT, en **Options → Features** marca **Nesting**.

---

## Paso 2 — Instalar Docker dentro del LXC

Ya dentro del contenedor (`pct enter 110`):

```bash
apt update && apt install -y curl git ca-certificates
curl -fsSL https://get.docker.com | sh
docker version
docker compose version
```

---

## Paso 3 — Subir el proyecto

**Opción A (git):**
```bash
cd /opt
git clone <URL-DE-TU-REPO> bitacora
cd bitacora
```

**Opción B (scp desde tu PC):** comprime el proyecto **sin** `node_modules/`, `.next/` ni
`*.db`, súbelo al LXC y descomprímelo en `/opt/bitacora`.

---

## Paso 4 — Configurar variables de entorno

```bash
cd /opt/bitacora
cp env.production.example .env.production
```

Edita `.env.production`:
```env
DATABASE_URL="file:/app/data/prod.db"
NEXTAUTH_SECRET="PEGAR-SECRET-GENERADO-AQUI"
NEXTAUTH_URL="http://IP-DEL-LXC:3000"
```

- **No cambies `DATABASE_URL`**: apunta al volumen persistente dentro del contenedor.
- Genera el secret:
  ```bash
  openssl rand -base64 32
  ```
- Pon en `NEXTAUTH_URL` la **IP real del LXC** (mírala con `ip a`), sin ningún path extra.

---

## Paso 5 — Construir y levantar

```bash
cd /opt/bitacora
docker compose up -d --build
```

El arranque hace **automáticamente**:
1. `prisma db push` — crea las tablas en el SQLite del volumen.
2. `seed` — crea usuarios/roles iniciales (solo la primera vez).
3. Inicia el servidor Next.js en el puerto 3000.

Ver el progreso / logs:
```bash
docker compose logs -f
```

---

## Paso 6 — Acceder

Abre en el navegador:
```
http://IP-DEL-LXC:3000
```
(el login está en `/login`).

### Credenciales por defecto

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@bitacora.com | admin123 |
| Técnico | tecnico@bitacora.com | tecnico123 |
| Usuario | usuario@bitacora.com | usuario123 |

⚠️ **Cambia las contraseñas después del primer login.**

---

## (Opcional) Reverse proxy con dominio + HTTPS

Si quieres exponerlo con dominio y HTTPS, pon un Nginx delante (en el mismo LXC u otro):

```nginx
location / {
    proxy_pass http://127.0.0.1:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
Y actualiza `NEXTAUTH_URL` al dominio (p. ej. `https://tudominio.com`), luego
`docker compose up -d` para recargar.

---

## Actualizar la app (nuevo código)

```bash
cd /opt/bitacora
git pull            # o vuelve a subir los archivos
docker compose up -d --build
```
Los datos **no se pierden**: viven en el volumen `bitacora-data`.

---

## Backup y restore de la base de datos

La base es un solo archivo dentro del volumen. Para respaldarla:

```bash
# Copiar el archivo SQLite fuera del contenedor
docker compose exec bitacora sh -c "cp /app/data/prod.db /app/data/backup.db"
docker cp bitacora:/app/data/backup.db ./bitacora_$(date +%Y%m%d).db
```

Backup automático diario (cron del LXC, `crontab -e`):
```cron
0 2 * * * docker cp bitacora:/app/data/prod.db /opt/backups/bitacora_$(date +\%Y\%m\%d).db
```

Restore:
```bash
docker cp ./bitacora_YYYYMMDD.db bitacora:/app/data/prod.db
docker compose restart bitacora
```

---

## Comandos útiles

```bash
docker compose ps              # estado
docker compose logs -f         # logs en vivo
docker compose restart         # reiniciar
docker compose down            # detener (conserva el volumen/datos)
docker compose down -v         # detener y BORRAR los datos (¡cuidado!)
```

## Solución de problemas

| Problema | Solución |
|----------|----------|
| Docker no arranca en el LXC | Falta `nesting=1` en el CT. Añádelo en Options → Features y reinicia el LXC. |
| Login no funciona / redirige mal | Revisa que `NEXTAUTH_URL` tenga la IP/dominio correctos (sin path extra). |
| No abre desde otra máquina | Verifica firewall del LXC y que el puerto 3000 esté publicado (`docker compose ps`). |
| Se borraron los datos | Solo pasa con `docker compose down -v`. Restaura desde backup. |
| Quiero reseeded desde cero | `docker compose down -v && docker compose up -d --build`. |
