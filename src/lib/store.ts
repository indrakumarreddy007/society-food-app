import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { StoreData } from "@/lib/types";

const societySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const chefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(8),
  societyId: z.string().min(1),
  rating: z.number().min(0).max(5),
  isVerified: z.boolean(),
  bio: z.string().min(1),
  walletBalance: z.number().default(0),
});

const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(8),
  societyId: z.string().min(1),
  address: z.string().min(1),
  walletBalance: z.number().default(0),
});

const dishSchema = z.object({
  id: z.string().min(1),
  chefId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().min(2),
  price: z.number().positive(),
  quantityAvailable: z.number().int().nonnegative(),
  cutoffTime: z.string().min(3),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
});

const orderStatusSchema = z.enum([
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "rejected",
]);

const paymentStatusSchema = z.enum(["pending", "paid"]);

const orderSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  chefId: z.string().min(1),
  dishId: z.string().min(1),
  quantity: z.number().int().positive(),
  totalAmount: z.number().positive(),
  note: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  address: z.string().min(5),
  createdAt: z.string().datetime(),
});

const issueSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  createdByCustomerId: z.string().min(1),
  issueType: z.enum(["late_delivery", "quality_issue", "wrong_item"]),
  message: z.string().min(5),
  status: z.enum(["open", "resolved"]),
  createdAt: z.string().datetime(),
});

const walletTransactionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["topup", "debit", "credit", "settlement", "refund"]),
  amount: z.number().positive(),
  description: z.string(),
  customerId: z.string().optional(),
  chefId: z.string().optional(),
  orderId: z.string().optional(),
  createdAt: z.string().datetime(),
});

const storeSchema = z.object({
  societies: z.array(societySchema),
  chefs: z.array(chefSchema),
  customers: z.array(customerSchema),
  dishes: z.array(dishSchema),
  orders: z.array(orderSchema),
  issues: z.array(issueSchema),
  walletTransactions: z.array(walletTransactionSchema).default([]),
});

const seedPath = path.join(process.cwd(), "src", "data", "store.seed.json");
const storePath = path.join(process.cwd(), "src", "data", "store.json");

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStoreFile() {
  try {
    await access(storePath, constants.F_OK);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      throw error;
    }
    await copyFile(seedPath, storePath);
  }
}

export async function resetStoreFromSeed() {
  await copyFile(seedPath, storePath);
}

export async function readStore(): Promise<StoreData> {
  await ensureStoreFile();
  const content = await readFile(storePath, "utf8");
  const parsed = JSON.parse(content);
  return storeSchema.parse(parsed);
}

async function writeStore(data: StoreData): Promise<void> {
  await writeFile(storePath, JSON.stringify(data, null, 2));
}

export async function mutateStore<T>(
  mutation: (draft: StoreData) => T | Promise<T>,
): Promise<T> {
  let result: T | undefined;
  writeQueue = writeQueue.then(async () => {
    const draft = await readStore();
    result = await mutation(draft);
    await writeStore(draft);
  });
  await writeQueue;
  if (result === undefined) {
    throw new Error("Store mutation did not produce a result.");
  }
  return result;
}

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
