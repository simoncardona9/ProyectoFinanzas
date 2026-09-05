import { cookies } from "next/headers";
import { getAuthContext } from "@/modules/auth/auth.service";
import { SESSION_COOKIE } from "./session-token";

export async function requireAuth() {
  return getAuthContext((await cookies()).get(SESSION_COOKIE)?.value);
}
