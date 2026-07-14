"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  CART_CUSTOMER_STORAGE_KEY,
  CHEF_SELECTION_STORAGE_KEY,
  ROLE_SELECTION_STORAGE_KEY,
} from "@/lib/cart-storage";
import type { Chef, Customer, Society } from "@/lib/types";

type Step = "phone" | "otp" | "profile" | "done";
type ProfileRole = "customer" | "chef";

type ProfileBootstrapResponse = {
  phone: string;
  societies: Society[];
  customer: Customer | null;
  chef: Chef | null;
};

export function LoginView() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [profileRole, setProfileRole] = useState<ProfileRole>("customer");
  const [societies, setSocieties] = useState<Society[]>([]);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [existingChef, setExistingChef] = useState<Chef | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileKitchenName, setProfileKitchenName] = useState("");
  const [profileSocietyId, setProfileSocietyId] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileBio, setProfileBio] = useState("Home-cooked meals made fresh daily.");

  function setRoleFormValues(
    role: ProfileRole,
    customerProfile: Customer | null,
    chefProfile: Chef | null,
    availableSocieties: Society[],
  ) {
    if (role === "customer") {
      setProfileName(customerProfile?.name ?? "");
      setProfileSocietyId(customerProfile?.societyId ?? availableSocieties[0]?.id ?? "");
      setProfileAddress(customerProfile?.address ?? "");
      return;
    }
    setProfileName(chefProfile?.name ?? "");
    setProfileKitchenName(chefProfile?.kitchenName ?? "");
    setProfileSocietyId(chefProfile?.societyId ?? availableSocieties[0]?.id ?? "");
    setProfileBio(chefProfile?.bio ?? "Home-cooked meals made fresh daily.");
  }

  async function loadProfileBootstrap() {
    const response = await fetch("/api/auth/profile");
    const payload = (await response.json()) as
      | ProfileBootstrapResponse
      | { message?: string };
    if (!response.ok) {
      throw new Error(
        "message" in payload && payload.message
          ? payload.message
          : "Failed to load profile setup.",
      );
    }
    const typedPayload = payload as ProfileBootstrapResponse;
    setSocieties(typedPayload.societies);
    setExistingCustomer(typedPayload.customer);
    setExistingChef(typedPayload.chef);
    const defaultRole: ProfileRole = typedPayload.customer ? "customer" : "chef";
    setProfileRole(defaultRole);
    setRoleFormValues(
      defaultRole,
      typedPayload.customer,
      typedPayload.chef,
      typedPayload.societies,
    );
  }

  async function sendOtp() {
    setError("");
    const raw = phone.trim();
    if (!raw) {
      setError("Enter your phone number.");
      return;
    }
    const formatted = raw.startsWith("+") ? raw : `+91${raw}`;
    setIsBusy(true);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: formatted }),
    });
    const data = (await res.json()) as {
      success?: boolean;
      message?: string;
      mock?: boolean;
    };
    setIsBusy(false);
    if (!res.ok) {
      setError(data.message ?? "Failed to send OTP.");
      return;
    }
    setPhone(formatted);
    setIsMock(Boolean(data.mock));
    setStep("otp");
  }

  async function verifyOtp(otpOverride?: string) {
    const token = otpOverride ?? otp;
    setError("");
    if (!token.trim()) {
      setError("Enter the OTP.");
      return;
    }
    setIsBusy(true);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, token }),
    });
    const data = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) {
      setIsBusy(false);
      setError(data.message ?? "Invalid OTP.");
      return;
    }
    try {
      await loadProfileBootstrap();
      setStep("profile");
    } catch (bootstrapError) {
      const message =
        bootstrapError instanceof Error
          ? bootstrapError.message
          : "Failed to load profile setup.";
      setError(message);
      setStep("otp");
    } finally {
      setIsBusy(false);
    }
  }

  async function saveProfile() {
    setError("");
    if (!profileName.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!profileSocietyId) {
      setError("Select your society.");
      return;
    }
    if (profileRole === "customer" && !profileAddress.trim()) {
      setError("Enter your flat/house details.");
      return;
    }
    if (profileRole === "chef" && !profileKitchenName.trim()) {
      setError("Enter your kitchen name.");
      return;
    }

    const requestBody =
      profileRole === "customer"
        ? {
            role: "customer" as const,
            name: profileName.trim(),
            societyId: profileSocietyId,
            address: profileAddress.trim(),
          }
        : {
            role: "chef" as const,
            name: profileName.trim(),
            kitchenName: profileKitchenName.trim(),
            societyId: profileSocietyId,
            bio: profileBio.trim() || "Home-cooked meals made fresh daily.",
          };

    setIsBusy(true);
    const response = await fetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const payload = (await response.json()) as {
      role?: ProfileRole;
      profileId?: string;
      message?: string;
    };
    setIsBusy(false);

    if (!response.ok || !payload.role || !payload.profileId) {
      setError(payload.message ?? "Failed to save profile.");
      return;
    }

    localStorage.setItem(ROLE_SELECTION_STORAGE_KEY, payload.role);
    if (payload.role === "customer") {
      localStorage.setItem(CART_CUSTOMER_STORAGE_KEY, payload.profileId);
    } else {
      localStorage.setItem(CHEF_SELECTION_STORAGE_KEY, payload.profileId);
    }

    setStep("done");
    setTimeout(() => router.push("/"), 1000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl shadow-lg">
            🍱
          </div>
          <h1 className="text-2xl font-bold">Society Food Market</h1>
          <p className="mt-1 text-sm text-muted">Home-cooked meals from your neighbors</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {step === "phone" ? (
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
                    onChange={(event) => setPhone(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && void sendOtp()}
                    placeholder="9876543210"
                    className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                    autoFocus
                    maxLength={15}
                  />
                </div>
                {error ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void sendOtp()}
                  disabled={isBusy}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Sending OTP..." : "Get OTP"}
                </button>
              </div>
            </>
          ) : null}

          {step === "otp" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError("");
                }}
                className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-foreground"
              >
                ← Back
              </button>
              <h2 className="text-lg font-semibold">Enter OTP</h2>
              <p className="mt-1 text-sm text-muted">
                Sent to <span className="font-medium text-foreground">{phone}</span>
              </p>
              {isMock ? (
                <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  No SMS provider yet — enter any 6-digit number (e.g. <strong>123456</strong>)
                </div>
              ) : null}
              <OtpBoxes
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (val.length === 6) {
                    void verifyOtp(val);
                  }
                }}
                disabled={isBusy}
              />
              {error ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void verifyOtp()}
                disabled={isBusy || otp.length < 6}
                className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? "Verifying..." : "Verify OTP"}
              </button>
            </>
          ) : null}

          {step === "profile" ? (
            <>
              <h2 className="text-lg font-semibold">Complete your profile</h2>
              <p className="mt-1 text-sm text-muted">
                Add basic details to continue as customer or chef.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileRole("customer");
                    setRoleFormValues(
                      "customer",
                      existingCustomer,
                      existingChef,
                      societies,
                    );
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    profileRole === "customer"
                      ? "bg-primary text-white"
                      : "bg-surface-soft text-foreground"
                  }`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileRole("chef");
                    setRoleFormValues("chef", existingCustomer, existingChef, societies);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    profileRole === "chef"
                      ? "bg-primary text-white"
                      : "bg-surface-soft text-foreground"
                  }`}
                >
                  Chef
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
                {profileRole === "chef" ? (
                  <input
                    value={profileKitchenName}
                    onChange={(event) => setProfileKitchenName(event.target.value)}
                    placeholder="Kitchen name"
                    className="w-full rounded-lg border border-border px-3 py-2"
                  />
                ) : null}
                <select
                  value={profileSocietyId}
                  onChange={(event) => setProfileSocietyId(event.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2"
                >
                  <option value="" disabled>
                    Select society
                  </option>
                  {societies.map((society) => (
                    <option key={society.id} value={society.id}>
                      {society.name}
                    </option>
                  ))}
                </select>
                {profileRole === "customer" ? (
                  <input
                    value={profileAddress}
                    onChange={(event) => setProfileAddress(event.target.value)}
                    placeholder="Flat/House number, building"
                    className="w-full rounded-lg border border-border px-3 py-2"
                  />
                ) : (
                  <textarea
                    value={profileBio}
                    onChange={(event) => setProfileBio(event.target.value)}
                    placeholder="What do you cook? (short bio)"
                    className="min-h-20 w-full rounded-lg border border-border px-3 py-2"
                  />
                )}
                {error ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  disabled={isBusy}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Saving..." : "Save and continue"}
                </button>
              </div>
            </>
          ) : null}

          {step === "done" ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
                ✅
              </div>
              <h2 className="text-lg font-semibold">Profile saved!</h2>
              <p className="mt-1 text-sm text-muted">Redirecting to marketplace...</p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          By signing in you agree to our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

// ── Segmented 6-box OTP input ──────────────────────────────────────────────

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function focusBox(index: number) {
    inputRefs.current[index]?.focus();
  }

  function handleKey(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key === "Backspace") {
      if (value[index]) {
        const next = value.split("");
        next[index] = "";
        onChange(next.join("").trimEnd());
      } else if (index > 0) {
        focusBox(index - 1);
        const next = value.split("");
        next[index - 1] = "";
        onChange(next.join("").trimEnd());
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusBox(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      focusBox(index + 1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    // Support paste: fill boxes starting at current index
    const chars = raw.slice(0, 6 - index).split("");
    const next = value.padEnd(6, " ").split("");
    chars.forEach((ch, i) => {
      next[index + i] = ch;
    });
    const newVal = next.join("").trimEnd().replace(/ /g, "");
    onChange(newVal);
    const nextFocus = Math.min(index + chars.length, 5);
    setTimeout(() => focusBox(nextFocus), 0);
  }

  return (
    <div className="mt-4 flex justify-center gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onFocus={(e) => e.target.select()}
          autoFocus={i === 0}
          disabled={disabled}
          className="h-12 w-11 rounded-xl border border-border text-center text-xl font-bold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

