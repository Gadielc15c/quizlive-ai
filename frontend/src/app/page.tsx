import Link from "next/link";
import { BarChart3, Eye, Radio, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Generacion con IA",
    desc: "Crea cuestionarios completos a partir de un tema en segundos.",
  },
  {
    icon: Radio,
    title: "Sesiones en vivo",
    desc: "Lanza una sala, comparte el enlace y controla el ritmo.",
  },
  {
    icon: Eye,
    title: "Quien respondio",
    desc: "Sigue el progreso de cada estudiante en tiempo real.",
  },
  {
    icon: BarChart3,
    title: "Resultados al instante",
    desc: "Puntajes y rubricas calculados automaticamente.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold text-brand">QuizLive AI</span>
        <Link href="/login" className="btn-primary">
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-10 text-center">
        <span className="badge bg-brand/10 text-brand">
          Evaluaciones en tiempo real
        </span>
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Evalua en vivo, potenciado por{" "}
          <span className="bg-gradient-to-r from-brand to-indigo-500 bg-clip-text text-transparent">
            IA
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          Genera cuestionarios, lanza sesiones interactivas y observa las
          respuestas de tus estudiantes mientras suceden.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login" className="btn-primary">
            Entrar como docente
          </Link>
          <a href="#features" className="btn-ghost">
            Ver mas
          </a>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto mt-16 grid max-w-5xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="card transition hover:-translate-y-1 hover:shadow-md"
          >
            <f.icon className="h-7 w-7 text-brand" strokeWidth={1.75} />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
          </div>
        ))}
      </section>

      <p className="mx-auto mt-16 max-w-5xl px-6 pb-12 text-center text-sm text-slate-400">
        Estudiantes: usen el enlace de invitacion que comparte su docente.
      </p>
    </main>
  );
}
