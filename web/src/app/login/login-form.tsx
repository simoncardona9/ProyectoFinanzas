"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError("No fue posible iniciar sesión. Revisa tus datos.");
      return;
    }
    router.replace("/settings");
    router.refresh();
  }
  return (
    <form action={submit} className="mt-7 space-y-5">
      <label className="block text-sm font-medium">
        Correo electrónico
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium">
        Contraseña
        <input
          required
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
