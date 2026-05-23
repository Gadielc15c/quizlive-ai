# Backend - Modulo Quizzes (MVP inicial)

Este documento describe el primer modulo implementado para QuizLive AI: creacion y gestion de quizzes.

## Alcance del incremento

- CRUD base de `quizzes`.
- Publicacion de quiz (`POST /quizzes/:id/publish`).
- Validaciones minimas:
- Rubrica debe sumar 100.
- `startsAt < endsAt`.
- Estado inicial por defecto: `draft`.

## Endpoints

- `POST /quizzes`
- `GET /quizzes?teacherId=&courseId=&status=`
- `GET /quizzes/:id`
- `PATCH /quizzes/:id`
- `DELETE /quizzes/:id`
- `POST /quizzes/:id/publish`

## Estructura creada

- `backend/src/quizzes/dto/create-quiz.dto.ts`
- `backend/src/quizzes/dto/update-quiz.dto.ts`
- `backend/src/quizzes/dto/publish-quiz.dto.ts`
- `backend/src/quizzes/schemas/quiz.schema.ts`
- `backend/src/quizzes/quizzes.service.ts`
- `backend/src/quizzes/quizzes.controller.ts`
- `backend/src/quizzes/quizzes.module.ts`

## Ejemplo rapido (crear quiz)

```json
{
  "institutionId": "inst_01",
  "teacherId": "teacher_01",
  "courseId": "course_01",
  "title": "Quiz de delimitadores",
  "description": "Evaluacion base de prompt engineering",
  "mode": "live",
  "durationMinutes": 30,
  "settings": {
    "randomizeQuestions": true,
    "randomizeOptions": true,
    "showResults": false,
    "allowRetries": false
  },
  "rubric": [
    { "name": "claridad", "weight": 50 },
    { "name": "uso de delimitadores", "weight": 50 }
  ]
}
```

## Estado actual

- `QuizzesModule` ya esta integrado en `AppModule`.
- Endpoints de quizzes ahora usan JWT + roles (`admin`, `teacher`).
- Aun faltan tests de integracion automatizados.
