Run `pnpm db:seed:demo` from `web/` to add demo finances to the existing local
`test.owner@finanzas.local` owner in `Hogar de prueba`. The script reads
`DATABASE_URL` from `.env.local`. For another local test account, set
`DEMO_USER_EMAIL` and `DEMO_HOUSEHOLD_NAME` explicitly.

The fixture adds six months of UYU/USD transactions, dedicated accounts and
categories, pending income, obligations, debts with linked payments, invoices,
and a private grocery plan. New names and descriptions begin with `Demo ·`;
no grocery records are published to the shared catalog.

Existing records and login credentials are preserved. Closed financial periods
are skipped. Inserts run in one transaction and have audit entries. IDs are
stable per household and month, so repeating the command does not duplicate
the same fixture or reset any edits made through the app. The command prints
the number of new records added. The fixture does not provide a reset command.
