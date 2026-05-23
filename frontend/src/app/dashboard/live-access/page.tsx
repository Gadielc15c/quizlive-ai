"use client";

import { FormEvent, useState } from "react";

type AccessResponse = {
  sessionId: string;
  sessionCode: string;
  joinToken: string;
  joinUrl: string;
  qrUrl: string;
};

export default function LiveAccessPage() {
  const [sessionId, setSessionId] = useState("");
  const [token, setToken] = useState("");
  const [data, setData] = useState<AccessResponse | null>(null);
  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setData(null);

    try {
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/access`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("No se pudo obtener el enlace");
      }
      const body = (await response.json()) as AccessResponse;
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Acceso en vivo (Link + QR)</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded border p-2"
          placeholder="Session ID"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          required
        />
        <textarea
          className="w-full rounded border p-2"
          placeholder="JWT del docente"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">
          Generar acceso
        </button>
      </form>

      {error ? <p className="text-red-600">{error}</p> : null}

      {data ? (
        <section className="space-y-3 rounded border p-4">
          <p>
            <strong>SessionCode:</strong> {data.sessionCode}
          </p>
          <p>
            <strong>Join URL:</strong> {data.joinUrl}
          </p>
          <img src={data.qrUrl} alt="QR de acceso" width={256} height={256} />
        </section>
      ) : null}
    </main>
  );
}

