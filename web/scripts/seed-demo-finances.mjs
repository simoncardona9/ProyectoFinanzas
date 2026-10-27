import { createHash } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";
config({ path: ".env.local", quiet: true });
const email = process.env.DEMO_USER_EMAIL ?? "test.owner@finanzas.local";
const householdName = process.env.DEMO_HOUSEHOLD_NAME ?? "Hogar de prueba";
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error("Demo seeding requires a local database.");
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Montevideo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const period = today.slice(0, 7);
const date = (month, day) => `${month}-${String(day).padStart(2, "0")}`;
const shift = (days) => {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const months = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(`${period}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 5 + i);
  return d.toISOString().slice(0, 7);
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const counts = {};
try {
  await client.query("BEGIN");
  const target = await client.query(
    `SELECT u.id AS user_id,h.id AS household_id FROM users u JOIN memberships m ON m.user_id=u.id JOIN households h ON h.id=m.household_id WHERE u.email=$1 AND h.name=$2 AND m.role='owner' AND u.is_active=true`,
    [email, householdName],
  );
  if (target.rows.length !== 1)
    throw new Error("Expected exactly one matching test owner and household.");
  const { user_id: userId, household_id: householdId } = target.rows[0];
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    `finance-demo:${householdId}`,
  ]);
  const closed = new Set(
    (
      await client.query(
        "SELECT to_char(period_start,'YYYY-MM') AS period FROM financial_periods WHERE household_id=$1 AND status='closed'",
        [householdId],
      )
    ).rows.map((r) => r.period),
  );
  const idFor = (key) => {
    const h = createHash("sha256")
      .update(`finance-demo-v1:${householdId}:${key}`)
      .digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  };
  // Identifiers are internal constants; all record values are parameterized.
  async function insert(table, key, fields) {
    const id = idFor(`${table}:${key}`);
    const record = { id, household_id: householdId, ...fields };
    const columns = Object.keys(record);
    const result = await client.query(
      `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT DO NOTHING RETURNING id`,
      Object.values(record),
    );
    if (result.rowCount) {
      counts[table] = (counts[table] ?? 0) + 1;
      await client.query(
        "INSERT INTO audit_logs(household_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,'seed_demo',$3,$4,$5)",
        [
          householdId,
          userId,
          table,
          id,
          JSON.stringify({ fixture: "finance-demo-v1", period }),
        ],
      );
    }
    return id;
  }
  const firstOpen = months.find((m) => !closed.has(m));
  if (!firstOpen)
    throw new Error("All six months are closed; no demo records added.");
  const accounts = {};
  for (const [key, name, type, currency, balance] of [
    ["bank", "Cuenta sueldo", "bank", "UYU", 12000000],
    ["cash", "Efectivo del hogar", "cash", "UYU", 800000],
    ["usd", "Ahorros en dólares", "bank", "USD", 350000],
  ])
    accounts[key] = await insert("accounts", key, {
      name: `Demo · ${name}`,
      type,
      currency,
      opening_balance_minor: balance,
      opening_balance_date: date(firstOpen, 1),
    });
  const categories = {};
  for (const [key, name, classification] of [
    ["salary", "Sueldo", null],
    ["freelance", "Servicios profesionales", null],
    ["rent", "Vivienda", "fixed"],
    ["food", "Supermercado", "variable"],
    ["utilities", "Servicios del hogar", "fixed"],
    ["transport", "Transporte", "variable"],
    ["health", "Salud", "variable"],
    ["education", "Educación", "fixed"],
    ["leisure", "Salidas y ocio", "discretionary"],
    ["tech", "Tecnología", "discretionary"],
  ])
    categories[key] = await insert("categories", key, {
      name: `Demo · ${name}`,
      kind: classification ? "expense" : "income",
      default_classification: classification,
    });
  async function movement(
    key,
    day,
    type,
    amount,
    account,
    category,
    description,
    recurring = false,
  ) {
    if (closed.has(day.slice(0, 7)) || (day > today && type !== "income"))
      return;
    return insert("transactions", key, {
      date: day,
      type,
      status: day > today ? "planned" : "paid",
      amount_minor: amount,
      currency: account === "usd" ? "USD" : "UYU",
      account_id: accounts[account],
      category_id: category ? categories[category] : null,
      description: `Demo · ${description}`,
      is_recurring: recurring,
      is_one_off: !recurring,
    });
  }
  for (const [i, month] of months.entries()) {
    if (closed.has(month)) continue;
    await movement(
      `${month}:salary`,
      date(month, 3),
      "income",
      9500000 + i * 120000,
      "bank",
      "salary",
      "Sueldo mensual",
      true,
    );
    await movement(
      `${month}:freelance`,
      date(month, 12),
      "income",
      130000 + i * 8000,
      "usd",
      "freelance",
      "Proyecto de diseño",
    );
    for (const [key, day, amount, category, description] of [
      ["rent", 5, 2850000, "rent", "Alquiler"],
      ["school", 8, 790000, "education", "Cuota de educación"],
      ["power", 10, 295000 + i * 7000, "utilities", "Electricidad y agua"],
      ["internet", 11, 185000, "utilities", "Internet y telefonía"],
      ["bus", 7, 210000 + i * 5000, "transport", "Transporte mensual"],
      ["health", 15, 350000, "health", "Salud y farmacia"],
      ["dinner", 18, 145000 + i * 10000, "leisure", "Cena en familia"],
      ["outdoor", 24, 85000 + i * 4000, "leisure", "Salida de fin de semana"],
    ])
      await movement(
        `${month}:${key}`,
        date(month, day),
        "expense",
        amount,
        "bank",
        category,
        description,
        ["rent", "school", "internet"].includes(key),
      );
    for (const [week, day] of [4, 11, 18, 25].entries()) {
      await movement(
        `${month}:food:${week}`,
        date(month, day),
        "expense",
        320000 + ((i * 17 + week * 13) % 9) * 15000,
        "bank",
        "food",
        `Compra semanal ${week + 1}`,
      );
      await movement(
        `${month}:cash:${week}`,
        date(month, day + 1),
        "expense",
        18500 + week * 2500,
        "cash",
        "transport",
        "Transporte en efectivo",
      );
    }
    await movement(
      `${month}:subscription`,
      date(month, 15),
      "expense",
      2900,
      "usd",
      "tech",
      "Suscripción de herramientas",
      true,
    );
    if (i % 2 === 0)
      await movement(
        `${month}:equipment`,
        date(month, 20),
        "expense",
        18500 + i * 1000,
        "usd",
        "tech",
        "Equipamiento de trabajo",
      );
  }
  if (!closed.has(period)) {
    // A genuinely pending income, including when the fixture is run on month-end.
    await insert("transactions", `${period}:expected`, {
      date: date(period, 28),
      type: "income",
      status: "pending",
      amount_minor: 2200000,
      currency: "UYU",
      account_id: accounts.bank,
      category_id: categories.freelance,
      description: "Demo · Servicio adicional por cobrar",
      is_one_off: true,
    });
    for (const [
      key,
      offset,
      amount,
      category,
      classification,
      description,
      currency,
    ] of [
      [
        "overdue",
        -4,
        245000,
        "utilities",
        "fixed",
        "Factura de agua pendiente",
        "UYU",
      ],
      [
        "internet",
        2,
        185000,
        "utilities",
        "fixed",
        "Próxima factura de internet",
        "UYU",
      ],
      ["rent", 7, 2850000, "rent", "fixed", "Próximo alquiler", "UYU"],
      [
        "school",
        12,
        790000,
        "education",
        "fixed",
        "Próxima cuota de educación",
        "UYU",
      ],
      ["insurance", 20, 420000, "health", "fixed", "Seguro familiar", "UYU"],
      [
        "software",
        5,
        4900,
        "tech",
        "discretionary",
        "Renovación de software",
        "USD",
      ],
    ]) {
      const due = shift(offset);
      if (!closed.has(due.slice(0, 7)))
        await insert("obligations", `${period}:${key}`, {
          description: `Demo · ${description}`,
          original_amount_minor: amount,
          remaining_amount_minor: amount,
          currency,
          due_date: due,
          category_id: categories[category],
          classification,
          status: "pending",
        });
    }
    for (const [key, currency, original, payment, account] of [
      ["usd", "USD", 150000, 25000, "usd"],
      ["uyu", "UYU", 4800000, 1200000, "bank"],
    ]) {
      const debt = await insert("debts", `${period}:${key}`, {
        creditor_name: `Demo · ${key === "usd" ? "Financiera de equipos" : "Banco de prueba"}`,
        description: "Demo · Financiación del hogar",
        original_amount_minor: original,
        remaining_amount_minor: original - payment,
        currency,
        incurred_date: date(period, 1),
        status: "active",
      });
      const transaction = await movement(
        `${period}:debt:${key}`,
        today,
        "debt_payment",
        payment,
        account,
        null,
        "Cuota de financiación",
      );
      await client.query(
        "INSERT INTO debt_payments(id,debt_id,transaction_id,amount_minor) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [idFor(`debt-payment:${period}:${key}`), debt, transaction, payment],
      );
    }
    for (const [index, currency, amount, status] of [
      [1, "UYU", 3660000, "sent"],
      [2, "USD", 122000, "sent"],
      [3, "UYU", 1830000, "draft"],
    ]) {
      const net = Math.round((amount * 10000) / 12200);
      await insert("invoices", `${period}:${index}`, {
        client_name: `Demo · Cliente ${index}`,
        description: "Demo · Servicio profesional",
        service_date: today,
        due_date: shift(7 + index * 3),
        gross_amount_minor: amount,
        net_amount_minor: net,
        iva_rate_basis_points: 2200,
        iva_amount_minor: amount - net,
        currency,
        status,
        remaining_amount_minor: amount,
        sent_date: status === "sent" ? today : null,
      });
    }
    const market = await insert("grocery_markets", "market", {
      name: "Demo · Mercado del barrio",
      normalized_name: "demo mercado del barrio",
    });
    const plan = await insert("grocery_plans", period, {
      name: "Demo · Compra familiar del mes",
      target_period_start: date(period, 1),
      currency: "UYU",
      status: "active",
      preferred_market_id: market,
    });
    for (const [i, name, price, quantity, unit] of [
      [1, "Arroz", 8500, 3, "kg"],
      [2, "Leche", 6000, 12, "litro"],
      [3, "Manzanas", 9500, 4, "kg"],
      [4, "Huevos", 18000, 2, "docena"],
      [5, "Pasta", 7800, 4, "paquete"],
      [6, "Aceite", 12500, 2, "litro"],
    ]) {
      const product = await insert("grocery_products", String(i), {
        name: `Demo · ${name}`,
        normalized_name: `demo ${name.toLowerCase()}`,
      });
      const observation = await insert(
        "grocery_price_observations",
        `${period}:${i}`,
        {
          market_id: market,
          product_id: product,
          amount_minor: price,
          currency: "UYU",
          observed_date: today,
          note: "Precio ficticio para probar la interfaz.",
        },
      );
      await insert("grocery_plan_items", `${period}:${i}`, {
        grocery_plan_id: plan,
        product_id: product,
        description: `Demo · ${name}`,
        quantity,
        unit,
        planned_unit_price_minor: price,
        suggested_price_observation_id: observation,
      });
    }
  }
  await client.query("COMMIT");
  console.log(
    JSON.stringify(
      {
        email,
        household: householdName,
        period,
        months,
        skippedClosedMonths: months.filter((m) => closed.has(m)),
        inserted: counts,
        note: "Existing records preserved; reruns do not duplicate the monthly fixture.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
