# Shared-catalog cross-household acceptance scenario

Use two disposable local households, separate browser profiles, and synthetic
data only. This Slice 11.3 flow proves the complete Step 11 outcome: one
household deliberately publishes sanitized catalog suggestions and another
household can search and adopt them without either household exposing private
or financial data.

## Preconditions

1. Apply migrations and start the application in the supported local
   environment.
2. Provision two synthetic owner users through the existing controlled local
   seed process. Give them separate households named `Slice 11.3 publisher`
   and `Slice 11.3 adopter`. Keep their credentials only in the local
   environment; do not add them to this document, shell history, screenshots,
   or Git.
3. Sign in as the publisher and adopter in separate browser profiles so their
   HTTP-only session cookies cannot be confused.
4. In both households, use **Configuración** → **Reiniciar datos de prueba**
   with `RESET TEST DATA`. Record each household's transaction count, grocery-
   plan count, dashboard totals, and account balances by currency. They must
   remain unchanged throughout this scenario.
5. Keep an existing viewer or accountant available in the adopter household
   for the read-only authorization check. A locally provisioned user may be
   invited through `POST /api/v1/household/members`; do not commit or paste its
   credentials into the acceptance record.

Use these exact values so every private and public row can be identified and
removed safely afterward:

- markets: `Slice 11.3 Mercado Río Norte`, `SLICE-11.3 mercado rio norte`, and
  `Slice 11.3 Mercado Río Sur`;
- products: `Slice 11.3 Café Ámbar 500 g` and
  `Slice-11.3 cafe ambar 500-g`;
- price: `321,09 UYU` on `2026-09-28` for the first market and product;
- private price note: `NOTA PRIVADA SLICE 11.3 — NO COMPARTIR`;
- unpublished control market: `Slice 11.3 control privado no publicar`.

The two spellings of the north market and the two product spellings normalize
to the same values. The south market is a legitimate distinct branch and must
never be merged automatically.

## Publisher: private setup and deliberate publication

1. In the publisher profile, open **Configuración** → **Catálogo de compras**
   (`/groceries`). Create all listed markets, products, and the price with its
   private note.
2. Publish the north-market spellings, the south branch, both product
   spellings, and the price. Confirm each browser warning. Do not publish the
   control market.
3. Reload the page. Confirm all six selected sources remain **Publicado**, the
   control still offers **Publicar**, and no duplicate publication appeared.
4. Confirm the transaction count, plan count, dashboard totals, and balances
   still equal the publisher's baseline. Publication is a catalog snapshot,
   not a financial or planning mutation.

## Adopter: normalized search and duplicate handling

1. In the adopter profile, search the shared catalog for `MÉRCADO-RÍO`. Confirm
   the accent, case, punctuation, and whitespace differences do not prevent a
   match.
2. Confirm the two north spellings appear as aliases/possible duplicates. The
   separately published price may add another north-name public result; it
   must also remain a selectable record rather than being silently merged.
3. Confirm `Slice 11.3 Mercado Río Sur` remains a distinct suggestion and is
   not labelled as the same normalized record as the north branch.
4. Search for `cafe ambar 500 g`. Confirm both product spellings appear with a
   possible-duplicate warning and remain independently selectable.
5. Search for `control privado no publicar`. It must return no matching market,
   product, or price. The publisher's private control was never shared.

## Explicit adoption and idempotency

1. Adopt one north-market suggestion. The confirmation must state that only
   its name is copied into the adopter's private catalog and no transaction or
   balance is changed. Confirm the action.
2. Adopt one product suggestion in the same way.
3. Adopt the `321,09 UYU` price. The confirmation must state that market,
   product, price, currency, and date are copied privately and that no
   transaction or balance is changed.
4. Reload `/groceries` and repeat both searches. The three chosen public
   sources must show **Ya incorporado** only in the adopter household. The
   copied market, product, and price must appear in its private lists; the price
   note must be empty because the publisher's note was never public.
5. Confirm the adopter's local duplicate hints remain visible where the price
   adoption copied names already adopted separately. A hint must not remove,
   merge, or overwrite either private record.
6. In the browser console, retry one already adopted result using its public ID
   from the search response:

   ```js
   const search = await fetch(
     "/api/v1/groceries/shared-catalog?query=cafe%20ambar%20500%20g",
   ).then((response) => response.json());
   const source = search.data.products.find((item) => item.adopted);
   const response = await fetch("/api/v1/groceries/shared-catalog", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       sourceType: "product",
       publicSourceId: source.id,
     }),
   });
   console.log(response.status, await response.json());
   ```

   The retry must succeed idempotently without adding another private product
   or audit event.

7. Recheck the adopter's transaction count, plan count, dashboard totals, and
   balances. They must equal its baseline exactly.

## Authorization and household-scoped status

1. Sign in as a viewer or accountant whose active membership is the adopter
   household. Shared search must remain available, but **Incorporar** controls
   must not appear.
2. With that same read-only session, use the browser console to get an
   unadopted public market and attempt a direct adoption:

   ```js
   const search = await fetch(
     "/api/v1/groceries/shared-catalog?query=mercado%20rio",
   ).then((response) => response.json());
   const source = search.data.markets.find((item) => !item.adopted);
   const response = await fetch("/api/v1/groceries/shared-catalog", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       sourceType: "market",
       publicSourceId: source.id,
     }),
   });
   console.log(response.status);
   ```

   The status must be `403`, with no private copy or adoption audit event.

3. Return to the publisher profile and run the same shared searches. The
   adopter's chosen records must not show **Ya incorporado** there. Adoption
   status is private to the active household even though the sanitized source
   record is shared.

## Privacy and audit evidence

1. Inspect the shared-search response in the browser network panel. It may
   contain public IDs, names, normalized names, aliases/duplicate hints, price,
   currency, date, and the current household's boolean `adopted` status. It
   must not contain household or user identity, publication links, private
   source IDs, note text, transactions, accounts, plans, purchases, receipts,
   quantities, or budgets.
2. Confirm the publisher cannot see the adopter's private copied records,
   plans, transactions, or adoption links. Confirm the adopter cannot see the
   publisher's private originals, note, control market, plans, transactions,
   or publication links.
3. As the publisher owner, filter **Auditoría y exportación** for `publish` and
   `grocery_catalog_publication`. Confirm exactly six events for this run and
   that each detail contains only `sourceType`.
4. As the adopter owner, filter for `adopt` and
   `grocery_catalog_adoption`. Confirm exactly three events despite the retry,
   and that each detail contains only `sourceType`. Neither household's audit
   report may expose the other household's events.

## Database allowlist inspection

From the repository root, open the local PostgreSQL console. For Docker
Compose:

```bash
docker compose exec db psql -U finanzas_app -d finanzas_dev
```

Verify that the public price contains only its approved snapshot fields:

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
WHERE market.name = 'Slice 11.3 Mercado Río Norte'
  AND product.name = 'Slice 11.3 Café Ámbar 500 g'
  AND price.amount_minor = 32109
  AND price.currency = 'UYU'
  AND price.observed_date = DATE '2026-09-28';
```

It must return one row. Then confirm forbidden private columns still do not
exist on any public table:

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
  'transaction_id',
  'purchase_id',
  'plan_id',
  'quantity',
  'budget'
);
```

The second query must return zero rows.

## Cleanup

1. Ensure the disposable publisher and adopter memberships are restored to
   `owner` if a role was temporarily changed for authorization testing.
2. In both owner profiles, use **Reiniciar datos de prueba** with
   `RESET TEST DATA`. Confirm private catalog records, publication/adoption
   statuses, audit events, and any other synthetic financial/planning data are
   gone from both households.
3. Public snapshots deliberately outlive a household reset. After both private
   link sets are gone, delete only the exact Slice 11.3 public rows:

   ```sql
   BEGIN;

   DELETE FROM public_grocery_price_suggestions
   WHERE amount_minor = 32109
     AND currency = 'UYU'
     AND observed_date = DATE '2026-09-28'
     AND market_id IN (
       SELECT id FROM public_grocery_markets
       WHERE name = 'Slice 11.3 Mercado Río Norte'
     )
     AND product_id IN (
       SELECT id FROM public_grocery_products
       WHERE name = 'Slice 11.3 Café Ámbar 500 g'
     );

   DELETE FROM public_grocery_markets
   WHERE name IN (
     'Slice 11.3 Mercado Río Norte',
     'SLICE-11.3 mercado rio norte',
     'Slice 11.3 Mercado Río Sur'
   );

   DELETE FROM public_grocery_products
   WHERE name IN (
     'Slice 11.3 Café Ámbar 500 g',
     'Slice-11.3 cafe ambar 500-g'
   );

   COMMIT;
   ```

4. Repeat the shared searches and public-price query. They must return no Slice
   11.3 results. The unpublished control must never have entered a public
   table. Exit `psql` with `\q`.

## Acceptance result

### Repeatable agent verification

With the configured synthetic local PostgreSQL database available, run from
`web/`:

```sh
pnpm db:migrate
pnpm dev --port 3101 --hostname 127.0.0.1
```

In a second terminal, also from `web/`, run:

```sh
pnpm test:acceptance:shared-catalog
```

To include real Chromium browser interaction, run this command instead:

```sh
pnpm test:acceptance:shared-catalog:browser
```

Browser mode requires the project's Playwright dependency and its Chromium
installation (`pnpm exec playwright install chromium`). It signs in through
the login form in separate browser contexts, creates the private catalog and
price through the forms, tests accepted/cancelled publication and adoption
dialogs, reload persistence, duplicate labels, viewer/accountant read-only
controls, and settings reset. Desktop (1440px) and narrow (390px/320px) viewport
checks catch horizontal overflow. Synthetic screenshots are stored under a
private `/tmp/finance-step11-browser-*` directory; no browser credentials or
session storage are saved in the repository.

The runner uses the actual login/API/database paths, separate session cookies,
and two new disposable households with unique names. It creates nonzero UYU
and USD account balances, paid transactions, and private grocery plans before
checking publication and adoption. Credentials are generated in memory. It
checks normalized aliases, distinct branches, unpublished controls, sanitized
responses, cross-household transaction/plan access rejection, owner/editor
adoption, viewer/accountant write rejection, idempotent retries, household-
scoped audit reports, unchanged financial/planning baselines, and public-table
column allowlists.

Cleanup exercises the development-only reset for its own households, verifies
private records and audit events are gone, removes public snapshots by the
exact IDs captured from its publication links, verifies an empty shared search,
and removes its disposable households/users. Existing households are never
reset. If execution is interrupted, inspect only that run's `Acceptance11`
households and publication links before cleaning up; do not perform a global
reset. The runner requires a development server because reset is disabled in
production. `ACCEPTANCE_BASE_URL` can select another loopback address/port.

On 2026-10-27, the agent executed this flow successfully on
`development-step-11` at base commit `afdf906`, including uncommitted Slice
11.3 changes. Both the acceptance assertions and cleanup passed. Fresh local
checks also passed: 101 tests, TypeScript, lint, formatting, migration
validation/application, production build, and `git diff --check`.

### Browser verification — 2026-10-27

The agent subsequently executed the browser-mode command successfully with
real local Chromium sessions, including the API/database assertions and full
cleanup. Browser review exposed horizontal overflow at 390px. The grocery page
now uses responsive padding, constrained inputs/selects, wrapping text, and
stacked catalog actions on narrow screens. This also fixes long market names
in the grocery-plan form on the same page. The browser regression check now
passes at 1440px, 390px, and 320px; desktop and 320px screenshots were visually
inspected. Unit tests do not model browser layout, so the real browser overflow
assertion is the regression coverage for this CSS change.

Verified browser outcomes include login, private form entry with localized
price, publication cancellation/confirmation, sanitized price confirmation,
adoption cancellation/confirmation, persisted publication/adoption status,
nonempty identical-name duplicate hints, distinct branches, household-scoped
status, viewer/accountant control hiding, editor controls, settings reset, and
no uncaught page errors. Both households' UYU/USD accounts, dashboard totals,
paid transaction counts, and grocery-plan counts remained unchanged until
cleanup. All disposable households/users and their private/public test records
were removed after verification.

The successful run's screenshots are in
`/tmp/finance-step11-browser-1793075953624/` (temporary local evidence).
Fresh TypeScript, lint, formatting, schema checks, and production build passed;
the unit suite passed all 101 tests. This supersedes the earlier browser-tooling
limitation. Physical-phone testing and Simon's household usability acceptance
were not performed as part of these checks; viewport resizing is not
physical-device testing. Simon's acceptance of these results is recorded below.

### Accepted closure — 2026-10-27

**Slice 11.3 and Step 11 are complete.** Simon explicitly requested closure
based on the successful agent-executed local checks. Those checks exercised
owner, editor, viewer, and accountant roles; publication and adoption across
two disposable households; privacy, idempotency, audit isolation, unchanged
financial/planning state, desktop and narrow browser layouts, and complete
synthetic cleanup. This acceptance supersedes the earlier pending-review
status. No separate manual usability session or physical-phone test is
claimed, and Git review/merge and deployment remain separate actions.
