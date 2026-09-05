# Dashboard acceptance scenario

Use a disposable local household and synthetic data only. Choose one month and
one currency, then create a cash or bank account with an opening balance of
`100000` minor units.

Record these items for the selected month:

- A paid income of `50000` minor units.
- A one-off paid income of `10000` minor units.
- A paid expense of `30000` minor units.
- A planned income of `20000` minor units.
- A pending obligation of `25000` minor units.

## UI entry notes

In **Registro de movimientos**, choose **Ingreso** and enable **Ingreso único**
when recording the `10000`-minor-unit one-off income. The checkbox is shown
only for income and may also be changed from that transaction's correction
screen. A one-off income remains a paid income and therefore affects both
spendable cash and collected income; the dashboard also reports it separately.

The transaction and obligation forms accept display-currency amounts, not raw
minor units: enter `100,00` to represent `10000` minor units in a two-decimal
currency. The application converts the value to minor units before saving it.

Expected dashboard totals for that currency:

| Figure | Expected minor units | Source |
| --- | ---: | --- |
| Spendable cash | 130000 | opening balance + paid income + one-off income - paid expense |
| Collected income | 60000 | the two paid income records |
| One-off income | 10000 | the one-off paid income record |
| Expected income | 20000 | the planned income record |
| Pending obligations | 25000 | the pending obligation |
| Projected cash | 125000 | spendable cash + expected income - pending obligations |

Set the household low-buffer threshold to `130000`. The dashboard must show a
low-buffer alert. Set it to `125000`; no alert must appear because the
threshold is not exceeded.

Open the dashboard's per-currency source links and confirm that the listed
income and obligation records match the inputs above. Repeat with a small USD
dataset and confirm neither currency total is combined with the other.

Step 5 was marked complete after the household reviewed this scenario locally
with synthetic data on 2026-09-05; the result is recorded in
`development-progress.md`.
