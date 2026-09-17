# Historical import acceptance scenario

Use a disposable local household and synthetic data only. This is the complete
Slice 8.4 UI flow for the shared **Asistente de importación**. It proves that
the reviewer sees all validation before a write, that linked historical records
are created atomically, and that a retry does not duplicate them.

## Setup

1. Start the local application and sign in as the disposable household owner
   or editor. Do not use a real household or an August/September workbook.
2. Open **Configuración** → **Asistente de importación** (`/imports`).

## Invalid preview: no write

1. Paste the bundle below, but change `ivaReserves[0].amountMinor` from
   `2200` to `2199`.
2. Click **Validar y previsualizar**.
3. Confirm that the row **ivaReserves · fila 1** is invalid and reports that
   the reserve does not match the calculated IVA allocation. The confirmation
   area must not be available.
4. Open **Deudas**, **Facturas e IVA**, **Tipos de cambio**, and the
   transaction register in separate tabs. They must contain none of the
   synthetic records named below.

## Valid preview and commit

Replace the text with this exact bundle and click **Validar y previsualizar**:

```json
{
  "version": "finance-import/v1",
  "source": { "type": "json_paste", "name": "slice-8.4-synthetic" },
  "accounts": [
    {
      "name": "Banco histórico UYU",
      "type": "bank",
      "currency": "UYU",
      "openingBalanceMinor": 50000,
      "openingBalanceDate": "2026-08-01"
    }
  ],
  "debts": [
    {
      "reference": "tarjeta-ago",
      "creditorName": "Banco sintético",
      "description": "Tarjeta histórica sintética",
      "amountMinor": 10000,
      "currency": "UYU",
      "incurredDate": "2026-08-01"
    }
  ],
  "debtPayments": [
    {
      "debt": "tarjeta-ago",
      "amountMinor": 2000,
      "account": "Banco histórico UYU",
      "paidDate": "2026-08-05",
      "description": "Pago histórico sintético"
    }
  ],
  "invoices": [
    {
      "reference": "fac-ago-1",
      "clientName": "Cliente sintético",
      "description": "Clase histórica sintética",
      "serviceDate": "2026-08-01",
      "dueDate": "2026-08-10",
      "grossAmountMinor": 12200,
      "ivaRateBasisPoints": 2200,
      "currency": "UYU",
      "sentDate": "2026-08-02"
    }
  ],
  "invoiceCollections": [
    {
      "reference": "cob-ago-1",
      "invoice": "fac-ago-1",
      "amountMinor": 12200,
      "account": "Banco histórico UYU",
      "paidDate": "2026-08-10",
      "description": "Cobranza histórica sintética"
    }
  ],
  "ivaReserves": [{ "collection": "cob-ago-1", "amountMinor": 2200 }],
  "exchangeRates": [
    {
      "baseCurrency": "UYU",
      "quoteCurrency": "USD",
      "rate": "42.75",
      "effectiveDate": "2026-08-01",
      "source": "Fuente sintética 8.4",
      "kind": "confirmed",
      "movement": "buy_usd"
    }
  ]
}
```

Confirm the preview has zero errors. Its UYU card must show invoice collections
of `12200` and protected IVA of `2200`; no USD total may be added to UYU. Type
`IMPORT` and click **Confirmar importación**.

## Verify normal product screens

1. The confirmation message must report one account, one debt, one invoice,
   and one exchange rate created. Reload `/imports`; no extra record should be
   created merely by viewing the page.
2. Open **Deudas**, select *Tarjeta histórica sintética*, and verify original
   `10000`, one `2000` payment dated 2026-08-05, and remaining `8000` UYU.
3. Open **Facturas e IVA**, select *Clase histórica sintética*, and verify a
   `12200` UYU collected invoice with one `12200` collection and one protected
   IVA reserve of `2200` UYU.
4. Open the transaction register and verify exactly two paid linked movements:
   the `2000` debt payment and `12200` invoice collection, both in *Banco
   histórico UYU*. They must not be regular category-based transactions.
5. Open **Tipos de cambio** and verify exactly one `UYU → USD`, `buy_usd`,
   confirmed rate: `42.75`, dated 2026-08-01, source *Fuente sintética 8.4*.
6. Before leaving the import assistant after its first confirmation, keep
   `IMPORT` in the field and click **Confirmar importación** a second time. It
   must report that the import was already confirmed. Then complete steps 2–5:
   counts and balances must be unchanged.

Finally reset the disposable household. Do not mark this slice accepted until
the household reviewer records the result below.

## Acceptance result

**Passed locally on 2026-09-15.** The household reviewer confirmed the invalid
preview made no live changes; the valid synthetic batch created the linked debt
payment, invoice collection, protected IVA reserve, and exchange rate with the
expected UYU amounts; and the repeated confirmation did not create duplicates.
