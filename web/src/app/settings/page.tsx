import { redirect } from "next/navigation";
import { authRepository } from "@/modules/auth/auth.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { FeatureNavigationCard } from "@/shared/ui/navigation";
import { LogoutButton } from "./logout-button";
import { LowBufferSettings } from "./low-buffer-settings";
export default async function SettingsPage() {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const household = await authRepository.getHousehold(
    context.membership.householdId,
  );
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Finanzas Familiares
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              Configuración del hogar
            </h1>
          </div>
          <LogoutButton />
        </div>
        <nav aria-label="Secciones principales" className="mt-6 grid gap-3">
          <FeatureNavigationCard
            href="/dashboard"
            title="Panel mensual"
            description="Revisar efectivo, ingresos cobrados y proyección por moneda."
          />
          <FeatureNavigationCard
            href="/structure"
            title="Cuentas y categorías"
            description="Crear y organizar la estructura financiera del hogar."
          />
          <FeatureNavigationCard
            href="/transactions"
            title="Registro de movimientos"
            description="Registrar y revisar ingresos y egresos pagados."
          />
          <FeatureNavigationCard
            href="/obligations"
            title="Obligaciones y proyección"
            description="Planificar vencimientos y revisar el efectivo proyectado."
          />
        </nav>
        <dl className="mt-8 divide-y divide-zinc-200">
          <div className="py-3">
            <dt className="text-sm text-zinc-500">Usuario</dt>
            <dd>{context.user.email}</dd>
          </div>
          <div className="py-3">
            <dt className="text-sm text-zinc-500">Hogar activo</dt>
            <dd>{household?.name}</dd>
          </div>
          <div className="py-3">
            <dt className="text-sm text-zinc-500">Rol</dt>
            <dd className="capitalize">{context.membership.role}</dd>
          </div>
          <div className="py-3">
            <dt className="text-sm text-zinc-500">Moneda predeterminada</dt>
            <dd>{household?.defaultCurrency}</dd>
          </div>
        </dl>
        {household && context.membership.role === "owner" && (
          <LowBufferSettings household={household} />
        )}
      </section>
    </main>
  );
}
