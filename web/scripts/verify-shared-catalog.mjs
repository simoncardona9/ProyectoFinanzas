import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import argon2 from "argon2";
import pg from "pg";

// Run against a local development server; credentials stay in memory.
config({ path: ".env.local", quiet: true });
const base = new URL(
  process.env.ACCEPTANCE_BASE_URL ?? "http://127.0.0.1:3101",
);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const run = `Acceptance11 ${randomUUID()}`;
const households = [];
const users = [];
const cookies = [];
const credentials = [];
let browserReview;
let publicRows = [];

async function request(cookie, path, body, expected = body ? 201 : 200) {
  const response = await fetch(new URL(path, base), {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Cookie: cookie ?? "" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.status, expected, `${path}: HTTP ${response.status}`);
  const json = await response.json();
  return {
    data: json.data,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const api = async (cookie, suffix, body, status) =>
  (await request(cookie, `/api/v1/${suffix}`, body, status)).data;
const search = (cookie, query) =>
  api(cookie, `groceries/shared-catalog?query=${encodeURIComponent(query)}`);
async function baseline(cookie, household) {
  const counts = await pool.query(
    `SELECT (SELECT count(*) FROM transactions WHERE household_id=$1) AS transactions,
      (SELECT count(*) FROM grocery_plans WHERE household_id=$1) AS plans`,
    [household],
  );
  return {
    counts: counts.rows,
    accounts: await api(cookie, "accounts"),
    dashboard: await api(cookie, "dashboard?period=2026-09"),
  };
}

try {
  assert.deepEqual(await (await fetch(new URL("/api/health", base))).json(), {
    status: "ok",
  });
  await request(
    undefined,
    "/api/v1/groceries/shared-catalog?query=market",
    undefined,
    401,
  );
  const password = randomUUID();
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  for (const role of ["publisher", "adopter"]) {
    const household = (
      await pool.query(
        "INSERT INTO households (name) VALUES ($1) RETURNING id",
        [`${run} ${role}`],
      )
    ).rows[0].id;
    households.push(household);
    const email = `${randomUUID()}@example.invalid`;
    credentials.push({ email, password });
    const user = (
      await pool.query(
        "INSERT INTO users (email,password_hash) VALUES ($1,$2) RETURNING id",
        [email, hash],
      )
    ).rows[0].id;
    users.push(user);
    await pool.query(
      "INSERT INTO memberships (user_id,household_id,role) VALUES ($1,$2,'owner')",
      [user, household],
    );
    cookies.push(
      (await request(undefined, "/api/v1/auth/login", { email, password }, 200))
        .cookie,
    );
  }
  const [publisher, adopter] = cookies;
  if (process.argv.includes("--browser")) {
    const { openCatalogBrowserReview } =
      await import("./shared-catalog-browser.mjs");
    browserReview = await openCatalogBrowserReview(base, credentials);
  }
  const privateTransactions = [];
  const privatePlans = [];
  for (const cookie of cookies) {
    const category = await api(cookie, "categories", {
      name: "Acceptance private expense",
      kind: "expense",
      defaultClassification: "variable",
    });
    for (const currency of ["UYU", "USD"]) {
      const account = await api(cookie, "accounts", {
        name: `Acceptance ${currency}`,
        type: "cash",
        currency,
        openingBalanceMinor: 100000,
        openingBalanceDate: "2026-09-01",
      });
      const { transaction } = await api(cookie, "transactions", {
        date: "2026-09-28",
        type: "expense",
        status: "paid",
        amountMinor: 1000,
        currency,
        accountId: account.id,
        categoryId: category.id,
        description: "Private acceptance transaction",
      });
      privateTransactions.push(transaction);
    }
    privatePlans.push(
      await api(cookie, "grocery-plans", {
        period: "2026-09",
        name: "Private acceptance plan",
        currency: "UYU",
      }),
    );
  }
  await api(
    adopter,
    `transactions/${privateTransactions[0].id}`,
    undefined,
    404,
  );
  await api(
    publisher,
    `transactions/${privateTransactions[2].id}`,
    undefined,
    404,
  );
  await api(adopter, `grocery-plans/${privatePlans[0].id}`, undefined, 404);
  await api(publisher, `grocery-plans/${privatePlans[1].id}`, undefined, 404);
  const before = await Promise.all(
    cookies.map((cookie, i) => baseline(cookie, households[i])),
  );
  const markets = [];
  for (const name of [
    "Mercado Río Norte",
    "MERCADO-RIO NORTE",
    "Mercado Río Sur",
    "control privado no publicar",
  ]) {
    const fullName = `${run} ${name}`;
    if (browserReview) {
      await browserReview.createNamed("market", fullName);
      markets.push(
        (await api(publisher, "groceries/markets")).find(
          (m) => m.name === fullName,
        ),
      );
    } else
      markets.push(
        await api(publisher, "groceries/markets", { name: fullName }),
      );
  }
  const products = [];
  for (const name of ["Café Ámbar 500 g", "cafe ambar 500-g"]) {
    const fullName = `${run} ${name}`;
    if (browserReview) {
      await browserReview.createNamed("product", fullName);
      products.push(
        (await api(publisher, "groceries/products")).find(
          (p) => p.name === fullName,
        ),
      );
    } else
      products.push(
        await api(publisher, "groceries/products", { name: fullName }),
      );
  }
  if (browserReview)
    await browserReview.createPrice(markets[0].id, products[0].id);
  const price = browserReview
    ? (await api(publisher, "groceries/price-observations"))[0]
    : await api(publisher, "groceries/price-observations", {
        marketId: markets[0].id,
        productId: products[0].id,
        amountMinor: 32109,
        currency: "UYU",
        observedDate: "2026-09-28",
        note: "PRIVATE ACCEPTANCE NOTE",
      });
  const sources = [
    ...markets
      .slice(0, 3)
      .map(({ id }) => ({ sourceType: "market", sourceId: id })),
    ...products.map(({ id }) => ({ sourceType: "product", sourceId: id })),
    { sourceType: "price", sourceId: price.id },
  ];
  if (browserReview) await browserReview.publish(markets, products);
  for (const source of sources)
    await api(publisher, "groceries/publications", source);
  await api(publisher, "groceries/publications", sources[0]);
  assert.equal((await api(publisher, "groceries/publications")).length, 6);
  await api(adopter, "groceries/publications", sources[0], 404);
  await api(
    adopter,
    "groceries/price-observations",
    {
      marketId: markets[0].id,
      productId: products[0].id,
      amountMinor: 1,
      currency: "UYU",
      observedDate: "2026-09-28",
    },
    404,
  );
  const found = await search(adopter, run);
  assert.equal(found.markets.length, 4);
  assert.equal(found.products.length, 3);
  assert.equal(found.prices.length, 1);
  const north = found.markets.filter(
    (m) => m.name.endsWith("Norte") || m.name.endsWith("NORTE"),
  );
  assert.equal(north.length, 3);
  assert.ok(
    north.every((m) => m.possibleDuplicates.length === 2 && m.aliases.length),
  );
  assert.equal(
    found.markets.find((m) => m.name.endsWith("Sur")).possibleDuplicates.length,
    0,
  );
  assert.ok(found.products.every((p) => p.possibleDuplicates.length === 2));
  const normalized = await search(adopter, "MÉRCADO-RÍO");
  assert.ok(normalized.markets.some((m) => m.id === north[0].id));
  const privateControl = await search(
    adopter,
    `${run} control privado no publicar`,
  );
  assert.equal(
    privateControl.markets.length +
      privateControl.products.length +
      privateControl.prices.length,
    0,
  );
  const forbidden =
    /household|userId|sourceId|note|transaction|account|planId|purchase|receipt|quantity|budget/i;
  function inspect(value) {
    if (Array.isArray(value)) return value.forEach(inspect);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!forbidden.test(key), `Private field: ${key}`);
      inspect(child);
    }
  }
  inspect(found);
  const adoptions = [
    { sourceType: "market", publicSourceId: north[0].id },
    { sourceType: "product", publicSourceId: found.products[0].id },
    { sourceType: "price", publicSourceId: found.prices[0].id },
  ];
  if (browserReview) await browserReview.adopt(run, found, adoptions);
  for (const adoption of adoptions)
    await api(adopter, "groceries/shared-catalog", adoption);
  await Promise.all(
    Array.from({ length: 3 }, () =>
      api(adopter, "groceries/shared-catalog", adoptions[1]),
    ),
  );
  const copiedPrices = await api(adopter, "groceries/price-observations");
  assert.equal(copiedPrices.length, 1);
  assert.equal(copiedPrices[0].amountMinor, 32109);
  assert.ok(!copiedPrices[0].note);
  assert.equal((await api(adopter, "groceries/markets")).length, 2);
  assert.equal((await api(adopter, "groceries/products")).length, 2);
  const adopted = await search(adopter, run);
  assert.equal(
    [...adopted.markets, ...adopted.products, ...adopted.prices].filter(
      (r) => r.adopted,
    ).length,
    3,
  );
  const publisherView = await search(publisher, run);
  assert.ok(
    [
      ...publisherView.markets,
      ...publisherView.products,
      ...publisherView.prices,
    ].every((r) => !r.adopted),
  );
  assert.equal((await api(adopter, "groceries/publications")).length, 0);
  for (const role of ["viewer", "accountant", "editor"]) {
    await pool.query(
      "UPDATE memberships SET role=$1 WHERE user_id=$2 AND household_id=$3",
      [role, users[1], households[1]],
    );
    await search(adopter, run);
    if (browserReview) await browserReview.checkRole(role, run);
    await api(
      adopter,
      "groceries/shared-catalog",
      adoptions[0],
      role === "editor" ? 201 : 403,
    );
    if (role !== "editor")
      await api(
        adopter,
        "groceries/publications",
        { sourceType: "market", sourceId: markets[0].id },
        403,
      );
  }
  await pool.query(
    "UPDATE memberships SET role='owner' WHERE user_id=$1 AND household_id=$2",
    [users[1], households[1]],
  );
  await api(
    adopter,
    "groceries/shared-catalog",
    { sourceType: "market", publicSourceId: randomUUID() },
    404,
  );
  await api(
    adopter,
    "groceries/shared-catalog",
    { sourceType: "market", publicSourceId: "invalid" },
    400,
  );
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(await baseline(cookies[i], households[i]), before[i]);
    const ownAction = i === 0 ? "publish" : "adopt";
    const otherAction = i === 0 ? "adopt" : "publish";
    const ownAudit = await api(cookies[i], `reports/audit?action=${ownAction}`);
    assert.equal(ownAudit.meta.total, i === 0 ? 6 : 3);
    assert.equal(
      (await api(cookies[i], `reports/audit?action=${otherAction}`)).meta.total,
      0,
    );
    const events = (
      await pool.query(
        "SELECT action,details FROM audit_logs WHERE household_id=$1 AND action IN ('publish','adopt')",
        [households[i]],
      )
    ).rows;
    assert.equal(events.length, i === 0 ? 6 : 3);
    assert.ok(
      events.every(
        (e) =>
          e.action === (i === 0 ? "publish" : "adopt") &&
          Object.keys(e.details).join() === "sourceType",
      ),
    );
  }
  const columns = (
    await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = ANY($1::text[])",
      [
        [
          "public_grocery_markets",
          "public_grocery_products",
          "public_grocery_price_suggestions",
        ],
      ],
    )
  ).rows;
  const allowed = new Set([
    "id",
    "name",
    "normalized_name",
    "created_at",
    "market_id",
    "product_id",
    "amount_minor",
    "currency",
    "observed_date",
  ]);
  assert.ok(columns.every((c) => allowed.has(c.column_name)));
  console.log(
    "PASS: publication/retry, normalized aliases, distinct branches, private control, cross-household rejection, adoption/retries, owner/editor/viewer/accountant roles, sanitized fields, audit counts, unchanged accounts/dashboard/transactions/plans, public schema allowlist.",
  );
  if (browserReview)
    console.log(
      "PASS: browser logins, catalog form entry, confirmation/cancellation, reload persistence, duplicate labels, read-only controls, desktop and mobile viewport checks.",
    );
} finally {
  try {
    // Capture only this run's public IDs before resetting its private links.
    publicRows = (
      await pool.query(
        "SELECT public_market_id,public_product_id,public_price_suggestion_id FROM grocery_catalog_publications WHERE household_id=ANY($1::uuid[])",
        [households],
      )
    ).rows;
    let browserResetError;
    for (let i = 0; i < households.length; i++)
      await pool.query(
        "UPDATE memberships SET role='owner' WHERE user_id=$1 AND household_id=$2",
        [users[i], households[i]],
      );
    if (browserReview) {
      try {
        await browserReview.reset();
      } catch (error) {
        browserResetError = error;
      }
    }
    for (let i = 0; i < households.length; i++) {
      await pool.query(
        "UPDATE memberships SET role='owner' WHERE user_id=$1 AND household_id=$2",
        [users[i], households[i]],
      );
      assert.ok(cookies[i], "Cleanup requires the disposable owner's session");
      await api(
        cookies[i],
        "household/reset-test-data",
        { confirmation: "RESET TEST DATA" },
        200,
      );
      for (const table of [
        "grocery_markets",
        "grocery_products",
        "grocery_price_observations",
        "grocery_catalog_publications",
        "grocery_catalog_adoptions",
        "audit_logs",
        "transactions",
        "grocery_plans",
        "accounts",
      ])
        assert.equal(
          (
            await pool.query(
              `SELECT count(*)::int AS count FROM ${table} WHERE household_id=$1`,
              [households[i]],
            )
          ).rows[0].count,
          0,
        );
    }
    for (const [table, field] of [
      ["public_grocery_price_suggestions", "public_price_suggestion_id"],
      ["public_grocery_markets", "public_market_id"],
      ["public_grocery_products", "public_product_id"],
    ]) {
      const ids = publicRows.map((r) => r[field]).filter(Boolean);
      await pool.query(`DELETE FROM ${table} WHERE id=ANY($1::uuid[])`, [ids]);
      assert.equal(
        (
          await pool.query(
            `SELECT count(*)::int AS count FROM ${table} WHERE id=ANY($1::uuid[])`,
            [ids],
          )
        ).rows[0].count,
        0,
      );
    }
    if (cookies[0]) {
      const empty = await search(cookies[0], run);
      assert.equal(
        empty.markets.length + empty.products.length + empty.prices.length,
        0,
      );
    }
    await pool.query("DELETE FROM households WHERE id=ANY($1::uuid[])", [
      households,
    ]);
    await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [users]);
    console.log(
      "PASS: development reset, exact-ID public cleanup, empty post-cleanup search, disposable household/user removal.",
    );
    if (browserResetError) throw browserResetError;
  } finally {
    if (browserReview) await browserReview.close();
    await pool.end();
  }
}
