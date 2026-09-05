import { NextResponse } from "next/server";
import { loginSchema } from "@/modules/auth/auth.schemas";
import { login } from "@/modules/auth/auth.service";
import { errorResponse } from "@/shared/errors/api-error";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/shared/auth/session-token";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = loginSchema.safeParse(await request.json());
    if (!input.success)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and password are required.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const result = await login(input.data.email, input.data.password);
    const response = NextResponse.json({
      data: {
        user: result.user,
        activeMembership: result.activeMembership,
        memberships: result.memberships,
      },
    });
    response.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
