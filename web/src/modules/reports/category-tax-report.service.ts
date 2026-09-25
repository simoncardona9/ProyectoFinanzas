import { buildCategoryTaxReport } from "./category-tax-report.rules";
import { categoryTaxReportRepository } from "./category-tax-report.repository";
import type { CategoryTaxReportQuery } from "./category-tax-report.schemas";

export async function getCategoryTaxReport(
  householdId: string,
  range: CategoryTaxReportQuery,
) {
  const rows = await categoryTaxReportRepository.reportRows(householdId, range);
  return buildCategoryTaxReport(
    rows.expenses as Parameters<typeof buildCategoryTaxReport>[0],
    rows.invoiceRows as Parameters<typeof buildCategoryTaxReport>[1],
    rows.collectionRows as Parameters<typeof buildCategoryTaxReport>[2],
    rows.reserveRows as Parameters<typeof buildCategoryTaxReport>[3],
    rows.settlementRows as Parameters<typeof buildCategoryTaxReport>[4],
    range,
  );
}
