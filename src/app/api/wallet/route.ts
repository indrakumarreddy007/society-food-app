import { NextResponse } from "next/server";
import { getWalletBalance } from "@/lib/store-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") ?? undefined;
    const chefId = searchParams.get("chefId") ?? undefined;

    if (!customerId && !chefId) {
      return NextResponse.json(
        { error: "customerId or chefId required" },
        { status: 400 },
      );
    }

    const data = await getWalletBalance(customerId, chefId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
