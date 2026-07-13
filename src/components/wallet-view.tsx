"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WalletTransaction } from "@/lib/types";

const UPI_ID = process.env.NEXT_PUBLIC_ADMIN_UPI_ID ?? "admin@upi";
const UPI_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=${UPI_ID}&pn=SocietyFood&cu=INR`;

const TX_ICONS: Record<string, string> = {
  topup: "⬆️",
  debit: "⬇️",
  credit: "⬆️",
  settlement: "🏦",
  refund: "↩️",
};

const TX_COLOR: Record<string, string> = {
  topup: "text-emerald-600",
  debit: "text-red-500",
  credit: "text-emerald-600",
  settlement: "text-blue-600",
  refund: "text-amber-500",
};

export default function WalletView() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("selectedCustomer");
    const fetches: Promise<unknown>[] = [];

    if (id) {
      fetches.push(
        fetch(`/api/wallet?customerId=${id}`)
          .then((r) => r.json())
          .then((data: { balance?: number; transactions?: WalletTransaction[] }) => {
            setBalance(data.balance ?? 0);
            setTransactions(data.transactions ?? []);
          }),
        fetch(`/api/dashboard`)
          .then((r) => r.json())
          .then((data: { customers?: Array<{ id: string; name: string }> }) => {
            const cust = data.customers?.find((c) => c.id === id);
            if (cust) setCustomerName(cust.name);
          }),
      );
    }

    Promise.allSettled(fetches).finally(() => setLoading(false));
  }, []);

  const copyUpi = () => {
    void navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            {customerName ? `${customerName}'s Wallet` : "My Wallet"}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm font-medium opacity-90 mb-1">Available Balance</p>
          <p className="text-5xl font-bold">₹{balance.toLocaleString("en-IN")}</p>
          <p className="text-xs opacity-75 mt-2">Society Food Wallet</p>
        </div>

        {/* Top-up instructions */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-base">Add Money to Wallet</h2>
          <p className="text-sm text-gray-500">
            Scan the QR or send money to the UPI ID below. Your wallet will be credited within a few hours.
          </p>
          <div className="flex flex-col items-center gap-4">
            {/* QR code */}
            <div className="border-4 border-orange-100 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={UPI_QR_URL} alt="UPI QR Code" className="w-52 h-52" />
            </div>
            {/* UPI ID */}
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl w-full">
              <span className="text-sm font-mono text-gray-700 flex-1">{UPI_ID}</span>
              <button
                onClick={copyUpi}
                className="text-orange-500 text-sm font-semibold hover:text-orange-600 transition"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">
            After payment, share screenshot with admin for instant credit.
          </p>
        </div>

        {/* Transaction history */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-base mb-4">Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">💳</span>
              <p className="text-gray-400 text-sm mt-2">No transactions yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((txn) => (
                <li key={txn.id} className="flex items-center gap-3 py-3">
                  <span className="text-2xl">{TX_ICONS[txn.type] ?? "💰"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{txn.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${TX_COLOR[txn.type] ?? "text-gray-700"}`}>
                    {txn.type === "debit" || txn.type === "settlement" ? "−" : "+"}₹{txn.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
