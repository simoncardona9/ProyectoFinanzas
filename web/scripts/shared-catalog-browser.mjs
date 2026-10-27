import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

export async function openCatalogBrowserReview(base, credentials) {
  const browser = await chromium.launch({ headless: true });
  const pages = [];
  const errors = [];
  const artifacts = `/tmp/finance-step11-browser-${Date.now()}`;
  await mkdir(artifacts, { recursive: true, mode: 0o700 });
  try {
    for (const { email, password } of credentials) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.setDefaultTimeout(15000);
      await page.goto(new URL("/login", base).href);
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Ingresar", exact: true }).click();
      await expect(page).toHaveURL(/\/settings$/);
      await page.goto(new URL("/groceries", base).href);
      await expect(
        page.getByRole("heading", { name: "Compras y planificación" }),
      ).toBeVisible();
      pages.push(page);
    }
  } catch (error) {
    await browser.close();
    throw error;
  }
  const [publisher, adopter] = pages;
  const section = (page, title) =>
    page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
      .last();
  const list = (page, title) => section(page, title).locator("li");
  const privateRow = (page, title, name) =>
    list(page, title).filter({
      hasText: new RegExp(
        `^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      ),
    });
  async function dialogClick(page, button, accept, phrases) {
    const pending = page.waitForEvent("dialog");
    const click = button.click();
    const dialog = await pending;
    const message = dialog.message();
    await (accept ? dialog.accept() : dialog.dismiss());
    await click;
    for (const phrase of phrases)
      assert.ok(
        message.includes(phrase),
        "Confirmation must describe shared fields and financial effects",
      );
  }
  async function search(page, query) {
    await page.getByPlaceholder("Buscar mercado o producto").fill(query);
    const response = page.waitForResponse(
      (r) =>
        r.url().includes("/groceries/shared-catalog?") &&
        r.request().method() === "GET",
    );
    await page.getByRole("button", { name: "Buscar compartidos" }).click();
    assert.ok((await response).ok());
  }
  async function noOverflow(page, label) {
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    if (dimensions.document > dimensions.viewport + 1) {
      await page.screenshot({
        path: `${artifacts}/overflow.png`,
        fullPage: true,
      });
      console.log(
        "Overflow elements:",
        await page.evaluate(() =>
          [...document.querySelectorAll("main *")]
            .filter((el) => el.getBoundingClientRect().right > innerWidth)
            .slice(0, 12)
            .map((el) => ({
              tag: el.tagName,
              class: el.className,
              width: el.getBoundingClientRect().width,
            })),
        ),
      );
    }
    assert.ok(
      dimensions.document <= dimensions.viewport + 1,
      `${label}: horizontal overflow ${dimensions.document}/${dimensions.viewport}`,
    );
  }
  return {
    async createNamed(kind, name) {
      await publisher
        .getByPlaceholder(
          kind === "market" ? "Ej. Feria del barrio" : "Ej. Yerba 1 kg",
        )
        .fill(name);
      await publisher
        .getByRole("button", {
          name: kind === "market" ? "Guardar mercado" : "Guardar producto",
          exact: true,
        })
        .click();
      await expect(
        privateRow(
          publisher,
          kind === "market" ? "Mercados privados" : "Productos privados",
          name,
        ),
      ).toHaveCount(1);
    },
    async createPrice(market, product) {
      await publisher.locator('select[name="marketId"]').selectOption(market);
      await publisher.locator('select[name="productId"]').selectOption(product);
      await publisher.getByPlaceholder("Precio (ej. 199,50)").fill("321,09");
      await publisher.locator('input[name="observedDate"]').fill("2026-09-28");
      await publisher
        .getByPlaceholder("Nota opcional")
        .fill("PRIVATE ACCEPTANCE NOTE");
      await publisher
        .getByRole("button", { name: "Guardar precio observado" })
        .click();
      await expect(list(publisher, "Precios observados")).toHaveCount(1);
    },
    async publish(markets, products) {
      const control = privateRow(
        publisher,
        "Mercados privados",
        markets[3].name,
      );
      await dialogClick(
        publisher,
        control.getByRole("button", { name: "Publicar", exact: true }),
        false,
        ["únicamente el nombre"],
      );
      await expect(
        control.getByRole("button", { name: "Publicar", exact: true }),
      ).toBeVisible();
      for (const [title, items] of [
        ["Mercados privados", markets.slice(0, 3)],
        ["Productos privados", products],
      ]) {
        for (const item of items) {
          const row = privateRow(publisher, title, item.name);
          await dialogClick(
            publisher,
            row.getByRole("button", { name: "Publicar", exact: true }),
            true,
            ["únicamente el nombre"],
          );
          await expect(
            row.getByText("Publicado", { exact: true }),
          ).toBeVisible();
        }
      }
      await dialogClick(
        publisher,
        publisher.getByRole("button", { name: "Publicar precio", exact: true }),
        true,
        [
          "mercado",
          "producto",
          "precio",
          "moneda",
          "fecha",
          "nota privada no se publicará",
        ],
      );
      await expect(
        publisher.getByText("Publicado", { exact: true }),
      ).toHaveCount(6);
      await publisher.reload();
      await expect(
        publisher.getByText("Publicado", { exact: true }),
      ).toHaveCount(6);
    },
    async adopt(run, found, adoptions) {
      await search(adopter, run);
      await expect(list(adopter, "Mercados compartidos")).toHaveCount(4);
      await expect(list(adopter, "Productos compartidos")).toHaveCount(3);
      const south = list(adopter, "Mercados compartidos").filter({
        hasText: "Río Sur",
      });
      await expect(south.getByText(/Posible duplicado/)).toHaveCount(0);
      await expect(
        list(adopter, "Mercados compartidos").filter({
          hasText: /Posible duplicado/,
        }),
      ).toHaveCount(3);
      for (const adoption of adoptions) {
        const named = adoption.sourceType !== "price";
        const title =
          adoption.sourceType === "market"
            ? "Mercados compartidos"
            : adoption.sourceType === "product"
              ? "Productos compartidos"
              : "Precios compartidos";
        const items =
          adoption.sourceType === "market"
            ? found.markets
            : adoption.sourceType === "product"
              ? found.products
              : found.prices;
        const row = list(adopter, title).nth(
          items.findIndex((r) => r.id === adoption.publicSourceId),
        );
        const phrases = named
          ? [
              "nombre",
              "catálogo privado",
              "No se crearán transacciones ni se modificarán saldos",
            ]
          : [
              "mercado",
              "producto",
              "precio",
              "moneda",
              "fecha",
              "No se crearán transacciones ni se modificarán saldos",
            ];
        await dialogClick(
          adopter,
          row.getByRole("button", { name: "Incorporar", exact: true }),
          false,
          phrases,
        );
        await expect(
          row.getByRole("button", { name: "Incorporar", exact: true }),
        ).toBeVisible();
        await dialogClick(
          adopter,
          row.getByRole("button", { name: "Incorporar", exact: true }),
          true,
          phrases,
        );
        await expect(
          row.getByText("Ya incorporado", { exact: true }),
        ).toBeVisible();
      }
      await adopter.reload();
      await search(adopter, run);
      await expect(
        adopter.getByText("Ya incorporado", { exact: true }),
      ).toHaveCount(3);
      await expect(adopter.getByText("PRIVATE ACCEPTANCE NOTE")).toHaveCount(0);
      await expect(
        list(adopter, "Mercados privados").filter({
          hasText: /Posible duplicado: coincide con .+/,
        }),
      ).toHaveCount(2);
      await expect(
        list(adopter, "Productos privados").filter({
          hasText: /Posible duplicado: coincide con .+/,
        }),
      ).toHaveCount(2);
      await search(publisher, run);
      await expect(
        publisher.getByText("Ya incorporado", { exact: true }),
      ).toHaveCount(0);
      await noOverflow(publisher, "publisher desktop");
      await noOverflow(adopter, "adopter desktop");
      await adopter.screenshot({
        path: `${artifacts}/desktop.png`,
        fullPage: true,
      });
      for (const width of [390, 320]) {
        await adopter.setViewportSize({ width, height: 844 });
        await noOverflow(adopter, `adopter mobile ${width}`);
        await expect(
          adopter.getByRole("button", { name: "Buscar compartidos" }),
        ).toBeVisible();
        await adopter.screenshot({
          path: `${artifacts}/mobile-${width}.png`,
          fullPage: true,
        });
      }
      await adopter.setViewportSize({ width: 1440, height: 1000 });
    },
    async checkRole(role, run) {
      await adopter.reload();
      await search(adopter, run);
      if (["viewer", "accountant"].includes(role)) {
        await expect(
          adopter.getByRole("button", { name: "Incorporar", exact: true }),
        ).toHaveCount(0);
        await expect(
          adopter.getByRole("button", { name: /^Publicar/ }),
        ).toHaveCount(0);
        await expect(
          adopter.getByRole("button", { name: "Guardar mercado", exact: true }),
        ).toHaveCount(0);
      } else {
        await expect(
          adopter
            .getByRole("button", { name: "Incorporar", exact: true })
            .first(),
        ).toBeVisible();
      }
    },
    async reset() {
      for (const page of pages) {
        await page.goto(new URL("/settings", base).href);
        await page
          .getByPlaceholder("Escribe RESET TEST DATA")
          .fill("RESET TEST DATA");
        await page
          .getByRole("button", { name: "Eliminar datos de prueba" })
          .click();
        await expect(
          page.getByText("Datos de prueba eliminados.", { exact: true }),
        ).toBeVisible();
        await page.goto(new URL("/groceries", base).href);
        await expect(page.getByText("Publicado", { exact: true })).toHaveCount(
          0,
        );
        await expect(
          list(page, "Mercados privados").getByText("Sin registros todavía."),
        ).toBeVisible();
      }
      assert.deepEqual(errors, [], "Browser page errors");
      console.log(
        `PASS: settings reset in both browser sessions. Screenshots directory: ${artifacts}`,
      );
    },
    close: () => browser.close(),
  };
}
