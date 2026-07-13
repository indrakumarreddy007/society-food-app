import { NextResponse } from "next/server";
import { settleChefWallet } from "@/lib/store-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chefId, amount, upiRef = "" } = body as {
      chefId: string;
      amount: number;
      upiRef?: string;
    };

    if (!chefId || !amount) {
      return NextResponse.json(
        { error: "chefId and amount are required" },
        { status: 400 },
      );
    }

    const txn = await settleChefWallet(chefId, Number(amount), upiRef);
    return NextResponse.json({ success: true, transaction: txn }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}
