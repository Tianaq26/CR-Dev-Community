# Publicar CR Dev Community gratis (y ponerle dominio)

La app son dos piezas que se publican por separado:

```
Navegador ──► Vercel (frontend React)  ──llama──►  API C# (Render o Railway) ──► PostgreSQL (Neon)
```

> Nada de esto se ha desplegado desde el repositorio: crear las cuentas y pulsar «deploy» requiere tus credenciales.
> Los archivos de configuración están listos y la **imagen Docker de la API se probó localmente** (arranca como usuario no-root,
> usa `PORT`, se conecta a Postgres, carga la demo). Los planes y precios cambian: confírmalos en cada página antes de decidir.

## 0. Elegir dónde (estado de los planes gratuitos, octubre 2026)

| Pieza | Opción | Qué hay que saber |
| --- | --- | --- |
| Frontend | **Vercel** (plan Hobby) | Gratis para proyectos personales. Te da `algo.vercel.app` al instante. |
| Base de datos | **Neon** ✅ recomendada | Postgres gratis, sin tarjeta, 0,5 GB por proyecto; se «duerme» tras 5 min sin uso y despierta en segundos. No caduca. [Precios](https://neon.com/pricing) |
| API | **Render** (web service gratis) | Gratis de verdad, pero **se duerme tras 15 min sin visitas** y la primera visita tarda ~30–60 s en despertar; 750 h/mes. [Detalle](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026) |
| API | **Railway** | Crédito de prueba único de 5 USD; después, plan Hobby de 5 USD/mes (siempre encendida, sin sueños). Las fuentes discrepan sobre si queda un nivel gratis permanente: [mira su página](https://docs.railway.com/reference/pricing). |

⚠️ **No uses el Postgres gratuito de Render**: [caduca a los 30 días](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026) y borra los datos. Por eso el `render.yaml` no lo crea.

**Mi recomendación para empezar a costo cero:** Vercel + Render + Neon. Si el «despertar» de la API te molesta, pasa la API a Railway (≈5 USD/mes) sin cambiar nada más.

## 1. Subir el código a GitHub

Ya está en `tianaq26/cr-dev-community`. Vercel, Render y Railway se conectan a ese repositorio y redespliegan solos con cada `push`.

## 2. Base de datos en Neon

1. Crea cuenta en <https://neon.com> → **New project** (elige la región más cercana a tu API).
2. En el panel, **Connect** → copia la cadena de conexión **directa** (la que *no* dice `-pooler`). Se ve así:
   `postgresql://usuario:clave@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
3. Guárdala: será `DATABASE_URL`. Las tablas se crean solas al primer arranque de la API.

## 3. La API

Genera un secreto para las sesiones (32+ caracteres):

```bash
openssl rand -base64 48
```

### Opción A — Render (gratis)

1. <https://render.com> → **New → Blueprint** → elige el repositorio. Render lee `render.yaml`.
2. Te pedirá dos valores:
   - `DATABASE_URL` → la cadena de Neon.
   - `CORS_ORIGINS` → por ahora pon `http://localhost:5173` (lo corriges en el paso 5).
   (`JWT_SECRET` lo genera Render solo. `SEED_DEMO` viene en `false`: ponlo en `true` solo si quieres cargar la comunidad de demostración para una primera prueba.)
3. Cuando termine, copia la URL pública, tipo `https://crdev-api.onrender.com`.
4. Comprueba que `https://crdev-api.onrender.com/health` responde `{"status":"ok"}`.

### Opción B — Railway

1. <https://railway.com> → **New Project → Deploy from GitHub repo**.
2. En el servicio: **Settings → Root Directory = `backend`** (Railway usará `railway.json` y el `Dockerfile`).
3. **Variables**: `JWT_SECRET`, `DATABASE_URL` (Neon, o añade un Postgres de Railway con **+ New → Database → PostgreSQL** y usa su variable), `CORS_ORIGINS` y, solo para una primera prueba con datos de ejemplo, `SEED_DEMO=true`.
4. **Settings → Networking → Generate Domain** y comprueba `/health`.

## 4. El frontend en Vercel

1. <https://vercel.com> → **Add New → Project** → importa el repositorio.
2. **Root Directory = `frontend`**. Vercel detecta Vite (el `vercel.json` ya incluye la reescritura para que las rutas como `/projects/…` funcionen al recargar).
3. **Environment Variables**:
   - `VITE_API_URL` = la URL de la API del paso 3 (sin `/` final).
   - `VITE_DEMO_LOGIN` = `true` solo mientras uses `SEED_DEMO=true` (muestra el botón de la cuenta de demostración). Para una publicación real, no la crees.
4. **Deploy**. Obtendrás `https://tu-proyecto.vercel.app` (puedes cambiar el nombre en *Settings → General* para elegir el subdominio).

## 5. Conectarlos (CORS)

Vuelve a la API y fija `CORS_ORIGINS` con tu dirección real de Vercel:

```
https://tu-proyecto.vercel.app,https://*.vercel.app
```

(El segundo valor permite también las vistas previas de Vercel.) Guarda; la API se reinicia sola. Abre tu sitio y prueba: crear cuenta, publicar un proyecto con imagen, entrar con otra cuenta y ver el emparejamiento.

## 6. Pasar de la demo a la publicación real

Hazlo antes de compartir el enlace con gente. La cuenta demo tiene la contraseña pública (`demo1234`).

1. **Neon → SQL Editor**: borra los datos de ejemplo (y cualquier cuenta de prueba) ejecutando:
   ```sql
   DROP SCHEMA public CASCADE; CREATE SCHEMA public;
   ```
2. **Render → crdev-api → Environment**: `SEED_DEMO` debe estar en `false` (o sin definir). Luego **Manual Deploy → Deploy latest commit**; al arrancar vuelve a crear las tablas, ahora vacías.
3. **Vercel → Settings → Environment Variables**: borra `VITE_DEMO_LOGIN` (o ponla en `false`) y haz **Deployments → ⋯ → Redeploy**. Las variables `VITE_…` se aplican al construir, por eso hace falta redesplegar.
4. **Render → Environment → `CORS_ORIGINS`**: deja solo tu dirección exacta, por ejemplo `https://tu-proyecto.vercel.app` (y luego la de tu dominio propio, si lo conectas).
5. Crea **tu propia cuenta** en el sitio: será la primera persona de la comunidad.

Detalles a tener en cuenta:
- El correo solo sirve para entrar; no se muestra a otras personas.
- Todavía no hay aviso de privacidad ni términos; si vas a recoger correos de mucha gente, conviene tenerlos.
- Con la base vacía la portada oculta los contadores y las pantallas muestran mensajes de «aún no hay…»: es normal.

## 7. Dominio propio

**Gratis y al instante:** `tu-proyecto.vercel.app`.

**Dominio propio** (`tucomunidad.com`):
1. Cómpralo en un registrador (Cloudflare Registrar, Porkbun, Namecheap…). Un `.com` suele costar unos 10–15 USD al año; confirma el precio actual. Un `.cr` se tramita con NIC Costa Rica y tiene sus propios requisitos y precio.
2. En Vercel: **Project → Settings → Domains → Add** `tucomunidad.com`. Vercel te muestra los registros DNS exactos (normalmente un registro `A` para el dominio raíz y un `CNAME` para `www`); créalos en el panel DNS de tu registrador. El certificado HTTPS es automático.
3. (Opcional, recomendable) Dale también dirección propia a la API: en Render/Railway **Custom Domain** → `api.tucomunidad.com` y su `CNAME`.
4. Actualiza las variables y redespliega: `CORS_ORIGINS=https://tucomunidad.com,https://www.tucomunidad.com` en la API, y `VITE_API_URL=https://api.tucomunidad.com` en Vercel.

Existen subdominios gratuitos para desarrolladores (por ejemplo `is-a.dev`, que se solicita por *pull request*); revisa sus condiciones actuales.

## 8. Administrar el backend

- **Logs y estado**: panel de Render/Railway → *Logs*. `GET /health` para monitoreo.
- **Variables**: se cambian en el mismo panel; el servicio se reinicia solo.
- **Actualizar la app**: haz `push` a la rama que desplegaste; ambas plataformas reconstruyen. Ojo: el esquema **no migra solo** (ver README, «límites actuales»).
- **Datos**: Neon guarda un historial corto para restaurar (6 h en el plan gratis). Para copias de seguridad reales: `pg_dump "<DATABASE_URL>" > respaldo.sql`.
- **Evitar el sueño en Render gratis** (opcional): un monitor externo (p. ej. UptimeRobot) que visite `/health` cada ~10 min mantiene la API despierta; un servicio encendido todo el mes cabe en las 750 h gratuitas. Revisa las condiciones de uso de Render antes de apoyarte en esto.
- **Crecer**: cuando haya tráfico real, sube la API a un plan de pago (siempre encendida) y la base a un plan con más de 0,5 GB. Las imágenes están guardadas en la base de datos; si pesan demasiado, el siguiente paso es moverlas a un almacenamiento de objetos (Cloudflare R2, S3…).

## Si algo falla

| Síntoma | Causa probable |
| --- | --- |
| La API se reinicia en bucle y los logs dicen `JWT_SECRET is required` o `DATABASE_URL is required` | Falta esa variable en producción (es a propósito). |
| El sitio carga pero todo da «No pudimos conectar con el servidor» | `VITE_API_URL` mal puesta, o `CORS_ORIGINS` no incluye la dirección exacta del sitio (con `https://`, sin `/` final). |
| La primera carga tarda ~1 minuto | La API gratuita estaba dormida; es normal en Render gratis. |
| Las imágenes no se ven | `VITE_API_URL` no apunta a la API (las imágenes se sirven desde ella). |
| Recargar `/projects/…` da 404 en Vercel | Falta `vercel.json` o el *Root Directory* no es `frontend`. |
