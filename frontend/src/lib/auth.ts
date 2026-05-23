const TOKEN_KEY = "quizlive.teacherToken";

export async function getTeacherAuthHeaders(apiUrl: string): Promise<HeadersInit> {
  const token = await getTeacherToken(apiUrl);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getTeacherToken(apiUrl: string): Promise<string> {
  if (typeof window === "undefined") return "";

  const envToken = process.env.NEXT_PUBLIC_TEACHER_JWT;
  if (envToken) {
    localStorage.setItem(TOKEN_KEY, envToken);
    return envToken;
  }

  const email = process.env.NEXT_PUBLIC_TEACHER_EMAIL;
  const password = process.env.NEXT_PUBLIC_TEACHER_PASSWORD;

  if (!email || !password) {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  }

  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error("No se pudo iniciar sesion del docente");
  }

  const body = (await response.json()) as { accessToken?: string };
  if (!body.accessToken) {
    throw new Error("El backend no devolvio accessToken");
  }

  localStorage.setItem(TOKEN_KEY, body.accessToken);
  localStorage.setItem("accessToken", body.accessToken);
  return body.accessToken;
}
