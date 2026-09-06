# Excel Migration Plan

## Source

The initial source is `_Finanzas Familiares_Agosto_2026_dashboard_actualizado.xlsm`.

## Migration stages

1. Preserve an unchanged source copy outside the application database.
2. Upload the original workbook through the import assistant. The Excel parser
   service reads it and transparently converts it to versioned canonical staged
   JSON; the user is never asked to prepare JSON.
3. Preserve the original workbook and source provenance for each staged record
   (file, sheet, and row number), then present a reviewable preview.
4. Map sheets to entities:
   - `Caja` → income transactions.
   - `Responsabilidades` → obligations and expense transactions.
   - `Deudas USD` → debts and debt payments.
   - `Facturación` → invoices and IVA reserves.
   - `Configuración` → initial settings and exchange-rate assumptions.
   - `Histórico` → monthly summary snapshots after reconciliation.
5. Validate dates, currencies, source accounts, duplicate payments, and invoice/payment links.
6. Reconcile totals with approved corrected figures.
7. Import only after a human review approves the staging report.

## File-type parser responsibilities

- `excel-import-parser`: handles `.xlsx` and `.xlsm` uploads and emits only
  canonical staged JSON plus source provenance.
- `csv-import-parser`: handles `.csv` uploads and emits the same canonical
  staged JSON plus source provenance.
- Shared normalization, mapping, validation, preview, and commit services must
  operate only on that canonical model, so adding a new file type does not
  duplicate financial validation or database-writing logic.

## Known issues to resolve before import

- DualBoot USD conversion needs a recorded source and formula-independent data representation.
- TEC billing data is misaligned in the workbook and must be corrected.
- Some cash-sheet date entries are not valid dates.
- Historical-sheet labels reference incorrect dashboard values.
- Fixed formula ranges exclude future rows.

## Acceptance criteria

The imported totals for each approved month must reconcile to the signed-off source report, and every imported record must retain a source-row reference.
