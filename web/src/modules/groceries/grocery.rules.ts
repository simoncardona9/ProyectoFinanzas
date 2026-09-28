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

/** Public records stay distinct. Matching normalized names are hints only, so
 * a real branch or product variant is never silently merged. */
export function withSharedDuplicateMetadata<
  T extends { id: string; name: string; normalizedName: string },
>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items)
    groups.set(item.normalizedName, [
      ...(groups.get(item.normalizedName) ?? []),
      item,
    ]);

  return items.map((item) => {
    const matches = groups.get(item.normalizedName) ?? [];
    return {
      ...item,
      aliases: [
        ...new Set(
          matches
            .filter((candidate) => candidate.id !== item.id)
            .map((candidate) => candidate.name),
        ),
      ],
      possibleDuplicates: matches
        .filter((candidate) => candidate.id !== item.id)
        .map((candidate) => ({ id: candidate.id, name: candidate.name })),
    };
  });
}
