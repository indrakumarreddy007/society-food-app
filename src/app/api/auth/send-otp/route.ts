import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  const { phone } = await request.json() as { phone: string };

  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    return NextResponse.json(
      { message: "Enter a valid phone number with country code, e.g. +919876543210" },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    // Dev mock: pretend OTP was sent
    return NextResponse.json({ success: true, mock: true });
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
