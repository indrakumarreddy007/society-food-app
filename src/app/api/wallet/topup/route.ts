import { NextResponse } from "next/server";
import { topUpCustomerWallet } from "@/lib/store-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, amount, txnRef = "" } = body as {
      customerId: string;
      amount: number;
      txnRef?: string;
    };

    if (!customerId || !amount) {
      return NextResponse.json(
        { error: "customerId and amount are required" },
        { status: 400 },
      );
    }

    const txn = await topUpCustomerWallet(customerId, Number(amount), txnRef);
    return NextResponse.json({ success: true, transaction: txn }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}
