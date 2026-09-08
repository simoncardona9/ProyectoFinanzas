# Excel Migration Plan

## Source

The initial source is `_Finanzas Familiares_Agosto_2026_dashboard_actualizado.xlsm`.

## Migration stages

1. Preserve an unchanged source copy outside the application database.
2. Upload the original workbook through the import assistant. The Excel parser
   service reads it and transparently converts it to versioned canonical staged
   JSON. The same assistant also accepts a documented JSON bundle for direct
   batch entry when there is no source workbook.
3. Preserve the original workbook or JSON content hash and source provenance
   for each staged record (source, sheet when applicable, and row number/path),
   then present a reviewable preview.
4. Detect sheet and column mappings from normalized names and configured
   aliases, then allow an editor to review or correct the proposal. Do not rely
   on a fixed sheet order, fixed cell positions, or fixed formula ranges. The
   standard mapping is:
   - `Caja` → income transactions.
   - `Responsabilidades` → obligations and expense transactions.
   - `Deudas USD` → debts and debt payments.
   - `Facturación` → invoices and IVA reserves.
   - `Configuración` → initial settings and exchange-rate assumptions.
   - `Histórico` → monthly summary snapshots after reconciliation.
   - `Histórico` is optional: its absence must produce an informational notice,
     not reject records that map to other supported entities.
5. Ignore presentation-only content such as blank styled cells, added
   formatting columns, and title rows. Report unknown populated columns,
   unmatched rows, missing required fields, and ambiguous aliases for review;
   never silently discard an apparent financial row.
6. Validate dates, currencies, source accounts, duplicate payments, and invoice/payment links.
7. Reconcile totals with approved corrected figures.
8. Import only after a human review approves the staging report. The commit is
   all-or-nothing and idempotent, so retrying cannot duplicate approved data.

## File-type parser responsibilities

- `excel-import-parser`: handles `.xlsx` and `.xlsm` uploads and emits only
  canonical staged JSON, a mapping report, and source provenance. It uses
  versioned sheet/header alias configuration and must support partially
  different workbook layouts when the required financial fields can be matched
  unambiguously.
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

The imported totals for each approved month must reconcile to the signed-off source report, and every imported record must retain a source-row reference. A
workbook with reordered sheets, moved headers, added columns, or blank styled
cells can be previewed and converted to batch JSON when its required fields
match configured aliases; an ambiguous mapping cannot be committed until an
editor resolves it.
