export const roles = ["owner", "editor", "viewer", "accountant"] as const;
export type Role = (typeof roles)[number];

export type AuthenticatedUser = { id: string; email: string };
export type Membership = {
  id: string;
  householdId: string;
  householdName: string;
  role: Role;
};
export type AuthContext = {
  user: AuthenticatedUser;
  membership: Membership;
  sessionId: string;
};
