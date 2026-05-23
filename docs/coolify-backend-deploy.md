# Deploy backend en Coolify (Git + Docker)

## 1) Repositorio

- Conecta el repo en Coolify.
- Define branch:
- `develop` -> staging
- `main` -> produccion

## 2) Build

- Tipo: Dockerfile.
- Ruta Dockerfile: `backend/Dockerfile`.
- Contexto: `backend`.
- Puerto expuesto: `5000`.

## 3) Variables de entorno requeridas

- `NODE_ENV=production`
- `PORT=5000`
- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `APP_URL`
- `LLM_PROVIDER`
- `OPENAI_API_KEY` (si aplica)
- `GEMINI_API_KEY` (si aplica)
- `CLAUDE_API_KEY` (si aplica)

## 4) Healthcheck recomendado

- Path: `/api/health` (publico).

## 5) Estrategia de despliegue

1. Push a `develop`.
2. Validar staging.
3. Merge a `main`.
4. Desplegar produccion por auto-deploy.

## 6) Riesgo operativo actual

- Login aun es stub (no usuarios reales).
- Evaluacion IA usa proveedor `mock`.
- Falta test e2e automatizado previo a release.
