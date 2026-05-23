"use client";

import { use, useEffect, useRef, useState } from "react";
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
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = use(params);
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<SessionStatus>("waiting");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  async function load() {
    try {
      const data = await api.participantQuestions(participantId);
      setStatus(data.sessionStatus);
      setQuestions(data.sessionStatus === "ended" ? [] : data.questions);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    const socket = createLiveSocket();
    socketRef.current = socket;
    socket.emit("participant:join", { sessionId: "", participantId });
    socket.on("session:started", () => load());
    socket.on("session:ended", () => {
      setStatus("ended");
      setQuestions([]);
    });
    socket.on("question:changed", () => load());

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
        <StatusBadge status={status} />
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
                          setAnswers((a) => ({ ...a, [q._id]: o.id }))
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
                            setAnswers((a) => ({ ...a, [q._id]: opt.v }))
                          }
                        />
                        {opt.l}
                      </label>
                    ))}
                  </div>
                )}

                {(q.type === "short_answer" ||
                  q.type === "essay" ||
                  q.type === "prompt_evaluation") && (
                  <textarea
                    className="input"
                    rows={q.type === "short_answer" ? 1 : 4}
                    value={(answers[q._id] as string) ?? ""}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q._id]: e.target.value }))
                    }
                  />
                )}
              </div>

              <button
                className="btn-ghost mt-3 inline-flex items-center gap-1.5"
                onClick={() => saveAnswer(q)}
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
            <button className="btn-primary w-full" onClick={finish}>
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
