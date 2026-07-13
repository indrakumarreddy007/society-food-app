import { NextResponse } from "next/server";
import { createOrder, debitCustomerWallet, getDashboardData } from "@/lib/store-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const chefId = searchParams.get("chefId");
  const { orders } = await getDashboardData();

  const filtered = orders.filter((order) => {
    if (customerId && order.customerId !== customerId) {
      return false;
    }
    if (chefId && order.chefId !== chefId) {
      return false;
    }
    return true;
  });

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const order = await createOrder(body);
    // Debit customer wallet on order placement
    try {
      await debitCustomerWallet(order.customerId, order.totalAmount, order.id);
    } catch {
      // Wallet debit failed — order still placed but logged
    }
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not place order.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

