# AGENTES - QuizLive AI

Guía operativa para ejecutar el proyecto con cambios atómicos, trazables y estables.

## 1) Objetivo

Construir y operar **QuizLive AI** con separación clara entre frontend y backend, DB en MongoDB, despliegue por Git en Coolify, contenedores Docker y configuración por variables de entorno.

## 2) Principios no negociables

1. Cambio atómico: una sola intención por PR.
2. Sin mezcla de tareas: no combinar feature + refactor + formato en el mismo cambio.
3. Contrato primero: backend define contrato (DTO/OpenAPI/eventos) antes de integrar frontend.
4. Verificación mínima obligatoria: no cerrar tarea sin prueba mínima ejecutada.
5. Trazabilidad IA: toda calificación/generación IA debe registrar modelo, prompt, rúbrica, resultado y timestamp.
6. Seguridad por defecto: validar input, limitar tasa, separar roles, no exponer respuestas correctas antes de cierre.

## 3) Roles de agentes

## 3.1 Agent Orquestador
- Mantiene backlog, dependencias, riesgos y criterios de salida.
- Autoriza paso entre fases solo si los gates están en verde.

## 3.2 Agent Backend
- Implementa NestJS: auth, courses, quizzes, questions, sessions, participants, responses, grading, ai, reports.
- Expone REST y Socket.IO con validación estricta.

## 3.3 Agent Frontend
- Implementa Next.js: panel docente, constructor, sala en vivo, vista estudiante, resultados.
- Consume API y sockets respetando contratos backend.

## 3.4 Agent Data (MongoDB)
- Diseña colecciones, índices, TTL, auditoría y versionado.
- Publica scripts de migración y validación de índices.

## 3.5 Agent IA
- Implementa capa multi-provider (OpenAI, Gemini, Claude).
- Normaliza salida JSON y aplica rúbricas obligatorias.

## 3.6 Agent DevOps
- Dockerfile por app, compose para local, despliegue Git->Coolify.
- Administra variables `env`, healthchecks, logs y backups.

## 3.7 Agent QA/Security
- Ejecuta pruebas críticas (API, sockets, flujo end-to-end base).
- Revisa OWASP básico y anti-fraude para sesiones invitadas.

## 4) Lineamiento atómico (SOP obligatorio)

Para **cada tarea**:

1. Definir alcance exacto en 1 frase.
2. Listar archivo(s) a tocar (máximo necesarios).
3. Confirmar que no rompe contratos existentes.
4. Implementar cambio mínimo.
5. Ejecutar prueba mínima relevante.
6. Registrar evidencia (comando + resultado breve).
7. Abrir PR con:
- Qué cambió.
- Qué no cambió.
- Riesgo residual.

Reglas:
- Si aparecen cambios inesperados en git, detener y reportar.
- Si se requiere refactor, hacerlo en PR separado.
- Si falla test, no continuar con nuevas features.

## 5) Arquitectura operativa

## 5.1 Frontend
- Stack: Next.js, TypeScript, Tailwind, shadcn/ui, TanStack Query, Socket.IO Client, Zustand, React Hook Form, Zod.
- Objetivo: UX rápida para estudiante y control en vivo para docente.

## 5.2 Backend
- Stack: NestJS, TypeScript, MongoDB, Redis, Socket.IO, BullMQ.
- Objetivo: lógica de evaluación, tiempo real, auditoría y APIs estables.

## 5.3 DB (MongoDB)
Colecciones mínimas:
- `users`
- `institutions`
- `courses`
- `groups`
- `quizzes`
- `questions`
- `questionBanks`
- `quizSessions`
- `participants`
- `responses`
- `gradingResults`
- `aiRequests`
- `reports`
- `auditLogs`

Índices mínimos:
- `quizSessions.sessionCode` (unique)
- `participants.sessionId + name` (unique opcional por regla del quiz)
- `responses.participantId + questionId` (unique)
- `aiRequests.createdAt` (analítica/costos)

## 6) Contratos críticos

## 6.1 REST (MVP)
- `POST /auth/login`
- `POST /quizzes`
- `POST /quizzes/:id/publish`
- `POST /quizzes/:id/sessions`
- `POST /join/:token`
- `POST /participant/:id/answer`
- `POST /participant/:id/submit`
- `POST /ai/generate-questions`
- `POST /ai/evaluate-response`
- `GET /sessions/:id/results`

## 6.2 Socket.IO (MVP)
Namespace: `/live-session`

Docente -> servidor:
- `teacher:start_session`
- `teacher:pause_session`
- `teacher:end_session`
- `teacher:next_question`

Estudiante -> servidor:
- `participant:join`
- `participant:answer_update`
- `participant:answer_submit`
- `participant:heartbeat`

Servidor -> docente:
- `session:participant_joined`
- `session:answer_received`
- `session:progress_updated`

Servidor -> estudiante:
- `session:started`
- `session:paused`
- `session:ended`
- `question:changed`

## 7) Fases de entrega

## Fase 1 (MVP base)
- Login docente.
- Crear quiz.
- Preguntas: múltiple, V/F, corta, abierta.
- Enlace público con nombre.
- Respuesta estudiante.
- Panel en vivo básico.
- Resultados básicos.

## Fase 2
- Evaluación IA con rúbricas.
- Tipo prompt y delimitadores.
- Banco de preguntas.
- Exportación PDF/Excel.

## Fase 3
- Código, archivo, audio, imagen.
- Adaptativo.
- Analítica avanzada.
- Integraciones LMS.

## 8) Git + Coolify + Docker + ENV

## 8.1 Git
- `main` -> producción
- `develop` -> staging
- `feature/*` -> trabajo atómico

Regla PR:
- 1 PR = 1 objetivo.
- Requiere evidencia de prueba mínima.

## 8.2 Coolify
- App `frontend` conectada a repo/branch.
- App `backend` conectada a repo/branch.
- Servicio `mongodb` y `redis` (interno o externo).
- Auto-deploy en `develop` y `main`.

## 8.3 Docker
- `frontend/Dockerfile`
- `backend/Dockerfile`
- `docker-compose.yml` para desarrollo local integrado.

## 8.4 Variables de entorno

Backend (`backend/.env.example`):
- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `APP_URL`
- `LLM_PROVIDER`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `CLAUDE_API_KEY`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

Frontend (`frontend/.env.example`):
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_APP_NAME`

Regla:
- Nunca commitear secretos.
- Solo usar `.env.example` versionado.

## 9) Seguridad mínima obligatoria

1. JWT seguro para docentes/admin.
2. Token temporal para invitado.
3. Rate limiting en auth, join y answer.
4. Validación estricta de payloads (Zod/class-validator).
5. Sanitización de entradas de texto.
6. No exponer `correctAnswer` al cliente antes de cierre.
7. Auditoría de acciones sensibles (inicio/pausa/cierre/recalificación).

## 10) Definition of Done (DoD)

Una tarea se cierra solo si:

1. Cumple objetivo atómico.
2. No modifica archivos no relacionados.
3. Tiene validación mínima ejecutada.
4. Actualiza documentación si cambió comportamiento/config/API/flujo.
5. Incluye consecuencias operativas y riesgo residual en PR.

## 11) Plantillas rápidas

## 11.1 Plantilla de tarea atómica
```md
Objetivo:
Alcance:
Archivos a tocar:
Contrato afectado:
Prueba mínima:
Riesgo residual:
```

## 11.2 Plantilla de PR
```md
## Qué cambió
- ...

## Qué no cambió
- ...

## Verificación
- Comando:
- Resultado:

## Riesgo residual
- ...
```

## 12) Riesgos técnicos y mitigación

1. Inconsistencia IA:
- Mitigación: rúbrica obligatoria + parser JSON estricto + revisión humana.

2. Costos IA altos:
- Mitigación: límites por institución + colas + fallback de modelo.

3. Saturación de sockets:
- Mitigación: pruebas de carga, heartbeat, reconexión controlada.

4. Duplicación de invitados:
- Mitigación: PIN opcional, bloqueo por nombre, ventana horaria, auditoría.

5. Evaluación de código/archivo riesgosa:
- Mitigación: sandbox aislado, validación MIME, límites de tamaño.

## 13) Orden de ejecución recomendado

1. Infra base (repos, Docker, env, Coolify staging).
2. Auth + cursos + quizzes + preguntas base.
3. Join invitado + respuestas + sala en vivo.
4. Generación IA.
5. Evaluación IA por rúbrica.
6. Reportes/exportaciones.
7. Hardening y producción.

