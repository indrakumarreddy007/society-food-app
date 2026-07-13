import { NextResponse } from "next/server";
import { resetStoreFromSeed } from "@/lib/store";

export async function POST() {
  await resetStoreFromSeed();
  return NextResponse.json({ ok: true });
}

