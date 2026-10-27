import assert from "node:assert/strict";
import { expect } from "@playwright/test";

// Mutations deliberately happen after the API reconciliation assertions. All
// records belong to the same disposable household cleaned by verify-system.
export async function verifyBrowserJourneys(
  browser,
  base,
  credentials,
  references,
) {
  const { uyu, expense, income } = references;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const field = (form, name) => form.locator(`[name="${name}"]`);
  async function navigate(path) {
    await page.goto(new URL(path, base).href);
    await page.waitForLoadState("networkidle");
  }
  async function submit(
    button,
    suffix,
    method = "POST",
    status = 201,
    readBody = true,
  ) {
    const pending = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.endsWith(suffix) &&
        r.request().method() === method,
    );
    await button.click();
    const response = await pending;
    assert.equal(response.status(), status, `Browser ${method} ${suffix}`);
    return readBody ? (await response.json()).data : undefined;
  }
  async function prompt(button, answers) {
    let index = 0;
    const handler = (dialog) => dialog.accept(answers[index++]);
    page.on("dialog", handler);
    try {
      await button.click();
    } finally {
      page.off("dialog", handler);
    }
    assert.equal(index, answers.length);
  }
  try {
    await navigate("/login");
    await page.getByLabel("Correo electrónico").fill(credentials.email);
    await page.getByLabel("Contraseña").fill(credentials.password);
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);

    await navigate("/structure");
    let form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Crear cuenta", exact: true }),
    });
    await field(form, "name").fill("Browser cash account");
    await field(form, "openingBalance").fill("10,00");
    await field(form, "openingBalanceDate").fill("2026-10-01");
    await submit(
      form.getByRole("button", { name: "Crear cuenta" }),
      "/accounts",
    );
    let accountRow = page
      .locator("li")
      .filter({ hasText: "Browser cash account" });
    await expect(accountRow).toBeVisible();
    await prompt(
      accountRow.getByRole("button", { name: "Editar", exact: true }),
      ["Browser cash renamed"],
    );
    accountRow = page.locator("li").filter({ hasText: "Browser cash renamed" });
    await expect(accountRow).toBeVisible();
    await accountRow.getByRole("button", { name: "Archivar" }).click();
    await expect(
      accountRow.getByRole("button", { name: "Reactivar" }),
    ).toBeVisible();
    await accountRow.getByRole("button", { name: "Reactivar" }).click();
    await expect(
      accountRow.getByRole("button", { name: "Archivar" }),
    ).toBeVisible();

    await navigate("/transactions");
    form = page.locator("form").filter({
      has: page.getByRole("button", {
        name: "Registrar movimiento",
        exact: true,
      }),
    });
    await field(form, "date").fill("2026-10-20");
    await field(form, "description").fill("Browser paid expense");
    await field(form, "amount").fill("12,34");
    await field(form, "accountId").selectOption(uyu.id);
    await field(form, "categoryId").selectOption(expense.id);
    const created = await submit(
      form.getByRole("button", { name: "Registrar movimiento", exact: true }),
      "/transactions",
    );
    assert.equal(created.transaction.amountMinor, 1234);
    await navigate(`/transactions/${created.transaction.id}`);
    await page.getByLabel("Importe corregido").fill("13,25");
    await page
      .getByPlaceholder("Razón de la corrección")
      .fill("Browser synthetic correction");
    await submit(
      page.getByRole("button", { name: "Guardar corrección" }),
      `/${created.transaction.id}`,
      "PATCH",
      200,
    );
    await expect(
      page.getByText("Movimiento actualizado y auditado."),
    ).toBeVisible();
    await page
      .getByPlaceholder("Razón de la anulación")
      .fill("Browser synthetic void");
    await submit(
      page.getByRole("button", { name: "Anular movimiento" }),
      "/void",
      "POST",
      200,
    );

    await navigate("/obligations");
    await page.locator('input[type="month"]').fill("2026-10");
    form = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Crear obligación" }) });
    await field(form, "description").fill("Browser obligation");
    await field(form, "amount").fill("20,00");
    await field(form, "dueDate").fill("2026-10-25");
    await field(form, "categoryId").selectOption(expense.id);
    await submit(
      form.getByRole("button", { name: "Crear obligación" }),
      "/obligations",
    );
    const obligationRow = page
      .locator("li")
      .filter({ hasText: "Browser obligation" });
    await expect(obligationRow).toBeVisible();
    await prompt(
      obligationRow.getByRole("button", { name: "Pagar", exact: true }),
      ["5,00"],
    );
    await expect(page.getByText(/Pago registrado desde/)).toBeVisible();
    await expect(obligationRow).toContainText("15,00");
    await prompt(obligationRow.getByRole("button", { name: "Aplazar" }), [
      "2026-11-25",
      "Browser synthetic deferral",
    ]);
    await expect(
      page.getByText("Obligación aplazada y visible en el nuevo período."),
    ).toBeVisible();

    await navigate("/debts");
    form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Registrar deuda", exact: true }),
    });
    await field(form, "creditorName").fill("Browser creditor");
    await field(form, "description").fill("Browser debt");
    await field(form, "amount").fill("15,00");
    await field(form, "incurredDate").fill("2026-10-20");
    const debt = await submit(
      form.getByRole("button", { name: "Registrar deuda" }),
      "/debts",
    );
    await navigate(`/debts/${debt.id}`);
    await page.getByPlaceholder("0,00").fill("5,00");
    await page.locator('select[name="accountId"]').selectOption(uyu.id);
    await page.locator('input[name="paidDate"]').fill("2026-10-20");
    await submit(
      page.getByRole("button", { name: "Registrar pago", exact: true }),
      "/payments",
      "POST",
      201,
      false,
    );
    await page.waitForLoadState("networkidle");

    await navigate("/invoices");
    form = page.locator("form").filter({
      has: page.getByRole("button", {
        name: "Registrar factura",
        exact: true,
      }),
    });
    await field(form, "clientName").fill("Browser invoice client");
    await field(form, "description").fill("Browser invoice service");
    await field(form, "serviceDate").fill("2026-10-20");
    await field(form, "dueDate").fill("2026-10-30");
    await field(form, "grossAmount").fill("12,20");
    const invoice = await submit(
      form.getByRole("button", { name: "Registrar factura" }),
      "/invoices",
    );
    assert.equal(invoice.ivaAmountMinor, 220);
    const invoiceRow = page
      .locator("li")
      .filter({ hasText: "Browser invoice client" });
    await expect(invoiceRow).toBeVisible();
    await submit(
      invoiceRow.getByRole("button", { name: "Marcar enviada" }),
      "/send",
      "POST",
      200,
    );
    form = page
      .locator("form")
      .filter({ has: page.getByPlaceholder("Importe cobrado") });
    await page.getByPlaceholder("Importe cobrado").fill("12,20");
    await field(form, "accountId").selectOption(uyu.id);
    await field(form, "paidDate").fill("2026-10-20");
    await submit(
      form.getByRole("button", { name: "Registrar cobranza" }),
      "/payments",
    );
    form = page
      .locator("form")
      .filter({ has: page.getByPlaceholder("Pago IVA") });
    await page.getByPlaceholder("Pago IVA").fill("2,20");
    await field(form, "accountId").selectOption(uyu.id);
    await field(form, "paidDate").fill("2026-10-20");
    await field(form, "reference").fill("Browser synthetic IVA");
    await submit(form.getByRole("button"), "/settle");
    await expect(
      page.getByText("Pago de IVA registrado y reserva actualizada."),
    ).toBeVisible();

    await navigate("/dashboard?period=2026-10");
    form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Agregar a la proyección" }),
    });
    await field(form, "description").fill("Browser expected income");
    await field(form, "amount").fill("25,00");
    await field(form, "date").fill("2026-10-25");
    await field(form, "accountId").selectOption(uyu.id);
    await field(form, "categoryId").selectOption(income.id);
    await submit(
      form.getByRole("button", { name: "Agregar a la proyección" }),
      "/transactions",
    );
    await expect(
      page.getByText(
        "Ingreso esperado registrado; aún no modifica el efectivo disponible.",
      ),
    ).toBeVisible();

    await navigate("/imports");
    await page.getByRole("textbox", { name: "Paquete JSON" }).fill(
      JSON.stringify({
        version: "finance-import/v1",
        source: { type: "json_paste", declaredPeriod: "2026-10" },
        categories: [
          {
            name: "Browser imported category",
            kind: "expense",
            defaultClassification: "variable",
          },
        ],
      }),
    );
    const preview = await submit(
      page.getByRole("button", { name: "Validar y previsualizar" }),
      "/preview",
      "POST",
      200,
    );
    assert.equal(preview.errors, 0);
    await page.getByPlaceholder("IMPORT", { exact: true }).fill("IMPORT");
    await submit(
      page.getByRole("button", { name: "Confirmar importación" }),
      "/commit",
    );

    await navigate("/financial-periods");
    await page.getByLabel("Mes", { exact: true }).fill("2026-12");
    await expect(
      page.getByRole("button", { name: "Cerrar mes", exact: true }),
    ).toBeVisible();
    await submit(
      page.getByRole("button", { name: "Cerrar mes", exact: true }),
      "/close",
      "POST",
      200,
    );
    await expect(
      page.getByRole("heading", { name: "Estado: cerrado" }),
    ).toBeVisible();
    await page
      .getByLabel("Motivo de reapertura")
      .fill("Browser synthetic reopen");
    await submit(
      page.getByRole("button", { name: "Reabrir mes", exact: true }),
      "/reopen",
      "POST",
      200,
    );
    await expect(
      page.getByRole("heading", { name: "Estado: abierto" }),
    ).toBeVisible();
    assert.deepEqual(errors, [], "Core browser journey errors");
  } finally {
    await context.close();
  }
}
