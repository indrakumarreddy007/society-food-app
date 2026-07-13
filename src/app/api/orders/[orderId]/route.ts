import { NextResponse } from "next/server";
import { creditChefWallet, getDashboardData, updateOrder } from "@/lib/store-service";

type Context = {
  params: Promise<{ orderId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { orderId } = await context.params;
  const body = await request.json();
  try {
    const order = await updateOrder(orderId, body);
    // Credit chef wallet when order is marked delivered
    if (body.status === "delivered") {
      const { orders } = await getDashboardData();
      const full = orders.find((o) => o.id === orderId);
      if (full) {
        try {
          await creditChefWallet(full.chefId, full.totalAmount, orderId);
        } catch {
          // Non-fatal: chef credit failed
        }
      }
    }
    return NextResponse.json(order);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update order.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

