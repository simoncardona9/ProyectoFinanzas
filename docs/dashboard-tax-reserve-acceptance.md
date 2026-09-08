# Dashboard tax-reserve acceptance scenario

Use a disposable local household and synthetic data only. This extends the
invoice and reserve flow in `tax-reserve-acceptance.md` and proves that IVA
protection changes the dashboard's spendable amount without mixing currencies.

## UYU protected-funds check

1. Reset local test data, create a UYU bank account with an opening balance of
   `0,00`, and create, send, and fully collect the UYU `122,00` invoice from
   the tax-reserve acceptance scenario. Do not settle its `22,00` IVA reserve.
2. Open **Panel mensual** for `2026-09`. The UYU card must show:

   | Figure | Expected minor units | Why |
   | --- | ---: | --- |
   | IVA protegido | 2200 | Remaining reserve from the collection |
   | Efectivo disponible para gastar | 10000 | Bank cash `12200` minus protected IVA `2200` |
   | Efectivo proyectado | 10000 | No expected income or pending obligations |

3. Follow **Facturas y reservas de IVA** and confirm the linked invoice detail
   identifies the same protected reserve and remaining amount. The dashboard
   card and the invoice must retain the original UYU currency.
4. Settle `10,00` of IVA. Reload the dashboard: protected IVA becomes `1200`;
   bank cash is `11200`; spendable and projected cash both remain `10000`.
   This proves that recording a tax payment reduces cash and releases exactly
   the corresponding protected amount.
5. Settle the remaining `12,00`. Protected IVA becomes `0`; bank cash and
   spendable cash are both `10000`.

## Currency separation check

Create and collect a small USD invoice in a USD bank account, leaving its IVA
reserve unsettled. The dashboard must render a separate USD card with only the
USD protected reserve and spendable cash. It must neither change nor be added
to any UYU total.

Finally reset the disposable household. The reset must remove the invoice,
reserve, settlements, and synthetic transactions without an integrity error.

## Acceptance result

Pending local execution.
