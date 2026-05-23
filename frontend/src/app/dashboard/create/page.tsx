"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getTeacherAuthHeaders } from "../../../lib/auth";

const QUESTION_TYPES = [
  ["multiple_choice", "Seleccion unica"],
  ["multiple_select", "Seleccion multiple"],
  ["true_false", "Verdadero / falso"],
  ["short_answer", "Respuesta corta"],
  ["essay", "Respuesta abierta"],
  ["fill_blank", "Completar espacios"],
  ["ordering", "Ordenamiento"],
  ["matching", "Pareo"],
  ["drag_drop", "Drag & drop"],
  ["matrix_scale", "Matriz"],
  ["prompt_evaluation", "Prompt con variables"],
] as const;

export default function CreateExamPage() {
  const router = useRouter();
  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
    [],
  );

  const [title, setTitle] = useState("Evaluacion generada con IA");
  const [courseId, setCourseId] = useState("course_default");
  const [quantity, setQuantity] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [description, setDescription] = useState("");
  const [types, setTypes] = useState<string[]>([
    "multiple_choice",
    "true_false",
    "short_answer",
    "matching",
    "ordering",
    "prompt_evaluation",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateExam = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/ai/generate-quiz`, {
        method: "POST",
        headers: {
          ...(await getTeacherAuthHeaders(apiUrl)),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId: "inst_default",
          courseId,
          title,
          description,
          topic: description || title,
          quantity,
          difficulty: "medium",
          language: "es",
          types,
          mode: "live",
          durationMinutes,
          publishNow: false,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "No se pudo generar el examen");
      }

      const body = (await response.json()) as { quizId?: string };
      if (!body.quizId) throw new Error("La IA no devolvio quizId");
      router.push(`/quizzes/${body.quizId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando examen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <h1 className="text-2xl font-semibold">Nuevo examen IA</h1>
          <p className="text-sm text-slate-600">Genera el examen completo y revisalo antes de publicar.</p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-6">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Titulo</span>
              <input className="h-10 rounded-md border px-3 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Curso</span>
              <input className="h-10 rounded-md border px-3 text-sm" value={courseId} onChange={(event) => setCourseId(event.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Cantidad</span>
              <input className="h-10 rounded-md border px-3 text-sm" type="number" min={1} max={50} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Duracion</span>
              <input className="h-10 rounded-md border px-3 text-sm" type="number" min={1} max={480} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
            </label>
          </div>

          <label className="mt-4 grid gap-2">
            <span className="text-sm font-medium">Descripcion grande del curso</span>
            <textarea className="min-h-60 rounded-md border px-3 py-2 text-sm leading-6" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUESTION_TYPES.map(([value, label]) => (
              <button
                className={`rounded-md border px-3 py-2 text-xs ${types.includes(value) ? "border-slate-950 bg-slate-950 text-white" : "bg-white"}`}
                key={value}
                onClick={() => setTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <button className="mt-5 h-11 rounded-md bg-cyan-700 px-5 text-sm font-medium text-white disabled:opacity-50" disabled={loading || types.length === 0} onClick={generateExam} type="button">
            {loading ? "Generando..." : "Generar examen completo"}
          </button>
        </div>
      </section>
    </main>
  );
}

