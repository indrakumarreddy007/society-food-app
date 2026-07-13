"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CART_CUSTOMER_STORAGE_KEY,
  CART_STORAGE_KEY,
  parseCartItems,
} from "@/lib/cart-storage";
import { orderStatusLabel } from "@/lib/order-utils";
import type {
  DashboardData,
  IssueType,
  OrderStatus,
  PaymentStatus,
  Role,
} from "@/lib/types";

const roles: Array<{ key: Role; label: string }> = [
  { key: "customer", label: "Customer" },
  { key: "chef", label: "Chef" },
  { key: "admin", label: "Admin" },
];

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

export function MarketplaceApp() {
  type CustomerBrowseMode = "cook" | "dish";

  const [activeRole, setActiveRole] = useState<Role>("customer");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() =>
    typeof window === "undefined"
      ? ""
      : (localStorage.getItem(CART_CUSTOMER_STORAGE_KEY) ?? ""),
  );
  const [selectedChefId, setSelectedChefId] = useState<string>("");
  const [selectedDishId, setSelectedDishId] = useState<string>("");
  const [cartItems, setCartItems] = useState<
    Array<{ dishId: string; quantity: number; note: string }>
  >(() =>
    typeof window === "undefined"
      ? []
      : parseCartItems(localStorage.getItem(CART_STORAGE_KEY)),
  );
  const [customerBrowseMode, setCustomerBrowseMode] =
    useState<CustomerBrowseMode>("cook");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCookId, setSelectedCookId] = useState<string>("");
  const [chefDishName, setChefDishName] = useState("");
  const [chefDishDescription, setChefDishDescription] = useState("");
  const [chefDishPrice, setChefDishPrice] = useState(149);
  const [chefDishQuantity, setChefDishQuantity] = useState(10);
  const [chefDishCutoff, setChefDishCutoff] = useState("11:30");
  const [chefDishTags, setChefDishTags] = useState("lunch,veg");
  const [chefDishImageUrl, setChefDishImageUrl] = useState("");
  const [chefDishImagePreview, setChefDishImagePreview] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string>("");
  const [issueOrderId, setIssueOrderId] = useState("");
  const [issueMessage, setIssueMessage] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("quality_issue");
  const [flashMessage, setFlashMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);

  async function loadDashboardData() {
    setLoadError("");
    const result = await requestJson<DashboardData>("/api/dashboard");
    if (!result.ok) {
      setLoadError(result.message);
      return;
    }
    setDashboard(result.data);
    if (!selectedCustomerId && result.data.customers[0]) {
      setSelectedCustomerId(result.data.customers[0].id);
    }
    if (!selectedChefId && result.data.chefs[0]) {
      setSelectedChefId(result.data.chefs[0].id);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial bootstrap only
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (!selectedCustomerId) {
      return;
    }
    localStorage.setItem(CART_CUSTOMER_STORAGE_KEY, selectedCustomerId);
  }, [selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => dashboard?.customers.find((entry) => entry.id === selectedCustomerId),
    [dashboard, selectedCustomerId],
  );

  const selectedChef = useMemo(
    () => dashboard?.chefs.find((entry) => entry.id === selectedChefId),
    [dashboard, selectedChefId],
  );

  const customerDishes = useMemo(() => {
    if (!dashboard || !selectedCustomer) {
      return [];
    }
    const chefIds = dashboard.chefs
      .filter((entry) => entry.societyId === selectedCustomer.societyId)
      .map((entry) => entry.id);
    return dashboard.dishes.filter(
      (entry) => chefIds.includes(entry.chefId) && entry.quantityAvailable > 0,
    );
  }, [dashboard, selectedCustomer]);

  const customerCookCards = useMemo(() => {
    if (!dashboard || !selectedCustomer) {
      return [];
    }
    const localChefs = dashboard.chefs.filter(
      (entry) => entry.societyId === selectedCustomer.societyId,
    );
    return localChefs
      .map((chef) => {
        const chefDishesList = customerDishes.filter(
          (dish) => dish.chefId === chef.id,
        );
        if (chefDishesList.length === 0) {
          return null;
        }
        return {
          chef,
          dishCount: chefDishesList.length,
          minPrice: Math.min(...chefDishesList.map((dish) => dish.price)),
          maxPrice: Math.max(...chefDishesList.map((dish) => dish.price)),
          sampleTags: [
            ...new Set(chefDishesList.flatMap((dish) => dish.tags)),
          ].slice(0, 3),
          dishes: chefDishesList,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          chef: DashboardData["chefs"][number];
          dishCount: number;
          minPrice: number;
          maxPrice: number;
          sampleTags: string[];
          dishes: DashboardData["dishes"];
        } => entry !== null,
      )
      .sort((a, b) => b.chef.rating - a.chef.rating);
  }, [customerDishes, dashboard, selectedCustomer]);

  const customerOrders = useMemo(
    () =>
      dashboard?.orders.filter((entry) => entry.customerId === selectedCustomerId) ??
      [],
    [dashboard, selectedCustomerId],
  );

  const chefOrders = useMemo(
    () => dashboard?.orders.filter((entry) => entry.chefId === selectedChefId) ?? [],
    [dashboard, selectedChefId],
  );

  const chefDishes = useMemo(
    () => dashboard?.dishes.filter((entry) => entry.chefId === selectedChefId) ?? [],
    [dashboard, selectedChefId],
  );

  const openIssues = dashboard?.issues.filter((entry) => entry.status === "open") ?? [];

  const effectiveSelectedCookId =
    selectedCookId && customerCookCards.some((entry) => entry.chef.id === selectedCookId)
      ? selectedCookId
      : (customerCookCards[0]?.chef.id ?? "");
  const selectedCook = customerCookCards.find(
    (entry) => entry.chef.id === effectiveSelectedCookId,
  );
  const normalizedSearch = customerSearchQuery.trim().toLowerCase();
  const filteredCookCards = customerCookCards.filter((entry) => {
    if (!normalizedSearch) {
      return true;
    }
    return (
      entry.chef.name.toLowerCase().includes(normalizedSearch) ||
      entry.sampleTags.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ||
      entry.dishes.some((dish) => dish.name.toLowerCase().includes(normalizedSearch))
    );
  });

  const filteredDishCards = customerDishes.filter((dish) => {
    if (effectiveSelectedCookId && dish.chefId !== effectiveSelectedCookId) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }
    return (
      dish.name.toLowerCase().includes(normalizedSearch) ||
      dish.chefName.toLowerCase().includes(normalizedSearch) ||
      dish.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch))
    );
  });
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = useMemo(() => {
    if (!dashboard) {
      return 0;
    }
    return cartItems.reduce((sum, item) => {
      const dish = dashboard.dishes.find((entry) => entry.id === item.dishId);
      if (!dish) {
        return sum;
      }
      return sum + dish.price * item.quantity;
    }, 0);
  }, [cartItems, dashboard]);
  const cartPreviewRows = useMemo(() => {
    if (!dashboard) {
      return [];
    }
    return cartItems
      .map((item) => {
        const dish = dashboard.dishes.find((entry) => entry.id === item.dishId);
        if (!dish) {
          return null;
        }
        return {
          ...item,
          dishName: dish.name,
          chefName: dish.chefName,
          price: dish.price,
          lineTotal: dish.price * item.quantity,
        };
      })
      .filter(
        (
          row,
        ): row is {
          dishId: string;
          quantity: number;
          note: string;
          dishName: string;
          chefName: string;
          price: number;
          lineTotal: number;
        } => row !== null,
      );
  }, [cartItems, dashboard]);
  const estimatedDeliveryText =
    cartCount <= 2 ? "Delivery in 20-30 mins" : "Delivery in 30-40 mins";
  const estimatedSavings = Math.min(40, cartCount * 10);

  function addToCart(dishId: string) {
    setCartItems((previous) => {
      const existing = previous.find((item) => item.dishId === dishId);
      if (existing) {
        return previous.map((item) =>
          item.dishId === dishId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...previous, { dishId, quantity: 1, note: "" }];
    });
    setSelectedDishId(dishId);
    setFlashMessage("Added to cart.");
  }

  function removeFromCart(dishId: string) {
    setCartItems((previous) => previous.filter((item) => item.dishId !== dishId));
  }

  function updateCartItemQuantity(dishId: string, quantity: number) {
    setCartItems((previous) =>
      previous.map((item) =>
        item.dishId === dishId
          ? { ...item, quantity: Math.max(1, Math.floor(quantity)) }
          : item,
      ),
    );
  }

  function startEditingDish(dishId: string) {
    const dish = chefDishes.find((d) => d.id === dishId);
    if (!dish) return;
    setEditingDishId(dishId);
    setChefDishName(dish.name);
    setChefDishDescription(dish.description);
    setChefDishPrice(dish.price);
    setChefDishQuantity(dish.quantityAvailable);
    setChefDishCutoff(dish.cutoffTime);
    setChefDishTags(dish.tags.join(","));
    setChefDishImageUrl((dish as { imageUrl?: string }).imageUrl ?? "");
    setChefDishImagePreview((dish as { imageUrl?: string }).imageUrl ?? "");
  }

  function cancelEditingDish() {
    setEditingDishId("");
    setChefDishName("");
    setChefDishDescription("");
    setChefDishPrice(149);
    setChefDishQuantity(10);
    setChefDishCutoff("11:30");
    setChefDishTags("lunch,veg");
    setChefDishImageUrl("");
    setChefDishImagePreview("");
  }

  async function handleDishImageUpload(file: File) {
    setIsUploadingImage(true);
    const preview = URL.createObjectURL(file);
    setChefDishImagePreview(preview);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json() as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        setFlashMessage(data.message ?? "Image upload failed.");
      } else {
        setChefDishImageUrl(data.url);
      }
    } catch {
      setFlashMessage("Image upload failed.");
    }
    setIsUploadingImage(false);
  }

  async function submitChefDish() {
    if (!selectedChefId) {
      setFlashMessage("Choose chef profile first.");
      return;
    }
    setIsBusy(true);
    
    if (editingDishId) {
      // Update existing dish
      const result = await requestJson(`/api/dishes`, {
        method: "PUT",
        body: JSON.stringify({
          dishId: editingDishId,
          name: chefDishName,
          description: chefDishDescription,
          price: chefDishPrice,
          quantityAvailable: chefDishQuantity,
          cutoffTime: chefDishCutoff,
          imageUrl: chefDishImageUrl || undefined,
          tags: chefDishTags
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        }),
      });
      setIsBusy(false);
      if (!result.ok) {
        setFlashMessage(result.message);
        return;
      }
      setFlashMessage("Dish updated successfully.");
      cancelEditingDish();
      await loadDashboardData();
    } else {
      // Create new dish
      const result = await requestJson("/api/dishes", {
        method: "POST",
        body: JSON.stringify({
          chefId: selectedChefId,
          name: chefDishName,
          description: chefDishDescription,
          price: chefDishPrice,
          quantityAvailable: chefDishQuantity,
          cutoffTime: chefDishCutoff,
          imageUrl: chefDishImageUrl || undefined,
          tags: chefDishTags
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        }),
      });
      setIsBusy(false);
      if (!result.ok) {
        setFlashMessage(result.message);
        return;
      }
      setChefDishName("");
      setChefDishDescription("");
      setChefDishPrice(149);
      setChefDishQuantity(10);
      setChefDishCutoff("11:30");
      setChefDishTags("lunch,veg");
      setChefDishImageUrl("");
      setChefDishImagePreview("");
      setFlashMessage("Dish published for today.");
      await loadDashboardData();
    }
  }

  async function updateOrder(
    orderId: string,
    status: OrderStatus,
    paymentStatus: PaymentStatus,
  ) {
    setIsBusy(true);
    const result = await requestJson(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, paymentStatus }),
    });
    setIsBusy(false);
    if (!result.ok) {
      setFlashMessage(result.message);
      return;
    }
    setFlashMessage("Order updated.");
    await loadDashboardData();
  }

  async function submitIssue() {
    if (!issueOrderId || !selectedCustomerId) {
      setFlashMessage("Select an order and customer to raise an issue.");
      return;
    }
    setIsBusy(true);
    const result = await requestJson("/api/issues", {
      method: "POST",
      body: JSON.stringify({
        orderId: issueOrderId,
        customerId: selectedCustomerId,
        issueType,
        message: issueMessage,
      }),
    });
    setIsBusy(false);
    if (!result.ok) {
      setFlashMessage(result.message);
      return;
    }
    setFlashMessage("Issue raised. Admin has been notified.");
    setIssueOrderId("");
    setIssueMessage("");
    await loadDashboardData();
  }

  async function resolveIssue(issueId: string) {
    setIsBusy(true);
    const result = await requestJson(`/api/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved" }),
    });
    setIsBusy(false);
    if (!result.ok) {
      setFlashMessage(result.message);
      return;
    }
    setFlashMessage("Issue resolved.");
    await loadDashboardData();
  }

  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10 ${
        activeRole === "customer" && cartCount > 0 ? "pb-28" : ""
      }`}
    >
      <header className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-primary">Society Food Market</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Home-cooked meals from trusted neighbors
        </h1>
        <p className="mt-3 max-w-3xl text-muted">
          A customer-friendly platform for society chefs to publish daily menus,
          collect orders, and manage cash/UPI-on-delivery workflows.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.key}
              type="button"
              onClick={() => {
                setActiveRole(role.key);
                setIsMiniCartOpen(false);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeRole === role.key
                  ? "bg-primary text-white"
                  : "bg-surface-soft text-foreground hover:bg-orange-100"
              }`}
            >
              {role.label} view
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/auth"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-surface-soft"
          >
            <span aria-hidden>👤</span>
            <span>Login</span>
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-surface-soft"
            aria-label={`Cart (${cartCount})`}
          >
            <span aria-hidden>🛒</span>
            <span>Cart</span>
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
              {cartCount}
            </span>
          </Link>
        </div>
      </div>

      {flashMessage ? (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm">
          {flashMessage}
        </div>
      ) : null}

      {loadError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {!dashboard ? (
        <section className="mt-6 rounded-xl border border-border bg-surface p-5">
          Loading marketplace data...
        </section>
      ) : null}

      {dashboard && activeRole === "customer" ? (
        <section className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-5 text-white shadow-sm">
              <h2 className="text-2xl font-semibold">Browse daily dishes</h2>
              <p className="mt-1 text-sm text-orange-50">
                Discover local cooks around you and order in minutes.
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="block text-sm text-muted">
                Select customer
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2"
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                  aria-label="Select customer"
                >
                  {dashboard.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="self-end rounded-full bg-surface-soft px-4 py-2 text-sm font-medium">
                Society:{" "}
                {dashboard.societies.find(
                  (entry) => entry.id === selectedCustomer?.societyId,
                )?.name ?? "Unknown"}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomerBrowseMode("cook")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  customerBrowseMode === "cook"
                    ? "bg-primary text-white"
                    : "bg-surface-soft text-foreground hover:bg-orange-100"
                }`}
              >
                Filter by Cook
              </button>
              <button
                type="button"
                onClick={() => setCustomerBrowseMode("dish")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  customerBrowseMode === "dish"
                    ? "bg-primary text-white"
                    : "bg-surface-soft text-foreground hover:bg-orange-100"
                }`}
              >
                Filter by Dish
              </button>
              <input
                value={customerSearchQuery}
                onChange={(event) => setCustomerSearchQuery(event.target.value)}
                placeholder={
                  customerBrowseMode === "cook"
                    ? "Search cook, dish or cuisine..."
                    : "Search dishes, tags or cook..."
                }
                className="ml-auto min-w-56 rounded-full border border-border px-4 py-2 text-sm"
              />
            </div>

            {customerBrowseMode === "cook" ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {filteredCookCards.map((entry) => (
                    <button
                      key={entry.chef.id}
                      type="button"
                      onClick={() => {
                        setSelectedCookId(entry.chef.id);
                        setSelectedDishId(entry.dishes[0]?.id ?? "");
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        effectiveSelectedCookId === entry.chef.id
                          ? "border-primary bg-orange-50"
                          : "border-border bg-white hover:border-orange-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            Verified home cook
                          </p>
                          <h3 className="mt-1 text-lg font-semibold">{entry.chef.name}</h3>
                        </div>
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-success">
                          ⭐ {entry.chef.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted">{entry.chef.bio}</p>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {entry.dishCount} dishes • ₹{entry.minPrice} - ₹{entry.maxPrice}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.sampleTags.map((tag) => (
                          <span
                            key={`${entry.chef.id}-${tag}`}
                            className="rounded-full bg-surface-soft px-2 py-1 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedCook ? (
                  <div className="mt-5 rounded-xl border border-border bg-white p-4">
                    <h3 className="text-base font-semibold">
                      Dishes by {selectedCook.chef.name}
                    </h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {selectedCook.dishes.map((dish) => (
                        <div
                          key={dish.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedDishId(dish.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedDishId(dish.id);
                            }
                          }}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            selectedDishId === dish.id
                              ? "border-primary bg-orange-50"
                              : "border-border hover:border-orange-300"
                          }`}
                        >
                          {(dish as { imageUrl?: string }).imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={(dish as { imageUrl?: string }).imageUrl}
                              alt={dish.name}
                              className="mb-2 h-28 w-full rounded-lg object-cover"
                            />
                          )}
                          <p className="font-medium">{dish.name}</p>
                          <p className="text-sm text-muted">{dish.description}</p>
                          <p className="mt-1 text-sm font-semibold">
                            ₹{dish.price} • {dish.quantityAvailable} left
                          </p>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              addToCart(dish.id);
                            }}
                            className="mt-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-strong"
                            aria-label={`Add ${dish.name} to cart`}
                          >
                            Add to cart
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {filteredDishCards.map((dish) => (
                  <div
                    key={dish.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedCookId(dish.chefId);
                      setSelectedDishId(dish.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCookId(dish.chefId);
                        setSelectedDishId(dish.id);
                      }
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedDishId === dish.id
                        ? "border-primary bg-orange-50"
                        : "border-border bg-white hover:border-orange-300 hover:shadow-sm"
                    }`}
                  >
                    <p className="text-sm text-muted">{dish.chefName}</p>
                    <h3 className="mt-1 font-semibold">{dish.name}</h3>
                    <p className="mt-1 text-sm text-muted">{dish.description}</p>
                    <p className="mt-2 text-sm font-semibold">
                      ₹{dish.price} • {dish.quantityAvailable} left • cutoff {dish.cutoffTime}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-surface-soft px-2 py-1 text-xs">
                      {dish.tags.join(" · ")}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(dish.id);
                      }}
                      className="mt-3 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-strong"
                      aria-label={`Add ${dish.name} to cart`}
                    >
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold">Cart and support</h2>
            <div className="mt-3 rounded-xl border border-border bg-white p-4">
              <p className="text-sm text-muted">Items in cart</p>
              <p className="mt-1 text-2xl font-semibold">{cartCount}</p>
              <Link
                href="/cart"
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong"
              >
                Open cart
              </Link>
              <p className="mt-2 text-xs text-muted">
                Review quantities and notes on the dedicated cart page.
              </p>
            </div>

            <h3 className="mt-6 text-base font-semibold">Your recent orders</h3>
            <div className="mt-3 space-y-3">
              {customerOrders.map((order) => (
                <div key={order.id} className="rounded-lg border border-border bg-white p-3">
                  <p className="font-medium">{order.dishName}</p>
                  <p className="text-sm text-muted">
                    {orderStatusLabel(order.status)} • Payment: {order.paymentStatus}
                  </p>
                  <p className="text-sm text-muted">₹{order.totalAmount}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-6 text-base font-semibold">Report an issue</h3>
            <label className="mt-2 block text-sm text-muted">
              Order
              <select
                value={issueOrderId}
                onChange={(event) => setIssueOrderId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              >
                <option value="">Select order</option>
                {customerOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.dishName} - {orderStatusLabel(order.status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-sm text-muted">
              Issue type
              <select
                value={issueType}
                onChange={(event) => setIssueType(event.target.value as IssueType)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              >
                <option value="quality_issue">Quality issue</option>
                <option value="wrong_item">Wrong item</option>
                <option value="late_delivery">Late delivery</option>
              </select>
            </label>
            <textarea
              value={issueMessage}
              onChange={(event) => setIssueMessage(event.target.value)}
              placeholder="Describe the issue"
              className="mt-2 min-h-20 w-full rounded-lg border border-border px-3 py-2"
            />
            <button
              type="button"
              onClick={() => void submitIssue()}
              disabled={isBusy}
              className="mt-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              Raise issue
            </button>
          </div>
        </section>
      ) : null}

      {dashboard && activeRole === "chef" ? (
        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-xl font-semibold">Chef dashboard</h2>
            <label className="mt-3 block text-sm text-muted">
              Select chef
              <select
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                value={selectedChefId}
                onChange={(event) => setSelectedChefId(event.target.value)}
              >
                {dashboard.chefs.map((chef) => (
                  <option key={chef.id} value={chef.id}>
                    {chef.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-sm text-muted">{selectedChef?.bio}</p>

            {/* Chef wallet balance */}
            {selectedChef && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👛</span>
                  <span className="text-sm font-medium text-gray-700">Wallet earnings</span>
                </div>
                <span className="text-base font-bold text-emerald-600">
                  ₹{(selectedChef.walletBalance ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <h3 className="mt-5 font-semibold">Publish today&apos;s dish</h3>
            <div className="mt-2 space-y-2">
              <input
                value={chefDishName}
                onChange={(event) => setChefDishName(event.target.value)}
                placeholder="Dish name"
                className="w-full rounded-lg border border-border px-3 py-2"
              />
              <textarea
                value={chefDishDescription}
                onChange={(event) => setChefDishDescription(event.target.value)}
                placeholder="Description"
                className="min-h-16 w-full rounded-lg border border-border px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={chefDishPrice}
                  onChange={(event) => setChefDishPrice(Number(event.target.value))}
                  placeholder="Price"
                  className="rounded-lg border border-border px-3 py-2"
                />
                <input
                  type="number"
                  value={chefDishQuantity}
                  onChange={(event) => setChefDishQuantity(Number(event.target.value))}
                  placeholder="Quantity"
                  className="rounded-lg border border-border px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={chefDishCutoff}
                  onChange={(event) => setChefDishCutoff(event.target.value)}
                  placeholder="Cutoff (HH:mm)"
                  className="rounded-lg border border-border px-3 py-2"
                />
                <input
                  value={chefDishTags}
                  onChange={(event) => setChefDishTags(event.target.value)}
                  placeholder="tags (comma separated)"
                  className="rounded-lg border border-border px-3 py-2"
                />
              </div>

              {/* Image upload */}
              <div className="rounded-lg border border-dashed border-border bg-surface-soft p-3">
                <p className="mb-2 text-xs font-medium text-muted">Dish photo (optional)</p>
                {chefDishImagePreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={chefDishImagePreview}
                      alt="Dish preview"
                      className="h-28 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setChefDishImageUrl(""); setChefDishImagePreview(""); }}
                      className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-border bg-white py-4 text-sm text-muted hover:border-primary hover:text-primary">
                    <span className="text-2xl">{isUploadingImage ? "⏳" : "📸"}</span>
                    <span>{isUploadingImage ? "Uploading..." : "Click to upload photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={isUploadingImage}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleDishImageUpload(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <button
                type="button"
                onClick={() => void submitChefDish()}
                disabled={isBusy || isUploadingImage}
                className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingDishId ? "Update dish" : "Publish dish"}
              </button>
              {editingDishId && (
                <button
                  type="button"
                  onClick={() => cancelEditingDish()}
                  className="w-full rounded-lg border border-border px-4 py-2 font-semibold hover:bg-surface-soft"
                >
                  Cancel editing
                </button>
              )}
            </div>

            <h3 className="mt-6 font-semibold">Your live menu</h3>
            <div className="mt-2 space-y-2">
              {chefDishes.map((dish) => (
                <div
                  key={dish.id}
                  className={`rounded-lg border p-3 ${
                    editingDishId === dish.id ? "border-primary bg-orange-50" : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{dish.name}</p>
                      <p className="text-sm text-muted">
                        ₹{dish.price} • {dish.quantityAvailable} left • cutoff {dish.cutoffTime}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditingDish(dish.id)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                        editingDishId === dish.id
                          ? "bg-primary text-white"
                          : "border border-border hover:bg-surface-soft"
                      }`}
                    >
                      {editingDishId === dish.id ? "Editing..." : "Edit"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-xl font-semibold">Incoming orders</h2>
            <div className="mt-3 space-y-3">
              {chefOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-border bg-white p-4">
                  <p className="font-medium">{order.dishName}</p>
                  <p className="text-sm text-muted">
                    {order.customerName} • ₹{order.totalAmount} •{" "}
                    {orderStatusLabel(order.status)}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={order.status}
                      onChange={(event) =>
                        void updateOrder(
                          order.id,
                          event.target.value as OrderStatus,
                          order.paymentStatus,
                        )
                      }
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <option value="placed">Placed</option>
                      <option value="accepted">Accepted</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="out_for_delivery">Out for delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        void updateOrder(
                          order.id,
                          order.status,
                          order.paymentStatus === "paid" ? "pending" : "paid",
                        )
                      }
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        order.paymentStatus === "paid"
                          ? "bg-green-100 text-success"
                          : "bg-surface-soft text-foreground"
                      }`}
                    >
                      {order.paymentStatus === "paid" ? "Paid" : "Mark paid"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {dashboard && activeRole === "admin" ? (
        <section className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total customers" value={dashboard.customers.length} />
            <MetricCard
              label="Active dishes today"
              value={dashboard.dishes.filter((dish) => dish.quantityAvailable > 0).length}
            />
            <MetricCard
              label="Open issues"
              value={dashboard.issues.filter((issue) => issue.status === "open").length}
            />
            <MetricCard
              label="Orders pending payment"
              value={dashboard.orders.filter((order) => order.paymentStatus === "pending").length}
            />
          </div>

          {/* Wallet management */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Customer wallet top-up */}
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-xl font-semibold">Customer Wallet Top-Up</h2>
              <p className="mt-1 text-xs text-muted">
                Credit a customer wallet after receiving UPI payment.
              </p>
              <div className="mt-3 space-y-2">
                <select
                  id="admin-topup-customer"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Select customer</option>
                  {dashboard.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — ₹{c.walletBalance ?? 0}
                    </option>
                  ))}
                </select>
                <input
                  id="admin-topup-amount"
                  type="number"
                  placeholder="Amount (₹)"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <input
                  id="admin-topup-ref"
                  placeholder="UPI ref / note"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong"
                  onClick={() => {
                    const sel = document.getElementById("admin-topup-customer") as HTMLSelectElement;
                    const amt = document.getElementById("admin-topup-amount") as HTMLInputElement;
                    const ref = document.getElementById("admin-topup-ref") as HTMLInputElement;
                    if (!sel.value || !amt.value) return;
                    void fetch("/api/wallet/topup", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ customerId: sel.value, amount: Number(amt.value), txnRef: ref.value }),
                    }).then(async (r) => {
                      if (r.ok) {
                        alert("✅ Wallet credited successfully!");
                        const res = await fetch("/api/dashboard");
                        const data = (await res.json()) as typeof dashboard;
                        setDashboard(data);
                      } else {
                        const err = await r.json() as { error?: string };
                        alert(`Error: ${err.error ?? "Unknown error"}`);
                      }
                    });
                  }}
                >
                  Credit Wallet
                </button>
              </div>
            </div>

            {/* Chef settlement */}
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-xl font-semibold">Chef Wallet Settlement</h2>
              <p className="mt-1 text-xs text-muted">
                Record UPI settlement after paying a chef.
              </p>
              <div className="mt-3 space-y-2">
                <select
                  id="admin-settle-chef"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Select chef</option>
                  {dashboard.chefs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — ₹{c.walletBalance ?? 0}
                    </option>
                  ))}
                </select>
                <input
                  id="admin-settle-amount"
                  type="number"
                  placeholder="Amount (₹)"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <input
                  id="admin-settle-ref"
                  placeholder="UPI ref / transaction ID"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  onClick={() => {
                    const sel = document.getElementById("admin-settle-chef") as HTMLSelectElement;
                    const amt = document.getElementById("admin-settle-amount") as HTMLInputElement;
                    const ref = document.getElementById("admin-settle-ref") as HTMLInputElement;
                    if (!sel.value || !amt.value) return;
                    void fetch("/api/wallet/settle", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ chefId: sel.value, amount: Number(amt.value), upiRef: ref.value }),
                    }).then(async (r) => {
                      if (r.ok) {
                        alert("✅ Chef settlement recorded!");
                        const res = await fetch("/api/dashboard");
                        const data = (await res.json()) as typeof dashboard;
                        setDashboard(data);
                      } else {
                        const err = await r.json() as { error?: string };
                        alert(`Error: ${err.error ?? "Unknown error"}`);
                      }
                    });
                  }}
                >
                  Mark Settled
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-xl font-semibold">Issue queue</h2>
            {openIssues.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No open issues.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {openIssues.map((issue) => (
                  <div key={issue.id} className="rounded-xl border border-border bg-white p-4">
                    <p className="font-medium">{issue.issueType.replaceAll("_", " ")}</p>
                    <p className="text-sm text-muted">
                      {issue.customerName} • Order status {orderStatusLabel(issue.orderStatus)}
                    </p>
                    <p className="mt-2 text-sm">{issue.message}</p>
                    <button
                      type="button"
                      onClick={() => void resolveIssue(issue.id)}
                      className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-soft"
                    >
                      Mark resolved
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeRole === "customer" && cartCount > 0 ? (
        <div className="cart-sticky-slide-up fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 p-3 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setIsMiniCartOpen((previous) => !previous)}
            className="flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3 text-white"
          >
            <div>
              <p className="text-xs text-orange-100">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </p>
              <p className="text-lg font-semibold">₹{cartSubtotal}</p>
              <p className="text-xs text-orange-100">
                {estimatedDeliveryText} • Save ₹{estimatedSavings}
              </p>
            </div>
            <span className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-primary">
              {isMiniCartOpen ? "Hide" : "Preview"}
            </span>
          </button>
        </div>
      ) : null}

      {activeRole === "customer" && cartCount > 0 && isMiniCartOpen ? (
        <div className="fixed inset-0 z-50 bg-black/35 md:hidden">
          <button
            type="button"
            aria-label="Close mini cart"
            className="h-full w-full"
            onClick={() => setIsMiniCartOpen(false)}
          />
          <div className="mini-cart-sheet absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border border-border bg-white p-4">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-border" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mini cart</h3>
              <p className="text-sm text-muted">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="mt-3 space-y-3">
              {cartPreviewRows.map((row) => (
                <div key={row.dishId} className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.dishName}</p>
                      <p className="text-xs text-muted">
                        {row.chefName} • ₹{row.price} each
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(row.dishId)}
                      className="rounded-full border border-border px-2 py-1 text-xs font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(event) =>
                        updateCartItemQuantity(row.dishId, Number(event.target.value))
                      }
                      className="w-20 rounded-lg border border-border px-2 py-1 text-sm"
                      aria-label={`Mini cart quantity for ${row.dishName}`}
                    />
                    <p className="text-sm font-semibold">₹{row.lineTotal}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-surface-soft px-3 py-2 text-sm">
              ETA {estimatedDeliveryText} • Savings ₹{estimatedSavings}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMiniCartOpen(false)}
                className="flex-1 rounded-xl border border-border px-3 py-3 text-sm font-semibold"
              >
                Continue browsing
              </button>
              <Link
                href="/cart"
                onClick={() => setIsMiniCartOpen(false)}
                className="flex-1 rounded-xl bg-primary px-3 py-3 text-center text-sm font-semibold text-white"
              >
                Go to Cart • ₹{cartSubtotal}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
