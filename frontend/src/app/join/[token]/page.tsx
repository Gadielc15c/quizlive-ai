"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = {
  _id: string;
  type: string;
  title: string;
  body: string;
  instructions?: string;
  points: number;
  options?: Array<{ id: string; label: string }>;
  metadata?: Record<string, unknown>;
  rubric?: Record<string, unknown>;
};

type JoinInfo = {
  sessionId: string;
  quizId: string;
  status: string;
  questionCount?: number;
  questions: Question[];
};

type Result = {
  participantId: string;
  score: number;
  maxScore: number;
  percentage: number;
  answers: number;
};

type AnswerValue = Record<string, unknown>;

export default function JoinExamPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const router = useRouter();
  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
    [],
  );

  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${apiUrl}/join/${encodeURIComponent(token)}`);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "El enlace del examen no es valido");
        }
        const body = (await response.json()) as JoinInfo;
        if (body.status === "ended") {
          throw new Error("La sesion ya finalizo");
        }
        const questionCount = body.questionCount ?? body.questions?.length ?? 0;
        if (!questionCount) {
          throw new Error("El examen existe, pero aun no tiene preguntas publicadas");
        }
        setInfo({ ...body, questionCount, questions: body.questions ?? [] });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el examen");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [apiUrl, token]);

  const enterExam = async () => {
    if (!token || !firstName.trim() || !lastName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/join/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`,
          studentCode,
        }),
      });

      if (!response.ok) throw new Error("No se pudo entrar al examen");
      const body = (await response.json()) as { participantId: string };
      router.push(`/play/${body.participantId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error entrando al examen");
    } finally {
      setSubmitting(false);
    }
  };

  const submitExam = async () => {
    if (!participantId || !info) return;

    setSubmitting(true);
    setError("");

    try {
      for (const question of info.questions) {
        const answer = answers[question._id];
        if (!answer) continue;

        const response = await fetch(`${apiUrl}/participant/${participantId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: question._id, answer }),
        });

        if (!response.ok) {
          throw new Error(`No se pudo guardar: ${question.title}`);
        }
      }

      await fetch(`${apiUrl}/participant/${participantId}/submit`, {
        method: "POST",
      });

      const resultResponse = await fetch(`${apiUrl}/participant/${participantId}/result`);
      if (!resultResponse.ok) throw new Error("No se pudo cargar la calificacion");
      setResult((await resultResponse.json()) as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error enviando examen");
    } finally {
      setSubmitting(false);
    }
  };

  const setAnswer = (questionId: string, answer: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  };

  if (loading) {
    return <main className="min-h-screen bg-[#f6f7f9] p-6">Cargando...</main>;
  }

  if (error && !info) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f9] p-6 text-slate-950">
        <section className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm text-red-600">No se pudo abrir el examen</p>
          <h1 className="mt-2 text-xl font-semibold">Enlace no disponible</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
        </section>
      </main>
    );
  }

  if (result) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f9] p-6 text-slate-950">
        <section className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Examen enviado</p>
          <h1 className="mt-2 text-2xl font-semibold">Tu calificacion</h1>
          <div className="mt-5 rounded-md bg-slate-50 p-4">
            <p className="text-3xl font-semibold">{result.percentage}%</p>
            <p className="mt-1 text-sm text-slate-600">
              {result.score} / {result.maxScore} puntos
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <h1 className="text-2xl font-semibold">Entrar al examen</h1>
          <p className="mt-1 text-sm text-slate-600">
            {info?.questionCount ?? info?.questions.length ?? 0} preguntas disponibles
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!participantId ? (
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Nombre</span>
                <input
                  className="h-11 rounded-md border px-3 text-sm"
                  onChange={(event) => setFirstName(event.target.value)}
                  value={firstName}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Apellido</span>
                <input
                  className="h-11 rounded-md border px-3 text-sm"
                  onChange={(event) => setLastName(event.target.value)}
                  value={lastName}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Matricula opcional</span>
                <input
                  className="h-11 rounded-md border px-3 text-sm"
                  onChange={(event) => setStudentCode(event.target.value)}
                  value={studentCode}
                />
              </label>
            </div>
            <button
              className="mt-5 h-11 rounded-md bg-slate-950 px-5 text-sm font-medium text-white disabled:opacity-50"
              disabled={!firstName.trim() || !lastName.trim() || submitting}
              onClick={enterExam}
              type="button"
            >
              {submitting ? "Entrando..." : "Comenzar"}
            </button>
          </section>
        ) : (
          <section className="space-y-4">
            {info?.questions.map((question, index) => (
              <QuestionCard
                answer={answers[question._id]}
                key={question._id}
                number={index + 1}
                onChange={(answer) => setAnswer(question._id, answer)}
                question={question}
              />
            ))}

            <div className="sticky bottom-0 border-t bg-white/90 py-4 backdrop-blur">
              <button
                className="h-11 rounded-md bg-cyan-700 px-5 text-sm font-medium text-white disabled:opacity-50"
                disabled={submitting}
                onClick={submitExam}
                type="button"
              >
                {submitting ? "Enviando..." : "Entregar examen"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function QuestionCard({
  question,
  number,
  answer,
  onChange,
}: {
  question: Question;
  number: number;
  answer?: AnswerValue;
  onChange: (answer: AnswerValue) => void;
}) {
  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">
          Pregunta {number}
        </span>
        <span className="rounded bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">
          {question.points} pts
        </span>
      </div>
      <h2 className="text-lg font-semibold">{question.title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-700">{question.body}</p>
      <div className="mt-5">
        <StudentWidget question={question} answer={answer} onChange={onChange} />
      </div>
    </article>
  );
}

function StudentWidget({
  question,
  answer,
  onChange,
}: {
  question: Question;
  answer?: AnswerValue;
  onChange: (answer: AnswerValue) => void;
}) {
  switch (question.type) {
    case "multiple_choice":
      return <Choice question={question} value={String(answer?.value ?? "")} onChange={(value) => onChange({ value })} />;
    case "multiple_select":
      return <MultiChoice question={question} values={Array.isArray(answer?.values) ? (answer?.values as string[]) : []} onChange={(values) => onChange({ values })} />;
    case "true_false":
      return <TrueFalse value={String(answer?.value ?? "")} onChange={(value) => onChange({ value })} />;
    case "short_answer":
      return <ShortAnswer value={String(answer?.value ?? "")} onChange={(value) => onChange({ value })} />;
    case "essay":
      return <Essay value={String(answer?.value ?? "")} onChange={(value) => onChange({ value })} />;
    case "fill_blank":
      return <FillBlank question={question} answer={answer} onChange={onChange} />;
    case "ordering":
    case "drag_drop":
      return <Ordering question={question} answer={answer} onChange={onChange} />;
    case "matching":
      return <Matching question={question} answer={answer} onChange={onChange} />;
    case "matrix_scale":
      return <Matrix question={question} answer={answer} onChange={onChange} />;
    case "prompt_evaluation":
      return <PromptEditor question={question} answer={answer} onChange={onChange} />;
    default:
      return <Essay value={String(answer?.value ?? "")} onChange={(value) => onChange({ value })} />;
  }
}

function Choice({ question, value, onChange }: { question: Question; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      {(question.options ?? []).map((option) => (
        <button
          className={`min-h-12 rounded-md border px-3 text-left text-sm transition hover:-translate-y-0.5 ${
            value === option.id ? "border-cyan-500 bg-cyan-50" : "bg-white"
          }`}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          <span className="font-medium">{option.id}.</span> {option.label}
        </button>
      ))}
    </div>
  );
}

function MultiChoice({ question, values, onChange }: { question: Question; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <div className="grid gap-2">
      {(question.options ?? []).map((option) => {
        const selected = values.includes(option.id);
        return (
          <button
            className={`min-h-12 rounded-md border px-3 text-left text-sm transition hover:-translate-y-0.5 ${
              selected ? "border-emerald-500 bg-emerald-50" : "bg-white"
            }`}
            key={option.id}
            onClick={() =>
              onChange(selected ? values.filter((id) => id !== option.id) : [...values, option.id])
            }
            type="button"
          >
            {selected ? "✓" : "□"} <span className="font-medium">{option.id}.</span> {option.label}
          </button>
        );
      })}
      <p className="text-xs text-slate-500">{values.length} seleccionadas</p>
    </div>
  );
}

function TrueFalse({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        ["true", "Verdadero"],
        ["false", "Falso"],
      ].map(([id, label]) => (
        <button
          className={`min-h-16 rounded-md border text-sm font-medium transition active:scale-[1.02] ${
            value === id ? "border-cyan-500 bg-cyan-50" : "bg-white"
          }`}
          key={id}
          onClick={() => onChange(id)}
          type="button"
        >
          {value === id ? "✓ " : ""}
          {label}
        </button>
      ))}
    </div>
  );
}

function ShortAnswer({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative block">
      <input
        className="peer h-12 w-full rounded-md border px-3 pt-4 text-sm outline-none transition focus:border-cyan-500"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <span className="pointer-events-none absolute left-3 top-1 text-xs text-slate-500 transition peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-focus:top-1 peer-focus:text-xs">
        Respuesta
      </span>
      {value ? <span className="absolute right-3 top-3 text-emerald-600">✓</span> : null}
    </label>
  );
}

function Essay({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="rounded-md border bg-slate-50 p-3 transition focus-within:-translate-y-0.5 focus-within:border-cyan-500">
      <textarea
        className="min-h-36 w-full resize-y bg-transparent text-sm outline-none"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe tu respuesta aqui..."
        value={value}
      />
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{words} palabras</span>
        <span>{value ? "Guardado local" : ""}</span>
      </div>
    </div>
  );
}

function FillBlank({ question, answer, onChange }: { question: Question; answer?: AnswerValue; onChange: (answer: AnswerValue) => void }) {
  const blanks = extractBlanks(question.body);
  const current = Array.isArray(answer?.blanks) ? (answer?.blanks as Array<{ id: string; value: string }>) : [];

  return (
    <div className="space-y-3">
      <p className="rounded-md bg-slate-50 p-3 text-sm">{question.body}</p>
      {blanks.map((id) => (
        <input
          className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-cyan-500"
          key={id}
          onChange={(event) =>
            onChange({
              blanks: upsert(current, { id, value: event.target.value }),
            })
          }
          placeholder={id}
          value={current.find((item) => item.id === id)?.value ?? ""}
        />
      ))}
    </div>
  );
}

function Ordering({ question, answer, onChange }: { question: Question; answer?: AnswerValue; onChange: (answer: AnswerValue) => void }) {
  const initial = Array.isArray(question.metadata?.items)
    ? (question.metadata?.items as string[])
    : Array.isArray(question.metadata?.blocks)
      ? (question.metadata?.blocks as string[])
      : [];
  const ordered = Array.isArray(answer?.ordered) ? (answer?.ordered as string[]) : initial;

  const move = (from: number, to: number) => {
    const next = [...ordered];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ ordered: next });
  };

  return (
    <div className="space-y-2">
      {ordered.map((item, index) => (
        <div
          className="flex items-center gap-3 rounded-md border bg-white p-3 text-sm transition hover:-translate-y-0.5"
          draggable
          key={`${item}-${index}`}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
          onDrop={(event) => move(Number(event.dataTransfer.getData("text/plain")), index)}
        >
          <span className="cursor-grab text-slate-400">≡</span>
          <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-xs text-white">
            {index + 1}
          </span>
          {item}
        </div>
      ))}
    </div>
  );
}

function Matching({ question, answer, onChange }: { question: Question; answer?: AnswerValue; onChange: (answer: AnswerValue) => void }) {
  const pairs = Array.isArray(question.metadata?.pairs)
    ? (question.metadata?.pairs as Array<{ left: string; right: string }>)
    : [];
  const rights = pairs.map((pair) => pair.right);
  const current = Array.isArray(answer?.pairs) ? (answer?.pairs as Array<{ left: string; right: string }>) : [];

  return (
    <div className="grid gap-3">
      {pairs.map((pair) => (
        <label className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-2 sm:items-center" key={pair.left}>
          <span className="font-medium">{pair.left}</span>
          <select
            className="h-10 rounded-md border px-3"
            onChange={(event) =>
              onChange({
                pairs: upsertPair(current, { left: pair.left, right: event.target.value }),
              })
            }
            value={current.find((item) => item.left === pair.left)?.right ?? ""}
          >
            <option value="">Selecciona definicion</option>
            {rights.map((right) => (
              <option key={right} value={right}>{right}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function Matrix({ question, answer, onChange }: { question: Question; answer?: AnswerValue; onChange: (answer: AnswerValue) => void }) {
  const rows = Array.isArray(question.metadata?.rows) ? (question.metadata?.rows as string[]) : [];
  const cols = Array.isArray(question.metadata?.cols) ? (question.metadata?.cols as string[]) : [];
  const current = Array.isArray(answer?.matrix) ? (answer?.matrix as Array<{ row: string; value: string }>) : [];

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const selected = current.find((item) => item.row === row)?.value ?? "";
        return (
          <div className="rounded-md border p-3" key={row}>
            <p className="mb-2 text-sm font-medium">{row}</p>
            <div className="flex flex-wrap gap-2">
              {cols.map((col) => (
                <button
                  className={`rounded-md border px-3 py-2 text-xs transition ${
                    selected === col ? "border-cyan-500 bg-cyan-50" : "bg-white"
                  }`}
                  key={col}
                  onClick={() => onChange({ matrix: upsertPair(current, { row, value: col }) })}
                  type="button"
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PromptEditor({ question, answer, onChange }: { question: Question; answer?: AnswerValue; onChange: (answer: AnswerValue) => void }) {
  const variables = (question.metadata?.variables ?? {}) as Record<string, { value: unknown; type: string; description?: string }>;
  const [text, setText] = useState(String(answer?.answer ?? ""));
  const [query, setQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const keys = Object.keys(variables);
  const filtered = keys.filter((key) => key.includes(query.toLowerCase()));
  const usedVariables = Array.from(new Set([...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1])));
  const renderedPrompt = text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) =>
    variables[key] ? String(variables[key].value) : `{${key}}`,
  );

  const update = (next: string) => {
    setText(next);
    const match = next.match(/\{([a-zA-Z0-9_]*)$/);
    setShowMenu(Boolean(match));
    setQuery(match?.[1] ?? "");
    onChange({ answer: next, usedVariables, renderedPrompt });
  };

  const insert = (key: string) => {
    const next = text.replace(/\{[a-zA-Z0-9_]*$/, `{${key}}`);
    setShowMenu(false);
    update(next);
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-md border bg-slate-50 p-3 focus-within:border-cyan-500">
        <textarea
          className="min-h-32 w-full bg-transparent text-sm outline-none"
          onChange={(event) => update(event.target.value)}
          placeholder="Escribe un prompt. Usa { para insertar variables."
          value={text}
        />
        {showMenu ? (
          <div className="absolute left-3 top-full z-10 mt-2 w-72 rounded-md border bg-white p-2 shadow-lg">
            {filtered.map((key) => (
              <button
                className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-50"
                key={key}
                onClick={() => insert(key)}
                type="button"
              >
                {`{${key}}`} - {String(variables[key].value)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {keys.map((key) => (
          <button
            className="rounded-full border bg-white px-3 py-1 text-xs hover:bg-cyan-50"
            key={key}
            onClick={() => update(`${text}{${key}}`)}
            title={variables[key].description}
            type="button"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="rounded-md bg-slate-950 p-3 text-xs text-white">
        Preview: {renderedPrompt || "Sin texto"}
      </div>
    </div>
  );
}

function extractBlanks(body: string) {
  const matches = [...body.matchAll(/\[\[(blank_[a-zA-Z0-9_]+)\]\]/g)];
  return matches.map((match) => match[1]);
}

function upsert<T extends { id: string }>(items: T[], item: T) {
  const exists = items.some((current) => current.id === item.id);
  return exists
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item];
}

function upsertPair<T extends { [key: string]: string }>(items: T[], item: T) {
  const key = "left" in item ? "left" : "row";
  const exists = items.some((current) => current[key] === item[key]);
  return exists
    ? items.map((current) => (current[key] === item[key] ? item : current))
    : [...items, item];
}
