export function parseMoneyToMinor(value: string): number | undefined {
  const trimmed = value.trim().replaceAll(" ", "");
  if (!trimmed) return undefined;
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const normalized = unsigned.includes(",")
    ? unsigned.replaceAll(".", "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(unsigned)
      ? unsigned.replaceAll(".", "")
      : unsigned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? (negative ? -minor : minor) : undefined;
}

export function formatMoneyInput(value: string): string {
  const negative = value.trim().startsWith("-") ? "-" : "";
  const [whole = "", fraction] = value.replaceAll(/[^\d,]/g, "").split(",");
  const grouped = (whole.replace(/^0+(?=\d)/, "") || "0").replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return fraction === undefined
    ? `${negative}${grouped}`
    : `${negative}${grouped},${fraction.slice(0, 2)}`;
}
