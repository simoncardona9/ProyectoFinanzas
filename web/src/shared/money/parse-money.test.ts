import { describe, expect, it } from "vitest";
import { parseMoneyToMinor } from "./parse-money";

describe("parseMoneyToMinor", () => {
  it("accepts Spanish money notation without losing centésimos", () => {
    expect(parseMoneyToMinor("1.234,56")).toBe(123456);
    expect(parseMoneyToMinor("1000")).toBe(100000);
    expect(parseMoneyToMinor("-25,5")).toBe(-2550);
  });
  it("rejects more than two decimal places", () => {
    expect(parseMoneyToMinor("12,345")).toBeUndefined();
  });
});
