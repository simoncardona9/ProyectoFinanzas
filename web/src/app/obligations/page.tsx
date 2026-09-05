import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/auth/request-auth";
import { ObligationManager } from "./obligation-manager";

export default async function ObligationsPage() {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-5xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <p className="text-sm font-semibold text-emerald-700">
          Finanzas Familiares
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          Obligaciones y proyección mensual
        </h1>
        <p className="mt-2 text-zinc-600">
          Las obligaciones pendientes afectan la proyección, pero no el efectivo
          actual hasta registrar un pago.
        </p>
        <ObligationManager
          canEdit={["owner", "editor"].includes(context.membership.role)}
        />
      </section>
    </main>
  );
}
