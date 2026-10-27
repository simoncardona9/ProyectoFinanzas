# Full-system verification — 2026-10-27

The agent completed a local audit of the functionality implemented by Steps
1–11 on `development-step-11`, base commit `afdf906`, including uncommitted
changes. All 20 system-audit groups and the separate shared-catalog browser
acceptance passed after the defects below were corrected. These are finite
synthetic acceptance scenarios, not a claim that every possible input,
browser, deployment, or future requirement has been verified.

## Verification results

| Area | Executed evidence and result |
| --- | --- |
| Authentication and households | Actual login, rejected credentials, HTTP-only/SameSite cookies, household settings, owner invitations of provisioned users, membership-authorized household switching, denied foreign-household switching, logout/session revocation. Passed. |
| Accounts and categories | Account types, opening balances, category hierarchy and controlled seed/retry, name changes, archive/reactivate, invalid parents, immutable currency and closed-month opening protection. API and browser workflows passed. |
| Paid transactions | UYU/USD income and expenses, one-off/recurring flags, filtered pagination, validation, auditable correction/void, and reconciled balances. Browser creation, localized correction and void passed. |
| Obligations and forecast | Planned/pending obligations, recurrence metadata, overpayment/currency rejection, partial/full payment, later-date deferral and month-specific forecast. Browser creation, localized partial payment and deferral passed, including when archived accounts exist. |
| Dashboard and expected income | Independently expected cash, protected reserves, one-off income, expected income, obligations, projected cash and low-buffer alerts; separate UYU/USD totals. Expected-income browser entry passed. |
| Debts and exchange rates | Original-currency debts, same-currency partial payments, overpayment rejection, purchase/sale/reference rates, duplicate conflicts, explicit rate eligibility and exact UYU exposure. Browser debt creation and payment passed. |
| Invoices and IVA | Gross/net/IVA breakdown, draft/send/cancel transitions, partial/full collections, protected reserve allocation, partial settlement and financial reconciliation. Full browser create/send/collect/settle workflow passed. Report-linked detail pages select the scoped invoice and reject another household's invoice. |
| Imports | JSON staging with no financial writes, ordered mixed/historical linked commit, idempotent preview/commit, key-reuse conflicts, invalid rows, rejected commits without partial financial changes, August reconciliation gate. CSV/XLSX/XLSM conversion, formula rejection, hidden-row warnings and CSV commit passed. Browser JSON preview and explicit commit passed. No real workbook was imported. |
| Monthly close | Owner close/reopen with reason and audit evidence; rejected dated financial writes, including account openings and imported invoice send dates. Actual browser close/reopen passed. |
| Reports and export | Account balances reconciled independently to the ledger; category/month/year grouping; currency-separated tax/debt totals; audit filtering and CSV export. All invoice source links opened successfully. |
| Private groceries | Price snapshots, fractional quantities, manual/suggested item estimates, no planning balance effect, paid-expense receipt reconciliation, actual/difference figures and duplicate-link rejection. Passed. |
| Shared catalog | Separate real browser sessions: private form entry, deliberate publication/cancellation, normalized aliases, distinct branches, explicit adoption/cancellation, reload persistence, duplicate hints, sanitized fields, idempotent retries, read-only controls and scoped status/audits. Passed. |
| Access control | Owner/editor/viewer/accountant matrix, owner-only settings/member/reset/close actions, read-only rejection at collection and nested mutation endpoints, foreign-household list/detail/mutation isolation. Passed. |
| Browser presentation | 19 primary page URLs plus login, invoice report-source pages and foreign-invoice rejection; no uncaught page errors. Layout checks at 1440px, 390px and 320px passed. Representative desktop/mobile screenshots were retained locally and visually inspected. |
| Concurrent payments | Simultaneous full payments for debts, obligations, invoice collections and IVA settlements yielded one success and a domain conflict/rejection; no duplicate collection/settlement or negative remaining balance. Passed. |
| Recovery | Actual local PostgreSQL 18 dump/restore into a separate temporary cluster using a private Unix socket. Counts and row checksums matched for all 31 public tables. Temporary cluster and dump were removed. Passed. |
| Cleanup | Both uniquely named disposable households were reset, private financial/import/audit data checked empty, and users/households removed. Shared-catalog snapshots were removed by their exact captured IDs. Existing households were not reset. Passed. |

Final project checks passed: **111 tests across 35 files**, TypeScript, ESLint,
Prettier, Drizzle schema validation, local migration application, production
build, and `git diff --check`. A new regression checks that every implemented
v1 route/method appears in OpenAPI.

The final system-run record is
`/tmp/finance-system-audit-1793077325423/results.json`: 20 passing groups and
278 explicitly tracked API requests, in addition to browser-generated requests
and concurrency checks. Shared-catalog screenshots are under
`/tmp/finance-step11-browser-1793077012518/`. These temporary paths contain only
synthetic evidence and may be removed by the local operating system.

## Defects corrected

1. Duplicate rates produced `500` because Drizzle wrapped the unique violation.
   The service now returns the documented `409 DUPLICATE_EXCHANGE_RATE`.
2. Invoice/IVA report sources pointed at missing `/invoices/:invoiceId` pages.
   A protected detail page now opens the correct household-scoped invoice,
   collections and reserves. Obsolete reserve/dashboard wording was corrected.
3. Account metadata updates could relabel UYU history as USD. Currency is now
   fixed at creation; same-currency metadata edits remain supported.
4. Closed-period coverage omitted direct/imported opening balances and imported
   invoice send dates. Those dates now use the same guard as financial writes.
5. Several pages and the debt report overflowed narrow viewports. Shared
   responsive spacing, wrapping and form/grid constraints now prevent this.
6. Obligation payments could pick an archived account. The UI now loads active
   accounts for payment selection.
7. Transaction corrections and obligation-payment prompts used raw minor units.
   Both now accept localized display amounts and convert to integer minor units.
8. OpenAPI omitted private grocery operations, tax-reserve detail/settlement,
   and the legacy category `PUT` rejection. The inventory is now documented,
   with regression coverage against implemented route methods.

Unit regression tests cover rate conflicts, account safeguards, import dates,
invoice-detail selection, localized money handling and API contract inventory.
Real browser tests cover layout and the archived-account/payment interaction;
jsdom does not perform browser layout.

## Repeat the audit

Use the configured local synthetic PostgreSQL database and Playwright Chromium.
From `web/`, start or reuse the documented local development server:

```sh
pnpm db:migrate
pnpm dev --port 3101 --hostname 127.0.0.1
```

In another terminal, from `web/`:

```sh
pnpm test:acceptance:system
pnpm test:acceptance:shared-catalog:browser
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm format:check
pnpm db:check
pnpm build
```

Run `git diff --check` from the repository root. The system runner creates its
own synthetic users/households, runs cleanup in `finally`, and writes only
sanitized results and synthetic screenshots to a private `/tmp` directory.
Credentials remain in memory. Set `ACCEPTANCE_BASE_URL` to select another
loopback port. Do not run both acceptance runners concurrently: recovery
checks compare a stable source database with its restored copy.

The native recovery check requires `pg_config`, `pg_dump`, `pg_restore`,
`initdb` and `pg_ctl`, compatible with the local PostgreSQL version. It starts
a disposable cluster in its own private temporary directory and does not
require `CREATEDB` on the application database. The existing Docker-specific
recovery procedure remains in `docker-compose.md`.

## Scope and remaining product gaps

These gaps are registered for future analysis/design as F-01–F-12 and O-01 in
[future-requirements.md](future-requirements.md). That backlog tracks scope and
open questions; this document retains the audit evidence.

Chromium viewport tests are not physical-phone, Firefox or WebKit tests. This
run used the native local runtime; Docker Compose, LAN TLS/ngrok, cloud
deployment, load testing and a security penetration test were not exercised.
No real financial records or original historical workbook were used.

The broad requirements and roadmap extend beyond the completed implementation
plan. The following capabilities are not implemented by Steps 1–11 and are
not counted as passing this audit:

- Monthly budgets and automatic generation from recurring rules (recurrence
  metadata is supported).
- General transfer/adjustment entry and a dedicated expected-income
  collection/mark-paid transition.
- Debt due-date schedules, interest calculations and repayment plans.
- Cross-plan grocery summaries grouped by product/market/period beyond the
  implemented plan-item reconciliation.
- Receipt-file attachments, notifications/reminders, savings goals, specialized
  accountant formats beyond CSV, and external/bank integrations.

These need separately scoped future work. Completion of the current plan
does not imply the broader product requirements are all implemented. Git
review/commit/merge and deployment remain separate from this local audit.
