# Backend MVP - Estado actual

## Modulos implementados

- `auth`
- `quizzes`
- `questions`
- `sessions`
- `participants`
- `responses`
- `grading`
- `ai`
- `reports`
- `websocket`

## Endpoints disponibles (prefijo `/api`)

Auth:
- `POST /auth/login`

Quizzes:
- `POST /quizzes`
- `GET /quizzes`
- `GET /quizzes/:id`
- `PATCH /quizzes/:id`
- `DELETE /quizzes/:id`
- `POST /quizzes/:id/publish`

Questions:
- `POST /quizzes/:id/questions`
- `GET /quizzes/:id/questions`
- `PATCH /questions/:id`
- `DELETE /questions/:id`

Sessions:
- `POST /quizzes/:id/sessions`
- `GET /sessions/:id`
- `POST /sessions/:id/start`
- `POST /sessions/:id/pause`
- `POST /sessions/:id/end`
- `POST /sessions/:id/review-access`

Participants:
- `GET /join/:token`
- `POST /join/:token`
- `GET /participant/:id/questions`
- `GET /participant/session/:id`
- `POST /participant/:id/heartbeat`
- `POST /participant/:id/submit`

Responses:
- `POST /participant/:id/answer`
- `POST /participant/:id/answer/:questionId`
- `GET /participant/:id/responses`
- `GET /participant/:id/result`
- `GET /participant/:id/review`

IA:
- `POST /ai/generate-questions`
- `POST /ai/evaluate-response`

Reportes:
- `GET /sessions/:id/results`
- `GET /sessions/:id/live`
- `GET /quizzes/:id/results`

## Reglas publicas de examen

- `GET /join/:token` no devuelve contenido de preguntas. Solo estado de sesion y `questionCount`.
- `GET /participant/:id/questions` devuelve preguntas solo si la sesion esta `live` o `paused`.
- Si `startedAt + durationMinutes` ya vencio, la sesion se marca `ended` antes de devolver datos.
- `POST /participant/:id/answer` solo acepta respuestas cuando la sesion esta `live`, el participante no entrego y la pregunta pertenece al quiz de la sesion.
- Resultados de sesion usan el puntaje maximo total del examen. Preguntas sin respuesta cuentan como cero.
- `GET /sessions/:id/live` incluye progreso, puntaje parcial y promedio de la sesion.
- La revision detallada del estudiante queda bloqueada por defecto.
- El docente habilita revision con `POST /sessions/:id/review-access` y body `{ "enabled": true }`.
- La revision solo puede habilitarse cuando la sesion esta `ended`.
- `GET /participant/:id/review` devuelve detalle por pregunta solo si `reviewAccessEnabled` esta activo.

## WebSocket

Namespace:
- `/live-session`

Eventos implementados:
- `participant:join`
- `participant:answer_update`
- `participant:answer_submit`
- `participant:heartbeat`
- `teacher:start_session`
- `teacher:pause_session`
- `teacher:end_session`
- `teacher:next_question`
- `teacher:extend_time`
- `teacher:send_announcement`

## Variables de entorno

Archivo:
- `backend/.env.example`

Minimas:
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`

## Docker

- `backend/Dockerfile`
- `docker-compose.yml` (backend + mongo + redis)

## Pendientes criticos para produccion

1. Reemplazar login stub por usuarios reales + hash de contrasena.
2. Integrar proveedor LLM real (OpenAI/Gemini/Claude).
3. Auditoria de IA (`aiRequests`, prompt/rubrica/resultado/version).
4. Rate limiting y hardening de seguridad.
5. Pruebas e2e y carga WebSocket.
6. Exportacion PDF/Excel real.
