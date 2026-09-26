# Grocery planning acceptance scenario

Use a disposable local household and synthetic data only. This Slice 10.4 UI
flow proves that private catalog and planning data do not move money, while a
linked paid expense remains the sole source of the actual amount and account
balance.

## Imported financial setup

Open **Configuración** → **Importación por lote** (`/imports`), paste this
exact bundle, and select **Validar y previsualizar**. Confirm it has zero
errors and makes no live changes before you type `IMPORT` and select
**Confirmar importación**. This imports the account, expense category, and
paid expense used by the grocery scenario in one atomic operation.

```json
{
  "version": "finance-import/v1",
  "source": {
    "type": "json_paste",
    "name": "slice-10.4-grocery-financial-setup"
  },
  "accounts": [
    {
      "name": "Caja compras sintética",
      "type": "cash",
      "currency": "UYU",
      "openingBalanceMinor": 100000,
      "openingBalanceDate": "2026-10-01"
    }
  ],
  "categories": [
    {
      "name": "Compras sintéticas",
      "kind": "expense",
      "defaultClassification": "variable"
    }
  ],
  "transactions": [
    {
      "date": "2026-10-05",
      "type": "expense",
      "amountMinor": 15000,
      "currency": "UYU",
      "account": "Caja compras sintética",
      "category": "Compras sintéticas",
      "description": "Compra sintética de almacén"
    }
  ]
}
```

The import must report one account, one category, and one transaction. The
resulting `Caja compras sintética` balance is `850,00 UYU`.

## Setup and private catalog

1. Sign in as the disposable household owner or editor. Open **Configuración**
   → **Reiniciar datos de prueba**, enter `RESET TEST DATA`, and reset the
   household.
2. Complete the imported financial setup above.
3. Open **Compras y precios** (`/groceries`). Create the private market
   `Almacén sintético` and product `Arroz sintético`.
4. Register an observed UYU price for that market and product: `100,00` on
   `2026-10-04`. Confirm that this catalog operation did not change the
   account balance, transaction register, dashboard cash, or create an actual
   purchase.

## Plan and estimates

1. Create a UYU October 2026 plan named `Compra octubre sintética`, selecting
   `Almacén sintético` as its optional preferred market.
2. Add `Arroz sintético` with quantity `1` and choose its `100,00 UYU`
   observed-price suggestion. Confirm the plan shows it as a copied suggested
   price and an estimated total of `100,00 UYU`.
3. Add a free-text item `Pan sintético`, quantity `1`, with a manual unit
   price of `75,00 UYU`. Confirm the plan estimate is now `175,00 UYU` and the
   account balance remains exactly `850,00 UYU`.
4. Optional snapshot check: return to **Compras y precios** and add a second
   observed price for `Arroz sintético` at `120,00 UYU` dated `2026-10-06`.
   Return to the plan and confirm its first item remains at the copied
   `100,00 UYU` price. The plan is an estimate snapshot, not a live catalog
   calculation.

## Paid-purchase reconciliation

1. In the selected plan, open **Conciliar compra pagada** and select the paid
   `150,00 UYU` expense created by the JSON import. Select the
   `Arroz sintético` plan item, enter receipt description `Ticket sintético
   arroz`, and receipt total `150,00`.
2. Link the purchase. Confirm the detail shows:

   - estimated total `175,00 UYU`;
   - real paid total `150,00 UYU`;
   - difference `-25,00 UYU`;
   - one linked purchase with the original paid-expense description; and
   - `150,00 UYU` attributed to the selected plan item.

3. Confirm the account remains `850,00 UYU`: creating the plan and linking its
   existing paid expense must not create, update, or duplicate a transaction.
   The original paid transaction is the only movement behind the balance.
4. Attempt to link that same expense again to this or another plan. It must be
   rejected without a second purchase link. In a separate disposable USD plan,
   attempting to select the UYU expense must be rejected or unavailable.
5. Attempt a receipt total other than `150,00`. It must be rejected, with no
   purchase link or receipt line created. A receipt line may reference only an
   item in the selected plan.

## Privacy, authorization, and cleanup

1. As a viewer or accountant, confirm the catalog, plans, linked purchase, and
   receipt details are readable but no create, edit, or reconciliation controls
   are offered; direct write requests must be rejected.
2. Use a second disposable household or an authenticated request from it to
   confirm that neither the market, product, observation, plan, linked expense
   reference, nor receipt line is listed or retrievable. No shared-catalog data
   is created by this flow.
3. Reset the original disposable household with `RESET TEST DATA`. Confirm its
   synthetic catalog, plan, purchase link, receipt line, and financial setup no
   longer appear.

## Acceptance result

Do not mark Step 10 complete until the household reviewer records a successful
local UI run here. Record only the date and the verified synthetic outcomes;
do not add credentials, exported data, or real financial records.

**Passed locally on 2026-09-26.** The household reviewer confirmed the imported
financial setup, private market/product and observed prices, suggested and
manual plan estimates, snapshot behavior, paid-expense reconciliation, actual
and difference totals, duplicate-link rejection with a user-facing conflict,
and successful disposable-household reset.
