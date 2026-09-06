import { redirect } from "next/navigation";
import { getDebtReport } from "@/modules/debts/debt-report.service";
import { debtReportQuerySchema } from "@/modules/debts/debt.schemas";
import { exchangeRateRepository } from "@/modules/exchange-rates/exchange-rate.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink } from "@/shared/ui/navigation";
import { DebtReportView } from "./debt-report-view";

export default async function DebtReportPage({
  searchParams,
}: {
  searchParams: Promise<{ exchangeRateId?: string }>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const input = debtReportQuerySchema.safeParse(await searchParams);
  const exchangeRateId = input.success ? input.data.exchangeRateId : undefined;
  const [report, rates] = await Promise.all([
    getDebtReport(context.membership.householdId, exchangeRateId),
    exchangeRateRepository.list(context.membership.householdId, {
      baseCurrency: "USD",
      quoteCurrency: "UYU",
    }),
  ]);
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-5xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Finanzas Familiares
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Reporte de deudas</h1>
          </div>
          <BackLink href="/settings">Volver a configuración</BackLink>
        </div>
        <p className="mt-2 text-zinc-600">
          Revisa saldos y pagos en sus monedas originales. La exposición en UYU
          requiere una cotización explícita.
        </p>
        <DebtReportView
          report={report}
          rates={rates}
          selectedRateId={exchangeRateId}
        />
      </section>
    </main>
  );
}
