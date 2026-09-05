import { LoginForm } from "./login-form";
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <p className="text-sm font-semibold text-emerald-700">
          Finanzas Familiares
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Ingresar</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Usa tu cuenta autorizada para acceder a tu hogar.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
