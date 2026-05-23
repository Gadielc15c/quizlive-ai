"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { createLiveSocket } from "@/lib/socket";
import { StatusBadge } from "@/components/StatusBadge";
import type { Question, SessionStatus } from "@/lib/types";

export default function PlayPage({
  params,
}: {
  params: { participantId: string };
}) {
  const { participantId } = params;
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<SessionStatus>("waiting");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);
  const [startedAt, setStartedAt] = useState<string | undefined>(undefined);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Restore answers from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("play_answers_" + participantId);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved) as Record<string, unknown>);
      } catch {
        // ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  async function load() {
    try {
      const data = await api.participantQuestions(participantId);
      setStatus(data.sessionStatus);
      setQuestions(data.sessionStatus === "ended" ? [] : data.questions);
      if (data.durationMinutes !== undefined) setDurationMinutes(data.durationMinutes);
      if (data.startedAt !== undefined) setStartedAt(data.startedAt);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
    const socket = createLiveSocket();
    socketRef.current = socket;
    socket.emit("participant:join", { sessionId: "", participantId });
    socket.on("session:started", () => { void load(); });
    socket.on("session:ended", () => {
      setStatus("ended");
      setQuestions([]);
    });
    socket.on("question:changed", () => { void load(); });
    socket.on("reconnect", () => { void load(); });

    const hb = setInterval(() => {
      api.participantQuestions(participantId).then(
        (d) => {
          setStatus(d.sessionStatus);
          if (d.sessionStatus === "ended") setQuestions([]);
        },
        () => {},
      );
    }, 8000);

    return () => {
      clearInterval(hb);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  // Timer countdown
  useEffect(() => {
    if (!durationMinutes || !startedAt) {
      setSecondsLeft(null);
      return;
    }

    const endsAt = new Date(startedAt).getTime() + durationMinutes * 60000;

    const tick = () => {
      const left = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [durationMinutes, startedAt]);

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updateAnswers(updater: (prev: Record<string, unknown>) => Record<string, unknown>) {
    setAnswers((prev) => {
      const next = updater(prev);
      sessionStorage.setItem("play_answers_" + participantId, JSON.stringify(next));
      return next;
    });
  }

  async function saveAnswer(q: Question) {
    try {
      await api.answer(participantId, q._id, { value: answers[q._id] });
      setSaved((s) => ({ ...s, [q._id]: true }));
      socketRef.current?.emit("participant:answer_update", {
        participantId,
        questionId: q._id,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function finish() {
    if (!window.confirm("¿Entregar examen? Esta accion no se puede deshacer.")) return;
    try {
      await api.submit(participantId);
      socketRef.current?.emit("participant:answer_submit", { participantId });
      setSubmitted(true);
      router.push(`/result/${participantId}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card max-w-sm">
          <h1 className="text-xl font-semibold">Respuestas enviadas</h1>
          <p className="mt-2 text-slate-500">
            Gracias por participar. Puedes cerrar esta ventana.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Evaluacion</h1>
        <div className="flex items-center gap-3">
          {secondsLeft !== null && (
            <span
              className={`font-mono text-sm font-semibold ${
                secondsLeft < 60 ? "text-red-600" : "text-slate-700"
              }`}
            >
              {formatTime(secondsLeft)}
            </span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {status === "waiting" && (
        <p className="mt-6 text-slate-500">
          Esperando que el docente inicie la sesion...
        </p>
      )}
      {status === "ended" && (
        <p className="mt-6 text-slate-500">La sesion finalizo.</p>
      )}

      {(status === "live" || status === "paused") && (
        <div className="mt-6 space-y-5">
          {status === "paused" && (
            <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
              Sesion en pausa.
            </p>
          )}
          {questions.map((q, i) => (
            <div key={q._id} className="card">
              <p className="text-xs uppercase text-slate-400">
                Pregunta {i + 1} · {q.points} pts
              </p>
              <p className="mt-1 font-medium">{q.title}</p>
              <p className="text-sm text-slate-600">{q.body}</p>

              <div className="mt-3">
                {q.type === "multiple_choice" &&
                  q.options?.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 py-1">
                      <input
                        type="radio"
                        name={q._id}
                        checked={answers[q._id] === o.id}
                        onChange={() =>
                          updateAnswers((a) => ({ ...a, [q._id]: o.id }))
                        }
                      />
                      {o.label}
                    </label>
                  ))}

                {q.type === "true_false" && (
                  <div className="flex gap-4">
                    {[
                      { v: true, l: "Verdadero" },
                      { v: false, l: "Falso" },
                    ].map((opt) => (
                      <label key={opt.l} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={q._id}
                          checked={answers[q._id] === opt.v}
                          onChange={() =>
                            updateAnswers((a) => ({ ...a, [q._id]: opt.v }))
                          }
                        />
                        {opt.l}
                      </label>
                    ))}
                  </div>
                )}

                {(q.type === "short_answer" || q.type === "essay") && (
                  <textarea
                    className="input"
                    rows={q.type === "short_answer" ? 1 : 4}
                    value={(answers[q._id] as string) ?? ""}
                    onChange={(e) =>
                      updateAnswers((a) => ({ ...a, [q._id]: e.target.value }))
                    }
                  />
                )}

                {q.type === "prompt_evaluation" && (
                  <PlayPromptEditor
                    question={q}
                    value={(answers[q._id] as Record<string, unknown>) ?? {}}
                    onChange={(val) => updateAnswers((a) => ({ ...a, [q._id]: val }))}
                  />
                )}
              </div>

              <button
                className="btn-ghost mt-3 inline-flex items-center gap-1.5"
                onClick={() => void saveAnswer(q)}
                disabled={status === "paused"}
              >
                {saved[q._id] ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" /> Guardado
                  </>
                ) : (
                  "Guardar respuesta"
                )}
              </button>
            </div>
          ))}

          {questions.length > 0 && (
            <button className="btn-primary w-full" onClick={() => void finish()}>
              Enviar todo
            </button>
          )}
          {questions.length === 0 && (
            <p className="text-slate-500">No hay preguntas disponibles.</p>
          )}
        </div>
      )}
    </main>
  );
}

function PlayPromptEditor({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: Record<string, unknown>;
  onChange: (val: Record<string, unknown>) => void;
}) {
  const variables = (question.metadata?.variables ?? {}) as Record<string, { value: unknown; type: string; description?: string }>;
  const requiredVars = Array.isArray(question.metadata?.requiredVariables)
    ? (question.metadata.requiredVariables as string[])
    : [];
  const [text, setText] = useState(String(value.answer ?? ""));
  const keys = Object.keys(variables);

  const usedVars = Array.from(new Set([...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1])));
  const missingRequired = requiredVars.filter((v) => !usedVars.includes(v));

  const update = (next: string) => {
    setText(next);
    const used = Array.from(new Set([...next.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1])));
    const rendered = next.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, k: string) =>
      variables[k] ? String(variables[k].value) : `{${k}}`,
    );
    onChange({ answer: next, usedVariables: used, renderedPrompt: rendered });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {keys.map((key) => {
          const isUsed = usedVars.includes(key);
          const isRequired = requiredVars.includes(key);
          return (
            <button
              className={`rounded border px-2 py-1 text-xs transition ${
                isUsed ? "border-emerald-400 bg-emerald-50 text-emerald-700" : isRequired ? "border-amber-300 bg-amber-50 text-amber-700" : "bg-white"
              }`}
              key={key}
              onClick={() => update(text ? `${text} {${key}}` : `{${key}}`)}
              title={variables[key].description}
              type="button"
            >
              <span className="font-mono">{`{${key}}`}</span>
              {isRequired && !isUsed && <span className="ml-1 text-amber-500">*</span>}
              {isUsed && <span className="ml-1">✓</span>}
            </button>
          );
        })}
      </div>

      <textarea
        className={`w-full rounded-lg border p-3 text-sm outline-none transition focus:ring-2 ${
          missingRequired.length > 0 ? "border-amber-300 focus:ring-amber-100" : "border-slate-300 focus:border-brand focus:ring-brand/20"
        }`}
        onChange={(e) => update(e.target.value)}
        placeholder="Escribe tu prompt. Haz clic en las variables de arriba para insertarlas."
        rows={5}
        value={text}
      />

      {missingRequired.length > 0 && (
        <p className="text-xs text-amber-600">Faltan variables requeridas: {missingRequired.map((v) => `{${v}}`).join(", ")}</p>
      )}

      {text && missingRequired.length === 0 && (
        <div className="rounded-md bg-slate-900 p-3">
          <p className="mb-1 text-xs text-slate-400">Preview con valores reales</p>
          <p className="whitespace-pre-wrap text-sm text-white">{text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, k: string) => variables[k] ? String(variables[k].value) : `{${k}}`)}</p>
        </div>
      )}
    </div>
  );
}
