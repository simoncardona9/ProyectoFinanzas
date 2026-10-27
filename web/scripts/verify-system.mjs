import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { config } from "dotenv";
import argon2 from "argon2";
import pg from "pg";
import * as XLSX from "xlsx";
import { chromium, expect } from "@playwright/test";

config({ path: ".env.local", quiet: true });
const base = new URL(
  process.env.ACCEPTANCE_BASE_URL ?? "http://127.0.0.1:3101",
);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const run = `System audit ${randomUUID()}`;
const artifacts = `/tmp/finance-system-audit-${Date.now()}`;
await mkdir(artifacts, { recursive: true, mode: 0o700 });
const results = [];
const users = [];
const households = [];
const credentials = [];
const cookies = [];
const ledger = [];
let browser;
let household,
  owner,
  other,
  uyu,
  usd,
  expense,
  income,
  paid,
  debt,
  invoice,
  reserve,
  plan,
  openObligation,
  draftInvoice,
  taxReport;
let requests = 0;

async function check(name, action) {
  try {
    await action();
    results.push({ name, status: "passed" });
    console.log(`PASS: ${name}`);
  } catch (error) {
    results.push({ name, status: "failed", error: error.message });
    console.log(`FAIL: ${name}: ${error.message}`);
  }
}
async function http(
  cookie,
  path,
  {
    method = "GET",
    body,
    status = method === "POST" ? 201 : 200,
    code,
    headers = {},
  } = {},
) {
  requests++;
  const form = body instanceof FormData;
  const response = await fetch(new URL(`/api/v1/${path}`, base), {
    method,
    headers: {
      Cookie: cookie ?? "",
      ...(!form ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: form ? body : JSON.stringify(body) } : {}),
  });
  assert.equal(
    response.status,
    status,
    `${method} ${path}: expected ${status}, got ${response.status}`,
  );
  const json = await response.json();
  if (code) assert.equal(json.error?.code, code, `${path}: error code`);
  return {
    data: json.data,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const get = async (path, cookie = owner) => (await http(cookie, path)).data;
const post = async (path, body, options = {}) =>
  (
    await http(options.cookie ?? owner, path, {
      method: "POST",
      body,
      ...options,
    })
  ).data;
const patch = async (path, body, options = {}) =>
  (
    await http(options.cookie ?? owner, path, {
      method: "PATCH",
      body,
      ...options,
    })
  ).data;
const reject = (path, body, code, status = 422, cookie = owner) =>
  post(path, body, { status, code, cookie });
const row = (rows, currency) => rows.find((r) => r.currency === currency);
const transaction = (values = {}) => ({
  date: "2026-10-15",
  type: "expense",
  status: "paid",
  amountMinor: 1000,
  currency: "UYU",
  accountId: uyu.id,
  categoryId: expense.id,
  description: "Synthetic system audit",
  ...values,
});
const invoiceValues = (values = {}) => ({
  clientName: "Synthetic client",
  description: "Synthetic service",
  serviceDate: "2026-10-15",
  dueDate: "2026-10-25",
  grossAmountMinor: 12200,
  ivaRateBasisPoints: 2200,
  currency: "UYU",
  ...values,
});
async function count(table, id = household) {
  return Number(
    (
      await pool.query(
        `SELECT count(*) AS count FROM ${table} WHERE household_id=$1`,
        [id],
      )
    ).rows[0].count,
  );
}
async function moneySnapshot() {
  const tables = [
    "accounts",
    "categories",
    "transactions",
    "obligations",
    "obligation_payments",
    "debts",
    "debt_payments",
    "invoices",
    "invoice_collections",
    "tax_reserves",
    "tax_reserve_settlements",
    "grocery_plans",
    "grocery_plan_items",
    "grocery_purchases",
    "grocery_receipt_lines",
    "audit_logs",
  ];
  const snapshot = {};
  for (const table of tables)
    snapshot[table] = (
      await pool.query(
        `SELECT coalesce(md5(string_agg(to_jsonb(t)::text, '' ORDER BY id)), '') AS digest FROM ${table} t WHERE ${["obligation_payments", "debt_payments", "invoice_collections", "tax_reserve_settlements"].includes(table) ? "transaction_id IN (SELECT id FROM transactions WHERE household_id=$1)" : "household_id=$1"} ${table === "audit_logs" ? "AND NOT (action='stage' AND entity_type='import_batch')" : ""}`,
        [household],
      )
    ).rows[0].digest;
  return snapshot;
}
async function addTransaction(values) {
  const result = await post("transactions", transaction(values));
  ledger.push(result.transaction);
  return result;
}
async function preview(bundle, key = randomUUID()) {
  return {
    key,
    data: await post("imports/json/preview", bundle, {
      status: 200,
      headers: { "Idempotency-Key": key },
    }),
  };
}
const commit = (batch, options = {}) =>
  post(
    `imports/${batch.data.importId}/commit`,
    { confirmation: "IMPORT" },
    { headers: { "Idempotency-Key": batch.key }, ...options },
  );
const bundle = (values = {}) => ({
  version: "finance-import/v1",
  source: { type: "json_paste", declaredPeriod: "2026-10" },
  ...values,
});

try {
  const health = await fetch(new URL("/api/health", base));
  assert.equal(health.status, 200);
  const password = randomUUID();
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  for (const role of ["primary", "isolated"]) {
    const id = (
      await pool.query("INSERT INTO households(name) VALUES($1) RETURNING id", [
        `${run} ${role}`,
      ])
    ).rows[0].id;
    households.push(id);
    const email = `${randomUUID()}@example.invalid`;
    const user = (
      await pool.query(
        "INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id",
        [email, hash],
      )
    ).rows[0].id;
    users.push(user);
    credentials.push({ email, password });
    await pool.query(
      "INSERT INTO memberships(user_id,household_id,role) VALUES($1,$2,'owner')",
      [user, id],
    );
    cookies.push(
      (
        await http(undefined, "auth/login", {
          method: "POST",
          body: { email, password },
          status: 200,
        })
      ).cookie,
    );
  }
  [household] = households;
  [owner, other] = cookies;

  await check(
    "Authentication, session cookies, settings, household switching and invitations",
    async () => {
      await http(undefined, "auth/me", {
        status: 401,
        code: "UNAUTHENTICATED",
      });
      await http(undefined, "auth/login", {
        method: "POST",
        body: { email: credentials[0].email, password: "wrong" },
        status: 401,
        code: "INVALID_CREDENTIALS",
      });
      assert.ok(owner.startsWith("finanzas_session="));
      const response = await fetch(new URL("/api/v1/auth/login", base), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials[0]),
      });
      assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
      assert.match(response.headers.get("set-cookie"), /SameSite=lax/i);
      const me = await get("auth/me");
      assert.ok(me);
      await patch("household", {
        name: `${run} primary`,
        locale: "es-UY",
        defaultCurrency: "UYU",
        lowBufferMinor: 200000,
        timeZone: "America/Montevideo",
      });
      assert.equal((await get("household")).lowBufferMinor, 200000);
      await reject(
        "auth/active-household",
        { householdId: households[1] },
        "HOUSEHOLD_ACCESS_DENIED",
        403,
      );
      await post("household/members", {
        email: credentials[1].email,
        role: "viewer",
      });
      assert.equal((await get("household/members")).length, 2);
      await post(
        "auth/active-household",
        { householdId: household },
        { cookie: other, status: 200 },
      );
      assert.equal((await get("household", other)).id, household);
      await post(
        "auth/active-household",
        { householdId: households[1] },
        { cookie: other, status: 200 },
      );
      await pool.query(
        "DELETE FROM memberships WHERE user_id=$1 AND household_id=$2",
        [users[1], household],
      );
    },
  );

  await check(
    "Accounts/categories create, hierarchy, edit, archive, reactivate and category seed",
    async () => {
      const seeded = await post("categories/seed", {}, { status: 201 });
      assert.ok(seeded.length > 0);
      const seededAgain = await post("categories/seed", {}, { status: 201 });
      assert.equal(seededAgain.length, seeded.length);
      income = await post("categories", {
        name: "Audit income",
        kind: "income",
      });
      const parent = await post("categories", {
        name: "Audit expenses",
        kind: "expense",
        defaultClassification: "variable",
      });
      expense = await post("categories", {
        name: "Audit grocery expense",
        kind: "expense",
        parentId: parent.id,
        defaultClassification: "variable",
      });
      await patch(`categories/${expense.id}`, {
        name: "Audit grocery expense updated",
      });
      expense.name = "Audit grocery expense updated";
      const archived = await post("categories", {
        name: "Audit archived expense",
        kind: "expense",
        defaultClassification: "fixed",
      });
      await post(`categories/${archived.id}/archive`, {}, { status: 200 });
      await reject(
        "categories",
        { name: "Invalid parent kind", kind: "income", parentId: parent.id },
        "INVALID_PARENT_CATEGORY",
      );
      uyu = await post("accounts", {
        name: "Audit cash UYU",
        type: "cash",
        currency: "UYU",
        openingBalanceMinor: 100000,
        openingBalanceDate: "2026-10-01",
      });
      usd = await post("accounts", {
        name: "Audit bank USD",
        type: "bank",
        currency: "USD",
        openingBalanceMinor: 50000,
        openingBalanceDate: "2026-10-01",
      });
      await patch(`accounts/${usd.id}`, { name: "Audit bank USD updated" });
      usd.name = "Audit bank USD updated";
      for (const type of ["card", "loan", "reserve_envelope"]) {
        const account = await post("accounts", {
          name: `Audit ${type}`,
          type,
          currency: "UYU",
          openingBalanceMinor: 0,
          openingBalanceDate: "2026-10-01",
        });
        await post(`accounts/${account.id}/archive`, {}, { status: 200 });
        assert.equal(
          (await get("accounts?active=false")).some((a) => a.id === account.id),
          true,
        );
        await post(`accounts/${account.id}/activate`, {}, { status: 200 });
        await post(`accounts/${account.id}/archive`, {}, { status: 200 });
      }
    },
  );

  await check(
    "Paid UYU/USD transactions, flags, filters, corrections, voids and balances",
    async () => {
      await addTransaction({
        type: "income",
        amountMinor: 10000,
        categoryId: income.id,
        isOneOff: true,
      });
      await addTransaction({
        type: "income",
        amountMinor: 3000,
        currency: "USD",
        accountId: usd.id,
        categoryId: income.id,
        isRecurring: true,
      });
      paid = (await addTransaction({ amountMinor: 2500 })).transaction;
      await patch(`transactions/${paid.id}`, {
        ...transaction({ amountMinor: 1800 }),
        changeReason: "Synthetic correction",
      });
      paid.amountMinor = 1800;
      const voided = (await addTransaction({ amountMinor: 777 })).transaction;
      await post(
        `transactions/${voided.id}/void`,
        { reason: "Synthetic duplicate" },
        { status: 200 },
      );
      assert.equal(
        (await get(`transactions/${voided.id}`)).transaction.status,
        "cancelled",
      );
      const detail = await get(`transactions/${paid.id}`);
      assert.equal(detail.transaction.amountMinor, 1800);
      assert.ok(detail.audit.length >= 2);
      const filtered = await get(
        `transactions?currency=USD&type=income&limit=1&offset=0`,
      );
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].currency, "USD");
      await reject(
        "transactions",
        transaction({ amountMinor: 0 }),
        "VALIDATION_ERROR",
        400,
      );
      await reject(
        "transactions",
        transaction({ currency: "USD" }),
        "CURRENCY_MISMATCH",
      );
      await reject(
        "transactions",
        transaction({ categoryId: income.id }),
        "INVALID_CATEGORY",
      );
      await reject(
        "transactions",
        transaction({ isRecurring: true, isOneOff: true }),
        "VALIDATION_ERROR",
        400,
      );
      await post(
        "transactions",
        transaction({
          type: "income",
          categoryId: income.id,
          status: "pending",
          amountMinor: 5000,
        }),
      );
      const dashboard = await get("dashboard?period=2026-10");
      assert.equal(row(dashboard.currencies, "UYU").currentCashMinor, 108200);
      assert.equal(row(dashboard.currencies, "UYU").expectedIncomeMinor, 5000);
      assert.equal(row(dashboard.currencies, "UYU").oneOffIncomeMinor, 10000);
      assert.equal(row(dashboard.currencies, "USD").currentCashMinor, 53000);
      assert.equal(dashboard.alerts.length, 1);
    },
  );

  await check(
    "Obligations, partial/full payment, deferral, recurrence metadata and forecast",
    async () => {
      const values = {
        description: "Audit obligation",
        amountMinor: 6000,
        currency: "UYU",
        dueDate: "2026-10-20",
        categoryId: expense.id,
        classification: "fixed",
        recurrenceRule: "monthly",
      };
      const obligation = await post("obligations", values);
      const pay = (amountMinor, accountId = uyu.id) => ({
        amountMinor,
        accountId,
        paidDate: "2026-10-15",
      });
      await reject(
        `obligations/${obligation.id}/payments`,
        pay(7000),
        "PAYMENT_EXCEEDS_BALANCE",
      );
      await reject(
        `obligations/${obligation.id}/payments`,
        pay(1000, usd.id),
        "CURRENCY_MISMATCH",
      );
      assert.equal(
        (await post(`obligations/${obligation.id}/payments`, pay(2000)))
          .obligation.remainingAmountMinor,
        4000,
      );
      assert.equal(
        (await post(`obligations/${obligation.id}/payments`, pay(4000)))
          .obligation.status,
        "paid",
      );
      const deferred = await post("obligations", {
        ...values,
        amountMinor: 3000,
      });
      await reject(
        `obligations/${deferred.id}/defer`,
        { newDueDate: "2026-10-19", reason: "Invalid backwards deferral" },
        "INVALID_DUE_DATE",
      );
      assert.equal(
        (
          await post(
            `obligations/${deferred.id}/defer`,
            { newDueDate: "2026-11-20", reason: "Synthetic deferral" },
            { status: 200 },
          )
        ).status,
        "deferred",
      );
      openObligation = await post("obligations", {
        ...values,
        amountMinor: 4000,
      });
      const dashboard = await get("dashboard?period=2026-10");
      assert.equal(
        row(dashboard.currencies, "UYU").pendingObligationsMinor,
        4000,
      );
      assert.equal(row(dashboard.currencies, "UYU").projectedCashMinor, 103200);
      const forecast = await get("forecast?period=2026-11");
      assert.equal(
        row(forecast.currencies, "UYU").pendingObligationsMinor,
        3000,
      );
    },
  );

  await check(
    "USD debts, partial payments, explicit rates, exposure, currency and overpayment rejection",
    async () => {
      debt = await post("debts", {
        creditorName: "Synthetic creditor",
        description: "Synthetic USD debt",
        amountMinor: 20000,
        currency: "USD",
        incurredDate: "2026-10-10",
      });
      const payment = {
        amountMinor: 5000,
        accountId: usd.id,
        paidDate: "2026-10-15",
      };
      await reject(
        `debts/${debt.id}/payments`,
        { ...payment, accountId: uyu.id },
        "CURRENCY_MISMATCH",
      );
      await reject(
        `debts/${debt.id}/payments`,
        { ...payment, amountMinor: 20001 },
        "PAYMENT_EXCEEDS_BALANCE",
      );
      assert.equal(
        (await post(`debts/${debt.id}/payments`, payment)).debt
          .remainingAmountMinor,
        15000,
      );
      const rateValues = {
        baseCurrency: "USD",
        quoteCurrency: "UYU",
        rate: "42.75",
        effectiveDate: "2026-10-15",
        source: "Synthetic manual quote",
        kind: "confirmed",
        movement: "buy_usd",
      };
      const rate = await post("exchange-rates", rateValues);
      const reference = await post("exchange-rates", {
        ...rateValues,
        movement: "reference",
      });
      await post("exchange-rates", {
        ...rateValues,
        movement: "sell_usd",
        rate: "41.50",
      });
      await reject(
        "exchange-rates",
        { ...rateValues, rate: "0" },
        "VALIDATION_ERROR",
        400,
      );
      await reject(
        "exchange-rates",
        rateValues,
        "DUPLICATE_EXCHANGE_RATE",
        409,
      );
      assert.equal(
        (await get("reports/debts")).uyuEquivalentExposureMinor,
        null,
      );
      const report = await get(`reports/debts?exchangeRateId=${rate.id}`);
      assert.equal(report.uyuEquivalentExposureMinor, 641250);
      assert.equal(report.totalsByOriginalCurrency.USD.paidAmountMinor, 5000);
      assert.equal(
        (await get(`debts/${debt.id}?exchangeRateId=${rate.id}`)).debt
          .remainingAmountMinor,
        15000,
      );
      await http(owner, `reports/debts?exchangeRateId=${reference.id}`, {
        status: 422,
        code: "INVALID_EXCHANGE_RATE",
      });
    },
  );

  await check(
    "Invoices, IVA rounding, send/cancel, partial/full collection and tax settlement",
    async () => {
      invoice = await post("invoices", invoiceValues());
      assert.equal(invoice.netAmountMinor, 10000);
      assert.equal(invoice.ivaAmountMinor, 2200);
      await reject(
        `invoices/${invoice.id}/payments`,
        { amountMinor: 1, accountId: uyu.id, paidDate: "2026-10-15" },
        "INVALID_STATUS_TRANSITION",
      );
      await post(
        `invoices/${invoice.id}/send`,
        { sentDate: "2026-10-15" },
        { status: 200 },
      );
      await reject(
        `invoices/${invoice.id}/payments`,
        { amountMinor: 12201, accountId: uyu.id, paidDate: "2026-10-15" },
        "COLLECTION_EXCEEDS_BALANCE",
      );
      await reject(
        `invoices/${invoice.id}/payments`,
        { amountMinor: 6100, accountId: usd.id, paidDate: "2026-10-15" },
        "CURRENCY_MISMATCH",
      );
      const first = await post(`invoices/${invoice.id}/payments`, {
        amountMinor: 6100,
        accountId: uyu.id,
        paidDate: "2026-10-15",
      });
      reserve = first.reserve;
      assert.equal(reserve.originalAmountMinor, 1100);
      assert.equal(first.invoice.status, "partially_collected");
      await reject(
        `invoices/${invoice.id}/cancel`,
        { reason: "Cannot cancel collected invoice" },
        "INVALID_STATUS_TRANSITION",
      );
      const last = await post(`invoices/${invoice.id}/payments`, {
        amountMinor: 6100,
        accountId: uyu.id,
        paidDate: "2026-10-16",
      });
      assert.equal(last.invoice.status, "collected");
      assert.equal(last.reserve.originalAmountMinor, 1100);
      await reject(
        `tax-reserves/${reserve.id}/settle`,
        {
          amountMinor: 1101,
          accountId: uyu.id,
          paidDate: "2026-10-16",
          reference: "Synthetic tax payment",
        },
        "SETTLEMENT_EXCEEDS_BALANCE",
      );
      assert.equal(
        (
          await post(`tax-reserves/${reserve.id}/settle`, {
            amountMinor: 500,
            accountId: uyu.id,
            paidDate: "2026-10-16",
            reference: "Synthetic tax payment",
          })
        ).reserve.remainingAmountMinor,
        600,
      );
      const cancel = await post(
        "invoices",
        invoiceValues({ grossAmountMinor: 1220 }),
      );
      assert.equal(
        (
          await post(
            `invoices/${cancel.id}/cancel`,
            { reason: "Synthetic cancellation" },
            { status: 200 },
          )
        ).status,
        "cancelled",
      );
      draftInvoice = await post(
        "invoices",
        invoiceValues({ grossAmountMinor: 2440 }),
      );
      const dashboard = await get("dashboard?period=2026-10");
      assert.equal(
        row(dashboard.currencies, "UYU").protectedReserveMinor,
        1700,
      );
      assert.equal(row(dashboard.currencies, "UYU").currentCashMinor, 112200);
      assert.equal(row(dashboard.currencies, "UYU").projectedCashMinor, 113200);
    },
  );

  await check(
    "Private grocery plans, snapshot estimates, receipts, actuals and duplicate links",
    async () => {
      const market = await post("groceries/markets", {
        name: "Audit private market",
      });
      const product = await post("groceries/products", {
        name: "Audit private product",
      });
      const price = await post("groceries/price-observations", {
        marketId: market.id,
        productId: product.id,
        amountMinor: 1000,
        currency: "UYU",
        observedDate: "2026-10-15",
        note: "Synthetic private note",
      });
      const before = await get("dashboard?period=2026-10");
      plan = await post("grocery-plans", {
        period: "2026-10",
        name: "Audit grocery plan",
        currency: "UYU",
        preferredMarketId: market.id,
      });
      await patch(`grocery-plans/${plan.id}`, { status: "active" });
      const item = await post(`grocery-plans/${plan.id}/items`, {
        productId: product.id,
        quantity: 2.5,
        unit: "kg",
        suggestedPriceObservationId: price.id,
      });
      await post(`grocery-plans/${plan.id}/items`, {
        description: "Manual price item",
        manualUnitPriceMinor: 500,
      });
      assert.equal(
        (await get(`grocery-plans/${plan.id}`)).estimatedTotalMinor,
        3000,
      );
      assert.deepEqual(await get("dashboard?period=2026-10"), before);
      const expenseTx = (await addTransaction({ amountMinor: 3200 }))
        .transaction;
      await reject(
        `grocery-plans/${plan.id}/purchases`,
        {
          transactionId: expenseTx.id,
          receiptLines: [
            {
              groceryPlanItemId: item.id,
              description: "Bad receipt",
              totalMinor: 3000,
            },
          ],
        },
        "RECEIPT_TOTAL_MISMATCH",
      );
      await post(`grocery-plans/${plan.id}/purchases`, {
        transactionId: expenseTx.id,
        receiptLines: [
          {
            groceryPlanItemId: item.id,
            description: "Synthetic receipt",
            totalMinor: 3200,
          },
        ],
      });
      const actual = await get(`grocery-plans/${plan.id}`);
      assert.equal(actual.actualTotalMinor, 3200);
      assert.equal(actual.differenceMinor, 200);
      await reject(
        `grocery-plans/${plan.id}/purchases`,
        { transactionId: expenseTx.id },
        "GROCERY_TRANSACTION_ALREADY_LINKED",
        409,
      );
    },
  );

  await check(
    "JSON import staging, mixed/historical links, commit, retry and invalid rollback",
    async () => {
      const payload = bundle({
        categories: [
          {
            name: "Imported parent",
            kind: "expense",
            defaultClassification: "fixed",
          },
          {
            name: "Imported child",
            kind: "expense",
            defaultClassification: "fixed",
            parent: "Imported parent",
          },
        ],
        accounts: [
          {
            name: "Imported cash",
            type: "cash",
            currency: "UYU",
            openingBalanceMinor: 10000,
            openingBalanceDate: "2026-10-01",
          },
        ],
        transactions: [
          {
            date: "2026-10-17",
            type: "expense",
            amountMinor: 100,
            currency: "UYU",
            account: "Imported cash",
            category: "Imported child",
            description: "Imported expense",
          },
        ],
        obligations: [
          {
            description: "Imported obligation",
            amountMinor: 100,
            currency: "UYU",
            dueDate: "2026-10-25",
            category: "Imported child",
            classification: "fixed",
          },
        ],
        expectedIncome: [
          {
            date: "2026-10-25",
            amountMinor: 200,
            currency: "UYU",
            account: uyu.name,
            category: income.name,
            description: "Imported expected income",
          },
        ],
        debts: [
          {
            reference: "import-debt",
            creditorName: "Imported creditor",
            description: "Imported debt",
            amountMinor: 1000,
            currency: "UYU",
            incurredDate: "2026-10-17",
          },
        ],
        debtPayments: [
          {
            debt: "import-debt",
            amountMinor: 200,
            account: "Imported cash",
            paidDate: "2026-10-17",
          },
        ],
        invoices: [
          {
            reference: "import-invoice",
            clientName: "Imported client",
            description: "Imported invoice",
            serviceDate: "2026-10-17",
            dueDate: "2026-10-25",
            grossAmountMinor: 1220,
            ivaRateBasisPoints: 2200,
            currency: "UYU",
            sentDate: "2026-10-17",
          },
        ],
        invoiceCollections: [
          {
            reference: "import-collection",
            invoice: "import-invoice",
            amountMinor: 1220,
            account: "Imported cash",
            paidDate: "2026-10-17",
          },
        ],
        ivaReserves: [{ collection: "import-collection", amountMinor: 220 }],
        exchangeRates: [
          {
            baseCurrency: "USD",
            quoteCurrency: "UYU",
            rate: "43",
            effectiveDate: "2026-10-17",
            source: "Imported rate",
            kind: "planning",
            movement: "buy_usd",
          },
        ],
      });
      const before = await moneySnapshot();
      const batch = await preview(payload);
      assert.equal(batch.data.errors, 0);
      assert.deepEqual(await moneySnapshot(), before);
      assert.equal(
        (await preview(payload, batch.key)).data.importId,
        batch.data.importId,
      );
      await post(
        "imports/json/preview",
        { ...payload, accounts: [] },
        {
          status: 409,
          code: "IDEMPOTENCY_KEY_REUSED",
          headers: { "Idempotency-Key": batch.key },
        },
      );
      await commit(batch);
      const after = await moneySnapshot();
      await commit(batch);
      assert.deepEqual(await moneySnapshot(), after);
      const invalid = await preview(
        bundle({
          transactions: [
            {
              date: "2026-10-17",
              type: "expense",
              amountMinor: 100,
              currency: "UYU",
              account: "Missing account",
              category: expense.name,
              description: "Invalid staged transaction",
            },
          ],
        }),
      );
      assert.ok(invalid.data.errors > 0);
      const invalidBefore = await moneySnapshot();
      await commit(invalid, { status: 422, code: "IMPORT_HAS_ERRORS" });
      assert.deepEqual(await moneySnapshot(), invalidBefore);
      const august = await preview({
        ...payload,
        source: { type: "json_paste", declaredPeriod: "2026-08" },
        accounts: [],
      });
      await commit(august, { status: 422 });
    },
  );

  await check(
    "CSV/XLSX/XLSM file conversion, provenance, formulas and hidden rows",
    async () => {
      const headers = [
        "Fecha",
        "Tipo",
        "Monto",
        "Moneda",
        "Cuenta",
        "Categoría",
        "Descripción",
      ];
      const values = [
        "18/10/2026",
        "Gasto",
        "125,50",
        "UYU",
        uyu.name,
        expense.name,
        "Synthetic uploaded expense",
      ];
      async function upload(name, bytes, status = 200) {
        const form = new FormData();
        form.set("file", new File([bytes], name));
        form.set("declaredPeriod", "2026-10");
        const key = randomUUID();
        const data = (
          await http(owner, "imports/file/preview", {
            method: "POST",
            body: form,
            status,
            headers: { "Idempotency-Key": key },
          })
        ).data;
        return { ...data, key };
      }
      const before = await moneySnapshot();
      const csv = await upload(
        "audit.csv",
        [headers.join(";"), values.join(";"), ""].join("\n"),
      );
      assert.ok(csv);
      assert.equal(csv.preview.errors, 0);
      assert.deepEqual(await moneySnapshot(), before);
      for (const extension of ["xlsx", "xlsm"]) {
        const sheet = XLSX.utils.aoa_to_sheet([headers, values]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Caja");
        const data = await upload(
          `audit.${extension}`,
          XLSX.write(workbook, { type: "buffer", bookType: extension }),
        );
        assert.ok(data);
      }
      const formulaSheet = XLSX.utils.aoa_to_sheet([headers, values]);
      formulaSheet.C2 = { t: "n", f: "100+25", v: 125 };
      const formulaWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(formulaWorkbook, formulaSheet, "Caja");
      await upload(
        "formula.xlsx",
        XLSX.write(formulaWorkbook, { type: "buffer", bookType: "xlsx" }),
        422,
      );
      const hiddenSheet = XLSX.utils.aoa_to_sheet([headers, values]);
      hiddenSheet["!rows"] = [{}, { hidden: true }];
      const hiddenWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(hiddenWorkbook, hiddenSheet, "Caja");
      const hidden = await upload(
        "hidden.xlsx",
        XLSX.write(hiddenWorkbook, { type: "buffer", bookType: "xlsx" }),
        200,
      );
      assert.ok(
        hidden.conversion.issues.some(
          (issue) =>
            issue.severity === "warning" && /ocult/i.test(issue.message),
        ),
      );
      await upload("unsupported.txt", "not an import", 400);
      assert.deepEqual(await moneySnapshot(), before);
      const transactionCount = await count("transactions");
      await commit({ key: csv.key, data: csv.preview });
      assert.equal(await count("transactions"), transactionCount + 1);
    },
  );

  await check(
    "Monthly close/reopen and rejection of every existing dated financial writer",
    async () => {
      const collectionGuard = await post(
        "invoices",
        invoiceValues({ grossAmountMinor: 1220 }),
      );
      await post(
        `invoices/${collectionGuard.id}/send`,
        { sentDate: "2026-10-15" },
        { status: 200 },
      );
      await post(
        "financial-periods/close",
        { period: "2026-10" },
        { status: 200 },
      );
      assert.equal(
        (await get("financial-periods?period=2026-10")).status,
        "closed",
      );
      await reject(
        "financial-periods/close",
        { period: "2026-10" },
        "PERIOD_ALREADY_CLOSED",
        409,
      );
      const before = await moneySnapshot();
      const cases = [
        [
          `invoices/${collectionGuard.id}/payments`,
          { amountMinor: 1, accountId: uyu.id, paidDate: "2026-10-20" },
        ],
        ["transactions", transaction()],
        [
          "transactions",
          transaction({
            type: "income",
            categoryId: income.id,
            status: "planned",
          }),
        ],
        [`transactions/${paid.id}/void`, { reason: "Closed-period guard" }],
        [
          "obligations",
          {
            description: "Blocked obligation",
            amountMinor: 1,
            currency: "UYU",
            dueDate: "2026-10-25",
            categoryId: expense.id,
            classification: "fixed",
          },
        ],
        [
          `obligations/${openObligation.id}/payments`,
          { amountMinor: 1, accountId: uyu.id, paidDate: "2026-10-20" },
        ],
        [
          `obligations/${openObligation.id}/defer`,
          { newDueDate: "2026-11-25", reason: "Blocked old period" },
        ],
        [
          "debts",
          {
            creditorName: "Blocked creditor",
            description: "Blocked debt",
            amountMinor: 1,
            currency: "UYU",
            incurredDate: "2026-10-20",
          },
        ],
        [
          `debts/${debt.id}/payments`,
          { amountMinor: 1, accountId: usd.id, paidDate: "2026-10-20" },
        ],
        ["invoices", invoiceValues()],
        [`invoices/${draftInvoice.id}/send`, { sentDate: "2026-10-20" }],
        [
          `invoices/${draftInvoice.id}/cancel`,
          { reason: "Blocked service period" },
        ],
        [
          `tax-reserves/${reserve.id}/settle`,
          {
            amountMinor: 1,
            accountId: uyu.id,
            paidDate: "2026-10-20",
            reference: "Blocked settlement",
          },
        ],
      ];
      for (const [path, body] of cases)
        await reject(path, body, "CLOSED_PERIOD");
      await patch(
        `transactions/${paid.id}`,
        {
          ...transaction({ amountMinor: 1800 }),
          changeReason: "Blocked correction",
        },
        { status: 422, code: "CLOSED_PERIOD" },
      );
      assert.deepEqual(await moneySnapshot(), before);
      const staged = await preview(
        bundle({
          transactions: [
            {
              date: "2026-10-17",
              type: "expense",
              amountMinor: 100,
              currency: "UYU",
              account: uyu.name,
              category: expense.name,
              description: "Blocked import",
            },
          ],
        }),
      );
      await commit(staged, { status: 422, code: "CLOSED_PERIOD" });
      await reject(
        "financial-periods/reopen",
        { period: "2026-10", reason: "" },
        "VALIDATION_ERROR",
        400,
      );
      await post(
        "financial-periods/reopen",
        { period: "2026-10", reason: "Synthetic audited reopening" },
        { status: 200 },
      );
      assert.equal(
        (await get("financial-periods?period=2026-10")).status,
        "open",
      );
    },
  );

  await check(
    "Account/category/tax/debt reports, independent ledger reconciliation and CSV export",
    async () => {
      const range = "from=2026-10-01&to=2026-10-31";
      const report = await get(`reports/accounts-cash-flow?${range}`);
      for (const account of [uyu, usd]) {
        const expectedBalance = (
          await pool.query(
            "SELECT a.opening_balance_minor + coalesce(sum(CASE WHEN t.status='paid' AND t.type='income' THEN t.amount_minor WHEN t.status='paid' AND t.type IN ('expense','debt_payment') THEN -t.amount_minor ELSE 0 END),0) AS balance FROM accounts a LEFT JOIN transactions t ON t.account_id=a.id AND t.household_id=a.household_id WHERE a.id=$1 GROUP BY a.id",
            [account.id],
          )
        ).rows[0].balance;
        assert.equal(
          report.accounts.find((a) => a.id === account.id).closingMinor,
          Number(expectedBalance),
        );
      }
      for (const groupBy of ["category", "month", "year"]) {
        const summary = await get(
          `reports/categories-tax?${range}&groupBy=${groupBy}`,
        );
        assert.equal(summary.categoryGrouping, groupBy);
        assert.ok(summary.taxTotalsByCurrency.UYU.reservedIvaMinor >= 2200);
        taxReport = summary;
      }
      const response = await fetch(
        new URL(`/api/v1/reports/export?${range}&format=csv`, base),
        { headers: { Cookie: owner } },
      );
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/csv/);
      const csv = await response.text();
      assert.ok(csv.includes("transaction:"));
      assert.ok(!csv.includes(credentials[1].email));
      assert.ok((await get("reports/audit?pageSize=100")).meta.total > 0);
      await http(
        owner,
        "reports/accounts-cash-flow?from=2026-10-31&to=2026-10-01",
        { status: 400 },
      );
    },
  );

  await check(
    "Household isolation across all financial reads and object writes",
    async () => {
      for (const path of [
        "accounts",
        "categories",
        "transactions",
        "obligations",
        "debts",
        "invoices",
        "exchange-rates",
        "grocery-plans",
        "groceries/markets",
        "groceries/products",
        "groceries/price-observations",
        "groceries/publications",
      ])
        assert.equal((await get(path, other)).length, 0, path);
      for (const path of [
        `transactions/${paid.id}`,
        `debts/${debt.id}`,
        `invoices/${invoice.id}`,
        `tax-reserves/${reserve.id}`,
        `grocery-plans/${plan.id}`,
      ])
        await http(other, path, { status: 404 });
      const before = await moneySnapshot();
      await reject(
        `debts/${debt.id}/payments`,
        { amountMinor: 1, accountId: usd.id, paidDate: "2026-10-20" },
        "NOT_FOUND",
        404,
        other,
      );
      await reject(
        `obligations/${openObligation.id}/payments`,
        { amountMinor: 1, accountId: uyu.id, paidDate: "2026-10-20" },
        "NOT_FOUND",
        404,
        other,
      );
      await reject(
        "groceries/publications",
        {
          sourceType: "market",
          sourceId: (await get("groceries/markets"))[0].id,
        },
        "GROCERY_PUBLICATION_SOURCE_NOT_FOUND",
        404,
        other,
      );
      assert.deepEqual(await moneySnapshot(), before);
    },
  );

  await check(
    "Account history cannot be relabelled into another currency or backdated into a closed month",
    async () => {
      try {
        await patch(
          `accounts/${uyu.id}`,
          { currency: "USD" },
          { status: 422, code: "ACCOUNT_CURRENCY_IMMUTABLE" },
        );
      } finally {
        await pool.query(
          "UPDATE accounts SET currency='UYU' WHERE id=$1 AND household_id=$2",
          [uyu.id, household],
        );
      }
      await post(
        "financial-periods/close",
        { period: "2026-09" },
        { status: 200 },
      );
      await reject(
        "accounts",
        {
          name: "Forbidden backdated opening",
          type: "cash",
          currency: "UYU",
          openingBalanceMinor: 123,
          openingBalanceDate: "2026-09-15",
        },
        "CLOSED_PERIOD",
      );
      const staged = await preview(
        bundle({
          accounts: [
            {
              name: "Forbidden imported opening",
              type: "cash",
              currency: "UYU",
              openingBalanceMinor: 123,
              openingBalanceDate: "2026-09-15",
            },
          ],
        }),
      );
      await commit(staged, { status: 422, code: "CLOSED_PERIOD" });
      const sentInClosedMonth = await preview(
        bundle({
          invoices: [
            {
              reference: "closed-send",
              ...invoiceValues({ serviceDate: "2026-10-15" }),
              sentDate: "2026-09-15",
            },
          ],
        }),
      );
      await commit(sentInClosedMonth, { status: 422, code: "CLOSED_PERIOD" });
    },
  );

  await check(
    "Viewer/accountant/editor authorization matrix and owner-only actions",
    async () => {
      for (const role of ["viewer", "accountant", "editor"]) {
        await pool.query(
          "INSERT INTO memberships(user_id,household_id,role) VALUES($1,$2,$3) ON CONFLICT(user_id,household_id) DO UPDATE SET role=EXCLUDED.role",
          [users[1], household, role],
        );
        await post(
          "auth/active-household",
          { householdId: household },
          { cookie: other, status: 200 },
        );
        const before = await moneySnapshot();
        await patch(
          "household",
          { name: "Forbidden settings" },
          { cookie: other, status: 403 },
        );
        await http(other, "household/members", { status: 403 });
        for (const path of [
          "financial-periods/close",
          "financial-periods/reopen",
          "household/reset-test-data",
          "household/members",
        ])
          await post(
            path,
            {
              period: "2026-10",
              reason: "Rejected role",
              confirmation: "RESET TEST DATA",
              email: credentials[0].email,
              role: "editor",
            },
            { cookie: other, status: 403 },
          );
        if (role !== "editor")
          for (const path of [
            "accounts",
            "categories",
            "transactions",
            "obligations",
            "debts",
            "invoices",
            "exchange-rates",
            "grocery-plans",
            "groceries/markets",
            "groceries/products",
            "groceries/price-observations",
            "groceries/publications",
            "groceries/shared-catalog",
            "imports/json/preview",
            `accounts/${uyu.id}/archive`,
            `accounts/${uyu.id}/activate`,
            `categories/${expense.id}/archive`,
            `transactions/${paid.id}/void`,
            `obligations/${openObligation.id}/payments`,
            `obligations/${openObligation.id}/defer`,
            `debts/${debt.id}/payments`,
            `invoices/${invoice.id}/send`,
            `invoices/${invoice.id}/cancel`,
            `invoices/${invoice.id}/payments`,
            `tax-reserves/${reserve.id}/settle`,
            `grocery-plans/${plan.id}/items`,
            `grocery-plans/${plan.id}/purchases`,
            `imports/${randomUUID()}/commit`,
          ])
            await post(path, {}, { cookie: other, status: 403 });
        if (role === "viewer" || role === "editor")
          await http(other, "reports/audit", { status: 403 });
        else await get("reports/audit", other);
        assert.deepEqual(await moneySnapshot(), before);
        if (role === "editor")
          await post(
            "groceries/products",
            { name: "Editor authorized synthetic product" },
            { cookie: other },
          );
      }
      await post(
        "auth/active-household",
        { householdId: households[1] },
        { cookie: other, status: 200 },
      );
      await pool.query(
        "DELETE FROM memberships WHERE user_id=$1 AND household_id=$2",
        [users[1], household],
      );
    },
  );

  await check(
    "Every implemented page, browser hydration, report links and desktop/mobile layouts",
    async () => {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.setDefaultTimeout(15000);
      await page.goto(new URL("/login", base).href);
      await page.getByLabel("Correo electrónico").fill(credentials[0].email);
      await page.getByLabel("Contraseña").fill(credentials[0].password);
      await page.getByRole("button", { name: "Ingresar", exact: true }).click();
      await expect(page).toHaveURL(/\/overview$/);
      await page.goto(
        new URL("/overview?period=2026-10&currency=UYU", base).href,
      );
      await expect(
        page.getByRole("heading", { name: "Resumen general", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".overview-kpi")).toHaveCount(4);
      const overviewDashboard = await get("dashboard?period=2026-10");
      const formatOverviewMoney = (amount, currency) =>
        new Intl.NumberFormat("es-UY", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(amount / 100);
      await expect(page.locator(".overview-kpi.available strong")).toHaveText(
        formatOverviewMoney(
          row(overviewDashboard.currencies, "UYU").currentCashMinor,
          "UYU",
        ),
      );
      await expect(page.locator(".overview-kpi.projected strong")).toHaveText(
        formatOverviewMoney(
          row(overviewDashboard.currencies, "UYU").projectedCashMinor,
          "UYU",
        ),
      );
      await page.getByLabel("Moneda", { exact: true }).selectOption("USD");
      await page.getByRole("button", { name: "Actualizar resumen" }).click();
      await expect(page).toHaveURL(/currency=USD/);
      await expect(page.locator(".overview-kpi.available strong")).toHaveText(
        formatOverviewMoney(
          row(overviewDashboard.currencies, "USD").currentCashMinor,
          "USD",
        ),
      );
      await page.goto(
        new URL("/overview?period=invalid&currency=UYU", base).href,
      );
      await expect(page.getByRole("status")).toContainText(
        "El mes indicado no es válido",
      );
      const routes = [
        "/",
        "/settings",
        "/overview?period=2026-10&currency=UYU",
        "/overview?period=2026-10&currency=USD",
        "/structure",
        "/transactions",
        `/transactions/${paid.id}`,
        "/obligations",
        "/dashboard?period=2026-10",
        "/debts",
        `/debts/${debt.id}`,
        "/debt-report",
        "/exchange-rates",
        "/invoices",
        "/imports",
        "/financial-periods",
        "/groceries",
        "/reports/accounts-cash-flow?from=2026-10-01&to=2026-10-31",
        "/reports/categories-tax?from=2026-10-01&to=2026-10-31",
        "/reports/audit-export",
        "/reports/export",
      ];
      const issues = [];
      for (const route of routes) {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const response = await page.goto(new URL(route, base).href);
        if (response.status() !== 200)
          issues.push(`${route}: HTTP ${response.status()}`);
        await expect(page.locator("main")).toBeVisible();
        // Wait for client-side fetches to settle before measuring populated forms.
        await page.waitForLoadState("networkidle");
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          if (route !== "/") {
            await expect(
              page.getByRole("button", { name: "Cerrar sesión", exact: true }),
            ).toBeInViewport();
          }
          const measured = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          if (measured.scroll > measured.width + 1) {
            issues.push(`${route}: overflow ${measured.scroll}/${width}`);
            await page.screenshot({
              path: `${artifacts}/${route.split("?")[0].replaceAll("/", "-") || "home"}-${width}.png`,
              fullPage: true,
            });
          }
          if (
            [
              "/overview?period=2026-10&currency=UYU",
              "/structure",
              "/invoices",
              "/debt-report",
              "/dashboard?period=2026-10",
            ].includes(route) &&
            width !== 390
          )
            await page.screenshot({
              path: `${artifacts}/${route.split("?")[0].replaceAll("/", "-")}-${width}.png`,
              fullPage: true,
            });
        }
      }
      for (const href of [
        ...new Set(taxReport?.taxSources.map((source) => source.href) ?? []),
      ]) {
        const response = await page.goto(new URL(href, base).href);
        if (response.status() !== 200)
          issues.push(`${href}: report source HTTP ${response.status()}`);
        else
          await expect(
            page.getByRole("heading", { name: "Detalle de factura" }),
          ).toBeVisible();
      }
      const isolatedContext = await browser.newContext();
      const isolatedPage = await isolatedContext.newPage();
      await isolatedContext.addCookies([
        {
          name: "finanzas_session",
          value: other.split("=")[1],
          url: base.origin,
        },
      ]);
      assert.equal(
        (
          await isolatedPage.goto(new URL(`/invoices/${invoice.id}`, base).href)
        ).status(),
        404,
      );
      await isolatedContext.close();
      await page.goto(new URL("/overview", base).href);
      await page
        .getByRole("button", { name: "Cerrar sesión", exact: true })
        .click();
      await expect(page).toHaveURL(/\/login$/);
      assert.equal(
        (
          await context.request.get(new URL("/api/v1/auth/me", base).href)
        ).status(),
        401,
      );
      await page.goto(new URL("/overview", base).href);
      await expect(page).toHaveURL(/\/login$/);
      assert.deepEqual(errors, [], "Uncaught browser errors");
      assert.deepEqual(issues, [], "Browser route/layout/source-link audit");
    },
  );

  await check(
    "Core browser user journeys: structure, transactions, obligations, debt, invoices/IVA, income, import and close/reopen",
    async () => {
      const { verifyBrowserJourneys } =
        await import("./verify-system-browser.mjs");
      await verifyBrowserJourneys(browser, base, credentials[0], {
        uyu,
        expense,
        income,
      });
    },
  );

  await check(
    "Concurrent financial payments cannot double-pay or leave partial records",
    async () => {
      async function race(path, body) {
        const responses = await Promise.all(
          [0, 1].map(() =>
            fetch(new URL(`/api/v1/${path}`, base), {
              method: "POST",
              headers: { Cookie: owner, "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
          ),
        );
        assert.equal(
          responses.filter((r) => r.status === 201).length,
          1,
          `${path}: exactly one payment may succeed`,
        );
        assert.ok(
          responses.every((r) => [201, 409, 422].includes(r.status)),
          `${path}: conflicts must be domain responses`,
        );
      }
      const raceDebt = await post("debts", {
        creditorName: "Concurrent creditor",
        description: "Concurrent USD debt",
        amountMinor: 1000,
        currency: "USD",
        incurredDate: "2026-10-20",
      });
      await race(`debts/${raceDebt.id}/payments`, {
        amountMinor: 1000,
        accountId: usd.id,
        paidDate: "2026-10-20",
      });
      assert.equal(
        (await get(`debts/${raceDebt.id}`)).debt.remainingAmountMinor,
        0,
      );
      const raceObligation = await post("obligations", {
        description: "Concurrent obligation",
        amountMinor: 1000,
        currency: "UYU",
        dueDate: "2026-10-20",
        categoryId: expense.id,
        classification: "fixed",
      });
      await race(`obligations/${raceObligation.id}/payments`, {
        amountMinor: 1000,
        accountId: uyu.id,
        paidDate: "2026-10-20",
      });
      const raceInvoice = await post(
        "invoices",
        invoiceValues({ grossAmountMinor: 1220 }),
      );
      await post(
        `invoices/${raceInvoice.id}/send`,
        { sentDate: "2026-10-20" },
        { status: 200 },
      );
      await race(`invoices/${raceInvoice.id}/payments`, {
        amountMinor: 1220,
        accountId: uyu.id,
        paidDate: "2026-10-20",
      });
      const detail = await get(`invoices/${raceInvoice.id}`);
      assert.equal(detail.invoice.remainingAmountMinor, 0);
      assert.equal(detail.collections.length, 1);
      const reserveId = detail.collections[0].reserveId;
      await race(`tax-reserves/${reserveId}/settle`, {
        amountMinor: 220,
        accountId: uyu.id,
        paidDate: "2026-10-20",
        reference: "Concurrent synthetic IVA settlement",
      });
      const settled = await get(`tax-reserves/${reserveId}`);
      assert.equal(settled.reserve.remainingAmountMinor, 0);
      assert.equal(settled.settlements.length, 1);
    },
  );

  await check(
    "Local PostgreSQL backup/restore with full-table checksums",
    async () => {
      const { verifyLocalBackup } = await import("./verify-local-backup.mjs");
      await verifyLocalBackup(pool, process.env.DATABASE_URL);
    },
  );

  await check("Logout invalidates server-side session", async () => {
    const session = (
      await http(undefined, "auth/login", {
        method: "POST",
        body: credentials[0],
        status: 200,
      })
    ).cookie;
    await post("auth/logout", {}, { cookie: session, status: 200 });
    await http(session, "auth/me", { status: 401 });
  });
} finally {
  if (browser) await browser.close();
  await check("Synthetic household cleanup", async () => {
    for (let i = 0; i < households.length; i++) {
      await pool.query(
        "UPDATE memberships SET role='owner' WHERE user_id=$1 AND household_id=$2",
        [users[i], households[i]],
      );
      if (!cookies[i])
        throw new Error(
          "Owner session absent: retain uniquely named audit household for scoped cleanup",
        );
      await post(
        "auth/active-household",
        { householdId: households[i] },
        { cookie: cookies[i], status: 200 },
      );
      await post(
        "household/reset-test-data",
        { confirmation: "RESET TEST DATA" },
        { cookie: cookies[i], status: 200 },
      );
      for (const table of [
        "accounts",
        "categories",
        "transactions",
        "obligations",
        "debts",
        "invoices",
        "tax_reserves",
        "grocery_plans",
        "import_batches",
        "audit_logs",
      ])
        assert.equal(await count(table, households[i]), 0);
    }
    await pool.query("DELETE FROM households WHERE id=ANY($1::uuid[])", [
      households,
    ]);
    await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [users]);
  });
  await pool.end();
  await writeFile(
    `${artifacts}/results.json`,
    JSON.stringify(
      { date: new Date().toISOString(), requests, results },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(`Audit evidence: ${artifacts}/results.json`);
}
if (results.some((r) => r.status !== "passed")) process.exitCode = 1;
