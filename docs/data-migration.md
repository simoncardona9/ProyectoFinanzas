# Excel Migration Plan

## Sources

The historical August source is
`_Finanzas Familiares_Agosto_2026_dashboard_actualizado.xlsm`.

The current monthly source is `Finanzas Familiares Setiembre 2026 - utima
version.xlsm`, supplied on 2026-09-08. It supersedes the August workbook as
the workbook to inspect for current-month migration, but does not replace the
August reconciliation evidence. An import batch must record the exact original
filename, byte content hash, and the editor's declared source period; filesystem
timestamps and a filename such as “latest version” are not sufficient to decide
which batch supersedes another.

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

## September workbook observations

The current workbook has the sheets `Configuración`, `Dashboard`,
`Responsabilidades`, `Facturación`, `Caja`, and `Deudas USD`. It has no
`Histórico` sheet, which remains an informational notice rather than an import
failure. `Responsabilidades` contains a defined table (`A3:K50`) with headers
for status, date, category, description, currency, amount, priority, type,
account/medium, month, and pending amount.

The workbook also contains hidden financial rows, a long tail of formatted but
empty rows, dropdown-controlled status/type fields, and formula cells with
cached numeric values. These observations establish the following parser and
preview requirements:

- Detect defined Excel tables and use their header/range as a strong mapping
  signal, while still supporting sheets without a table and never assuming a
  fixed range.
- Do not silently exclude hidden rows or filtered rows. Stage populated rows
  with a `hidden`/`filtered` provenance flag so the reviewer decides whether
  they represent records, duplicates, or intentionally excluded items.
- Ignore only rows that are demonstrably empty after reading values and
  formulas; formatting alone must not create records or inflate the used range.
- Convert Excel serial dates with the workbook's declared date system, preserve
  the original cell text/value, and require review for invalid, blank, or
  ambiguous dates.
- Map controlled status/type labels, including emoji-prefixed values, through
  versioned aliases. A label such as `🔎 Revisar` must block commit until the
  editor resolves it to a supported lifecycle state.
- Never execute VBA/macros or recalculate formulas. Store formula text and its
  cached value only as provenance/warning evidence; a formula-derived financial
  amount requires explicit reviewer confirmation before it becomes a canonical
  import value.

Although the file uses an `.xlsm` extension, this inspected package contains no
VBA project. The implementation must nevertheless detect and report macro
presence for every `.xlsm` upload, preserve the original safely, and parse cell
data without running macros.

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

## Step 8 reconciliation gate and slice coverage

Neither the August workbook/summary nor the September workbook is yet an
approved import source. They are planning evidence only until each issue above
has a corrected source value, an accountable reviewer, and a signed-off
reconciliation report. In particular, a displayed spreadsheet total or formula
is not sufficient evidence for a commit.

Step 8 is planned as six slices. Slices 8.1–8.3 establish the shared staged
JSON assistant and safely import structure and core cash-flow records. Slice
8.4 explicitly covers the workbook's linked historical debt,
invoice/collection/IVA-reserve, and exchange-rate data; this is necessary
because those entities are present in the workbook mapping but were not in the
original five assistant entry points. Slice 8.5 adds CSV and Excel conversion
to the same pipeline, and Slice 8.6 performs the August reconciliation and
acceptance.

Until Slice 8.6 completes, either workbook may be parsed and previewed with
synthetic or disposable data, but no August or September batch may be committed
to a household used for real financial tracking.

## Acceptance criteria

The imported totals for each approved month must reconcile to the signed-off source report, and every imported record must retain a source-row reference. A
workbook with reordered sheets, moved headers, added columns, or blank styled
cells can be previewed and converted to batch JSON when its required fields
match configured aliases; an ambiguous mapping cannot be committed until an
editor resolves it.
