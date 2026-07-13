import { describe, expect, it } from "vitest";
import { computeOrderTotal, orderStatusLabel } from "@/lib/order-utils";

describe("computeOrderTotal", () => {
  it("calculates amount using quantity", () => {
    expect(computeOrderTotal(129, 2)).toBe(258);
  });
});

describe("orderStatusLabel", () => {
  it("formats snake case statuses for UI", () => {
    expect(orderStatusLabel("out_for_delivery")).toBe("Out For Delivery");
  });
});

