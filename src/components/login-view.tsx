"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "phone" | "otp" | "done";

export function LoginView() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isMock, setIsMock] = useState(false);

  async function sendOtp() {
    setError("");
    const raw = phone.trim();
    if (!raw) {
      setError("Enter your phone number.");
      return;
    }
    // Auto-prefix +91 if not provided
    const formatted = raw.startsWith("+") ? raw : `+91${raw}`;
    setIsBusy(true);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: formatted }),
    });
    const data = await res.json() as { success?: boolean; message?: string; mock?: boolean };
    setIsBusy(false);
    if (!res.ok) {
      setError(data.message ?? "Failed to send OTP.");
      return;
    }
    setPhone(formatted);
    setIsMock(Boolean(data.mock));
    setStep("otp");
  }

  async function verifyOtp() {
    setError("");
    if (!otp.trim()) {
      setError("Enter the OTP.");
      return;
    }
    setIsBusy(true);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, token: otp }),
    });
    const data = await res.json() as { success?: boolean; message?: string };
    setIsBusy(false);
    if (!res.ok) {
      setError(data.message ?? "Invalid OTP.");
      return;
    }
    setStep("done");
    setTimeout(() => router.push("/"), 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo/header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl shadow-lg">
            🍱
          </div>
          <h1 className="text-2xl font-bold">Society Food Market</h1>
          <p className="mt-1 text-sm text-muted">Home-cooked meals from your neighbors</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {step === "phone" && (
            <>
              <h2 className="text-lg font-semibold">Sign in with your phone</h2>
              <p className="mt-1 text-sm text-muted">
                We&apos;ll send a 6-digit OTP to verify your number.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="flex items-center border-r border-border bg-surface-soft px-3 text-sm font-medium text-muted">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void sendOtp()}
                    placeholder="9876543210"
                    className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                    autoFocus
                    maxLength={15}
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                )}

                <button
                  type="button"
                  onClick={() => void sendOtp()}
                  disabled={isBusy}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Sending OTP…" : "Get OTP"}
                </button>
              </div>
            </>
          )}

          {step === "otp" && (
            <>
              <button
                type="button"
                onClick={() => { setStep("phone"); setError(""); }}
                className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-foreground"
              >
                ← Back
              </button>

              <h2 className="text-lg font-semibold">Enter OTP</h2>
              <p className="mt-1 text-sm text-muted">
                Sent to <span className="font-medium text-foreground">{phone}</span>
              </p>

              {isMock && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  🔧 Dev mode — enter any 6-digit number (e.g. <strong>123456</strong>)
                </div>
              )}

              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && void verifyOtp()}
                  placeholder="______"
                  className="w-full rounded-xl border border-border px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                  maxLength={6}
                />

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                )}

                <button
                  type="button"
                  onClick={() => void verifyOtp()}
                  disabled={isBusy || otp.length < 6}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Verifying…" : "Verify OTP"}
                </button>

                <button
                  type="button"
                  onClick={() => void sendOtp()}
                  disabled={isBusy}
                  className="w-full py-2 text-sm text-muted hover:text-foreground"
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {step === "done" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
                ✅
              </div>
              <h2 className="text-lg font-semibold">Logged in!</h2>
              <p className="mt-1 text-sm text-muted">Redirecting to marketplace…</p>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          By signing in you agree to our{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          {" "}and{" "}
          <Link href="/terms" className="underline">Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}
