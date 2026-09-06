# Debt report acceptance scenario

Use a disposable local household and synthetic data only. The amounts below are
minor units; forms accept display amounts with two decimal places.

1. Create an active USD account with enough opening balance to make a payment.
2. Register a confirmed **Compra de USD (`UYU` → `USD`)** rate of `42.75`,
   dated `2026-09-06`, with a recognizable synthetic source. The stored
   convention is `1 USD = 42.75 UYU`.
3. Register a USD debt with original amount `20000` (`USD 200.00`).
4. Record a same-currency USD payment of `5000` (`USD 50.00`) from the active
   USD account.
5. Open **Reporte de deudas**, select the rate created in step 2, and apply it.

The report must show the USD row and USD original-currency totals as follows:

| Figure | Expected minor units |
| --- | ---: |
| Original USD debt | 20000 |
| Paid USD amount | 5000 |
| Remaining USD balance | 15000 |
| UYU equivalent of remaining USD balance | 641250 |

`641250` is `15000 × 42.75`, rounded half up to the nearest UYU minor unit.
The selected rate’s purchase movement, date, source, and kind must be visible
with the UYU exposure. Without selecting a rate, the report must not combine
UYU and USD or show a total UYU exposure. A USD-sale or reference rate must
not be offered for this debt exposure. Confirm that the debt detail shows the
same remaining USD balance and equivalence when the identical rate is selected.

Finally, confirm that no rate selection or report read created a transaction,
changed the debt balance, or altered the rate record. Reset the disposable test
household when the review is complete.
