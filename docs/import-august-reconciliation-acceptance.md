# August 2026 reconciliation-gate acceptance scenario

This procedure is the Slice 8.6 synthetic acceptance check. It proves the
reconciliation control, idempotent retry, and rollback behavior without
claiming that either supplied household workbook is approved. Use a disposable
local household only.

## Synthetic JSON input

All acceptance inputs below use the existing **Configuración → Importación por
lote** JSON editor; no account, category, or financial record needs to be
entered manually. Reset the disposable household, then paste this exact valid
synthetic bundle and click **Validar y previsualizar**. The report hash is a
fixed synthetic placeholder, not a hash for either supplied workbook.

```json
{
  "version": "finance-import/v1",
  "source": {
    "type": "json_paste",
    "name": "slice-8.6-synthetic-approved-report",
    "declaredPeriod": "2026-08",
    "reconciliation": {
      "reportName": "Informe sintético corregido — agosto 2026",
      "reportContentHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "reviewer": "Revisor sintético responsable",
      "signedAt": "2026-09-16T12:00:00-03:00",
      "corrections": [
        { "issue": "dualboot_conversion", "correction": "Fuente y conversión verificadas en el informe sintético." },
        { "issue": "tec_billing_alignment", "correction": "Fila de TEC alineada y verificada en el informe sintético." },
        { "issue": "invalid_cash_dates", "correction": "Fechas de caja corregidas y verificadas en el informe sintético." },
        { "issue": "historical_dashboard_labels", "correction": "Etiquetas históricas corregidas en el informe sintético." },
        { "issue": "fixed_formula_ranges", "correction": "Rangos fijos eliminados y verificados en el informe sintético." }
      ],
      "totals": {
        "UYU": {
          "transactionIncomeMinor": 125000,
          "transactionExpenseMinor": 0,
          "obligationMinor": 0,
          "expectedIncomeMinor": 0,
          "debtOriginalMinor": 0,
          "debtPaymentMinor": 0,
          "invoiceGrossMinor": 0,
          "invoiceCollectionMinor": 0,
          "ivaReserveMinor": 0
        },
        "USD": {
          "transactionIncomeMinor": 0,
          "transactionExpenseMinor": 0,
          "obligationMinor": 0,
          "expectedIncomeMinor": 0,
          "debtOriginalMinor": 0,
          "debtPaymentMinor": 0,
          "invoiceGrossMinor": 0,
          "invoiceCollectionMinor": 0,
          "ivaReserveMinor": 0
        }
      }
    }
  },
  "accounts": [
    {
      "name": "Caja sintética agosto",
      "type": "cash",
      "currency": "UYU",
      "openingBalanceMinor": 0,
      "openingBalanceDate": "2026-08-01"
    }
  ],
  "categories": [{ "name": "Ingresos sintéticos agosto", "kind": "income" }],
  "transactions": [
    {
      "date": "2026-08-05",
      "type": "income",
      "amountMinor": 125000,
      "currency": "UYU",
      "account": "Caja sintética agosto",
      "category": "Ingresos sintéticos agosto",
      "description": "Cobro sintético conciliado"
    }
  ]
}
```

## 1. Prove the gate blocks an unsigned August batch

1. In the JSON above, remove the complete `source.reconciliation` object and
   preview the resulting bundle.
2. The card must say that August reconciliation is required; there
   must be no confirmation control. Calling the commit route directly must
   return `422 AUGUST_RECONCILIATION_REQUIRED` and create no account,
   transaction, audit create event, or balance change.

## 2. Prove an approved report must match entity and currency totals

1. Restore the exact JSON above, but change
   `source.reconciliation.totals.UYU.transactionIncomeMinor` from `125000` to
   `124999`.
2. Preview must name the mismatching `UYU · transactionIncomeMinor` entity and
   not expose the
   confirmation control. A direct commit returns
   `422 IMPORT_RECONCILIATION_MISMATCH`, with no live changes.
3. Restore `125000`. The preview must show **Conciliación de agosto de
   2026: coincide** and identify the report, reviewer, and signature time.
   Sign in as an editor and verify direct confirmation returns
   `403 AUGUST_RECONCILIATION_OWNER_REQUIRED`.

## 3. Commit, retry, and rollback proof

1. Sign in as the disposable household owner and confirm with `IMPORT`.
   Verify the expected records are created exactly once and the import-batch
   audit event retains the declared period plus report name/hash/reviewer/time.
2. Repeat the same confirmation using the original idempotency key. It must
   return the original counts with `alreadyCommitted: true`; record counts and
   balances must be unchanged.
3. The unsigned and mismatched variants both contain the same account,
   category, and dependent movement. Verify that each rejected confirmation
   leaves **all** of those prerequisite and dependent records absent. This
   demonstrates the JSON batch is atomic rather than partially committed.
4. Reset the disposable household after recording the results.

## Production gate

Do not use the supplied August workbook or `Resumen_Financiero_Agosto_2026.md`
as the report in this procedure. They explicitly record unresolved DualBoot,
TEC, cash-date, historical-label, and formula-range discrepancies. A real
August import remains blocked until a corrected report is preserved outside the
application, its SHA-256 is entered in the bundle, all five corrections are
accountably signed off, and every UYU/USD entity total matches the staged
canonical records.

## Execution record

Completed successfully on 2026-09-17 in a disposable local household. The
unsigned and mismatched variants were blocked without live changes; an editor
was restricted from confirmation; the owner committed the matched synthetic
batch once; retry returned the existing result; and the household was reset.
This execution record is synthetic acceptance evidence only and does not
approve either supplied workbook for real-use import.
