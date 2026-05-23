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
    const difficulty = input.difficulty ?? "medium";
    const lang = input.language ?? "es";
    const typeList = types.join(", ");

    return [
      "Eres un experto en diseño de evaluaciones academicas de alto impacto.",
      "Tu objetivo es crear preguntas que discriminen niveles de comprension: no basta memorizar, el estudiante debe analizar, aplicar o sintetizar.",
      "Devuelve SOLO JSON valido. Sin markdown, sin explicaciones, sin texto adicional.",
      "",
      `## Contexto del curso`,
      `Descripcion / tema: ${input.topic}`,
      `Cantidad de preguntas: ${input.quantity}`,
      `Dificultad: ${difficulty} — ${difficulty === "easy" ? "conocimiento directo y definiciones basicas" : difficulty === "hard" ? "aplicacion en escenarios ambiguos, casos extremos, errores comunes disfrazados" : "aplicacion de conceptos en escenarios concretos, relaciones causa-efecto"}`,
      `Idioma de salida: ${lang}`,
      `Tipos permitidos (usa SOLO estos): ${typeList}`,
      "",
      "## Principios obligatorios de calidad",
      "1. NIVEL COGNITIVO: apunta a Bloom L3-L5 (aplicar, analizar, evaluar). Evita preguntas de pura memoria.",
      "2. DISTRACTORES PLAUSIBLES: en MC y multiple_select, los incorrectos deben representar errores conceptuales reales, no ser obviamente falsos.",
      "3. SIN CLAVES OBVIAS: elimina patrones como 'siempre', 'nunca', 'todas las anteriores', opciones mucho mas largas que las otras.",
      "4. TRAMPAS PEDAGOGICAS: incluye al menos 2 preguntas con un giro — algo que parece correcto por intuicion pero no lo es.",
      "5. CONTEXTO NARRATIVO: cuando aplique, envuelve la pregunta en un escenario breve (caso de uso, fragmento de codigo, situacion real) antes de preguntar.",
      "6. FEEDBACK IMPLICITO: la respuesta correcta, cuando se lea, debe aclarar por que los distractores son incorrectos.",
      "",
      "## Especificacion exacta por tipo",
      "",
      "### multiple_choice",
      '- body: escenario o situacion concreta (2-3 oraciones). Pregunta al final.',
      '- options: exactamente 4 opciones. Tres incorrectos plausibles, uno correcto. Longitud similar entre opciones.',
      '- instructions: "Selecciona la unica respuesta correcta."',
      '- correctAnswer: {value: "A"|"B"|"C"|"D"}',
      '- Ejemplo distractor de calidad: si la respuesta es "TCP garantiza entrega", un distractor es "UDP garantiza entrega con menos latencia" (parcialmente verdadero pero incorrecto).',
      "",
      "### multiple_select",
      '- body: escenario que implique multiples condiciones verdaderas simultaneas.',
      '- options: 5-6 opciones, 2-3 correctas. Los incorrectos deben ser verdaderos en contextos diferentes.',
      '- instructions: "Selecciona TODAS las opciones correctas. Puede haber mas de una."',
      '- correctAnswer: {values: ["A","C","E"]}',
      "",
      "### true_false",
      '- body: afirmacion factual con precision tecnica. Mezcla verdaderas y falsas al 50%.',
      '- TRAMPA EFECTIVA: usa modificadores de alcance ("siempre ocurre X", "solo es posible cuando") — cambian el valor de verdad.',
      '- correctAnswer: {value: "true"} o {value: "false"}',
      '- Si es falso, instructions debe incluir una pista sutil de por que es falso.',
      "",
      "### short_answer",
      '- body: pregunta abierta que exige un termino tecnico especifico o una cifra exacta.',
      '- correctAnswer: {value: "termino exacto"}',
      '- metadata: {maxWords: 5, acceptedSynonyms: ["sinonimo1", "sinonimo2"]}',
      '- Evita preguntas cuya respuesta sea un concepto vago.',
      "",
      "### essay",
      '- body: escenario real o hipotetico que exige argumentar una posicion, comparar enfoques o proponer una solucion.',
      '- instructions: "Desarrolla tu respuesta con argumentos concretos. Minimo 150 palabras."',
      '- rubric.criteria: minimo 4 criterios con nombre descriptivo, peso y maxScore. Ejemplo: [{name:"Precision conceptual",weight:35,maxScore:35},{name:"Aplicacion al contexto",weight:30,maxScore:30},{name:"Estructura del argumento",weight:20,maxScore:20},{name:"Ejemplos concretos",weight:15,maxScore:15}]',
      '- metadata: {maxWords: 400}',
      "",
      "### fill_blank",
      '- body: oracion o parrafo tecnico donde [[blank_1]], [[blank_2]] sustituyen terminos clave (NO articulos ni verbos genericos).',
      '- correctAnswer: {blanks:[{id:"blank_1",answers:["termino_principal","sinonimo"]},{id:"blank_2",answers:["otro_termino"]}]}',
      '- Los blancos deben ser en conceptos que discriminen comprension, no en palabras de relleno.',
      "",
      "### ordering",
      '- body: descripcion de un proceso donde el ORDEN es significativo y no trivial.',
      '- metadata: {items: ["paso_mezclado_1", "paso_mezclado_2", ...]} — presenta en orden INCORRECTO adrede.',
      '- correctAnswer: {ordered: ["paso_1_correcto", "paso_2_correcto", ...]} — orden logico correcto.',
      '- Incluye pasos que estudiantes frecuentemente intercambian (p.ej. autenticacion vs autorizacion).',
      "",
      "### matching",
      '- body: descripcion del dominio. Pide emparejar conceptos con definiciones/ejemplos.',
      '- metadata: {pairs: [{left:"termino",right:"descripcion"}, ...]} — minimo 4 pares.',
      '- Los "right" deben ser plausibles para mas de un "left" — fuerza discriminacion.',
      '- correctAnswer: {pairs: [...mismo orden que metadata...]}',
      "",
      "### drag_drop",
      '- Igual que ordering. metadata={blocks:[...],targets:[...]}. correctAnswer={ordered:[...]}.',
      "",
      "### matrix_scale",
      '- body: tabla de evaluacion donde el estudiante asigna un nivel a cada criterio.',
      '- metadata: {rows: ["criterio1","criterio2","criterio3"], cols: ["Deficiente","Basico","Competente","Experto"]}',
      '- correctAnswer: {matrix: [{row:"criterio1",value:"Competente"}, ...]}',
      '- Usa dominios donde los niveles sean discutibles para forzar analisis.',
      "",
      "### prompt_evaluation",
      `- Genera variables ESPECIFICAS al tema del curso. Extrae conceptos clave de: "${input.topic.substring(0, 200)}"`,
      '- metadata.variables: objeto donde cada clave es un nombre de variable descriptivo en camelCase.',
      '  Cada variable: {value: "ejemplo_concreto_del_dominio", type: "text"|"number"|"list", description: "que representa este dato"}',
      '- Usa 4-6 variables relevantes al dominio. Ejemplo para tema de redes: {ipOrigen:{value:"192.168.1.10",type:"text",description:"IP del cliente"},protocolo:{value:"TCP",type:"text",description:"Protocolo de transporte"}}',
      '- body: escenario tecnico que require redactar un prompt usando las variables.',
      '- instructions: "Escribe un prompt tecnico que resuelva el escenario usando las variables disponibles. Debes usar al menos las variables marcadas como requeridas."',
      '- correctAnswer: {expectedVariables: ["var1","var2"], structuredOutput: true}',
      '- rubric.criteria: [{name:"Uso correcto de variables requeridas",weight:40,maxScore:40},{name:"Precision tecnica del prompt",weight:30,maxScore:30},{name:"Claridad y completitud",weight:30,maxScore:30}]',
      "",
      "## Formato JSON de salida",
      '{"title":"string","description":"string","questions":[{"type":"string","title":"string","body":"string","instructions":"string","points":number,"options":[],"correctAnswer":{},"rubric":{},"metadata":{}}]}',
      "",
      "IMPORTANTE: genera exactamente " + input.quantity + " preguntas. Varia los tipos segun la lista permitida.",
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
          temperature: schemaName === "quiz_generation" ? 0.72 : 0.15,
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
              content: schemaName === "quiz_generation"
                ? "Eres un experto en psicometria y diseno de evaluaciones educativas de alto impacto. Diseñas examenes que distinguen entre estudiantes que memorizan y estudiantes que comprenden profundamente. Tu salida es SIEMPRE JSON parseable sin ningun texto adicional."
                : "Eres un evaluador academico experto. Tu salida debe ser JSON parseable.",
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
            label: this.cleanOptionLabel(
              String(o.label ?? ""),
              String(o.id ?? String.fromCharCode(65 + optionIndex)),
            ),
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

  private cleanOptionLabel(label: string, id: string) {
    const trimmedLabel = label.trim();
    const trimmedId = id.trim();
    if (!trimmedLabel || !trimmedId) return trimmedLabel;
    if (trimmedLabel.toLowerCase() === trimmedId.toLowerCase()) return "";

    const escapedId = this.escapeRegExp(trimmedId);
    return trimmedLabel
      .replace(new RegExp(`^${escapedId}\\s*[.)\\-:]\\s*`, "i"), "")
      .trim();
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
