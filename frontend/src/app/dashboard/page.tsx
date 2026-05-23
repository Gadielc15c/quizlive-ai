"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTeacherAuthHeaders } from "../../lib/auth";

type Quiz = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  mode: string;
  durationMinutes: number;
  createdAt?: string;
};

type Session = {
  _id: string;
  sessionCode: string;
  status: string;
  quizId: string;
};

type Participant = {
  _id: string;
  name: string;
  studentCode?: string;
  status: string;
  submittedAt?: string;
};

type SessionResult = {
  sessionId: string;
  participants: number;
  totalQuestions?: number;
  maxScore?: number;
  summary?: {
    averagePercentage: number;
    highestPercentage: number;
    lowestPercentage: number;
    submitted: number;
    pending: number;
  };
  results: Array<{
    participantId: string;
    name?: string;
    studentCode?: string;
    status?: string;
    score: number;
    maxScore: number;
    percentage?: number;
  }>;
};

type AccessData = {
  sessionId: string;
  sessionCode: string;
  joinUrl: string;
  qrUrl: string;
};

export default function DashboardPage() {
  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
    [],
  );

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<SessionResult | null>(null);
  const [access, setAccess] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    void loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    setLoading(true);
    setError("");
    try {
      setBackendOnline(true);
      const headers = await getTeacherAuthHeaders(apiUrl);
      const response = await fetch(`${apiUrl}/quizzes`, { headers });
      if (!response.ok) {
        setBackendOnline(true);
        const text = await response.text();
        throw new Error(text || `Backend respondio ${response.status}`);
      }
      setQuizzes((await response.json()) as Quiz[]);
    } catch (err) {
      setBackendOnline(err instanceof TypeError ? false : true);
      setError(err instanceof Error ? err.message : "Error cargando dashboard");
    } finally {
      setLoading(false);
    }
  };

  const openQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setSelectedSession(null);
    setParticipants([]);
    setResults(null);
    setAccess(null);

    const headers = await getTeacherAuthHeaders(apiUrl);
    const response = await fetch(`${apiUrl}/quizzes/${quiz._id}/sessions`, {
      headers,
    });
    if (response.ok) {
      setSessions((await response.json()) as Session[]);
    }
  };

  const createSession = async () => {
    if (!selectedQuiz) return;
    setError("");
    try {
      const headers = {
        ...(await getTeacherAuthHeaders(apiUrl)),
        "Content-Type": "application/json",
      };
      await fetch(`${apiUrl}/quizzes/${selectedQuiz._id}/publish`, {
        method: "POST",
        headers,
        body: JSON.stringify({ force: true }),
      });

      const response = await fetch(`${apiUrl}/quizzes/${selectedQuiz._id}/sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("No se pudo crear sesion");
      const session = (await response.json()) as Session;
      setSessions((current) => [session, ...current]);
      await openSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando sesion");
    }
  };

  const openSession = async (session: Session) => {
    setSelectedSession(session);
    const headers = await getTeacherAuthHeaders(apiUrl);
    const [participantsRes, resultsRes, accessRes] = await Promise.all([
      fetch(`${apiUrl}/participant/session/${session._id}`, { headers }),
      fetch(`${apiUrl}/sessions/${session._id}/results`, { headers }),
      fetch(`${apiUrl}/sessions/${session._id}/access`, { headers }),
    ]);

    if (participantsRes.ok) setParticipants((await participantsRes.json()) as Participant[]);
    if (resultsRes.ok) setResults((await resultsRes.json()) as SessionResult);
    if (accessRes.ok) setAccess((await accessRes.json()) as AccessData);
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-semibold">Panel docente</h1>
            <p className="text-sm text-slate-600">Examenes, sesiones en vivo, QR y calificaciones.</p>
          </div>
          <Link className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" href="/dashboard/create">
            Nuevo examen IA
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Examenes</h2>
            <button className="text-sm text-cyan-700" onClick={loadQuizzes} type="button">Actualizar</button>
          </div>
          {loading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
          {error ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {backendOnline ? error : `Backend no disponible: ${error}`}
            </div>
          ) : null}
          <div className="grid gap-2">
            {quizzes.map((quiz) => (
              <button
                className={`rounded-md border p-3 text-left text-sm transition hover:bg-slate-50 ${
                  selectedQuiz?._id === quiz._id ? "border-cyan-500 bg-cyan-50" : "bg-white"
                }`}
                key={quiz._id}
                onClick={() => void openQuiz(quiz)}
                type="button"
              >
                <p className="font-medium">{quiz.title}</p>
                <p className="mt-1 text-xs text-slate-500">{quiz.status} · {quiz.durationMinutes} min</p>
              </button>
            ))}
            {!quizzes.length && !loading && backendOnline ? (
              <p className="text-sm text-slate-500">No hay examenes creados.</p>
            ) : null}
          </div>
        </aside>

        <section className="space-y-5">
          {selectedQuiz ? (
            <>
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Examen seleccionado</p>
                    <h2 className="mt-1 text-xl font-semibold">{selectedQuiz.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{selectedQuiz.description ?? "Sin descripcion"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link className="rounded-md border px-3 py-2 text-sm" href={`/quizzes/${selectedQuiz._id}`}>
                      Editar / revisar
                    </Link>
                    <button className="rounded-md bg-slate-950 px-3 py-2 text-sm text-white" onClick={createSession} type="button">
                      Publicar y crear QR
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">Sesiones</h3>
                  <div className="mt-3 grid gap-2">
                    {sessions.map((session) => (
                      <button
                        className={`rounded-md border p-3 text-left text-sm ${
                          selectedSession?._id === session._id ? "border-cyan-500 bg-cyan-50" : "bg-white"
                        }`}
                        key={session._id}
                        onClick={() => void openSession(session)}
                        type="button"
                      >
                        <p className="font-medium">{session.sessionCode}</p>
                        <p className="text-xs text-slate-500">{session.status}</p>
                      </button>
                    ))}
                    {!sessions.length ? <p className="text-sm text-slate-500">Sin sesiones publicadas.</p> : null}
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">Acceso estudiantes</h3>
                  {access ? (
                    <>
                      <a className="mt-3 block break-all text-sm text-cyan-700 underline" href={access.joinUrl} target="_blank">
                        {access.joinUrl}
                      </a>
                      <img alt="QR" className="mt-4 h-56 w-56 rounded-md border p-2" src={access.qrUrl} />
                      <p className="mt-2 text-sm text-slate-600">Codigo: {access.sessionCode}</p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Selecciona o crea una sesion.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <h3 className="font-semibold">Participantes y calificaciones</h3>
                {results?.summary ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-5">
                    <SessionInsight label="Promedio" value={`${results.summary.averagePercentage}%`} />
                    <SessionInsight label="Mejor" value={`${results.summary.highestPercentage}%`} />
                    <SessionInsight label="Menor" value={`${results.summary.lowestPercentage}%`} />
                    <SessionInsight label="Entregados" value={String(results.summary.submitted)} />
                    <SessionInsight label="Pendientes" value={String(results.summary.pending)} />
                  </div>
                ) : null}
                <div className="mt-4 overflow-auto">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="border p-2">Estudiante</th>
                        <th className="border p-2">Matricula</th>
                        <th className="border p-2">Estado</th>
                        <th className="border p-2">Calificacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((participant) => {
                        const score = results?.results.find((item) => item.participantId === participant._id);
                        return (
                          <tr key={participant._id}>
                            <td className="border p-2">{score?.name ?? participant.name}</td>
                            <td className="border p-2">{score?.studentCode ?? participant.studentCode ?? "-"}</td>
                            <td className="border p-2">{score?.status ?? participant.status}</td>
                            <td className="border p-2">
                              {score
                                ? `${score.score}/${score.maxScore} (${score.percentage ?? 0}%)`
                                : "Pendiente"}
                            </td>
                          </tr>
                        );
                      })}
                      {!participants.length ? (
                        <tr><td className="border p-3 text-slate-500" colSpan={4}>Sin participantes aun.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-white p-6 text-sm text-slate-600 shadow-sm">
              Selecciona un examen para ver sesiones, QR, participantes y calificaciones.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SessionInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
