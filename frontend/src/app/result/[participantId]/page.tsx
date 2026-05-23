"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { ParticipantResult, ParticipantReview } from "@/lib/types";

export default function ParticipantResultPage() {
  const params = useParams<{ participantId: string }>();
  const participantId = Array.isArray(params?.participantId)
    ? params.participantId[0]
    : params?.participantId;
  const [result, setResult] = useState<ParticipantResult | null>(null);
  const [review, setReview] = useState<ParticipantReview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!participantId) return;
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const data = await api.participantResult(participantId);
        if (!mounted) return;
        setResult(data);
        setError("");
        if (data.reviewAccessEnabled) {
          const reviewData = await api.participantReview(participantId);
          if (!mounted) return;
          setReview(reviewData);
        } else {
          setReview(null);
        }
        // Si faltan respuestas por evaluar con IA, vuelve a consultar.
        if (!data.gradingComplete || !data.reviewAccessEnabled) {
          timer = setTimeout(() => void load(), 3000);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Error");
      }
    };

    void load();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [participantId]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Tu resultado</h1>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div className="mt-6 space-y-4">
          {!result.gradingComplete ? (
            <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand">
              <Loader2 className="h-4 w-4 animate-spin" />
              Evaluando {result.pendingGrading} respuesta(s) con IA. El puntaje
              final se actualiza solo...
            </div>
          ) : null}

          <section className="card space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Puntuacion</span>
              <span className="text-2xl font-bold">
                {result.score}{" "}
                <span className="text-base font-normal text-slate-400">
                  / {result.maxScore}
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.min(result.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>{result.percentage}%</span>
              <span>
                {result.answers}/{result.totalQuestions ?? result.answers} respuestas
              </span>
            </div>
          </section>

          {!result.reviewAccessEnabled ? (
            <section className="card flex gap-3 border-amber-200 bg-amber-50 text-amber-900">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="font-semibold">Espera autorizacion</h2>
                <p className="mt-1 text-sm">
                  El administrador aun no habilita la revision de respuestas.
                  Esta pagina se actualiza sola cuando el acceso este disponible.
                </p>
              </div>
            </section>
          ) : null}

          {review?.reviewAccessEnabled ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Revision de respuestas</h2>
              {review.items.map((item, index) => (
                <article className="card space-y-3" key={item.questionId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-500">
                      Pregunta {index + 1} · {item.score}/{item.maxScore} pts
                    </p>
                    <ReviewStatus isCorrect={item.isCorrect} answered={item.answered} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.body}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-700">Tu respuesta</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">
                      {formatAnswer(item.answer)}
                    </p>
                  </div>
                  {item.feedback ? (
                    <div className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-slate-700">Feedback</p>
                      <p className="mt-1 text-slate-600">{item.feedback}</p>
                    </div>
                  ) : null}
                  {item.aiInsight ? (
                    <AiInsight insight={item.aiInsight} />
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}
        </div>
      ) : !error ? (
        <p className="mt-6 text-slate-500">Cargando...</p>
      ) : null}
    </main>
  );
}

function ReviewStatus({
  isCorrect,
  answered,
}: {
  isCorrect: boolean | null;
  answered: boolean;
}) {
  if (!answered) {
    return <span className="badge bg-slate-100 text-slate-600">Sin responder</span>;
  }

  if (isCorrect === true) {
    return (
      <span className="badge gap-1 bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Correcta
      </span>
    );
  }

  if (isCorrect === false) {
    return (
      <span className="badge gap-1 bg-red-50 text-red-700">
        <XCircle className="h-3.5 w-3.5" /> Incorrecta
      </span>
    );
  }

  return <span className="badge bg-brand/10 text-brand">Evaluada por IA</span>;
}

function AiInsight({ insight }: { insight: Record<string, unknown> }) {
  const feedback = typeof insight.feedback === "string" ? insight.feedback : "";
  const confidence =
    typeof insight.confidence === "number" ? `${Math.round(insight.confidence * 100)}%` : "";
  const criteria =
    insight.criteria && typeof insight.criteria === "object"
      ? Object.entries(insight.criteria as Record<string, unknown>)
      : [];

  return (
    <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 text-sm">
      <p className="font-medium text-brand">Insight IA</p>
      {feedback ? <p className="mt-1 text-slate-700">{feedback}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
        {confidence ? <span className="rounded bg-white px-2 py-1">Confianza {confidence}</span> : null}
        {criteria.map(([key, value]) => (
          <span className="rounded bg-white px-2 py-1" key={key}>
            {key}: {String(value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatAnswer(answer: Record<string, unknown> | null) {
  if (!answer) return "Sin respuesta";
  if (typeof answer.value === "string" || typeof answer.value === "number") {
    return String(answer.value);
  }
  if (typeof answer.answer === "string") return answer.answer;
  if (Array.isArray(answer.values)) return answer.values.map(String).join(", ");
  if (typeof answer.renderedPrompt === "string") return answer.renderedPrompt;
  return JSON.stringify(answer, null, 2);
}
