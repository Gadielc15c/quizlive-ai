import {
  EvaluateResponseInput,
  EvaluateResponseOutput,
  GeneratedQuestion,
  GenerateQuestionsInput,
  GenerateQuestionsOutput,
  LlmProvider,
} from "../ai.types";

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  screeningModel: string;
  assessmentModel: string;
}

const SUPPORTED_TYPES = [
  "multiple_choice",
  "multiple_select",
  "true_false",
  "short_answer",
  "essay",
  "fill_blank",
  "ordering",
  "matching",
  "drag_drop",
  "matrix_scale",
  "prompt_evaluation",
];

export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(private readonly config: ProviderConfig) {}

  async generateQuestions(
    input: GenerateQuestionsInput,
  ): Promise<GenerateQuestionsOutput> {
    const requestedTypes = this.cleanRequestedTypes(input.types);
    const prompt = this.buildGenerationPrompt(input, requestedTypes);
    const raw = await this.chatJson(this.config.screeningModel, prompt, "quiz_generation");
    return this.normalizeGenerateOutput(raw, input.quantity, requestedTypes);
  }

  async evaluateResponse(
    input: EvaluateResponseInput,
  ): Promise<EvaluateResponseOutput> {
    const prompt = [
      "Evalua una respuesta academica usando solo la rubrica dada.",
      "No inventes criterios.",
      "Devuelve solo JSON valido.",
      `Pregunta: ${input.question}`,
      `Respuesta estudiante: ${input.studentAnswer}`,
      `Rubrica: ${JSON.stringify(input.rubric ?? {})}`,
      `Salida estructurada esperada: ${JSON.stringify(input.structured ?? {})}`,
      'Formato exacto: {"score":number,"maxScore":number,"feedback":"string","confidence":number,"criteria":{"clarity":number,"accuracy":number},"structured":{"answer":"string","usedVariables":["string"],"renderedPrompt":"string"}}',
    ].join("\n");

    const raw = await this.chatJson(
      this.config.assessmentModel,
      prompt,
      "response_evaluation",
    );
    return this.normalizeEvaluateOutput(raw);
  }

  private buildGenerationPrompt(input: GenerateQuestionsInput, types: string[]) {
    return [
      "Genera un examen listo para guardar en MongoDB y renderizar en frontend.",
      "Devuelve solo JSON valido. No markdown. No texto adicional.",
      `Tema o descripcion del curso: ${input.topic}`,
      `Cantidad total: ${input.quantity}`,
      `Dificultad: ${input.difficulty ?? "medium"}`,
      `Idioma: ${input.language ?? "es"}`,
      `Tipos permitidos: ${types.join(", ")}`,
      "Distribuye las preguntas usando SOLO esos tipos permitidos.",
      "Cada pregunta debe traer la estructura exacta de su tipo.",
      "",
      "Reglas por tipo:",
      'multiple_choice: options=[{id:"A",label:"..."},...], correctAnswer={value:"A"}.',
      'multiple_select: options=[...], correctAnswer={values:["A","C"]}.',
      'true_false: options true/false, correctAnswer={value:"true"} o {value:"false"}.',
      'short_answer: correctAnswer={value:"respuesta esperada"}, metadata={maxWords:number, acceptedSynonyms:["..."]}.',
      'essay: rubric={criteria:[{name:"claridad",weight:30,maxScore:30},...]}, metadata={maxWords:number}.',
      'fill_blank: body usa [[blank_1]], correctAnswer={blanks:[{id:"blank_1",answers:["CSS"]}]}.',
      'ordering: metadata={items:["..."]}, correctAnswer={ordered:["..."]}.',
      'matching: metadata={pairs:[{left:"CPU",right:"Procesa instrucciones"}]}, correctAnswer={pairs:[...]}.',
      'drag_drop: metadata={blocks:["..."],targets:["..."]}, correctAnswer={ordered:["..."]}.',
      'matrix_scale: metadata={rows:["Word"],cols:["Bajo","Medio","Alto"]}, correctAnswer={matrix:[{row:"Word",value:"Medio"}]}.',
      'prompt_evaluation: metadata={variables:{cliente:{value:"Ana",type:"text",description:"..."}},requiredVariables:["cliente"]}, rubric={criteria:[...]}, correctAnswer={expectedVariables:["cliente"],structuredOutput:true}.',
      "",
      'Formato raiz: {"title":"string","description":"string","questions":[{"type":"string","title":"string","body":"string","instructions":"string","points":number,"options":[],"correctAnswer":{},"rubric":{},"metadata":{}}]}',
    ].join("\n");
  }

  private async chatJson(
    model: string,
    prompt: string,
    schemaName: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: schemaName,
              strict: false,
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
          messages: [
            {
              role: "system",
              content:
                "Eres un generador de evaluaciones academicas. Tu salida debe ser JSON parseable.",
            },
            { role: "user", content: prompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM response vacia");
      return JSON.parse(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  private cleanRequestedTypes(types?: string[]) {
    const cleaned = (types?.length ? types : ["multiple_choice"])
      .map((type) => (type === "prompt_editor" ? "prompt_evaluation" : type))
      .filter((type) => SUPPORTED_TYPES.includes(type));

    return cleaned.length ? cleaned : ["multiple_choice"];
  }

  private normalizeGenerateOutput(
    raw: unknown,
    quantity: number,
    requestedTypes: string[],
  ): GenerateQuestionsOutput {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const rawQuestions = Array.isArray(obj.questions) ? obj.questions : [];

    const questions = Array.from({ length: quantity }).map((_, index) => {
      const q = (rawQuestions[index] ?? {}) as Record<string, unknown>;
      const type = this.normalizeType(String(q.type ?? requestedTypes[index % requestedTypes.length]), requestedTypes);
      return this.normalizeQuestion(q, type, index);
    });

    return {
      title: String(obj.title ?? "Examen generado por IA"),
      description: String(obj.description ?? "Borrador generado desde descripcion del curso"),
      questions,
    };
  }

  private normalizeType(type: string, requestedTypes: string[]) {
    const normalized = type === "prompt_editor" ? "prompt_evaluation" : type;
    if (requestedTypes.includes(normalized)) return normalized;
    return requestedTypes[0] ?? "multiple_choice";
  }

  private normalizeQuestion(
    q: Record<string, unknown>,
    type: string,
    index: number,
  ): GeneratedQuestion {
    const base = {
      type,
      title: String(q.title ?? `Pregunta ${index + 1}`),
      body: String(q.body ?? "Responde la pregunta."),
      instructions: String(q.instructions ?? ""),
      points: Number(q.points ?? 5),
      rubric: (q.rubric as Record<string, unknown> | undefined) ?? {},
      metadata: (q.metadata as Record<string, unknown> | undefined) ?? {},
      options: Array.isArray(q.options)
        ? (q.options as Array<Record<string, unknown>>).map((o, optionIndex) => ({
            id: String(o.id ?? String.fromCharCode(65 + optionIndex)),
            label: String(o.label ?? ""),
          }))
        : undefined,
      correctAnswer:
        (q.correctAnswer as Record<string, unknown> | undefined) ?? {},
    };

    switch (type) {
      case "multiple_choice":
        return {
          ...base,
          options: this.ensureOptions(base.options),
          correctAnswer: this.ensureValueAnswer(base.correctAnswer, "A"),
        };
      case "multiple_select":
        return {
          ...base,
          options: this.ensureOptions(base.options),
          correctAnswer: this.ensureValuesAnswer(base.correctAnswer, ["A", "C"]),
        };
      case "true_false":
        return {
          ...base,
          options: [
            { id: "true", label: "Verdadero" },
            { id: "false", label: "Falso" },
          ],
          correctAnswer: this.ensureValueAnswer(base.correctAnswer, "true"),
        };
      case "short_answer":
        return {
          ...base,
          correctAnswer: this.ensureValueAnswer(base.correctAnswer, "respuesta esperada"),
          metadata: { maxWords: 20, ...(base.metadata ?? {}) },
        };
      case "essay":
        return {
          ...base,
          correctAnswer: {},
          rubric: this.ensureRubric(base.rubric),
          metadata: { maxWords: 500, ...(base.metadata ?? {}) },
        };
      case "fill_blank":
        return {
          ...base,
          body: base.body.includes("[[blank_")
            ? base.body
            : `${base.body} [[blank_1]]`,
          correctAnswer:
            Array.isArray(base.correctAnswer?.blanks)
              ? base.correctAnswer
              : { blanks: [{ id: "blank_1", answers: ["respuesta"] }] },
        };
      case "ordering":
      case "drag_drop": {
        const items = Array.isArray(base.metadata?.items)
          ? (base.metadata?.items as string[])
          : Array.isArray(base.metadata?.blocks)
            ? (base.metadata?.blocks as string[])
            : ["Paso 1", "Paso 2", "Paso 3"];
        return {
          ...base,
          metadata: { ...base.metadata, items, blocks: items },
          correctAnswer: { ordered: items },
        };
      }
      case "matching": {
        const pairs = Array.isArray(base.metadata?.pairs)
          ? (base.metadata?.pairs as Array<Record<string, unknown>>)
          : [
              { left: "Concepto", right: "Definicion" },
              { left: "Ejemplo", right: "Aplicacion" },
            ];
        return {
          ...base,
          metadata: { ...base.metadata, pairs },
          correctAnswer: { pairs },
        };
      }
      case "matrix_scale": {
        const rows = Array.isArray(base.metadata?.rows) ? base.metadata.rows : ["Criterio"];
        const cols = Array.isArray(base.metadata?.cols)
          ? base.metadata.cols
          : ["Bajo", "Medio", "Alto"];
        return {
          ...base,
          metadata: { ...base.metadata, rows, cols },
          correctAnswer: {
            matrix: (rows as string[]).map((row) => ({
              row,
              value: (cols as string[])[0],
            })),
          },
        };
      }
      case "prompt_evaluation":
        return {
          ...base,
          correctAnswer: {
            expectedVariables: ["cliente", "producto"],
            structuredOutput: true,
            ...(base.correctAnswer ?? {}),
          },
          rubric: this.ensureRubric(base.rubric),
          metadata: {
            variables: {
              cliente: {
                value: "Ana Martinez",
                type: "text",
                description: "Nombre del cliente",
              },
              producto: {
                value: "Curso IA",
                type: "text",
                description: "Producto o tema",
              },
            },
            requiredVariables: ["cliente", "producto"],
            ...(base.metadata ?? {}),
          },
        };
      default:
        return base;
    }
  }

  private ensureOptions(options?: { id: string; label: string }[]) {
    if (options && options.length >= 2) return options;
    return [
      { id: "A", label: "Opcion A" },
      { id: "B", label: "Opcion B" },
      { id: "C", label: "Opcion C" },
      { id: "D", label: "Opcion D" },
    ];
  }

  private ensureValueAnswer(answer: Record<string, unknown>, fallback: string) {
    return { value: String(answer?.value ?? fallback) };
  }

  private ensureValuesAnswer(answer: Record<string, unknown>, fallback: string[]) {
    return { values: Array.isArray(answer?.values) ? answer.values : fallback };
  }

  private ensureRubric(rubric?: Record<string, unknown>) {
    if (rubric && Array.isArray(rubric.criteria)) return rubric;
    return {
      criteria: [
        { name: "claridad", weight: 40, maxScore: 40 },
        { name: "precision", weight: 40, maxScore: 40 },
        { name: "estructura", weight: 20, maxScore: 20 },
      ],
    };
  }

  private normalizeEvaluateOutput(raw: unknown): EvaluateResponseOutput {
    const obj = (raw ?? {}) as Record<string, unknown>;
    return {
      score: Number(obj.score ?? 0),
      maxScore: Number(obj.maxScore ?? 100),
      feedback: String(obj.feedback ?? "Evaluacion generada"),
      confidence: Number(obj.confidence ?? 0.5),
      criteria:
        (obj.criteria as Record<string, number> | undefined) ?? undefined,
      structured:
        (obj.structured as Record<string, unknown> | undefined) ?? undefined,
    };
  }
}

