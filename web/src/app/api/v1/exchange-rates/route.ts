import { exchangeRateRepository } from "@/modules/exchange-rates/exchange-rate.repository";
import {
  createExchangeRateSchema,
  listExchangeRatesSchema,
} from "@/modules/exchange-rates/exchange-rate.schemas";
import { createExchangeRate } from "@/modules/exchange-rates/exchange-rate.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

function validation(fields: Record<string, string[] | undefined>) {
  return Response.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid exchange rate.",
        fields,
      },
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = listExchangeRatesSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success) return validation(input.error.flatten().fieldErrors);
    return Response.json({
      data: await exchangeRateRepository.list(
        context.membership.householdId,
        input.data,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = createExchangeRateSchema.safeParse(await request.json());
    if (!input.success) return validation(input.error.flatten().fieldErrors);
    return Response.json(
      { data: await createExchangeRate(context, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
