"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
import { Header } from "@/components/Header";
import type { Participant, SessionResults } from "@/lib/types";

export default function ResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [results, setResults] = useState<SessionResults | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    Promise.all([api.sessionResults(id), api.sessionParticipants(id)])
      .then(([r, ps]) => {
        setResults(r);
        const map: Record<string, string> = {};
        (ps as Participant[]).forEach((p) => (map[p._id] = p.name));
        setNames(map);
      })
      .catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold">Resultados de la sesion</h1>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {results && (
          <>
            <p className="mt-1 text-sm text-slate-500">
              {results.participants} participantes
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              <Insight label="Promedio" value={`${results.summary?.averagePercentage ?? 0}%`} />
              <Insight label="Mejor" value={`${results.summary?.highestPercentage ?? 0}%`} />
              <Insight label="Menor" value={`${results.summary?.lowestPercentage ?? 0}%`} />
              <Insight label="Entregados" value={String(results.summary?.submitted ?? 0)} />
              <Insight label="Pendientes" value={String(results.summary?.pending ?? 0)} />
            </div>
            <table className="mt-5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">Participante</th>
                  <th className="px-4 py-2">Puntaje</th>
                  <th className="px-4 py-2">Maximo</th>
                  <th className="px-4 py-2">Avance</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r) => (
                  <tr key={r.participantId} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      {names[r.participantId] ?? r.participantId}
                    </td>
                    <td className="px-4 py-2 font-medium">{r.score}</td>
                    <td className="px-4 py-2 text-slate-500">{r.maxScore}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {r.percentage ?? 0}%
                    </td>
                  </tr>
                ))}
                {results.results.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-slate-500" colSpan={4}>
                      Sin respuestas calificadas todavia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </main>
    </>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
