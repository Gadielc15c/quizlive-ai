"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getDisplayOptionLabel } from "@/lib/question-options";
import { getTeacherAuthHeaders } from "../../../lib/auth";

type Quiz = {
  _id: string;
  title: string;
  description?: string;
  mode: "live" | "async";
  status: "draft" | "published" | "closed";
  durationMinutes: number;
};

type Question = {
  _id: string;
  quizId: string;
  type: string;
  title: string;
  body: string;
  instructions?: string;
  points: number;
  options?: Array<{ id: string; label: string }>;
  correctAnswer?: Record<string, unknown>;
  rubric?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type AccessData = {
  sessionId: string;
  sessionCode: string;
  joinUrl: string;
  qrUrl: string;
};

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Seleccion unica",
  multiple_select: "Seleccion multiple",
  true_false: "Verdadero o falso",
  short_answer: "Respuesta corta",
  essay: "Respuesta abierta",
  fill_blank: "Completar espacios",
  ordering: "Ordenamiento",
  matching: "Pareo",
  drag_drop: "Drag & drop",
  matrix_scale: "Matriz / escala",
  prompt_evaluation: "Prompt con variables",
};

export default function QuizReviewPage() {
  const params = useParams<{ id: string }>();
  const quizId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
    [],
  );

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [editingPoints, setEditingPoints] = useState(5);
  const [editingCorrectAnswer, setEditingCorrectAnswer] = useState("");
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [access, setAccess] = useState<AccessData | null>(null);
  const [generateTopic, setGenerateTopic] = useState("");
  const [generateQuantity, setGenerateQuantity] = useState(10);
  const [generateTypes, setGenerateTypes] = useState([
    "multiple_choice",
    "true_false",
    "short_answer",
    "matching",
    "ordering",
    "prompt_evaluation",
  ]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quizId) return;
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = await getTeacherAuthHeaders(apiUrl);
        const [quizRes, questionsRes] = await Promise.all([
          fetch(`${apiUrl}/quizzes/${quizId}`, { headers }),
          fetch(`${apiUrl}/quizzes/${quizId}/questions`, { headers }),
        ]);

        if (!quizRes.ok) throw new Error("No se pudo cargar el quiz");
        if (!questionsRes.ok) throw new Error("No se pudieron cargar preguntas");

        const quizBody = (await quizRes.json()) as Quiz;
        const questionBody = (await questionsRes.json()) as Question[];

        setQuiz(quizBody);
        setQuestions(questionBody);
        setApproved(
          Object.fromEntries(questionBody.map((question) => [question._id, true])),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando examen");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [apiUrl, quizId]);

  const allApproved =
    questions.length > 0 && questions.every((question) => approved[question._id]);

  const startEdit = (question: Question) => {
    setEditingQuestionId(question._id);
    setEditingTitle(question.title);
    setEditingBody(question.body);
    setEditingPoints(question.points);
    setEditingCorrectAnswer(JSON.stringify(question.correctAnswer ?? {}, null, 2));
  };

  const saveEdit = async () => {
    if (!editingQuestionId) return;
    setError("");

    try {
      const payload = {
        title: editingTitle,
        body: editingBody,
        points: editingPoints,
        correctAnswer: editingCorrectAnswer ? JSON.parse(editingCorrectAnswer) : {},
      };

      const response = await fetch(`${apiUrl}/questions/${editingQuestionId}`, {
        method: "PATCH",
        headers: {
          ...(await getTeacherAuthHeaders(apiUrl)),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("No se pudo guardar la pregunta");
      const updated = (await response.json()) as Question;
      setQuestions((current) =>
        current.map((question) => (question._id === updated._id ? updated : question)),
      );
      setEditingQuestionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error editando pregunta");
    }
  };

  const publishAndCreateQr = async () => {
    if (!quizId || !allApproved) return;

    setPublishing(true);
    setError("");

    try {
      const headers = {
        ...(await getTeacherAuthHeaders(apiUrl)),
        "Content-Type": "application/json",
      };

      const publishRes = await fetch(`${apiUrl}/quizzes/${quizId}/publish`, {
        method: "POST",
        headers,
        body: JSON.stringify({ force: true }),
      });
      if (!publishRes.ok) throw new Error("No se pudo publicar el quiz");

      const sessionRes = await fetch(`${apiUrl}/quizzes/${quizId}/sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (!sessionRes.ok) throw new Error("No se pudo crear la sesion");

      const session = (await sessionRes.json()) as { _id?: string; id?: string };
      const sessionId = session._id ?? session.id;
      if (!sessionId) throw new Error("La sesion no devolvio id");

      const accessRes = await fetch(`${apiUrl}/sessions/${sessionId}/access`, {
        headers: await getTeacherAuthHeaders(apiUrl),
      });
      if (!accessRes.ok) throw new Error("No se pudo crear el QR");

      setAccess((await accessRes.json()) as AccessData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error publicando");
    } finally {
      setPublishing(false);
    }
  };

  const generateIntoCurrentQuiz = async () => {
    if (!quizId) return;

    setGenerating(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/ai/quizzes/${quizId}/generate-questions`, {
        method: "POST",
        headers: {
          ...(await getTeacherAuthHeaders(apiUrl)),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic:
            generateTopic.trim() ||
            `${quiz?.title ?? "Examen"} ${quiz?.description ?? ""}`.trim(),
          quantity: generateQuantity,
          difficulty: "medium",
          language: "es",
          types: generateTypes,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "No se pudo generar el examen");
      }

      const body = (await response.json()) as { questions?: Question[] };
      const generatedQuestions = body.questions ?? [];
      setQuestions((current) => [...current, ...generatedQuestions]);
      setApproved((current) => ({
        ...current,
        ...Object.fromEntries(generatedQuestions.map((question) => [question._id, true])),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando examen");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        Cargando examen...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Revision de examen generado
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{quiz?.title ?? "Quiz"}</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {quiz?.description ?? "Valida las preguntas generadas antes de publicar."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!allApproved || publishing}
              onClick={publishAndCreateQr}
              type="button"
            >
              {publishing ? "Publicando..." : "Publicar y crear QR"}
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_160px]">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Descripcion del curso o tema</span>
                <textarea
                  className="min-h-24 rounded-md border px-3 py-2 text-sm"
                  onChange={(event) => setGenerateTopic(event.target.value)}
                  placeholder="Pega aqui la descripcion grande del curso. La IA generara cada pregunta con estructura segun su tipo."
                  value={generateTopic}
                />
              </label>
              <label className="grid h-fit gap-2">
                <span className="text-sm font-medium">Cantidad</span>
                <input
                  className="h-10 rounded-md border px-3 text-sm"
                  max={50}
                  min={1}
                  onChange={(event) => setGenerateQuantity(Number(event.target.value))}
                  type="number"
                  value={generateQuantity}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
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
              ].map((type) => (
                <button
                  className={`rounded-md border px-3 py-1 text-xs ${
                    generateTypes.includes(type)
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "bg-white text-slate-700"
                  }`}
                  key={type}
                  onClick={() =>
                    setGenerateTypes((current) =>
                      current.includes(type)
                        ? current.filter((item) => item !== type)
                        : [...current, type],
                    )
                  }
                  type="button"
                >
                  {TYPE_LABELS[type] ?? type}
                </button>
              ))}
            </div>

            <button
              className="mt-4 h-10 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white disabled:opacity-50"
              disabled={generating || generateTypes.length === 0}
              onClick={generateIntoCurrentQuiz}
              type="button"
            >
              {generating ? "Generando examen..." : "Generar y montar examen"}
            </button>
          </div>

          {questions.map((question, index) => (
            <article
              key={question._id}
              className="rounded-lg border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      Pregunta {index + 1}
                    </span>
                    <span className="rounded bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">
                      {TYPE_LABELS[question.type] ?? question.type}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      {question.points} pts
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{question.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {question.body}
                  </p>
                </div>

                <label className="flex shrink-0 items-center gap-2 text-sm">
                  <input
                    checked={Boolean(approved[question._id])}
                    onChange={(event) =>
                      setApproved((current) => ({
                        ...current,
                        [question._id]: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  Aprobada
                </label>
                <button
                  className="rounded-md border px-3 py-2 text-sm"
                  onClick={() => startEdit(question)}
                  type="button"
                >
                  Editar
                </button>
              </div>

              <div className="pt-4">
                {editingQuestionId === question._id ? (
                  <div className="grid gap-3">
                    <input
                      className="h-10 rounded-md border px-3 text-sm"
                      onChange={(event) => setEditingTitle(event.target.value)}
                      value={editingTitle}
                    />
                    <textarea
                      className="min-h-24 rounded-md border px-3 py-2 text-sm"
                      onChange={(event) => setEditingBody(event.target.value)}
                      value={editingBody}
                    />
                    <input
                      className="h-10 rounded-md border px-3 text-sm"
                      max={100}
                      min={1}
                      onChange={(event) => setEditingPoints(Number(event.target.value))}
                      type="number"
                      value={editingPoints}
                    />
                    <textarea
                      className="min-h-32 rounded-md border px-3 py-2 font-mono text-xs"
                      onChange={(event) => setEditingCorrectAnswer(event.target.value)}
                      value={editingCorrectAnswer}
                    />
                    <div className="flex gap-2">
                      <button className="rounded-md bg-slate-950 px-3 py-2 text-sm text-white" onClick={saveEdit} type="button">
                        Guardar
                      </button>
                      <button className="rounded-md border px-3 py-2 text-sm" onClick={() => setEditingQuestionId(null)} type="button">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <QuestionRenderer question={question} />
                )}
              </div>
            </article>
          ))}

          {!questions.length ? (
            <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
              Este quiz no tiene preguntas guardadas. Usa el generador de examen completo
              para crear el quiz con estructura por tipo.
            </div>
          ) : null}
        </section>

        <aside className="h-fit rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Publicacion</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Preguntas: {questions.length}</p>
            <p>Aprobadas: {questions.filter((q) => approved[q._id]).length}</p>
            <p>Estado: {quiz?.status ?? "draft"}</p>
          </div>

          {access ? (
            <div className="mt-5 border-t pt-5">
              <p className="text-sm font-medium">Link para estudiantes</p>
              <a
                className="mt-2 block break-all text-sm text-cyan-700 underline"
                href={access.joinUrl}
                target="_blank"
              >
                {access.joinUrl}
              </a>
              <img
                alt="QR de acceso"
                className="mt-4 h-56 w-56 rounded-md border bg-white p-2"
                src={access.qrUrl}
              />
              <p className="mt-2 text-sm text-slate-600">
                Codigo: {access.sessionCode}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function QuestionRenderer({ question }: { question: Question }) {
  switch (question.type) {
    case "multiple_choice":
      return <MultipleChoicePreview question={question} />;
    case "multiple_select":
      return <MultipleSelectPreview question={question} />;
    case "true_false":
      return <TrueFalsePreview question={question} />;
    case "short_answer":
      return <ShortAnswerPreview question={question} />;
    case "essay":
      return <EssayPreview question={question} />;
    case "fill_blank":
      return <FillBlankPreview question={question} />;
    case "ordering":
    case "drag_drop":
      return <OrderingPreview question={question} />;
    case "matching":
      return <MatchingPreview question={question} />;
    case "matrix_scale":
      return <MatrixPreview question={question} />;
    case "prompt_evaluation":
      return <PromptPreview question={question} />;
    default:
      return (
        <pre className="overflow-auto rounded-md bg-slate-100 p-3 text-xs">
          {JSON.stringify(question, null, 2)}
        </pre>
      );
  }
}

function MultipleChoicePreview({ question }: { question: Question }) {
  const value = String(question.correctAnswer?.value ?? "");
  return (
    <div className="grid gap-2">
      {(question.options ?? []).map((option) => (
        <label
          className="flex min-h-12 items-center gap-3 rounded-md border px-3 text-sm"
          key={option.id}
        >
          <input checked={value === option.id} readOnly type="radio" />
          <span className="font-medium">{option.id}.</span>
          <span>{getDisplayOptionLabel(option)}</span>
        </label>
      ))}
    </div>
  );
}

function MultipleSelectPreview({ question }: { question: Question }) {
  const values = Array.isArray(question.correctAnswer?.values)
    ? (question.correctAnswer?.values as string[])
    : [];
  return (
    <div className="grid gap-2">
      {(question.options ?? []).map((option) => (
        <label
          className="flex min-h-12 items-center gap-3 rounded-md border px-3 text-sm"
          key={option.id}
        >
          <input checked={values.includes(option.id)} readOnly type="checkbox" />
          <span className="font-medium">{option.id}.</span>
          <span>{getDisplayOptionLabel(option)}</span>
        </label>
      ))}
    </div>
  );
}

function TrueFalsePreview({ question }: { question: Question }) {
  const value = String(question.correctAnswer?.value ?? "true");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {["true", "false"].map((option) => (
        <div
          className={`rounded-md border p-4 text-center text-sm font-medium ${
            value === option ? "border-emerald-400 bg-emerald-50" : "bg-white"
          }`}
          key={option}
        >
          {option === "true" ? "Verdadero" : "Falso"}
        </div>
      ))}
    </div>
  );
}

function ShortAnswerPreview({ question }: { question: Question }) {
  return (
    <input
      className="h-11 w-full rounded-md border bg-slate-50 px-3 text-sm"
      readOnly
      value={String(question.correctAnswer?.value ?? "")}
    />
  );
}

function EssayPreview({ question }: { question: Question }) {
  return (
    <div className="space-y-3">
      <textarea
        className="min-h-32 w-full rounded-md border bg-slate-50 p-3 text-sm"
        readOnly
        value="Esta respuesta sera evaluada por IA usando la rubrica generada."
      />
      <Rubric rubric={question.rubric} />
    </div>
  );
}

function FillBlankPreview({ question }: { question: Question }) {
  const blanks = Array.isArray(question.correctAnswer?.blanks)
    ? (question.correctAnswer?.blanks as Array<{ id: string; answers: string[] }>)
    : [];

  return (
    <div className="space-y-3">
      <p className="rounded-md bg-slate-50 p-3 text-sm">{question.body}</p>
      {blanks.map((blank) => (
        <input
          className="h-10 w-full rounded-md border px-3 text-sm"
          key={blank.id}
          readOnly
          value={`${blank.id}: ${blank.answers?.join(" / ") ?? ""}`}
        />
      ))}
    </div>
  );
}

function OrderingPreview({ question }: { question: Question }) {
  const ordered = Array.isArray(question.correctAnswer?.ordered)
    ? (question.correctAnswer?.ordered as string[])
    : [];
  return (
    <ol className="space-y-2">
      {ordered.map((item, index) => (
        <li className="flex items-center gap-3 rounded-md border bg-slate-50 p-3 text-sm" key={item}>
          <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-xs text-white">
            {index + 1}
          </span>
          {item}
        </li>
      ))}
    </ol>
  );
}

function MatchingPreview({ question }: { question: Question }) {
  const pairs = Array.isArray(question.correctAnswer?.pairs)
    ? (question.correctAnswer?.pairs as Array<{ left: string; right: string }>)
    : [];
  return (
    <div className="grid gap-2">
      {pairs.map((pair) => (
        <div className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-[1fr_auto_1fr]" key={`${pair.left}-${pair.right}`}>
          <span>{pair.left}</span>
          <span className="text-slate-400">{"->"}</span>
          <span className="font-medium">{pair.right}</span>
        </div>
      ))}
    </div>
  );
}

function MatrixPreview({ question }: { question: Question }) {
  const rows = Array.isArray(question.metadata?.rows) ? (question.metadata?.rows as string[]) : [];
  const cols = Array.isArray(question.metadata?.cols) ? (question.metadata?.cols as string[]) : [];
  const matrix = Array.isArray(question.correctAnswer?.matrix)
    ? (question.correctAnswer?.matrix as Array<{ row: string; value: string }>)
    : [];

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2 text-left">Criterio</th>
            {cols.map((col) => (
              <th className="border p-2" key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = matrix.find((item) => item.row === row)?.value;
            return (
              <tr key={row}>
                <td className="border p-2 font-medium">{row}</td>
                {cols.map((col) => (
                  <td className="border p-2 text-center" key={col}>
                    <input checked={selected === col} readOnly type="radio" />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PromptPreview({ question }: { question: Question }) {
  const variables = (question.metadata?.variables ?? {}) as Record<
    string,
    { value: unknown; type: string; description?: string }
  >;
  const expected = Array.isArray(question.correctAnswer?.expectedVariables)
    ? (question.correctAnswer?.expectedVariables as string[])
    : [];

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-slate-50 p-3 text-sm">
        Redacta un prompt usando las variables requeridas.
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(variables).map(([key, variable]) => (
          <span className="rounded-full border bg-white px-3 py-1 text-xs" key={key} title={variable.description}>
            {key}: {String(variable.value)}
          </span>
        ))}
      </div>
      <div className="rounded-md bg-slate-950 p-3 text-xs text-white">
        Variables obligatorias: {expected.map((key) => `{${key}}`).join(", ")}
      </div>
      <Rubric rubric={question.rubric} />
    </div>
  );
}

function Rubric({ rubric }: { rubric?: Record<string, unknown> }) {
  const criteria = Array.isArray(rubric?.criteria)
    ? (rubric?.criteria as Array<{ name: string; weight: number; maxScore: number }>)
    : [];

  if (!criteria.length) return null;

  return (
    <div className="rounded-md border bg-white p-3">
      <p className="mb-2 text-sm font-medium">Rubrica IA</p>
      <div className="grid gap-2">
        {criteria.map((criterion) => (
          <div className="flex justify-between text-sm" key={criterion.name}>
            <span>{criterion.name}</span>
            <span>{criterion.weight ?? criterion.maxScore} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
