"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { createLiveSocket } from "@/lib/socket";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getInitialAnswer,
  StudentAnswerWidget,
  type AnswerValue,
} from "@/components/StudentAnswerWidget";
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
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
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
        setAnswers(JSON.parse(saved) as Record<string, AnswerValue>);
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

  function updateAnswers(
    updater: (prev: Record<string, AnswerValue>) => Record<string, AnswerValue>,
  ) {
    setAnswers((prev) => {
      const next = updater(prev);
      sessionStorage.setItem("play_answers_" + participantId, JSON.stringify(next));
      return next;
    });
  }

  async function saveAnswer(q: Question) {
    try {
      const answer = answers[q._id] ?? getInitialAnswer(q);
      if (!answer) {
        setError("Completa la respuesta antes de guardarla.");
        return;
      }

      await api.answer(participantId, q._id, answer);
      if (!answers[q._id]) {
        updateAnswers((current) => ({ ...current, [q._id]: answer }));
      }
      setSaved((s) => ({ ...s, [q._id]: true }));
      setError(null);
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
                <StudentAnswerWidget
                  answer={answers[q._id]}
                  disabled={status === "paused"}
                  onChange={(answer) => {
                    updateAnswers((current) => ({
                      ...current,
                      [q._id]: answer,
                    }));
                    setSaved((current) => ({ ...current, [q._id]: false }));
                  }}
                  question={q}
                />
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
