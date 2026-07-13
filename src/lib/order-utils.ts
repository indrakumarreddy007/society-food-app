import { OrderStatus } from "@/lib/types";

export function computeOrderTotal(price: number, quantity: number): number {
  return Number((price * quantity).toFixed(2));
}

export function orderStatusLabel(status: OrderStatus): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

