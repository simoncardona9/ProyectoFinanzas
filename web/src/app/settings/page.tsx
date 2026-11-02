import { redirect } from "next/navigation";
import { authRepository } from "@/modules/auth/auth.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { FeatureNavigationCard } from "@/shared/ui/navigation";
import { ViewModeSelect } from "@/shared/ui/finance-shell";
import { LowBufferSettings } from "./low-buffer-settings";
import { ResetTestData } from "./reset-test-data";

const basicLinks = [
  [
    "/overview",
    "Resumen general",
    "Ver el estado financiero, gráficos y próximos pagos.",
  ],
  [
    "/transactions",
    "Registro de movimientos",
    "Registrar y revisar ingresos y egresos pagados.",
  ],
  [
    "/structure",
    "Cuentas y categorías",
    "Crear y organizar la estructura financiera del hogar.",
  ],
  [
    "/obligations",
    "Obligaciones",
    "Planificar vencimientos y registrar pagos.",
  ],
] as const;

const advancedLinks = [
  [
    "/dashboard",
    "Panel mensual",
    "Revisar efectivo, ingresos esperados y proyección por moneda.",
  ],
  [
    "/invoices",
    "Facturas e IVA",
    "Gestionar facturas, cobros y reservas de IVA.",
  ],
  ["/debts", "Deudas", "Registrar deudas, pagos y saldos pendientes."],
  [
    "/groceries",
    "Compras",
    "Planificar compras y consultar catálogos y precios.",
  ],
  [
    "/exchange-rates",
    "Cotizaciones",
    "Registrar referencias UYU/USD fechadas.",
  ],
  [
    "/financial-periods",
    "Cierre mensual",
    "Consultar, cerrar o reabrir períodos según tu rol.",
  ],
  [
    "/imports",
    "Importación por lote",
    "Revisar JSON, CSV o Excel antes de importar.",
  ],
  [
    "/reports/accounts-cash-flow",
    "Flujo de efectivo",
    "Consultar saldos y movimientos por cuenta y moneda.",
  ],
  [
    "/reports/categories-tax",
    "Categorías e IVA",
    "Revisar egresos, facturación y liquidaciones.",
  ],
  [
    "/debt-report",
    "Reporte de deudas",
    "Consultar saldos y exposición con cotización explícita.",
  ],
] as const;

export default async function SettingsPage() {
  const canResetTestData = process.env.NODE_ENV !== "production";
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const household = await authRepository.getHousehold(
    context.membership.householdId,
  );
  const isAdvanced = context.user.viewMode === "advanced";
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <p className="text-sm font-semibold text-emerald-700">
          Finanzas Familiares
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Configuración del hogar</h1>
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <ViewModeSelect id="settings-view-mode" />
          <p className="mt-2 text-sm text-zinc-600">
            La vista básica muestra las tareas cotidianas. La avanzada agrega
            planificación, facturas, deudas, compras, importaciones y reportes.
            Tus datos y permisos son los mismos en ambas vistas.
          </p>
        </div>
        <nav aria-label="Secciones principales" className="mt-6 grid gap-3">
          {basicLinks.map(([href, title, description]) => (
            <FeatureNavigationCard
              key={href}
              href={href}
              title={title}
              description={description}
            />
          ))}
          {isAdvanced &&
            advancedLinks.map(([href, title, description]) => (
              <FeatureNavigationCard
                key={href}
                href={href}
                title={title}
                description={description}
              />
            ))}
          {isAdvanced &&
            ["owner", "accountant"].includes(context.membership.role) && (
              <FeatureNavigationCard
                href="/reports/audit-export"
                title="Auditoría y exportación"
                description="Revisar eventos del hogar y descargar registros financieros en CSV."
              />
            )}
          {isAdvanced && context.membership.role === "editor" && (
            <FeatureNavigationCard
              href="/reports/export"
              title="Exportar registros financieros"
              description="Descargar los registros del hogar en CSV para el rango elegido."
            />
          )}
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
          <>
            <LowBufferSettings household={household} />
            {canResetTestData && <ResetTestData />}
          </>
        )}
      </section>
    </main>
  );
}
