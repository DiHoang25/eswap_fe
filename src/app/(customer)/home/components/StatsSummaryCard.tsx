"use client";
import React from "react";
import { FaInfoCircle } from "react-icons/fa";

interface StatsSummaryCardProps {
  transactions?: any[];
  userStats?: any;
  loading?: boolean;
}

export default function StatsSummaryCard({
  transactions = [],
  userStats,
  loading = false,
}: StatsSummaryCardProps) {
  // Calculate statistics from transactions
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const thisMonthSwaps = transactions.filter((tx) => {
    const txDate = new Date(tx.swapDate || tx.createdAt || 0);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  }).length;

  const lastMonthSwaps = transactions.filter((tx) => {
    const txDate = new Date(tx.swapDate || tx.createdAt || 0);
    return txDate.getMonth() === lastMonth && txDate.getFullYear() === lastMonthYear;
  }).length;

  // Calculate carbon saved (assuming 1 swap = ~10kg CO2 saved)
  const carbonSaved = transactions.length * 10;

  // Get subscription info
  const subscription = userStats?.subscription || null;
  const planType = subscription?.PlanName || subscription?.planName || "No Plan";
  const remainingSwaps = subscription?.RemainingSwaps || subscription?.remainingSwaps || 0;

  const swapIncrease = thisMonthSwaps - lastMonthSwaps;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-2 shadow-md border border-gray-100">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
        </div>
      </div>
    );
  }

  // Check if should show Remaining Swaps (only if user has a plan and remainingSwaps > 0)
  const showRemainingSwaps = remainingSwaps > 0 && planType !== "No Plan";
  const gridCols = showRemainingSwaps ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className="bg-white rounded-2xl p-2 shadow-md border border-gray-100">
      {/* Stats Grid */}
      <div className={`flex-1 grid ${gridCols} gap-2`}>
        {/* Carbon Saved */}
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Carbon Saved</div>
          <div className="text-2xl font-bold text-gray-900">
            {carbonSaved} kg
          </div>
        </div>

        {/* This Month Swaps */}
        <div className={`text-center ${showRemainingSwaps ? 'border-l-2 border-r-2 border-gray-200' : ''}`}>
          <div className="text-sm text-gray-600 mb-1">This Month Swaps</div>
          <div className="text-2xl font-bold text-gray-900">
            {thisMonthSwaps}
          </div>
          {swapIncrease > 0 && (
            <div className="text-xs text-green-600 mt-1">
              +{swapIncrease} from last month
            </div>
          )}
        </div>

        {/* Remaining Swaps - Only show if user has a plan and remainingSwaps > 0 */}
        {showRemainingSwaps && (
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Remaining Swaps</div>
          <div className="text-2xl font-bold text-gray-900">
            {remainingSwaps}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            {planType}
            <button
              className="inline-flex items-center justify-center text-gray-200 hover:text-gray-500 transition-colors"
              title="Plan info"
              onClick={() => alert(`Plan details: ${planType}`)}
            >
              <FaInfoCircle size={16} />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
