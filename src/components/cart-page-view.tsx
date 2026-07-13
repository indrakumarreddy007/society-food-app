"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CART_CUSTOMER_STORAGE_KEY,
  CART_STORAGE_KEY,
  CartItem,
  parseCartItems,
} from "@/lib/cart-storage";
import type { DashboardData } from "@/lib/types";

async function requestJson<T>(
  input: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as T | { message: string };
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Request failed.";
    return { ok: false, message };
  }
  return { ok: true, data: body as T };
}

export function CartPageView() {
  const noContactStorageKey = "society-food-no-contact-v1";
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    typeof window === "undefined"
      ? []
      : parseCartItems(localStorage.getItem(CART_STORAGE_KEY)),
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (localStorage.getItem(CART_CUSTOMER_STORAGE_KEY) ?? ""),
  );
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [flashMessage, setFlashMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [noContactDelivery, setNoContactDelivery] = useState(() =>
    typeof window === "undefined"
      ? false
      : localStorage.getItem(noContactStorageKey) === "true",
  );

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    localStorage.setItem(CART_CUSTOMER_STORAGE_KEY, selectedCustomerId);
    // Fetch wallet balance whenever customer changes
    fetch(`/api/wallet?customerId=${selectedCustomerId}`)
      .then((r) => r.json())
      .then((data: { balance?: number }) => setWalletBalance(data.balance ?? 0))
      .catch(() => setWalletBalance(0));
  }, [selectedCustomerId]);

  useEffect(() => {
    localStorage.setItem(noContactStorageKey, String(noContactDelivery));
  }, [noContactDelivery]);

  useEffect(() => {
    async function loadData() {
      const result = await requestJson<DashboardData>("/api/dashboard");
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setDashboard(result.data);
      if (!selectedCustomerId && result.data.customers[0]) {
        setSelectedCustomerId(result.data.customers[0].id);
      }
    }
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cartRows = useMemo(() => {
    if (!dashboard) return [];
    return cartItems
      .map((item) => {
        const dish = dashboard.dishes.find((entry) => entry.id === item.dishId);
        if (!dish) return null;
        return { ...item, dish, total: dish.price * item.quantity };
      })
      .filter(
        (
          row,
        ): row is {
          dishId: string;
          quantity: number;
          note: string;
          dish: DashboardData["dishes"][number];
          total: number;
        } => row !== null,
      );
  }, [cartItems, dashboard]);

  const grandTotal = cartRows.reduce((sum, row) => sum + row.total, 0);
  const hasEnoughBalance = walletBalance >= grandTotal;

  function updateQuantity(dishId: string, quantity: number) {
    setCartItems((prev) =>
      prev.map((item) =>
        item.dishId === dishId
          ? { ...item, quantity: Math.max(1, Math.floor(quantity)) }
          : item,
      ),
    );
  }

  function updateNote(dishId: string, note: string) {
    setCartItems((prev) =>
      prev.map((item) => (item.dishId === dishId ? { ...item, note } : item)),
    );
  }

  function removeItem(dishId: string) {
    setCartItems((prev) => prev.filter((item) => item.dishId !== dishId));
  }

  async function placeOrderFromCart() {
    if (!selectedCustomerId) {
      setFlashMessage("Choose a customer profile before checkout.");
      return;
    }
    if (cartRows.length === 0) {
      setFlashMessage("Your cart is empty.");
      return;
    }
    if (!hasEnoughBalance) {
      setFlashMessage(
        `Insufficient wallet balance. You have ₹${walletBalance} but need ₹${grandTotal}. Please top up your wallet first.`,
      );
      return;
    }
    setIsBusy(true);
    setFlashMessage("");

    for (const row of cartRows) {
      const checkoutNote = noContactDelivery
        ? row.note.trim()
          ? `${row.note.trim()} | No-contact delivery: leave at door.`
          : "No-contact delivery: leave at door."
        : row.note;
      const result = await requestJson("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomerId,
          dishId: row.dishId,
          quantity: row.quantity,
          note: checkoutNote,
        }),
      });
      if (!result.ok) {
        setIsBusy(false);
        setFlashMessage((result as { ok: false; message: string }).message);
        return;
      }
    }

    // Refresh wallet balance after order
    const walletRes = await fetch(`/api/wallet?customerId=${selectedCustomerId}`);
    const walletData = (await walletRes.json()) as { balance?: number };
    setWalletBalance(walletData.balance ?? 0);

    setCartItems([]);
    setFlashMessage("✅ Order placed! Wallet debited.");
    setIsBusy(false);
  }

  const selectedCustomer = dashboard?.customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Your cart</h1>
          <p className="mt-1 text-sm text-muted">
            Review items and place order — payment deducted from wallet.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-soft"
        >
          Continue browsing
        </Link>
      </div>

      {flashMessage ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            flashMessage.startsWith("✅")
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          {flashMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!dashboard ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          Loading cart...
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* Items section */}
          <section className="rounded-2xl border border-border bg-surface p-5">
            <label className="block text-sm text-muted">
              Checkout as customer
              <select
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              >
                {dashboard.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 space-y-3">
              {cartRows.length === 0 ? (
                <p className="rounded-xl border border-border bg-white p-4 text-sm text-muted">
                  Your cart is empty. Add dishes from the customer home page.
                </p>
              ) : null}
              {cartRows.map((row) => (
                <div key={row.dishId} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.dish.name}</p>
                      <p className="text-sm text-muted">
                        by {row.dish.chefName} • ₹{row.dish.price} each
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(row.dishId)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface-soft"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[110px_1fr_auto]">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(event) =>
                        updateQuantity(row.dishId, Number(event.target.value))
                      }
                      className="rounded-lg border border-border px-3 py-2"
                      aria-label={`Quantity for ${row.dish.name}`}
                    />
                    <input
                      value={row.note}
                      onChange={(event) => updateNote(row.dishId, event.target.value)}
                      placeholder="Optional cooking instructions"
                      className="rounded-lg border border-border px-3 py-2"
                      aria-label={`Note for ${row.dish.name}`}
                    />
                    <div className="self-center text-right text-sm font-semibold">
                      ₹{row.total}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={noContactDelivery}
                onChange={(event) => setNoContactDelivery(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span>No-contact delivery (leave order at the door and ring the bell)</span>
            </label>
          </section>

          {/* Bill summary */}
          <aside className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-xl font-semibold">Bill details</h2>

            {/* Wallet balance display */}
            <div className="mt-4 rounded-xl bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👛</span>
                  <span className="text-sm font-medium text-gray-700">Wallet balance</span>
                </div>
                <span className={`text-base font-bold ${hasEnoughBalance ? "text-emerald-600" : "text-red-500"}`}>
                  ₹{walletBalance.toLocaleString("en-IN")}
                </span>
              </div>
              {!hasEnoughBalance && grandTotal > 0 && (
                <p className="mt-1 text-xs text-red-500">
                  Need ₹{(grandTotal - walletBalance).toLocaleString("en-IN")} more.{" "}
                  <Link href="/wallet" className="underline font-semibold">
                    Top up →
                  </Link>
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Item total</span>
                <span>₹{grandTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-emerald-600 font-medium">FREE</span>
              </div>
              <div className="text-xs text-muted">Estimated delivery: 20-35 mins</div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-base font-semibold">
                <span>To pay</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            {/* Payment method badge */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-lg">👛</span>
              <div>
                <p className="text-xs font-semibold text-emerald-700">Wallet Payment</p>
                <p className="text-xs text-emerald-600">
                  {selectedCustomer?.name ?? "Customer"} — ₹{walletBalance} available
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void placeOrderFromCart()}
              disabled={isBusy || cartRows.length === 0 || !hasEnoughBalance}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy
                ? "Placing order…"
                : cartRows.length === 0
                  ? "Cart is empty"
                  : !hasEnoughBalance
                    ? "Insufficient balance"
                    : `Pay ₹${grandTotal} from wallet →`}
            </button>

            <Link
              href="/wallet"
              className="mt-3 flex items-center justify-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              <span>👛</span> View wallet & add money
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

