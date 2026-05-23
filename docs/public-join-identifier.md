# Identificador publico de ingreso

El QR ya no depende solo de un token largo.

## Identificadores aceptados

El endpoint publico acepta:

- `quizId`
- `sessionId`
- `sessionCode`
- `joinToken`

Ruta:

```http
GET /api/join/:token
POST /api/join/:token
```

`GET /api/join/:token` no expone el contenido de las preguntas. Devuelve datos de acceso, estado de sesion y `questionCount`.

Despues de registrar al estudiante, el cliente debe usar:

```http
GET /api/participant/:participantId/questions
```

Este endpoint devuelve preguntas solo mientras la sesion esta `live` o `paused`. Si el tiempo del examen vencio, retorna `questions: []`.

## Revision posterior

Al entregar, el estudiante puede consultar:

```http
GET /api/participant/:participantId/result
```

La nota se muestra de inmediato. El detalle de respuestas queda bloqueado hasta que el docente habilite:

```http
POST /api/sessions/:sessionId/review-access
```

Luego el estudiante puede ver:

```http
GET /api/participant/:participantId/review
```

La revision muestra su respuesta, puntaje por pregunta, correcto/incorrecto y feedback IA cuando exista. No expone `correctAnswer`.

## QR nuevo

El QR generado por:

```http
GET /api/sessions/:id/access
```

usa:

```txt
/join/:quizId
```

Esto simplifica el enlace y permite que el mismo examen tenga un identificador estable.

## Nota

Un `courseId` puede tener varios examenes. Por eso el identificador estable usado para entrar es `quizId`, no `courseId`.
