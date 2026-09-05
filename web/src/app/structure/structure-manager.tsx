"use client";
import { FormEvent, useEffect, useState } from "react";
import {
  formatMoneyInput,
  parseMoneyToMinor,
} from "@/shared/money/parse-money";

type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalanceMinor: number;
  active: boolean;
};
type Category = {
  id: string;
  name: string;
  kind: string;
  parentCategoryId: string | null;
  defaultClassification: string | null;
  active: boolean;
};
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error?.message ?? "No se pudo completar la operación.",
    );
  return body.data;
}
export function StructureManager({ canEdit }: { canEdit: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0,00");
  const [accountFormKey, setAccountFormKey] = useState(0);
  const [categoryFormKey, setCategoryFormKey] = useState(0);
  const load = async () => {
    try {
      const [nextAccounts, nextCategories] = await Promise.all([
        api<Account[]>("/api/v1/accounts"),
        api<Category[]>("/api/v1/categories"),
      ]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al cargar.");
    }
  };
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, []);
  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const openingBalanceMinor = parseMoneyToMinor(openingBalance);
    if (openingBalanceMinor === undefined) {
      setMessage("Ingresa un importe válido, por ejemplo 1.234,56.");
      return;
    }
    try {
      await api("/api/v1/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          type: form.get("type"),
          currency: form.get("currency"),
          openingBalanceMinor,
          openingBalanceDate: form.get("openingBalanceDate"),
        }),
      });
      setAccountFormKey((key) => key + 1);
      setOpeningBalance("0,00");
      setMessage("Cuenta creada.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kind = String(form.get("kind"));
    try {
      await api("/api/v1/categories", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          kind,
          parentId: form.get("parentId") || null,
          defaultClassification:
            kind === "expense" ? form.get("defaultClassification") : null,
        }),
      });
      setCategoryFormKey((key) => key + 1);
      setMessage("Categoría creada.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  const archive = async (resource: "accounts" | "categories", id: string) => {
    try {
      await api(`/api/v1/${resource}/${id}/archive`, { method: "POST" });
      setMessage("Elemento archivado; su historial se conserva.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  const activateAccount = async (id: string) => {
    try {
      await api(`/api/v1/accounts/${id}/activate`, { method: "POST" });
      setMessage("Cuenta reactivada; su historial se conserva.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  const rename = async (
    resource: "accounts" | "categories",
    id: string,
    currentName: string,
  ) => {
    const name = window.prompt("Nuevo nombre", currentName)?.trim();
    if (!name || name === currentName) return;
    try {
      await api(`/api/v1/${resource}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setMessage("Elemento actualizado.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  const seed = async () => {
    try {
      await api("/api/v1/categories/seed", { method: "POST" });
      setMessage("Categorías iniciales instaladas.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      {message && (
        <p className="lg:col-span-2 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      <section className="rounded-xl border border-zinc-200 p-5">
        <h2 className="text-xl font-semibold">Cuentas</h2>
        {canEdit && (
          <form
            key={accountFormKey}
            onSubmit={submitAccount}
            className="mt-4 grid gap-2"
          >
            <input
              name="name"
              required
              placeholder="Nombre"
              className="rounded border p-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <select name="type" className="rounded border p-2">
                <option value="cash">Efectivo</option>
                <option value="bank">Banco</option>
                <option value="card">Tarjeta</option>
                <option value="loan">Préstamo</option>
                <option value="reserve_envelope">Sobre de reserva</option>
              </select>
              <select name="currency" className="rounded border p-2">
                <option>UYU</option>
                <option>USD</option>
              </select>
            </div>
            <input
              name="openingBalance"
              type="text"
              inputMode="decimal"
              required
              value={openingBalance}
              onChange={(event) =>
                setOpeningBalance(formatMoneyInput(event.target.value))
              }
              placeholder="Saldo inicial (ej. 1.234,56)"
              className="rounded border p-2"
            />
            <input
              name="openingBalanceDate"
              type="date"
              required
              className="rounded border p-2"
            />
            <button className="rounded bg-emerald-700 p-2 text-white">
              Crear cuenta
            </button>
          </form>
        )}
        <ul className="mt-5 divide-y">
          {accounts.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between py-3"
            >
              <span>
                {item.name}{" "}
                <small className="text-zinc-500">
                  {item.type} · {item.currency} ·{" "}
                  {item.active ? "Activa" : "Archivada"}
                </small>
              </span>
              {canEdit && (
                <span className="flex gap-3 text-sm">
                  <button
                    onClick={() => void rename("accounts", item.id, item.name)}
                    className="text-emerald-700"
                  >
                    Editar
                  </button>
                  {item.active ? (
                    <button
                      onClick={() => void archive("accounts", item.id)}
                      className="text-red-700"
                    >
                      Archivar
                    </button>
                  ) : (
                    <button
                      onClick={() => void activateAccount(item.id)}
                      className="text-emerald-700"
                    >
                      Reactivar
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
          {!accounts.length && (
            <li className="py-3 text-zinc-500">Aún no hay cuentas.</li>
          )}
        </ul>
      </section>
      <section className="rounded-xl border border-zinc-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Categorías</h2>
          {canEdit && !categories.length && (
            <button
              onClick={() => void seed()}
              className="text-sm text-emerald-700"
            >
              Instalar categorías iniciales
            </button>
          )}
        </div>
        {canEdit && (
          <form
            key={categoryFormKey}
            onSubmit={submitCategory}
            className="mt-4 grid gap-2"
          >
            <input
              name="name"
              required
              placeholder="Nombre"
              className="rounded border p-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <select name="kind" className="rounded border p-2">
                <option value="expense">Egreso</option>
                <option value="income">Ingreso</option>
                <option value="transfer">Transferencia</option>
              </select>
              <select
                name="defaultClassification"
                className="rounded border p-2"
              >
                <option value="fixed">Fijo</option>
                <option value="variable">Variable</option>
                <option value="discretionary">Discrecional</option>
              </select>
            </div>
            <select name="parentId" className="rounded border p-2">
              <option value="">Sin categoría superior</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className="rounded bg-emerald-700 p-2 text-white">
              Crear categoría
            </button>
          </form>
        )}
        <ul className="mt-5 divide-y">
          {categories.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between py-3"
            >
              <span>
                {item.name}{" "}
                <small className="text-zinc-500">
                  {item.kind}
                  {item.defaultClassification
                    ? ` · ${item.defaultClassification}`
                    : ""}
                </small>
              </span>
              {canEdit && (
                <span className="flex gap-3 text-sm">
                  <button
                    onClick={() =>
                      void rename("categories", item.id, item.name)
                    }
                    className="text-emerald-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => void archive("categories", item.id)}
                    className="text-red-700"
                  >
                    Archivar
                  </button>
                </span>
              )}
            </li>
          ))}
          {!categories.length && (
            <li className="py-3 text-zinc-500">
              Instala las categorías iniciales o crea una.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
