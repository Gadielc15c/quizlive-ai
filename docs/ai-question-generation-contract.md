# Contrato de generacion IA por tipo de pregunta

El LLM debe devolver preguntas listas para renderizar en frontend y calificar en backend.

## Regla general

Cada pregunta generada debe incluir:

- `type`
- `title`
- `body`
- `points`
- `options` cuando aplique
- `metadata` cuando aplique
- `rubric` cuando aplique
- `correctAnswer` cuando sea autocalificable o tenga estructura esperada

## Tipos y estructura

`multiple_choice`

```json
{
  "options": [{ "id": "A", "label": "..." }],
  "correctAnswer": { "value": "A" }
}
```

`multiple_select`

```json
{
  "options": [{ "id": "A", "label": "..." }],
  "correctAnswer": { "values": ["A", "C"] }
}
```

`true_false`

```json
{
  "options": [
    { "id": "true", "label": "Verdadero" },
    { "id": "false", "label": "Falso" }
  ],
  "correctAnswer": { "value": "true" }
}
```

`short_answer`

```json
{
  "correctAnswer": { "value": "respuesta esperada" },
  "metadata": { "maxWords": 20, "acceptedSynonyms": ["sinonimo"] }
}
```

`fill_blank`

```json
{
  "body": "HTML da [[blank_1]] a la pagina.",
  "correctAnswer": {
    "blanks": [{ "id": "blank_1", "answers": ["estructura"] }]
  }
}
```

`ordering` / `drag_drop`

```json
{
  "metadata": { "items": ["Analizar", "Disenar", "Aplicar"] },
  "correctAnswer": { "ordered": ["Analizar", "Disenar", "Aplicar"] }
}
```

`matching`

```json
{
  "metadata": {
    "pairs": [{ "left": "CPU", "right": "Procesa instrucciones" }]
  },
  "correctAnswer": {
    "pairs": [{ "left": "CPU", "right": "Procesa instrucciones" }]
  }
}
```

`matrix_scale`

```json
{
  "metadata": {
    "rows": ["Word", "Excel"],
    "cols": ["Bajo", "Medio", "Alto"]
  },
  "correctAnswer": {
    "matrix": [{ "row": "Word", "value": "Medio" }]
  }
}
```

`essay`

```json
{
  "rubric": {
    "criteria": [{ "name": "claridad", "weight": 30, "maxScore": 30 }]
  },
  "metadata": { "maxWords": 500 }
}
```

`prompt_evaluation`

```json
{
  "metadata": {
    "variables": {
      "cliente": {
        "value": "Ana Martinez",
        "type": "text",
        "description": "Nombre del cliente"
      }
    },
    "requiredVariables": ["cliente"]
  },
  "correctAnswer": {
    "expectedVariables": ["cliente"],
    "structuredOutput": true
  },
  "rubric": {
    "criteria": [{ "name": "uso_variables", "weight": 40, "maxScore": 40 }]
  }
}
```

## Calificacion

El backend califica automaticamente:

- `multiple_choice`
- `multiple_select`
- `true_false`
- `short_answer`
- `fill_blank`
- `ordering`
- `drag_drop`
- `matching`
- `matrix_scale`

El backend califica con IA:

- `essay`
- `prompt_evaluation`

