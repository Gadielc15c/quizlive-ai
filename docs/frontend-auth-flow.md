# Frontend auth flow

El frontend no debe pedir JWT manual al docente.

## Flujo actual

1. El frontend lee `NEXT_PUBLIC_API_URL`.
2. Busca token guardado en `localStorage`.
3. Si no existe, usa `NEXT_PUBLIC_TEACHER_EMAIL` y `NEXT_PUBLIC_TEACHER_PASSWORD`.
4. Llama `POST /api/auth/login`.
5. Guarda `accessToken`.
6. Usa `Authorization: Bearer <token>` en endpoints protegidos.

## Variables

Archivo local:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_TEACHER_EMAIL=docente@quizlive.local
NEXT_PUBLIC_TEACHER_PASSWORD=quizlive-dev-password
NEXT_PUBLIC_TEACHER_JWT=
```

## Rutas corregidas

- `/dashboard`
- `/quizzes/:id`

## Nota

En produccion esto debe cambiar a login real con usuarios guardados en DB.
Mientras el backend use login stub, estas credenciales son solo para desarrollo.

