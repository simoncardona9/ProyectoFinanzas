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

Do not mark Step 5 complete until this scenario has been reviewed locally by
the household and its result recorded in `development-progress.md`.
