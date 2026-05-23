import {
  EvaluateResponseInput,
  EvaluateResponseOutput,
  GeneratedQuestion,
  GenerateQuestionsInput,
  GenerateQuestionsOutput,
  LlmProvider,
} from "../ai.types";

export class MockLlmProvider implements LlmProvider {
  async generateQuestions(
    input: GenerateQuestionsInput,
  ): Promise<GenerateQuestionsOutput> {
    const types = input.types?.length ? input.types : ["multiple_choice"];
    const questions = Array.from({ length: input.quantity }).map((_, idx) =>
      this.questionForType(types[idx % types.length], input.topic, idx + 1),
    );

    return {
      title: `Quiz generado: ${input.topic}`,
      description: `Generado automaticamente (${input.difficulty ?? "medium"})`,
      questions,
    };
  }

  async evaluateResponse(
    input: EvaluateResponseInput,
  ): Promise<EvaluateResponseOutput> {
    const maxScore = 100;
    const score = Math.min(maxScore, Math.max(20, input.studentAnswer.length));
    return {
      score,
      maxScore,
      feedback: "Evaluacion IA simulada. Requiere proveedor real para uso productivo.",
      confidence: 0.5,
      criteria: {
        clarity: Math.round(score * 0.35),
        accuracy: Math.round(score * 0.45),
        structure: Math.round(score * 0.2),
      },
      structured: input.structured,
    };
  }

  private questionForType(type: string, topic: string, index: number): GeneratedQuestion {
    switch (type === "prompt_editor" ? "prompt_evaluation" : type) {
      case "multiple_select":
        return {
          type: "multiple_select",
          title: `Pregunta ${index}: seleccion multiple`,
          body: `Selecciona elementos correctos sobre ${topic}.`,
          points: 10,
          options: [
            { id: "A", label: "Concepto correcto 1" },
            { id: "B", label: "Distractor" },
            { id: "C", label: "Concepto correcto 2" },
            { id: "D", label: "Distractor" },
          ],
          correctAnswer: { values: ["A", "C"] },
        };
      case "true_false":
        return {
          type: "true_false",
          title: `Pregunta ${index}: verdadero o falso`,
          body: `${topic} requiere estructura clara para ser evaluado correctamente.`,
          points: 5,
          options: [
            { id: "true", label: "Verdadero" },
            { id: "false", label: "Falso" },
          ],
          correctAnswer: { value: "true" },
        };
      case "short_answer":
        return {
          type: "short_answer",
          title: `Pregunta ${index}: respuesta corta`,
          body: `Define brevemente un concepto clave de ${topic}.`,
          points: 8,
          correctAnswer: { value: "respuesta esperada" },
          metadata: { maxWords: 20, acceptedSynonyms: ["respuesta valida"] },
        };
      case "essay":
        return {
          type: "essay",
          title: `Pregunta ${index}: respuesta abierta`,
          body: `Explica con detalle la importancia de ${topic}.`,
          points: 20,
          rubric: {
            criteria: [
              { name: "claridad", weight: 30, maxScore: 30 },
              { name: "precision", weight: 40, maxScore: 40 },
              { name: "profundidad", weight: 30, maxScore: 30 },
            ],
          },
          metadata: { maxWords: 500 },
        };
      case "fill_blank":
        return {
          type: "fill_blank",
          title: `Pregunta ${index}: completar`,
          body: `El concepto central de ${topic} es [[blank_1]].`,
          points: 6,
          correctAnswer: {
            blanks: [{ id: "blank_1", answers: ["respuesta"] }],
          },
        };
      case "ordering":
      case "drag_drop":
        return {
          type,
          title: `Pregunta ${index}: ordenar`,
          body: `Ordena los pasos relacionados con ${topic}.`,
          points: 10,
          metadata: { items: ["Analizar", "Disenar", "Aplicar", "Evaluar"] },
          correctAnswer: { ordered: ["Analizar", "Disenar", "Aplicar", "Evaluar"] },
        };
      case "matching":
        return {
          type: "matching",
          title: `Pregunta ${index}: pareo`,
          body: `Relaciona conceptos de ${topic}.`,
          points: 10,
          metadata: {
            pairs: [
              { left: "Concepto", right: "Definicion" },
              { left: "Ejemplo", right: "Aplicacion" },
            ],
          },
          correctAnswer: {
            pairs: [
              { left: "Concepto", right: "Definicion" },
              { left: "Ejemplo", right: "Aplicacion" },
            ],
          },
        };
      case "matrix_scale":
        return {
          type: "matrix_scale",
          title: `Pregunta ${index}: matriz`,
          body: `Evalua dominio de aspectos de ${topic}.`,
          points: 10,
          metadata: { rows: ["Claridad", "Aplicacion"], cols: ["Bajo", "Medio", "Alto"] },
          correctAnswer: {
            matrix: [
              { row: "Claridad", value: "Alto" },
              { row: "Aplicacion", value: "Medio" },
            ],
          },
        };
      case "prompt_evaluation":
        return {
          type: "prompt_evaluation",
          title: `Pregunta ${index}: prompt con variables`,
          body: `Crea un prompt sobre ${topic} usando variables inline.`,
          points: 20,
          metadata: {
            variables: {
              cliente: { value: "Ana Martinez", type: "text", description: "Nombre del cliente" },
              producto: { value: "Curso IA", type: "text", description: "Producto objetivo" },
              tono: { value: "Profesional", type: "text", description: "Tono" },
            },
            requiredVariables: ["cliente", "producto", "tono"],
          },
          rubric: {
            criteria: [
              { name: "claridad", weight: 30, maxScore: 30 },
              { name: "uso_variables", weight: 40, maxScore: 40 },
              { name: "estructura", weight: 30, maxScore: 30 },
            ],
          },
          correctAnswer: {
            expectedVariables: ["cliente", "producto", "tono"],
            structuredOutput: true,
          },
        };
      case "multiple_choice":
      default:
        return {
          type: "multiple_choice",
          title: `Pregunta ${index}: seleccion unica`,
          body: `Cual opcion describe mejor ${topic}?`,
          points: 5,
          options: [
            { id: "A", label: "Respuesta correcta" },
            { id: "B", label: "Distractor" },
            { id: "C", label: "Distractor" },
            { id: "D", label: "Distractor" },
          ],
          correctAnswer: { value: "A" },
        };
    }
  }
}

