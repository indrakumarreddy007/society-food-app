import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  getProfilesByPhone,
  upsertChefProfile,
  upsertCustomerProfile,
} from "@/lib/store-service";

const requestSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("customer"),
    name: z.string().min(2),
    societyId: z.string().min(1),
    address: z.string().min(3),
  }),
  z.object({
    role: z.literal("chef"),
    name: z.string().min(2),
    kitchenName: z.string().min(2),
    societyId: z.string().min(1),
    bio: z.string().min(3).max(220).optional(),
  }),
]);

export async function GET() {
  const cookieStore = await cookies();
  const phone = cookieStore.get("session_phone")?.value;
  if (!phone) {
    return NextResponse.json(
      { message: "You need to login first." },
      { status: 401 },
    );
  }
  const profiles = await getProfilesByPhone(phone);
  return NextResponse.json({
    phone,
    societies: profiles.societies,
    customer: profiles.customer,
    chef: profiles.chef,
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const phone = cookieStore.get("session_phone")?.value;
  if (!phone) {
    return NextResponse.json(
      { message: "You need to login first." },
      { status: 401 },
    );
  }

  const payload = requestSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { message: "Please fill all required profile details." },
      { status: 400 },
    );
  }

  if (payload.data.role === "customer") {
    const customer = await upsertCustomerProfile({
      phone,
      name: payload.data.name,
      societyId: payload.data.societyId,
      address: payload.data.address,
    });
    return NextResponse.json({ role: "customer", profileId: customer.id });
  }

  const chef = await upsertChefProfile({
    phone,
    name: payload.data.name,
    kitchenName: payload.data.kitchenName,
    societyId: payload.data.societyId,
    bio: payload.data.bio ?? "Home-cooked meals made fresh daily.",
  });
  return NextResponse.json({ role: "chef", profileId: chef.id });
}
