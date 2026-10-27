"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST" });
      if (!response.ok)
        throw new Error("No se pudo cerrar la sesión. Intenta nuevamente.");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("No se pudo cerrar la sesión. Intenta nuevamente.");
      setPending(false);
    }
  }

  return (
    <div className="finance-logout">
      <button
        onClick={() => void logout()}
        disabled={pending}
        className="finance-logout-button"
      >
        <span aria-hidden="true">↪</span>{" "}
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
