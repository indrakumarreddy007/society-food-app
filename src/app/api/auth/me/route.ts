import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const phone = cookieStore.get("session_phone")?.value;
  if (!phone) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, phone });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session_phone");
  cookieStore.delete("session_token");
  return NextResponse.json({ success: true });
}
