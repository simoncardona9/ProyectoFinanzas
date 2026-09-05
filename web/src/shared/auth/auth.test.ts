import { describe, expect, it } from "vitest";
import { requireRole } from "./authorization";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, hashSessionToken } from "./session-token";

const viewerContext = {
  user: { id: "user-1", email: "viewer@example.test" },
  membership: {
    id: "member-1",
    householdId: "household-a",
    householdName: "A",
    role: "viewer" as const,
  },
  sessionId: "session-1",
};

describe("authentication security", () => {
  it("uses Argon2id hashes and never accepts a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toContain("$argon2id$");
    await expect(
      verifyPassword(hash, "correct horse battery staple"),
    ).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });
  it("creates opaque tokens and persists only a one-way hash", () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);
    expect(token).not.toEqual(hash);
    expect(hash).toHaveLength(64);
    expect(hashSessionToken(token)).toEqual(hash);
  });
  it("prevents a viewer from editing a household", () => {
    expect(() => requireRole(viewerContext, ["owner", "editor"])).toThrow(
      /does not allow/i,
    );
  });
});
