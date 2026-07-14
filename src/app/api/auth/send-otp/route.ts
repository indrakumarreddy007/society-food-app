import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * SMS OTP is only attempted when both Supabase is configured AND
 * OTP_SMS_ENABLED=true is set (requires a real phone provider in Supabase).
 * Otherwise we fall back to mock mode (any 6-digit code accepted).
 */
function isSmsEnabled(): boolean {
  return isSupabaseConfigured() && process.env.OTP_SMS_ENABLED === "true";
}

export async function POST(request: Request) {
  const { phone } = (await request.json()) as { phone: string };

  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    return NextResponse.json(
      { message: "Enter a valid phone number with country code, e.g. +919876543210" },
      { status: 400 },
    );
  }

  if (!isSmsEnabled()) {
    return NextResponse.json({ success: true, mock: true });
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
