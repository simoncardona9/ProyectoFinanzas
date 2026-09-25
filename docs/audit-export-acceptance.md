# Audit and CSV export acceptance scenario

Use a disposable local household and synthetic data only. This Slice 9.6 UI
flow proves household-scoped audit filtering, authorized CSV export,
spreadsheet-safe output, and the export audit event.

## Setup

1. Sign in as the disposable household owner.
2. Open **Configuración** → **Reiniciar datos de prueba**, enter
   `RESET TEST DATA`, and reset the household. This removes the household's
   prior financial and audit test data.
3. Open **Configuración** → **Importación por lote** (`/imports`).

## Synthetic JSON import

Paste this exact JSON and select **Validar y previsualizar**:

```json
{
  "version": "finance-import/v1",
  "source": {
    "type": "json_paste",
    "name": "slice-9.6-synthetic-export"
  },
  "accounts": [
    {
      "name": "Caja exportación sintética",
      "type": "cash",
      "currency": "UYU",
      "openingBalanceMinor": 10000,
      "openingBalanceDate": "2026-09-01"
    }
  ],
  "categories": [
    { "name": "Ingresos exportación", "kind": "income" },
    {
      "name": "Gastos exportación",
      "kind": "expense",
      "defaultClassification": "variable"
    }
  ],
  "transactions": [
    {
      "date": "2026-09-03",
      "type": "income",
      "amountMinor": 25000,
      "currency": "UYU",
      "account": "Caja exportación sintética",
      "category": "Ingresos exportación",
      "description": "Ingreso sintético"
    },
    {
      "date": "2026-09-04",
      "type": "expense",
      "amountMinor": 3500,
      "currency": "UYU",
      "account": "Caja exportación sintética",
      "category": "Gastos exportación",
      "description": "=Gasto sintético para probar CSV"
    }
  ],
  "obligations": [
    {
      "description": "Obligación sintética",
      "amountMinor": 1800,
      "currency": "UYU",
      "dueDate": "2026-09-12",
      "category": "Gastos exportación",
      "classification": "variable"
    }
  ],
  "debts": [
    {
      "reference": "deuda-exportacion",
      "creditorName": "Acreedor sintético",
      "description": "Deuda sintética",
      "amountMinor": 8000,
      "currency": "UYU",
      "incurredDate": "2026-09-13"
    }
  ],
  "invoices": [
    {
      "reference": "factura-exportacion",
      "clientName": "Cliente sintético",
      "description": "Factura sintética",
      "serviceDate": "2026-09-14",
      "dueDate": "2026-09-30",
      "grossAmountMinor": 12200,
      "ivaRateBasisPoints": 2200,
      "currency": "UYU"
    }
  ],
  "exchangeRates": [
    {
      "baseCurrency": "UYU",
      "quoteCurrency": "USD",
      "rate": "42.75",
      "effectiveDate": "2026-09-15",
      "source": "Fuente sintética",
      "kind": "confirmed",
      "movement": "buy_usd"
    }
  ]
}
```

Confirm the preview has zero errors and says that no records have changed.
Enter `IMPORT` and select **Confirmar importación**. The result must report one
account, two categories, two transactions, one obligation, one debt, one
invoice, and one exchange rate.

## Audit report and CSV download

1. Open **Configuración** → **Auditoría y exportación**
   (`/reports/audit-export`).
2. Filter the audit report from `2026-09-01` to `2026-09-30`, leaving action
   and type blank. Confirm that creation and import events belong only to the
   active household and name the signed-in user as actor.
3. In **Exportar CSV**, use the same inclusive range and select
   **Descargar CSV**.
4. Open the download in a text editor or spreadsheet. It must contain six data
   rows: two transactions, one obligation, one debt, one invoice, and one
   exchange rate. It must not contain staged import data, the original JSON,
   audit rows, sessions, or credentials.
5. Confirm all rows retain their original currency with no UYU/USD conversion.
   The description starting with `=Gasto` must begin with an apostrophe in the
   CSV (`'=Gasto...`) so a spreadsheet cannot evaluate it as a formula.
6. Return to the audit report and filter `action` to `export` and `entityType`
   to `financial_export`. Confirm one event records `format: csv`, the date
   range, and `rowCount: 6`, without including the exported content.

## Optional role checks

- An accountant can access **Auditoría y exportación** and download CSV.
- An editor can access **Exportar registros financieros** (`/reports/export`)
  and download CSV, but is redirected away from the audit screen.
- A viewer is redirected away from both export screens.

## Cleanup and execution record

Reset the disposable household after recording the result. Do not mark this
slice accepted until the household reviewer records a successful local run
below.

**Passed locally on 2026-09-25.** The household reviewer confirmed that the
synthetic JSON batch committed successfully, audit results remained
household-scoped, the CSV contained the six expected dated financial rows with
no staged source data, the formula-like description was neutralized, and the
minimal export audit event retained only its range, format, and row count.
