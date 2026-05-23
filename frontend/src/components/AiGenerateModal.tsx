"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { api, getUser } from "@/lib/api";

const QUESTION_TYPES = [
  { id: "multiple_choice", label: "Seleccion unica" },
  { id: "multiple_select", label: "Seleccion multiple" },
  { id: "true_false", label: "Verdadero / Falso" },
  { id: "short_answer", label: "Respuesta corta" },
  { id: "fill_blank", label: "Completar" },
  { id: "ordering", label: "Ordenamiento" },
  { id: "matching", label: "Relacionar" },
  { id: "matrix_scale", label: "Matriz / Escala" },
  { id: "essay", label: "Ensayo (IA)" },
  { id: "prompt_evaluation", label: "Prompt (IA)" },
];

export function AiGenerateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (quizId: string) => void;
}) {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("curso-demo");
  const [quantity, setQuantity] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [types, setTypes] = useState<string[]>(["multiple_choice"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function toggleType(id: string) {
    setTypes((t) =>
      t.includes(id) ? t.filter((x) => x !== id) : [...t, id],
    );
  }

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const user = getUser();
      const res = await api.generateQuiz({
        institutionId: user?.institutionId ?? "inst_default",
        courseId,
        title: title || topic,
        topic,
        quantity: Number(quantity),
        difficulty,
        types,
        language: "es",
      });
      onCreated(res.quizId);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Generar cuestionario con IA
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Tema</label>
            <input
              className="input"
              placeholder="Ej: Revolucion Industrial"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Titulo (opcional)</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Curso</label>
              <input
                className="input"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad</label>
              <input
                className="input"
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Dificultad</label>
              <select
                className="input"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as "easy" | "medium" | "hard")
                }
              >
                <option value="easy">Facil</option>
                <option value="medium">Media</option>
                <option value="hard">Dificil</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Tipos de pregunta</label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleType(t.id)}
                  className={`badge border px-3 py-1 ${
                    types.includes(t.id)
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={generate}
            disabled={loading || !topic.trim() || types.length === 0}
          >
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
      </div>
    </div>
  );
}
