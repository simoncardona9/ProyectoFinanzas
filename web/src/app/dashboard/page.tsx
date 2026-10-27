import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink, FeatureNavigationCard } from "@/shared/ui/navigation";
import { DashboardSummary } from "./dashboard-summary";

export default async function DashboardPage() {
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }
  return (
    <main className="dashboard-page flex flex-1 justify-center p-6">
      <section className="w-full max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              TU RESUMEN FINANCIERO
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Panel mensual
            </h1>
          </div>
          <BackLink href="/settings">Volver a configuración</BackLink>
        </div>
        <p className="mt-2 text-zinc-600">
          Consulta el efectivo y la proyección mensual con importes trazables.
        </p>
        <div className="mt-4">
          <FeatureNavigationCard
            href="/imports"
            title="Importar ingresos esperados"
            description="Abrir el mismo asistente de revisión por lote."
          />
        </div>
        <DashboardSummary />
      </section>
    </main>
  );
}
