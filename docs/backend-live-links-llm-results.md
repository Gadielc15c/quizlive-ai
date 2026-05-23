# Backend - Live links, LLM dinamico y resultados de estudiante

## Nuevos endpoints

1. Link + QR de sesion en vivo:
- `GET /api/sessions/:id/access`
- Requiere JWT de docente/admin.
- Responde `joinUrl` y `qrUrl`.

2. Generar quiz completo con IA y guardar en DB:
- `POST /api/ai/generate-quiz`
- Requiere JWT de docente/admin.
- Crea quiz + preguntas y guarda `correctAnswer` por pregunta.

3. Resultado del estudiante:
- `GET /api/participant/:id/result`
- Retorna `score`, `maxScore`, `percentage`, `answers`, `totalQuestions`, `pendingGrading`, `gradingComplete`.
- `maxScore` sale del total de preguntas del examen, no solo de las respuestas enviadas.

4. Preguntas del estudiante:
- `GET /api/participant/:id/questions`
- Retorna preguntas solo si la sesion esta `live` o `paused`.
- Si la duracion ya vencio, el backend marca la sesion como `ended` y retorna `questions: []`.

## Variables LLM agregadas

- `LLM_PROVIDER=api`
- `LLM_BASE_URL=https://api.openai.com/v1`
- `OPENAI_API_KEY=...`
- `LLM_TIMEOUT_SECONDS=60`
- `AI_SCREENING_MODEL=gpt-5.4-mini-2026-03-17`
- `AI_ASSESSMENT_MODEL=gpt-5.4-mini-2026-03-17`

## Regla de respuesta correcta

Para tipos auto-corregibles:
- `multiple_choice`
- `true_false`
- `short_answer`

`correctAnswer` es obligatorio (validacion en DTO y servicio).

## Frontend agregado

1. Dashboard de acceso en vivo:
- Ruta: `/dashboard/live-access`
- Permite obtener link y QR con `sessionId` + JWT.

2. Pantalla de resultado estudiante:
- Ruta: `/result/[participantId]`
- Muestra calificacion guardada desde backend.

3. Flujo estudiante:
- Ruta: `/join/[token]` registra al estudiante y redirige a `/play/[participantId]`.
- `/join/[token]` no renderiza preguntas.
- `/play/[participantId]` limpia preguntas cuando la sesion finaliza.
