import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/errors/api-error";

const { requireAuth, updateViewMode } = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  updateViewMode: vi.fn(),
}));
vi.mock("@/shared/auth/request-auth", () => ({ requireAuth }));
vi.mock("@/modules/auth/auth.repository", () => ({
  authRepository: { updateViewMode },
}));
import { PATCH } from "./route";

const request = (body: unknown) =>
  new Request("http://localhost/api/v1/auth/view-mode", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("view-mode preference API", () => {
  beforeEach(() => {
    requireAuth.mockReset();
    updateViewMode.mockReset();
    requireAuth.mockResolvedValue({
      user: { id: "viewer-1", email: "viewer@example.test", viewMode: "basic" },
      membership: { role: "viewer", householdId: "household-1" },
    });
  });

  it("lets a viewer change only their own display preference", async () => {
    updateViewMode.mockResolvedValue({ viewMode: "advanced" });
    const response = await PATCH(request({ viewMode: "advanced" }));
    expect(response.status).toBe(200);
    expect(updateViewMode).toHaveBeenCalledWith("viewer-1", "advanced");
    expect(await response.json()).toEqual({ data: { viewMode: "advanced" } });
  });

  it("rejects invalid choices before writing", async () => {
    const response = await PATCH(request({ viewMode: "hidden" }));
    expect(response.status).toBe(400);
    expect(updateViewMode).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    requireAuth.mockRejectedValue(
      new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
    );
    const response = await PATCH(request({ viewMode: "advanced" }));
    expect(response.status).toBe(401);
    expect(updateViewMode).not.toHaveBeenCalled();
  });
});
