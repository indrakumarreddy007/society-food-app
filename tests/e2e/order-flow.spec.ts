import { expect, test } from "@playwright/test";

test("customer can place an order", async ({ page, request }) => {
  await request.post("/api/reset");
  await page.goto("/");
  await expect(page.getByText("Browse daily dishes")).toBeVisible();

  await page.getByRole("button", { name: "Customer view" }).click();
  await page.getByLabel("Add Rajma Rice Bowl to cart").first().click();
  await page.getByRole("link", { name: "Cart (1)" }).click();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Rajma Rice Bowl")).toBeVisible();

  // Switch to Cash on delivery to avoid Razorpay popup in tests
  await page.getByRole("button", { name: "Cash on delivery" }).click();
  const placeBtn = page.getByRole("button", { name: /Place order/ });
  await expect(placeBtn).toBeEnabled();
  await placeBtn.click();

  await expect(page.getByText(/Order placed/)).toBeVisible();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});
