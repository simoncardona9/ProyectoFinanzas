import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/auth/request-auth";
import { getOverview } from "@/modules/dashboard/overview.service";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const query = await searchParams;
  const currentPeriod = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
  const validPeriod =
    typeof query.period === "string" &&
    /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(query.period);
  const period = validPeriod ? (query.period as string) : currentPeriod;
  const monthEnd = new Date(
    Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5)), 0),
  )
    .toISOString()
    .slice(0, 10);
  const categoriesHref = `/reports/categories-tax?from=${period}-01&to=${monthEnd}&groupBy=category`;
  const currency = query.currency === "USD" ? "USD" : "UYU";
  const data = await getOverview(
    context.membership.householdId,
    period,
    currency,
  );
  const money = (minor: number) =>
    new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat("es-UY", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat("es-UY", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(new Date(`${month}-01T12:00:00Z`));
  const summary = data.summary;
  const scale = Math.max(
    1,
    ...data.months.flatMap((month) => [month.incomeMinor, month.expenseMinor]),
  );
  const categoryTotal = data.categories.reduce(
    (total, row) => total + row.totalMinor,
    0,
  );
  const net = (summary?.collectedIncomeMinor ?? 0) - data.expensesMinor;
  const cards = [
    [
      "Efectivo disponible",
      summary?.currentCashMinor ?? 0,
      "Saldo actual · IVA protegido descontado",
      "available",
    ],
    [
      "Ingresos cobrados",
      summary?.collectedIncomeMinor ?? 0,
      "Ingresos pagados del mes seleccionado",
      "income",
    ],
    [
      "Egresos pagados",
      data.expensesMinor,
      "Gastos y pagos de deuda del mes",
      "expense",
    ],
    [
      "Efectivo proyectado",
      summary?.projectedCashMinor ?? 0,
      "Disponible + esperado − obligaciones del mes",
      "projected",
    ],
  ] as const;

  return (
    <main className="overview-page">
      <section className="overview-container">
        <div className="overview-heading">
          <div>
            <p className="overview-eyebrow">TU ECONOMÍA, EN PERSPECTIVA</p>
            <h1>Resumen general</h1>
            <p className="overview-muted">
              Una mirada a tu efectivo, tus gastos y lo que viene.
            </p>
          </div>
          <Link className="overview-action" href="/transactions">
            Ver movimientos ↗
          </Link>
        </div>
        <form className="overview-filters" action="/overview">
          <label>
            Mes
            <input
              name="period"
              type="month"
              min="1900-01"
              max="2199-12"
              defaultValue={period}
              required
            />
          </label>
          <label>
            <span id="overview-currency-label">Moneda</span>
            <select
              name="currency"
              aria-labelledby="overview-currency-label"
              defaultValue={currency}
            >
              <option value="UYU">UYU · Pesos uruguayos</option>
              <option value="USD">USD · Dólares</option>
            </select>
          </label>
          <button className="overview-action overview-primary">
            Actualizar resumen
          </button>
          <p className="overview-muted">Cada moneda se analiza por separado.</p>
        </form>
        {query.period !== undefined && !validPeriod && (
          <p role="status" className="overview-notice">
            El mes indicado no es válido. Se muestra el mes actual.
          </p>
        )}
        {!summary && (
          <div className="overview-notice">
            No hay saldos registrados en {currency}.{" "}
            <Link href="/structure">Configura tus cuentas</Link> para comenzar.
          </div>
        )}
        {(data.lowBuffer || (summary?.projectedCashMinor ?? 0) < 0) && (
          <p role="alert" className="overview-notice">
            Atención: la proyección en {currency}{" "}
            {data.lowBuffer
              ? "está por debajo del colchón mínimo del hogar"
              : "es negativa"}
            . <Link href="/dashboard">Revisar planificación →</Link>
          </p>
        )}
        <div className="overview-kpis">
          {cards.map(([label, value, caption, kind]) => (
            <article
              className={`overview-card overview-kpi ${kind}`}
              key={kind}
            >
              <p>
                {label}
                <span>{currency}</span>
              </p>
              <strong>{money(value)}</strong>
              <small>{caption}</small>
            </article>
          ))}
        </div>
        <div className="overview-chart-grid">
          <section className="overview-card">
            <div className="overview-card-heading">
              <div>
                <h2>Ingresos y egresos</h2>
                <p className="overview-muted">
                  Últimos 6 meses · movimientos pagados en {currency}
                </p>
              </div>
              <span className="overview-pill">{monthLabel(period)}</span>
            </div>
            <div className="overview-legend">
              <span>
                <i className="overview-income" />
                Ingresos
              </span>
              <span>
                <i className="overview-expense" />
                Egresos
              </span>
            </div>
            {data.months.every(
              (month) => month.incomeMinor === 0 && month.expenseMinor === 0,
            ) ? (
              <p className="overview-empty">
                Sin movimientos pagados en estos seis meses. Los gráficos se
                completarán cuando registres actividad.
              </p>
            ) : (
              <>
                <div className="overview-bars" aria-hidden="true">
                  {data.months.map((month) => (
                    <div className="overview-bar-column" key={month.month}>
                      <div className="overview-bar-pair">
                        <div
                          className="overview-income"
                          style={{
                            height: `${(month.incomeMinor / scale) * 100}%`,
                          }}
                          title={`Ingresos: ${money(month.incomeMinor)}`}
                        />
                        <div
                          className="overview-expense"
                          style={{
                            height: `${(month.expenseMinor / scale) * 100}%`,
                          }}
                          title={`Egresos: ${money(month.expenseMinor)}`}
                        />
                      </div>
                      <span>{monthLabel(month.month)}</span>
                    </div>
                  ))}
                </div>
                <details className="overview-chart-data">
                  <summary>Ver importes del gráfico</summary>
                  <table>
                    <caption className="sr-only">
                      Ingresos y egresos mensuales en {currency}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Mes</th>
                        <th scope="col">Ingresos</th>
                        <th scope="col">Egresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.months.map((month) => (
                        <tr key={month.month}>
                          <th scope="row">{monthLabel(month.month)}</th>
                          <td>{money(month.incomeMinor)}</td>
                          <td>{money(month.expenseMinor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </>
            )}
            <div className="overview-chart-footer">
              <span>
                Flujo neto del mes{" "}
                <strong
                  className={
                    net < 0 ? "overview-negative" : "overview-positive"
                  }
                >
                  {money(net)}
                </strong>
              </span>
              <Link href="/reports/accounts-cash-flow">Ver reporte →</Link>
            </div>
          </section>
          <section className="overview-card">
            <div className="overview-card-heading">
              <div>
                <h2>Gastos por categoría</h2>
                <p className="overview-muted">
                  {monthLabel(period)} · gastos pagados, sin pagos de deuda
                </p>
              </div>
            </div>
            {categoryTotal === 0 ? (
              <p className="overview-empty">
                No hay gastos por categoría en este mes y moneda.
              </p>
            ) : (
              <div className="overview-categories">
                {data.categories.slice(0, 6).map((row, index) => (
                  <div key={row.key}>
                    <div className="overview-category-label">
                      <Link href={categoriesHref}>{row.label}</Link>
                      <strong>{money(row.totalMinor)}</strong>
                    </div>
                    <div className="overview-track">
                      <span
                        style={{
                          width: `${(row.totalMinor / categoryTotal) * 100}%`,
                          background: [
                            "#788bff",
                            "#54cfb0",
                            "#b997f7",
                            "#f2bf72",
                            "#72b9ef",
                            "#ec8fba",
                          ][index],
                        }}
                      />
                    </div>
                    <p className="overview-category-percent">
                      {((row.totalMinor / categoryTotal) * 100).toFixed(1)}% del
                      gasto
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="overview-chart-footer">
              <span>
                Total <strong>{money(categoryTotal)}</strong>
              </span>
              <Link href={categoriesHref}>Ver categorías →</Link>
            </div>
            {data.categories.length > 6 && (
              <p className="overview-muted">
                Se muestran las 6 categorías principales de{" "}
                {data.categories.length}.
              </p>
            )}
          </section>
        </div>
        <div className="overview-lower-grid">
          <section className="overview-card">
            <div className="overview-card-heading">
              <div>
                <h2>Próximos pagos y vencidos</h2>
                <p className="overview-muted">
                  Desde hoy, {dateLabel(data.today)}, hasta{" "}
                  {dateLabel(data.horizonDate)} · {currency}
                </p>
              </div>
              <Link href="/obligations">Ver todos →</Link>
            </div>
            {data.obligations.length === 0 ? (
              <p className="overview-empty">
                No hay obligaciones vencidas ni pagos previstos para los
                próximos 30 días en {currency}.
              </p>
            ) : (
              <ul className="overview-payments">
                {data.obligations.map((row) => (
                  <li key={row.id}>
                    <div>
                      <Link href="/obligations">{row.description}</Link>
                      <small
                        className={
                          row.dueDate < data.today
                            ? "overview-negative"
                            : "overview-muted"
                        }
                      >
                        {dateLabel(row.dueDate)} ·{" "}
                        {row.dueDate < data.today ? "Vencido" : "Por vencer"}
                      </small>
                    </div>
                    <strong>{money(row.remainingAmountMinor)}</strong>
                  </li>
                ))}
              </ul>
            )}
            {data.obligationCount > 8 && (
              <p className="overview-muted">
                Se muestran 8 de {data.obligationCount} obligaciones, empezando
                por las más antiguas.
              </p>
            )}
          </section>
          <section className="overview-card overview-health">
            <h2>Lo que conviene revisar</h2>
            <p className="overview-muted">Datos actuales en {currency}</p>
            <div>
              <span>Pagos en los próximos 30 días</span>
              <strong>{money(data.upcomingTotalMinor)}</strong>
            </div>
            <div>
              <span>Obligaciones vencidas</span>
              <strong
                className={
                  data.overdueCount ? "overview-negative" : "overview-positive"
                }
              >
                {data.overdueCount}
              </strong>
            </div>
            <div>
              <span>IVA protegido actualmente</span>
              <strong>{money(summary?.protectedReserveMinor ?? 0)}</strong>
            </div>
            <Link className="overview-action" href="/dashboard">
              Abrir planificación mensual →
            </Link>
            <p className="overview-muted">
              El efectivo es el saldo actual; ingresos, egresos y proyección
              corresponden al mes elegido. Los pagos próximos se calculan desde
              hoy.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
