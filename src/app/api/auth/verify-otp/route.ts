import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cookies } from "next/headers";

function isSmsEnabled(): boolean {
  return isSupabaseConfigured() && process.env.OTP_SMS_ENABLED === "true";
}

export async function POST(request: Request) {
  const { phone, token } = (await request.json()) as { phone: string; token: string };

  if (!phone || !token) {
    return NextResponse.json(
      { message: "Phone and token are required." },
      { status: 400 },
    );
  }

  if (!isSmsEnabled()) {
    // Mock mode: accept any 6-digit number
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { message: "Enter any 6-digit code to sign in (demo mode)." },
        { status: 400 },
      );
    }
    const cookieStore = await cookies();
    cookieStore.set("session_phone", phone, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return NextResponse.json({ success: true, mock: true, phone });
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error || !data.session) {
    return NextResponse.json(
      { message: error?.message ?? "Invalid OTP." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("session_token", data.session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  cookieStore.set("session_phone", phone, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return NextResponse.json({ success: true, phone });
}
