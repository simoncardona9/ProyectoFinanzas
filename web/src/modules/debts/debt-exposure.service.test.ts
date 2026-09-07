import { describe, expect, it } from "vitest";
import { convertUsdMinorToUyuMinor } from "./debt-exposure.rules";

describe("convertUsdMinorToUyuMinor", () => {
  it("converts USD minor units with exact decimal arithmetic", () => {
    expect(convertUsdMinorToUyuMinor(10_000, "42.75")).toBe(427_500);
  });

  it("rounds half up to the nearest UYU minor unit", () => {
    expect(convertUsdMinorToUyuMinor(1, "0.5")).toBe(1);
    expect(convertUsdMinorToUyuMinor(1, "0.49999999")).toBe(0);
  });
});
