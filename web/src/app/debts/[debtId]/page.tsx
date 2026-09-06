import { notFound, redirect } from "next/navigation";
import { debtRepository } from "@/modules/debts/debt.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink } from "@/shared/ui/navigation";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    amount / 100,
  );
}

export default async function DebtDetailPage({
  params,
}: {
  params: Promise<{ debtId: string }>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const { debtId } = await params;
  const detail = await debtRepository.findDetail(
    context.membership.householdId,
    debtId,
  );
  if (!detail) notFound();
  const { debt, audit } = detail;
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
        <p className="mt-6 rounded bg-zinc-50 p-3 text-sm text-zinc-600">
          Aún no hay pagos ni equivalencia en UYU: ambos se añadirán en los
          próximos cortes del Paso 6.
        </p>
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
