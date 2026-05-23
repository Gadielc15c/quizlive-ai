"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { api, getToken } from "@/lib/api";
import { createLiveSocket } from "@/lib/socket";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import type { LiveProgress, QuizSession } from "@/lib/types";

export default function LiveSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [live, setLive] = useState<LiveProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  async function loadSession() {
    setSession(await api.getSession(id));
  }
  async function loadLive() {
    try {
      setLive(await api.sessionLive(id));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    loadSession().catch((e) => setError((e as Error).message));
    loadLive();

    const socket = createLiveSocket();
    socketRef.current = socket;
    socket.on("session:participant_joined", loadLive);
    socket.on("session:answer_received", loadLive);

    const interval = setInterval(loadLive, 4000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function emit(event: string) {
    socketRef.current?.emit(event, { sessionId: id });
  }

  async function control(action: "start" | "pause" | "end") {
    try {
      if (action === "start") {
        setSession(await api.startSession(id));
        emit("teacher:start_session");
      } else if (action === "pause") {
        setSession(await api.pauseSession(id));
        emit("teacher:pause_session");
      } else {
        setSession(await api.endSession(id));
        emit("teacher:end_session");
      }
      loadLive();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function setReviewAccess(enabled: boolean) {
    try {
      setSession(await api.setReviewAccess(id, enabled));
      loadLive();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const participants = live?.participants ?? [];
  const total = live?.totalQuestions ?? 0;
  const answeredAny = participants.filter((p) => p.answeredCount > 0).length;
  const submitted = participants.filter((p) => p.status === "submitted").length;
  const average = live?.averagePercentage ?? 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Panel en vivo</h1>
          {session && <StatusBadge status={session.status} />}
        </div>

        {session && (
          <p className="mt-1 text-sm text-slate-500">
            Codigo de sesion:{" "}
            <span className="font-mono text-base font-semibold text-slate-700">
              {session.sessionCode}
            </span>
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="btn-primary"
            onClick={() => control("start")}
            disabled={session?.status === "live"}
          >
            ▶ Iniciar
          </button>
          <button
            className="btn-ghost"
            onClick={() => control("pause")}
            disabled={session?.status !== "live"}
          >
            ⏸ Pausar
          </button>
          <button className="btn-danger" onClick={() => control("end")}>
            ⏹ Finalizar
          </button>
          <button
            className="btn-ghost ml-auto"
            onClick={() => router.push(`/sessions/${id}/results`)}
          >
            Ver resultados
          </button>
          <button
            className="btn-ghost"
            disabled={session?.status !== "ended"}
            onClick={() => setReviewAccess(!session?.reviewAccessEnabled)}
          >
            {session?.reviewAccessEnabled
              ? "Bloquear revision"
              : "Habilitar revision"}
          </button>
        </div>

        {session?.status !== "ended" ? (
          <p className="mt-3 text-sm text-slate-500">
            La revision de respuestas se puede habilitar cuando la sesion finalice.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-5">
          <Stat label="Conectados" value={participants.length} />
          <Stat label="Respondiendo" value={answeredAny} />
          <Stat label="Entregaron" value={submitted} />
          <Stat label="Preguntas" value={total} />
          <Stat label="Promedio" value={average} suffix="%" />
        </div>

        <section className="mt-8">
          <h2 className="font-semibold">Quien ha respondido</h2>
          <div className="mt-3 space-y-2">
            {participants.length === 0 && (
              <p className="text-slate-500">Esperando estudiantes...</p>
            )}
            {participants.map((p) => {
              const pct = Math.round((p.progress ?? 0) * 100);
              return (
                <div
                  key={p.participantId}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">
                        {p.answeredCount}/{total} · {p.score ?? 0}/{p.maxScore ?? 0} ({p.percentage ?? 0}%)
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.status === "submitted"
                          ? "bg-emerald-500"
                          : "bg-brand"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold">{value}{suffix}</p>
    </div>
  );
}
