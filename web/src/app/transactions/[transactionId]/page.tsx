import { notFound, redirect } from "next/navigation";
import { transactionRepository } from "@/modules/transactions/transaction.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink } from "@/shared/ui/navigation";
import { TransactionActions } from "./transaction-actions";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function auditDescription(details: Record<string, unknown> | null) {
  const reason = details?.reason;
  return typeof reason === "string" ? `Motivo: ${reason}` : null;
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const { transactionId } = await params;
  const detail = await transactionRepository.findDetail(
    context.membership.householdId,
    transactionId,
  );
  if (!detail) notFound();
  const { transaction, audit } = detail;

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <BackLink href="/transactions">Volver al registro</BackLink>
        <p className="mt-5 text-sm font-semibold text-emerald-700">
          Movimiento pagado
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold">{transaction.description}</h1>
          <strong className="text-xl">
            {transaction.type === "expense" ? "−" : "+"}
            {formatMoney(transaction.amountMinor, transaction.currency)}
          </strong>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-zinc-500">Fecha</dt>
            <dd>{transaction.date}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Estado</dt>
            <dd>{transaction.status}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Cuenta</dt>
            <dd>{transaction.accountName}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Categoría</dt>
            <dd>{transaction.categoryName}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Recurrente</dt>
            <dd>{transaction.isRecurring ? "Sí" : "No"}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Único</dt>
            <dd>{transaction.isOneOff ? "Sí" : "No"}</dd>
          </div>
        </dl>
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Historial de auditoría</h2>
          <ul className="mt-3 divide-y">
            {audit.map((event) => (
              <li key={event.id} className="py-2 text-sm">
                <span>
                  {event.action} · {event.createdAt.toLocaleString("es-UY")}
                </span>
                {auditDescription(event.details) && (
                  <span className="block text-zinc-600">
                    {auditDescription(event.details)}
                  </span>
                )}
              </li>
            ))}
            {!audit.length && (
              <li className="py-2 text-sm text-zinc-500">
                No hay eventos registrados.
              </li>
            )}
          </ul>
        </section>
        <TransactionActions
          transaction={transaction}
          canEdit={["owner", "editor"].includes(context.membership.role)}
        />
      </section>
    </main>
  );
}
