/** Keeps matching predictable for local duplicate suggestions, without making
 * names globally unique or publishing any household data. */
export function normalizeGroceryName(name: string) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-UY")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
