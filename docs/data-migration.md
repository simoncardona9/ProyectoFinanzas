# Excel Migration Plan

## Source

The initial source is `_Finanzas Familiares_Agosto_2026_dashboard_actualizado.xlsm`.

## Migration stages

1. Preserve an unchanged source copy outside the application database.
2. Export each sheet to a reviewable CSV staging file.
3. Map sheets to entities:
   - `Caja` → income transactions.
   - `Responsabilidades` → obligations and expense transactions.
   - `Deudas USD` → debts and debt payments.
   - `Facturación` → invoices and IVA reserves.
   - `Configuración` → initial settings and exchange-rate assumptions.
   - `Histórico` → monthly summary snapshots after reconciliation.
4. Validate dates, currencies, source accounts, duplicate payments, and invoice/payment links.
5. Reconcile totals with approved corrected figures.
6. Import only after a human review approves the staging report.

## Known issues to resolve before import

- DualBoot USD conversion needs a recorded source and formula-independent data representation.
- TEC billing data is misaligned in the workbook and must be corrected.
- Some cash-sheet date entries are not valid dates.
- Historical-sheet labels reference incorrect dashboard values.
- Fixed formula ranges exclude future rows.

## Acceptance criteria

The imported totals for each approved month must reconcile to the signed-off source report, and every imported record must retain a source-row reference.
