# Tax-reserve settlement acceptance scenario

Use a disposable local household and synthetic data only. Amounts below include
two decimal places as entered in the UI; their minor-unit equivalents appear in
parentheses. An owner or editor performs the flow.

## Set up the required data

1. Sign in and open **Configuración del hogar**. As the owner, use **Restablecer
   datos de prueba** with the exact confirmation `RESET TEST DATA`.
2. Open **Cuentas y categorías** and create this active account:

   | Field | Value |
   | --- | --- |
   | Nombre | `Banco de prueba IVA UYU` |
   | Tipo | `Banco` |
   | Moneda | `UYU` |
   | Saldo inicial | `0,00` (`0`) |
   | Fecha de saldo inicial | `2026-09-07` |

   No category is required: the IVA payment is a linked tax expense, rather
   than a discretionary category expense.
3. Open **Facturas e IVA** and create the following draft invoice:

   | Field | Value |
   | --- | --- |
   | Cliente | `Cliente IVA de prueba` |
   | Descripción | `Servicio sintético 7.4` |
   | Fecha de servicio | `2026-09-01` |
   | Vencimiento | `2026-09-10` |
   | Importe bruto | `122,00` (`12200`) |
   | Tasa de IVA | `22` % |
   | Moneda | `UYU` |

   The invoice must display net `100,00` (`10000`) and IVA `22,00` (`2200`).
4. Click **Marcar enviada**, then **Ver detalle**. Register a full collection
   with amount `122,00`, account `Banco de prueba IVA UYU`, and paid date
   `2026-09-07`.

The detail must now show one `IVA protegido` reserve of `22,00`, with a
remaining amount of `22,00` and status `protected`.

## Settlement flow

1. In that reserve's **Pagar IVA** form, enter `10,00` (`1000`), select
   `Banco de prueba IVA UYU`, use paid date `2026-09-07`, and reference
   `DGI prueba parcial`. Submit it.
2. Confirm the success message and reload the invoice detail. The same reserve
   must show a remaining amount of `12,00` (`1200`) and status
   `partially_settled`.
3. Open **Registro de movimientos**. It must contain a paid UYU expense of
   `10,00`, dated `2026-09-07`, in `Banco de prueba IVA UYU`, with description
   `Pago de IVA: DGI prueba parcial`. The account's cash effect is therefore
   `112,00`: collection `122,00` minus settlement `10,00`.
4. Return to the invoice detail and try a payment of `12,01` with reference
   `DGI prueba excedida`. It must be rejected. Reload both the invoice detail
   and transaction register: the reserve remains `12,00`, its status remains
   `partially_settled`, and no `12,01` expense exists. This confirms the
   rejected request left no partial financial mutation.
5. Submit the remaining `12,00` with reference `DGI prueba final`. The detail
   must show `0,00` remaining and status `settled`; the **Pagar IVA** form is
   no longer shown for that reserve.
6. Confirm a second paid UYU expense of `12,00` exists in the transaction
   register, with description `Pago de IVA: DGI prueba final`. The account's
   net cash effect is now `100,00` (`12200 - 2200`).

## Guardrails and traceability

- Before the final payment, attempt to select a USD or archived account if one
  exists. The UI must not offer it for this UYU reserve; the API also rejects a
  mismatched or inactive account.
- While signed in, use **Ver vínculos de pago** below the reserve. Confirm two
  settlement records, each with amount, reference, transaction ID, date, and
  account. This is the traceability record for the tax payments.
- If a controlled viewer test membership is available, sign in as that viewer.
  The invoice/reserve detail remains readable, but the **Pagar IVA** form is
  absent and a direct settlement request is forbidden.

Finally, as the owner, reset the disposable household. The reset must complete
without an integrity error and remove invoices, reserves, settlements, and
their synthetic transactions.

## Acceptance result

**Passed locally on 2026-09-08 using a disposable household and synthetic
data.** The flow created the UYU invoice collection and its protected IVA
reserve, recorded a partial tax payment, rejected an over-settlement without a
financial side effect, and recorded the final payment. The reserve transitioned
from `protected` through `partially_settled` to `settled`; linked paid expense
transactions and settlement references were traceable, and the disposable
household reset successfully afterward.
