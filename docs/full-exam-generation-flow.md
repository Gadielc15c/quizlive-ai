# Flujo correcto: examen completo generado por IA

## Problema resuelto

Antes el frontend podia tratar la salida IA como sugerencias de preguntas. Eso dejaba al docente viendo preguntas al lado, pero no un examen armado con inputs reales.

Ahora el flujo correcto es:

1. Crear o abrir un quiz.
2. Usar `Generar y montar examen`.
3. Backend genera preguntas con estructura por tipo.
4. Backend guarda preguntas en MongoDB.
5. Frontend renderiza cada pregunta como control real.
6. Docente valida cada pregunta.
7. Docente publica y obtiene link + QR.

## Endpoint para quiz existente

```http
POST /api/ai/quizzes/:id/generate-questions
```

Payload:

```json
{
  "topic": "descripcion grande del curso",
  "quantity": 10,
  "difficulty": "medium",
  "language": "es",
  "types": [
    "multiple_choice",
    "true_false",
    "matching",
    "ordering",
    "prompt_evaluation"
  ]
}
```

Respuesta:

```json
{
  "quizId": "...",
  "questionsCreated": 10,
  "questions": []
}
```

## Endpoint para quiz nuevo completo

```http
POST /api/ai/generate-quiz
```

Este endpoint crea quiz + preguntas.

## Publicacion

```http
POST /api/quizzes/:id/publish
POST /api/quizzes/:id/sessions
GET /api/sessions/:id/access
```

El ultimo endpoint devuelve:

```json
{
  "joinUrl": "https://...",
  "qrUrl": "https://...",
  "sessionCode": "ABCD-1234"
}
```

