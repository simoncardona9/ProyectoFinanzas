# Business Rules

## Money and currency

1. Store monetary values in integer minor units plus currency code.
   User interfaces accept localized display amounts (for example `1.234,56`)
   and convert them to minor units before persistence.
2. Do not mix UYU and USD totals without an explicit exchange rate and date.
3. Preserve the original currency and the UYU planning equivalent for foreign-currency transactions.

## Cash-flow definitions

1. **Collected income**: income transactions with status `paid` and marked available for spending.
2. **Spendable cash**: collected income plus opening cash, minus paid expenses, transfers, and protected tax reserves.
3. **Forecast income**: pending or planned income with confidence status; it must be visible separately from collected income.
4. **Projected cash**: spendable cash plus forecast income minus pending obligations due in the period.
5. Gifts and exceptional income are `one_off` and excluded from the recurring-income budget by default.

## Expense classification

1. Fixed/essential: loan installments, healthcare, wages, utilities, insurance, tax and social-security obligations.
2. Variable: costs that can change each period, such as activities and household purchases.
3. Discretionary: subscriptions, optional contributions, gifts, travel, and non-essential activities.
4. Deferred does not mean cancelled: it remains visible in the next period and is included in total liabilities.

## Financial periods and spending summaries

1. A financial period belongs to one household and represents one calendar month (`year` and `month`). It is unique per household.
2. A transaction belongs to reporting periods according to its actual transaction date. The application does not duplicate month or year values on transactions.
3. Closing a financial period prevents changes to financial records dated in that month. Reopening requires an authorized user, a reason, and an audit entry.
4. A spending summary accepts an inclusive `from` and `to` date. It can cover any range, including two months, a calendar year, or a custom interval, and can group results by month, year, or category.
5. Spending totals include paid `expense` transactions in the requested range. Transfers are excluded; debt payments and tax payments are reported separately unless a report explicitly includes them.
6. UYU and USD are never added as if they were the same currency. Reports return separate currency totals unless the caller supplies an explicit base currency and exchange rate.

## Grocery planning and market prices

1. A grocery plan belongs to one household and target financial period. It is planning data and does not affect balances, spendable cash, or reports of actual spending until an actual transaction is linked.
2. A grocery plan item may use a manually entered price or a market-price suggestion. Selecting a suggestion copies its value into the plan item; later changes to the price catalog must not alter existing plans or transactions.
3. A plan can be fulfilled partially, by multiple transactions, or at multiple markets. Planned-versus-actual reporting uses only linked paid transactions and line items.
4. Receipt line items are optional. If they are recorded, their total must equal the parent transaction total; an explicit uncategorized remainder is required for any difference.
5. Market and product creation searches normalized names and aliases for potential duplicates. The application alerts the user to matches but allows a new record when a different branch, location, or product is legitimate.
6. Household market prices and products are private by default. Publishing a shared market, product, or price is an explicit opt-in action and must never disclose a household's purchases, quantities, budgets, or identity.
7. A market price includes its market or branch, observation date, currency, quantity, unit or pack size, and source. It is a suggestion, not an authoritative or automatically applied value.

## Tax and IVA

1. IVA is calculated from gross invoice amount and configured IVA rate.
2. IVA and other tax reserves are protected funds, not spendable cash.
3. A tax reserve becomes settled only when a linked payment transaction is recorded.

## Data integrity

1. A payment must not exceed the remaining balance of its linked debt or obligation without an explicit adjustment.
2. Deleting a posted transaction requires an audit record; voiding is preferred.
3. Closed months cannot be changed without reopening them and logging the reason.
