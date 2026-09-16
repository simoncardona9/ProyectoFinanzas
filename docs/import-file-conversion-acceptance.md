# File-import conversion acceptance scenario

Use a disposable local household and synthetic files only. This is the Slice
8.5 UI flow for CSV/XLSX/XLSM conversion. It proves that a file is mapped into
the existing staged JSON preview before any record is written, while formulas
and ambiguous rows block staging.

## Setup

1. Start the local application, sign in as a disposable household **owner**,
   and use **Configuración → Restablecer datos de prueba** if prior synthetic
   data exists. Never use an August or September household workbook here.
2. Open **Configuración → Importación por lote**, replace the JSON editor
   contents with the following structure-only bundle, and click **Validar y
   previsualizar**. Confirm it with `IMPORT`. This replaces manual account and
   category entry.

```json
{
  "version": "finance-import/v1",
  "source": { "type": "json_paste", "name": "slice-8.5-fixture-structure" },
  "accounts": [
    {
      "name": "Caja prueba CSV",
      "type": "cash",
      "currency": "UYU",
      "openingBalanceMinor": 0,
      "openingBalanceDate": "2026-09-01"
    }
  ],
  "categories": [
    { "name": "Ingresos prueba CSV", "kind": "income" },
    {
      "name": "Gastos prueba CSV",
      "kind": "expense",
      "defaultClassification": "variable"
    }
  ]
}
```

3. The synthetic files are already provided in
   [`fixtures/import-file-conversion`](fixtures/import-file-conversion). To
   recreate them, run `pnpm fixtures:import-acceptance` from `web/`. Use
   `slice-8.5-valid.csv` for this first flow:

```csv
Fecha,Tipo,Monto,Moneda,Cuenta,Categoría,Descripción
08/09/2026,Ingreso,"1.234,50",UYU,Caja prueba CSV,Ingresos prueba CSV,Cobro sintético CSV
09/09/2026,Gasto,250,UYU,Caja prueba CSV,Gastos prueba CSV,Compra sintética CSV
```

## Valid CSV: convert, preview, and commit once

1. Open **Configuración → Importación por lote**.
2. Set **Período declarado del archivo** to `2026-09`, choose
   **Convertir CSV/Excel**, and select `slice-8.5-valid.csv`.
3. Confirm the conversion report states:
   - `CSV` and the original filename;
   - an SHA-256 value and declared period `2026-09`;
   - one detected header row, two populated rows, and zero hidden rows;
   - no red conversion errors.
4. Confirm the normal preview appears below the report, has zero invalid rows,
   and shows UYU income `1,234.50` and expense `250.00`. USD must stay zero.
   No record has been created yet.
5. Type `IMPORT` and click **Confirmar importación**. The result must report
   two movements created.
6. Without leaving the page, click **Confirmar importación** a second time.
   It must say the import was already confirmed and did not duplicate records.
7. Open **Registro de movimientos**. Confirm exactly these two paid UYU
   transactions, dated 2026-09-08 and 2026-09-09, use the synthetic account
   and their respective categories. No USD transaction may appear.

## Formula safety: Excel must not stage

1. In the import assistant choose **Convertir CSV/Excel** and select the
   provided `slice-8.5-formula.xlsx`.
   It has the same seven headers and one otherwise valid transaction row, but
   its **Monto** cell contains `=100+25`.
2. Continue the flow with the selected file.
3. Confirm the conversion report has a red error saying the row uses a formula
   and requires manual review. There must be no normal preview and no `IMPORT`
   confirmation control.
4. Reload the transaction register and confirm no formula-test transaction was
   created.

## Hidden-row review: Excel must remain visible

1. Convert the provided `slice-8.5-hidden-row.xlsx` in the assistant. It has
   two valid rows and hides the second data row.
2. The report must show one hidden row and a
   warning that the hidden row is included for review. It must not disappear
   silently or inflate the result with formatting-only trailing rows.
3. Do not commit this optional check if it would duplicate the prior synthetic
   records; reset the disposable household afterwards.

## Acceptance result

**Passed locally on 2026-09-16.** The household reviewer confirmed the JSON
fixture setup, valid CSV conversion, preview-before-write behavior, explicit
commit and retry safety, formula blocking, and hidden-row review. The supplied
August/September workbooks remain blocked from real import pending their
sheet-specific mappings and the Slice 8.6 reconciliation gate.
