import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("documents every implemented v1 API path and HTTP method in OpenAPI", () => {
  const source = readFileSync(
    resolve(process.cwd(), "../docs/api/openapi.v1.yaml"),
    "utf8",
  );
  const documented = new Map(
    [
      ...source.matchAll(
        /^  (\/api\/v1\/[^:\n]+):\n([\s\S]*?)(?=^  \/api\/|^components:|$(?![\s\S]))/gm,
      ),
    ].map((match) => [match[1], match[2]]),
  );
  const directory = resolve(process.cwd(), "src/app/api/v1");
  const missing = [];
  for (const file of readdirSync(directory, { recursive: true }).filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.endsWith("route.ts"),
  )) {
    const path =
      "/api/v1/" +
      file.replace(/\/route\.ts$/, "").replace(/\[([^\]]+)\]/g, "{$1}");
    const route = readFileSync(resolve(directory, file), "utf8");
    for (const [, method] of route.matchAll(
      /export async function (GET|POST|PATCH|PUT|DELETE)\(/g,
    )) {
      if (
        !new RegExp(`^    ${method.toLowerCase()}:`, "m").test(
          documented.get(path) ?? "",
        )
      )
        missing.push(`${method} ${path}`);
    }
  }
  expect(missing).toEqual([]);
});
