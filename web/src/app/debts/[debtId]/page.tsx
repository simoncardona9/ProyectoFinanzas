import { notFound, redirect } from "next/navigation";
import { debtRepository } from "@/modules/debts/debt.repository";
import { getDebtExposure } from "@/modules/debts/debt-exposure.service";
import { debtExposureQuerySchema } from "@/modules/debts/debt.schemas";
import { exchangeRateRepository } from "@/modules/exchange-rates/exchange-rate.repository";
import { structureRepository } from "@/modules/structure/structure.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink } from "@/shared/ui/navigation";
import { DebtPaymentForm } from "./debt-payment-form";
import { DebtExposure } from "./debt-exposure";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    amount / 100,
  );
}

export default async function DebtDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ debtId: string }>;
  searchParams: Promise<{ exchangeRateId?: string }>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const [{ debtId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const exchangeRateInput = debtExposureQuerySchema.safeParse(rawSearchParams);
  const exchangeRateId = exchangeRateInput.success
    ? exchangeRateInput.data.exchangeRateId
    : undefined;
  const [detail, accountList] = await Promise.all([
    debtRepository.findDetail(context.membership.householdId, debtId),
    structureRepository.listAccounts(context.membership.householdId),
  ]);
  if (!detail) notFound();
  const { debt, audit } = detail;
  const [rates, exposure] = await Promise.all([
    exchangeRateRepository.list(context.membership.householdId, {
      baseCurrency: "USD",
      quoteCurrency: "UYU",
      movement: "buy_usd",
    }),
    getDebtExposure(context.membership.householdId, debt, exchangeRateId),
  ]);
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <BackLink href="/debts">Volver a deudas</BackLink>
        <p className="mt-5 text-sm font-semibold text-emerald-700">
          Deuda en moneda original
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold">{debt.description}</h1>
          <strong className="text-xl">
            {money(debt.remainingAmountMinor, debt.currency)}
          </strong>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-zinc-500">Acreedor</dt>
            <dd>{debt.creditorName}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Estado</dt>
            <dd>{debt.status}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Saldo original</dt>
            <dd>{money(debt.originalAmountMinor, debt.currency)}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Fecha de origen</dt>
            <dd>{debt.incurredDate}</dd>
          </div>
        </dl>
        <DebtExposure
          debtId={debt.id}
          currency={debt.currency}
          rates={rates}
          selectedRateId={exchangeRateId}
          exposure={exposure}
        />
        {debt.status === "active" &&
          ["owner", "editor"].includes(context.membership.role) && (
            <DebtPaymentForm
              debtId={debt.id}
              currency={debt.currency}
              remainingAmountMinor={debt.remainingAmountMinor}
              accounts={accountList}
            />
          )}
        <p className="mt-6 rounded bg-zinc-50 p-3 text-sm text-zinc-600">
          Los pagos se registran en la misma moneda de la deuda. Si eliges una
          cotización, la equivalencia en UYU es informativa y no modifica el
          saldo original.
        </p>
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Pagos</h2>
          <ul className="mt-3 divide-y rounded-xl border">
            {detail.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap justify-between gap-2 p-3 text-sm"
              >
                <span>
                  {payment.paidDate} · {payment.accountName}
                  <small className="block text-zinc-500">
                    {payment.description}
                  </small>
                </span>
                <strong>{money(payment.amountMinor, debt.currency)}</strong>
              </li>
            ))}
            {!detail.payments.length && (
              <li className="p-3 text-sm text-zinc-500">
                Aún no hay pagos registrados.
              </li>
            )}
          </ul>
        </section>
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Historial de auditoría</h2>
          <ul className="mt-3 divide-y">
            {audit.map((event) => (
              <li key={event.id} className="py-2 text-sm">
                {event.action} · {event.createdAt.toLocaleString("es-UY")}
              </li>
            ))}
            {!audit.length && (
              <li className="py-2 text-sm text-zinc-500">
                No hay eventos registrados.
              </li>
            )}
          </ul>
        </section>
      </section>
    </main>
  );
}
