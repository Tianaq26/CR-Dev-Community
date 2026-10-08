# CR Dev Community

Red para que personas que construyen cosas (desarrolladoras, músicos, ilustradores, escritoras…) **publiquen sus proyectos, cuenten a quién necesitan y encuentren a quien encaja**.

- **Perfil**: nombre, ubicación, habilidades, y dónde trabajas y/o estudias (uno, otro, ambos o ninguno), foto y enlaces.
- **Proyectos**: descripción, imágenes, videos (YouTube/Vimeo) y **puestos que buscas**. Un puesto = una habilidad.
- **Emparejamiento**: si tu perfil tiene la habilidad que un proyecto busca, aparece en tu pestaña **Para ti** con la etiqueta «Encaja contigo». La persona que creó el proyecto ve, por cada puesto, **quién tiene esa habilidad**.
- **Unirse**: pides un puesto con un mensaje; quien creó el proyecto acepta o rechaza desde su **Bandeja** y la persona pasa al equipo.
- **Amigos**: buscar gente, solicitudes, aceptar/rechazar, y un feed solo de amigos.
- **Ideas**: publica una idea (aún sin proyecto); otros dan **feedback** o dicen **«quiero ayudar»**, y puedes **convertirla en proyecto** con un clic.
- **Diseño**: papel kraft y madera clara, tipografías de imprenta (Fraunces + Lora) y «vidrio líquido» cálido: paneles translúcidos con desenfoque y reflejos de borde.

## Cómo está hecho

| Parte | Tecnología |
| --- | --- |
| Backend | C# · ASP.NET Core 10 (controladores) · EF Core · JWT · BCrypt |
| Base de datos | **PostgreSQL** en producción · **SQLite** en local (sin instalar nada) |
| Frontend | React 19 · TypeScript · Vite · React Router · TanStack Query · CSS propio (sin framework de UI) |
| Pruebas | xUnit (58, sobre SQLite **y** PostgreSQL) · Vitest |
| Despliegue | Dockerfile (API) · `vercel.json` (frontend) · `render.yaml` / `railway.json` |

```
backend/
  src/CrDev.Api/       API: Controllers, Domain, Data (EF + seed), Services, Contracts, Seed/covers
  tests/CrDev.Api.Tests/
  Dockerfile  railway.json
frontend/
  src/                 pages, components, hooks, lib, styles (tokens → glass → layout → features)
  vercel.json
docs/DESPLIEGUE.md     publicar gratis + dominio, paso a paso
render.yaml  docker-compose.yml  .github/workflows/ci.yml
```

## Probarlo en local

Necesitas [.NET 10 SDK](https://dotnet.microsoft.com/download) y Node 22+.

```bash
# 1) API en http://localhost:5080  (SQLite + datos de demostración, sin configurar nada)
cd backend/src/CrDev.Api
dotnet run

# 2) Frontend en http://localhost:5173  (en otra terminal; Vite redirige /api a la API)
cd frontend
npm install
npm run dev
```

Abre <http://localhost:5173> y pulsa **«Mirar con la cuenta de demostración»**, o entra con
`demo@crdev.community` / `demo1234` (Mateo, músico: verás proyectos que buscan músicos).
Las otras personas de la demo no tienen contraseña conocida; crea tu propia cuenta para jugar con dos perfiles a la vez.

Para probar contra PostgreSQL como en producción: `docker compose up -d` y arranca la API con
`DATABASE_URL=postgresql://crdev:crdev@localhost:5432/crdev`.
Documentación interactiva de la API (solo en desarrollo): <http://localhost:5080/openapi/v1.json>.

### Pruebas

```bash
cd backend && dotnet test                                                          # SQLite
cd backend && TEST_POSTGRES="Host=localhost;Username=postgres;Password=postgres" dotnet test   # PostgreSQL real
cd frontend && npm test && npm run lint && npm run build
```

## Publicarlo

Guía completa (Neon + Render o Railway + Vercel, y cómo conectar un dominio): **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

Variables del backend (ver `backend/.env.example`): `JWT_SECRET` y `DATABASE_URL` son obligatorias en producción
(la API **se niega a arrancar** sin ellas, para no perder datos en un disco efímero); `CORS_ORIGINS` lista los sitios que pueden llamar a la API.
Variables del frontend: `VITE_API_URL`, `VITE_DEMO_LOGIN`.

## API en una mirada

Todo bajo `/api`, JSON, autenticación `Authorization: Bearer <token>` salvo donde se indica.

| Área | Endpoints |
| --- | --- |
| Sesión | `POST auth/register` · `POST auth/login` (limitados por IP) |
| Perfil | `GET/PUT me` · `GET users?q=&skill=` · `GET users/{id}` |
| Proyectos | `GET projects?feed=foryou\|recent\|friends&q=&skill=&ownerId=` · `GET/POST/PUT/DELETE projects/{id}` · `GET projects/{id}/suggestions` · `GET projects/{id}/requests` · `POST projects/{id}/apply` · `DELETE projects/{id}/members/{userId}` |
| Solicitudes | `GET inbox` · `GET inbox/count` · `POST join-requests/{id}/accept\|decline` · `DELETE join-requests/{id}` |
| Amigos | `GET friends` · `GET friends/requests` · `POST friends/requests` · `POST friends/requests/{id}/accept\|decline` · `DELETE friends/{userId}` · `GET friends/suggestions` |
| Ideas | `GET/POST ideas` · `GET/PUT/DELETE ideas/{id}` · `PUT/DELETE ideas/{id}/interest` · `POST ideas/{id}/comments` · `DELETE ideas/{id}/comments/{cid}` |
| Archivos | `POST media` (imágenes ≤ 4 MB, validadas por contenido) · `GET media/{id}` (público) |
| Otros | `GET skills` · `GET stats` (público) · `GET /health` |

Seguridad que ya está: contraseñas con BCrypt, JWT, comprobación de dueño en cada edición/borrado, validación de entradas con mensajes en español,
solo enlaces `http(s)` aceptados, imágenes verificadas por sus bytes (no por la extensión; SVG rechazado), CORS por lista, límite de intentos de acceso.

## Lo que hay que saber (límites actuales)

- **Esquema de base de datos**: se crea automáticamente al arrancar (`EnsureCreated`). Sirve para el prototipo, pero **no migra** cambios futuros del modelo: antes de tener usuarios reales conviene pasar a migraciones de EF Core.
- **Sin verificación de correo ni «olvidé mi contraseña»** (requieren un servicio de correo).
- **Sin mensajería directa**: la conversación es por solicitudes y comentarios. Las notificaciones son la Bandeja con contador (se actualiza cada minuto), no hay push ni correo.
- **Imágenes en la base de datos** (4 MB por imagen, 60 MB por cuenta) porque los discos de los planes gratuitos se borran al reiniciar. Los **videos son enlaces**.
- **El emparejamiento compara habilidades normalizadas** (sin mayúsculas/tildes): «Músico» = «musico», pero «Músico» ≠ «Compositor». El selector de habilidades sugiere un catálogo para que la gente coincida.
- **Sin moderación ni reportes** de contenido todavía.
- La sesión se guarda en `localStorage` (válida 14 días).
- Probado en Chromium (escritorio y móvil). No se ha probado en Safari ni Firefox.
