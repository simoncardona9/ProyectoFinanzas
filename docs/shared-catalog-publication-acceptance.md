# Shared-catalog publication acceptance scenario

Use a disposable local household and synthetic data only. This Slice 11.1 UI
flow proves that publishing is deliberate, role-protected, idempotent, and
limited to an identity-free catalog snapshot. Shared search and adoption are
not available until Slice 11.2.

## Preconditions

1. Apply migrations and start the local application.
2. Use an owner or editor in a disposable household. Keep a viewer or
   accountant membership available for the authorization check.
3. Open **Configuración** → **Reiniciar datos de prueba**, enter
   `RESET TEST DATA`, and reset the household.
4. Record the current transaction count and dashboard balances by currency.
   They must remain unchanged throughout this scenario.

Use these exact synthetic values so the shared snapshots can be identified and
removed safely afterward:

- market: `Slice 11.1 mercado sintético 2026-09-28`;
- product: `Slice 11.1 producto sintético 2026-09-28`;
- observed price: `123,45 UYU` on `2026-09-28`;
- private note: `NOTA PRIVADA SLICE 11.1 — NO PUBLICAR`;
- unpublished control market: `Slice 11.1 control privado 2026-09-28`.

## Private setup and cancelled publication

1. Open **Configuración** → **Compras y precios** (`/groceries`). Create the
   synthetic market, product, observed price, and private note listed above.
2. Create the unpublished control market.
3. Select **Publicar** for the control market and then cancel the browser
   confirmation. Confirm that it still offers **Publicar** after a reload and
   is not marked **Publicado**.
4. Confirm that creating these private records did not add a transaction or
   change any dashboard/account balance.

## Explicit publication flow

1. Select **Publicar** beside the synthetic market. The confirmation must say
   that only the record name will be shared and that the action cannot be
   undone in this slice. Confirm it.
2. Confirm the market now shows **Publicado**. Reload `/groceries` and confirm
   the status persists and no second publication control appears.
3. Repeat the same flow for the synthetic product.
4. Select **Publicar precio** for the `123,45 UYU` observation. The confirmation
   must state that market, product, price, currency, and date will be shared,
   while the private note will not be published. Confirm it.
5. Confirm the observation shows **Publicado** after a reload. The private note
   may remain visible inside the original household's private catalog; it must
   not appear in the public snapshot inspected below.
6. Recheck transaction count and balances. They must equal the precondition
   values exactly because publication is not a financial event.

## Audit and idempotency evidence

1. As the owner, open **Configuración** → **Auditoría y exportación**
   (`/reports/audit-export`). Filter `action` to `publish` and `entityType` to
   `grocery_catalog_publication`.
2. Confirm exactly three new events for this run: market, product, and price.
   Each event must identify the signed-in actor and contain only its
   `sourceType` detail. It must not contain names, note text, price, household
   data, plan data, purchase data, or receipt contents.
3. Reload `/groceries` more than once and return to the same audit filter.
   Confirm no additional publication or audit event was created. Persisted
   **Publicado** status and the unique server-side source constraint make the
   operation idempotent.

## Authorization and household isolation

1. Sign in as a viewer or accountant in the same household. Confirm the
   catalog and **Publicado** statuses are readable, but no **Publicar** or
   **Publicar precio** controls are offered.
2. While signed in with that read-only role, use the browser developer console
   to verify the server also rejects a direct write against the unpublished
   control market. This snippet uses only the current same-origin session and
   synthetic data:

   ```js
   const markets = await fetch("/api/v1/groceries/markets").then((response) =>
     response.json(),
   );
   const sourceId = markets.data.find(
     (item) => item.name === "Slice 11.1 control privado 2026-09-28",
   ).id;
   const response = await fetch("/api/v1/groceries/publications", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ sourceType: "market", sourceId }),
   });
   console.log(response.status);
   ```

   The status must be `403`. Return as owner and confirm the control market is
   still unpublished and no publication audit event was added for it.

3. If a second disposable household is available, open `/groceries` there.
   Its private lists and `GET /api/v1/groceries/publications` status must not
   expose the first household's private sources or publication links. Do not
   expect shared catalog search in this slice; that user flow begins in 11.2.

## Public-snapshot privacy inspection

The shared-search UI is intentionally deferred, so verify the persisted public
allowlist directly in the local database. For Docker Compose, open the local
database console from the repository root:

```bash
docker compose exec db psql -U finanzas_app -d finanzas_dev
```

Run this read-only query:

```sql
SELECT
  market.name AS market_name,
  product.name AS product_name,
  price.amount_minor,
  price.currency,
  price.observed_date
FROM public_grocery_price_suggestions AS price
JOIN public_grocery_markets AS market ON market.id = price.market_id
JOIN public_grocery_products AS product ON product.id = price.product_id
WHERE market.name = 'Slice 11.1 mercado sintético 2026-09-28'
  AND product.name = 'Slice 11.1 producto sintético 2026-09-28'
  AND price.amount_minor = 12345
  AND price.currency = 'UYU'
  AND price.observed_date = DATE '2026-09-28';
```

It must return the expected synthetic price. The public tables expose only the
selected names, integer amount, currency, and date. Confirm structurally that
forbidden identity/private columns do not exist:

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN (
  'public_grocery_markets',
  'public_grocery_products',
  'public_grocery_price_suggestions'
)
AND column_name IN (
  'household_id',
  'user_id',
  'source_id',
  'note',
  'purchase_id',
  'plan_id',
  'quantity',
  'budget'
);
```

This second query must return zero rows. Exit `psql` with `\q`.

## Cleanup

1. As the original disposable household owner, use **Reiniciar datos de
   prueba** with `RESET TEST DATA`. Confirm the private market, product,
   observation, control market, publication statuses, and their household audit
   events no longer appear.
2. Slice 11.1 intentionally has no unpublish UI, and public snapshots outlive
   the private reset. Remove only the exact synthetic public rows from this
   scenario in the local database. After the household reset has removed its
   private publication links, run:

   ```sql
   BEGIN;

   DELETE FROM public_grocery_price_suggestions
   WHERE amount_minor = 12345
     AND currency = 'UYU'
     AND observed_date = DATE '2026-09-28'
     AND market_id IN (
       SELECT id FROM public_grocery_markets
       WHERE name = 'Slice 11.1 mercado sintético 2026-09-28'
     )
     AND product_id IN (
       SELECT id FROM public_grocery_products
       WHERE name = 'Slice 11.1 producto sintético 2026-09-28'
     );

   DELETE FROM public_grocery_markets
   WHERE name = 'Slice 11.1 mercado sintético 2026-09-28';

   DELETE FROM public_grocery_products
   WHERE name = 'Slice 11.1 producto sintético 2026-09-28';

   COMMIT;
   ```

3. Repeat the public-price query above and confirm it returns zero rows. The
   unpublished control market never entered a public table.

## Acceptance result

Do not start Slice 11.2 until the household reviewer records a successful local
run below. Record only the date, roles exercised, and verified synthetic
outcomes; never add credentials, session cookies, real catalog data, or
financial records.

**Passed locally on 2026-09-28.** The household reviewer confirmed cancelled
publication remains private; deliberate market, product, and price publication;
persisted/idempotent status; minimal audit evidence; read-only-role rejection;
household isolation; unchanged financial records and balances; exclusion of
identity and private columns from public tables; and complete removal of the
synthetic private and public records.
