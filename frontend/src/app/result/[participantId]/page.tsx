"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ParticipantResult } from "@/lib/types";

export default function ParticipantResultPage() {
  const params = useParams<{ participantId: string }>();
  const participantId = Array.isArray(params?.participantId)
    ? params.participantId[0]
    : params?.participantId;
  const [result, setResult] = useState<ParticipantResult | null>(null);
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
        // Si faltan respuestas por evaluar con IA, vuelve a consultar.
        if (!data.gradingComplete) {
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
    <main className="mx-auto max-w-xl px-6 py-10">
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
              <span>{result.answers} respuestas</span>
            </div>
          </section>
        </div>
      ) : !error ? (
        <p className="mt-6 text-slate-500">Cargando...</p>
      ) : null}
    </main>
  );
}
