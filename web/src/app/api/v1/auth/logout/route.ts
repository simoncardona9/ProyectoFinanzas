import { NextResponse } from "next/server";
import { authRepository } from "@/modules/auth/auth.repository";
import { hashSessionToken, SESSION_COOKIE } from "@/shared/auth/session-token";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (token) await authRepository.revokeSession(hashSessionToken(token));
  const response = NextResponse.json({ data: { loggedOut: true } });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
