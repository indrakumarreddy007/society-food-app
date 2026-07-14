import { z } from "zod";
import { computeOrderTotal } from "@/lib/order-utils";
import { createId, mutateStore, nowIso, readStore } from "@/lib/store";
import type {
  Chef,
  Customer,
  DashboardData,
  Dish,
  IssueType,
  IssueWithDetails,
  OrderStatus,
  OrderWithDetails,
  PaymentStatus,
  Society,
  WalletTransaction,
} from "@/lib/types";

const addDishSchema = z.object({
  chefId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().min(2),
  price: z.number().positive(),
  quantityAvailable: z.number().int().positive(),
  cutoffTime: z.string().min(3),
  tags: z.array(z.string()).max(5).default([]),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  dishId: z.string().min(1),
  quantity: z.number().int().positive(),
  note: z.string().max(250).default(""),
});

const updateOrderSchema = z.object({
  status: z
    .enum([
      "placed",
      "accepted",
      "preparing",
      "ready",
      "out_for_delivery",
      "delivered",
      "rejected",
    ])
    .optional(),
  paymentStatus: z.enum(["pending", "paid"]).optional(),
});

const createIssueSchema = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  issueType: z.enum(["late_delivery", "quality_issue", "wrong_item"]),
  message: z.string().min(5).max(250),
});

const updateIssueStatusSchema = z.object({
  status: z.enum(["open", "resolved"]),
});

const upsertCustomerProfileSchema = z.object({
  phone: z.string().min(8),
  name: z.string().min(2),
  societyId: z.string().min(1),
  address: z.string().min(3),
});

const upsertChefProfileSchema = z.object({
  phone: z.string().min(8),
  name: z.string().min(2),
  kitchenName: z.string().min(2),
  societyId: z.string().min(1),
  bio: z.string().min(3).max(220).default("Home-cooked meals made fresh daily."),
});

export type AddDishInput = z.infer<typeof addDishSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;
export type UpsertCustomerProfileInput = z.infer<typeof upsertCustomerProfileSchema>;
export type UpsertChefProfileInput = z.infer<typeof upsertChefProfileSchema>;

function joinOrderDetails(store: Awaited<ReturnType<typeof readStore>>): OrderWithDetails[] {
  return store.orders
    .map((order) => {
      const chef = store.chefs.find((entry) => entry.id === order.chefId);
      const customer = store.customers.find(
        (entry) => entry.id === order.customerId,
      );
      const dish = store.dishes.find((entry) => entry.id === order.dishId);
      if (!chef || !customer || !dish) {
        return null;
      }
      return {
        ...order,
        chefName: chef.name,
        customerName: customer.name,
        dishName: dish.name,
      };
    })
    .filter((entry): entry is OrderWithDetails => entry !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function joinIssueDetails(
  store: Awaited<ReturnType<typeof readStore>>,
): IssueWithDetails[] {
  return store.issues
    .map((issue) => {
      const customer = store.customers.find(
        (entry) => entry.id === issue.createdByCustomerId,
      );
      const order = store.orders.find((entry) => entry.id === issue.orderId);
      if (!customer || !order) {
        return null;
      }
      return {
        ...issue,
        customerName: customer.name,
        orderStatus: order.status,
      };
    })
    .filter((entry): entry is IssueWithDetails => entry !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getDashboardData(): Promise<DashboardData> {
  const store = await readStore();
  return {
    societies: store.societies,
    chefs: store.chefs,
    customers: store.customers,
    dishes: store.dishes
      .map((dish) => {
        const chef = store.chefs.find((entry) => entry.id === dish.chefId);
        const society = store.societies.find(
          (entry) => entry.id === chef?.societyId,
        );
        if (!chef || !society) {
          return null;
        }
        return {
          ...dish,
          chefName: chef.name,
          chefRating: chef.rating,
          societyName: society.name,
        };
      })
      .filter((entry): entry is DashboardData["dishes"][number] => entry !== null)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    orders: joinOrderDetails(store),
    issues: joinIssueDetails(store),
    walletTransactions: (store.walletTransactions ?? []).slice().sort(
      (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
    ),
  };
}

export async function addDish(payload: AddDishInput): Promise<Dish> {
  const input = addDishSchema.parse(payload);
  return mutateStore((store) => {
    const chef = store.chefs.find((entry) => entry.id === input.chefId);
    if (!chef) {
      throw new Error("Chef not found.");
    }
    const dish: Dish = {
      id: createId("dish"),
      chefId: input.chefId,
      name: input.name,
      description: input.description,
      price: input.price,
      quantityAvailable: input.quantityAvailable,
      cutoffTime: input.cutoffTime,
      tags: input.tags,
      createdAt: nowIso(),
    };
    store.dishes.unshift(dish);
    return dish;
  });
}

export async function updateDish(dishId: string, payload: Partial<AddDishInput>): Promise<Dish> {
  const input = addDishSchema.partial().parse(payload);
  return mutateStore((store) => {
    const dish = store.dishes.find((entry) => entry.id === dishId);
    if (!dish) {
      throw new Error("Dish not found.");
    }
    if (input.name !== undefined) dish.name = input.name;
    if (input.description !== undefined) dish.description = input.description;
    if (input.price !== undefined) dish.price = input.price;
    if (input.quantityAvailable !== undefined) dish.quantityAvailable = input.quantityAvailable;
    if (input.cutoffTime !== undefined) dish.cutoffTime = input.cutoffTime;
    if (input.tags !== undefined) dish.tags = input.tags;
    return dish;
  });
}

export async function createOrder(payload: CreateOrderInput) {
  const input = createOrderSchema.parse(payload);
  return mutateStore((store) => {
    const customer = store.customers.find((entry) => entry.id === input.customerId);
    if (!customer) {
      throw new Error("Customer not found.");
    }
    const dish = store.dishes.find((entry) => entry.id === input.dishId);
    if (!dish) {
      throw new Error("Dish not found.");
    }
    if (dish.quantityAvailable < input.quantity) {
      throw new Error("Not enough quantity available.");
    }
    const chef = store.chefs.find((entry) => entry.id === dish.chefId);
    if (!chef) {
      throw new Error("Chef not found for selected dish.");
    }
    if (chef.societyId !== customer.societyId) {
      throw new Error("Customer and chef must be in the same society.");
    }

    const order = {
      id: createId("order"),
      customerId: customer.id,
      chefId: chef.id,
      dishId: dish.id,
      quantity: input.quantity,
      totalAmount: computeOrderTotal(dish.price, input.quantity),
      note: input.note,
      status: "placed" as OrderStatus,
      paymentStatus: "pending" as PaymentStatus,
      address: customer.address,
      createdAt: nowIso(),
    };
    dish.quantityAvailable -= input.quantity;
    store.orders.unshift(order);
    return order;
  });
}

export async function updateOrder(orderId: string, payload: UpdateOrderInput) {
  const input = updateOrderSchema.parse(payload);
  return mutateStore((store) => {
    const order = store.orders.find((entry) => entry.id === orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    if (input.status) {
      order.status = input.status;
    }
    if (input.paymentStatus) {
      order.paymentStatus = input.paymentStatus;
    }
    return order;
  });
}

export async function createIssue(payload: CreateIssueInput) {
  const input = createIssueSchema.parse(payload);
  return mutateStore((store) => {
    const order = store.orders.find((entry) => entry.id === input.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.customerId !== input.customerId) {
      throw new Error("Issue can only be raised by the customer who placed the order.");
    }
    const issue = {
      id: createId("issue"),
      orderId: input.orderId,
      createdByCustomerId: input.customerId,
      issueType: input.issueType as IssueType,
      message: input.message,
      status: "open" as const,
      createdAt: nowIso(),
    };
    store.issues.unshift(issue);
    return issue;
  });
}

export async function updateIssueStatus(
  issueId: string,
  payload: UpdateIssueStatusInput,
) {
  const input = updateIssueStatusSchema.parse(payload);
  return mutateStore((store) => {
    const issue = store.issues.find((entry) => entry.id === issueId);
    if (!issue) {
      throw new Error("Issue not found.");
    }
    issue.status = input.status;
    return issue;
  });
}

export async function getProfilesByPhone(phone: string): Promise<{
  societies: Society[];
  customer: Customer | null;
  chef: Chef | null;
}> {
  const normalizedPhone = phone.trim();
  if (!normalizedPhone) {
    throw new Error("Phone is required.");
  }
  const store = await readStore();
  return {
    societies: store.societies,
    customer:
      store.customers.find((entry) => entry.phone === normalizedPhone) ?? null,
    chef: store.chefs.find((entry) => entry.phone === normalizedPhone) ?? null,
  };
}

export async function upsertCustomerProfile(
  payload: UpsertCustomerProfileInput,
): Promise<Customer> {
  const input = upsertCustomerProfileSchema.parse(payload);
  return mutateStore((store) => {
    const society = store.societies.find((entry) => entry.id === input.societyId);
    if (!society) {
      throw new Error("Society not found.");
    }
    const existing = store.customers.find((entry) => entry.phone === input.phone);
    if (existing) {
      existing.name = input.name.trim();
      existing.societyId = input.societyId;
      existing.address = input.address.trim();
      return existing;
    }
    const customer: Customer = {
      id: createId("cust"),
      name: input.name.trim(),
      phone: input.phone,
      societyId: input.societyId,
      address: input.address.trim(),
      walletBalance: 0,
    };
    store.customers.unshift(customer);
    return customer;
  });
}

export async function upsertChefProfile(
  payload: UpsertChefProfileInput,
): Promise<Chef> {
  const input = upsertChefProfileSchema.parse(payload);
  return mutateStore((store) => {
    const society = store.societies.find((entry) => entry.id === input.societyId);
    if (!society) {
      throw new Error("Society not found.");
    }
    const existing = store.chefs.find((entry) => entry.phone === input.phone);
    if (existing) {
      existing.name = input.name.trim();
      existing.kitchenName = input.kitchenName.trim();
      existing.societyId = input.societyId;
      existing.bio = input.bio.trim();
      return existing;
    }
    const chef: Chef = {
      id: createId("chef"),
      name: input.name.trim(),
      kitchenName: input.kitchenName.trim(),
      phone: input.phone,
      societyId: input.societyId,
      rating: 5,
      isVerified: false,
      bio: input.bio.trim(),
      walletBalance: 0,
    };
    store.chefs.unshift(chef);
    return chef;
  });
}

// ─── Wallet operations ────────────────────────────────────────────────────────

export async function getWalletBalance(
  customerId?: string,
  chefId?: string,
): Promise<{ balance: number; transactions: WalletTransaction[] }> {
  const store = await readStore();
  let balance = 0;
  if (customerId) {
    const customer = store.customers.find((c) => c.id === customerId);
    balance = customer?.walletBalance ?? 0;
  } else if (chefId) {
    const chef = store.chefs.find((c) => c.id === chefId);
    balance = chef?.walletBalance ?? 0;
  }
  const transactions = (store.walletTransactions ?? []).filter(
    (t) =>
      (customerId && t.customerId === customerId) ||
      (chefId && t.chefId === chefId),
  );
  return { balance, transactions };
}

export async function topUpCustomerWallet(
  customerId: string,
  amount: number,
  txnRef: string,
): Promise<WalletTransaction> {
  if (amount <= 0) throw new Error("Top-up amount must be positive.");
  return mutateStore((store) => {
    const customer = store.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error("Customer not found.");
    customer.walletBalance = (customer.walletBalance ?? 0) + amount;
    if (!store.walletTransactions) store.walletTransactions = [];
    const txn: WalletTransaction = {
      id: createId("wtxn"),
      type: "topup",
      amount,
      description: `Wallet top-up${txnRef ? ` (ref: ${txnRef})` : ""}`,
      customerId,
      createdAt: nowIso(),
    };
    store.walletTransactions.unshift(txn);
    return txn;
  });
}

export async function debitCustomerWallet(
  customerId: string,
  amount: number,
  orderId: string,
): Promise<WalletTransaction> {
  return mutateStore((store) => {
    const customer = store.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error("Customer not found.");
    const balance = customer.walletBalance ?? 0;
    if (balance < amount)
      throw new Error(`Insufficient wallet balance. Available: ₹${balance}`);
    customer.walletBalance = balance - amount;
    if (!store.walletTransactions) store.walletTransactions = [];
    const txn: WalletTransaction = {
      id: createId("wtxn"),
      type: "debit",
      amount,
      description: `Order payment`,
      customerId,
      orderId,
      createdAt: nowIso(),
    };
    store.walletTransactions.unshift(txn);
    return txn;
  });
}

export async function creditChefWallet(
  chefId: string,
  amount: number,
  orderId: string,
): Promise<WalletTransaction> {
  return mutateStore((store) => {
    const chef = store.chefs.find((c) => c.id === chefId);
    if (!chef) throw new Error("Chef not found.");
    chef.walletBalance = (chef.walletBalance ?? 0) + amount;
    if (!store.walletTransactions) store.walletTransactions = [];
    const txn: WalletTransaction = {
      id: createId("wtxn"),
      type: "credit",
      amount,
      description: `Order earnings`,
      chefId,
      orderId,
      createdAt: nowIso(),
    };
    store.walletTransactions.unshift(txn);
    return txn;
  });
}

export async function settleChefWallet(
  chefId: string,
  amount: number,
  upiRef: string,
): Promise<WalletTransaction> {
  return mutateStore((store) => {
    const chef = store.chefs.find((c) => c.id === chefId);
    if (!chef) throw new Error("Chef not found.");
    const balance = chef.walletBalance ?? 0;
    if (balance < amount)
      throw new Error(`Insufficient wallet balance. Available: ₹${balance}`);
    chef.walletBalance = balance - amount;
    if (!store.walletTransactions) store.walletTransactions = [];
    const txn: WalletTransaction = {
      id: createId("wtxn"),
      type: "settlement",
      amount,
      description: `UPI settlement${upiRef ? ` (ref: ${upiRef})` : ""}`,
      chefId,
      createdAt: nowIso(),
    };
    store.walletTransactions.unshift(txn);
    return txn;
  });
}
