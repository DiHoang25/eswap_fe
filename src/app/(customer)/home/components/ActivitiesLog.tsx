"use client";
import React from "react";
import { FaRegClock, FaChevronRight } from "react-icons/fa";

interface Activity {
  id: string;
  type: "completed" | "canceled" | "scheduled";
  message: string;
  timestamp: string;
}

interface ActivitiesLogProps {
  transactions?: any[];
  loading?: boolean;
  onViewAll?: () => void;
}

function formatTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}`;
  } catch {
    return dateString;
  }
}

function transformTransactionToActivity(transaction: any): Activity {
  const status = transaction.status || transaction.swapStatus || '';
  const stationName = transaction.stationName || 'Station';
  
  let type: "completed" | "canceled" | "scheduled" = "scheduled";
  let message = `Swap at ${stationName}`;
  
  if (status === 'completed' || status === 'paid') {
    type = "completed";
    message = `Swap Completed at ${stationName}`;
  } else if (status === 'cancelled' || status === 'failed') {
    type = "canceled";
    message = `Swap Canceled at ${stationName}`;
  } else {
    type = "scheduled";
    message = `Swap Scheduled at ${stationName}`;
  }
  
  const timestamp = formatTimestamp(transaction.swapDate || transaction.createdAt || new Date().toISOString());
  
  return {
    id: transaction.swapTransactionID || transaction.transactionID || transaction.id || Math.random().toString(),
    type,
    message,
    timestamp,
  };
}

export default function ActivitiesLog({
  transactions = [],
  loading = false,
  onViewAll,
}: ActivitiesLogProps) {
  const activities: Activity[] = transactions.map(transformTransactionToActivity);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-2 shadow-md border border-gray-100 h-full">
        <div className="flex flex-col h-full">
          <div className="flex justify-start mb-2">
            <div className="flex items-center gap-1 text-lg font-semibold text-gray-800 px-2 py-1">
              <span>Activities</span>
            </div>
          </div>
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-2 shadow-md border border-gray-100 h-full">
        <div className="flex flex-col h-full">
          <div className="flex justify-start mb-2">
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-lg font-semibold text-gray-800 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 rounded-lg transition-all duration-200"
            >
              <span>Activities</span>
              <FaChevronRight size={14} />
            </button>
          </div>
          <div className="flex items-center justify-center h-24">
            <p className="text-gray-500 text-sm">No activities yet</p>
          </div>
        </div>
      </div>
    );
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "completed":
        return "text-teal-700";
      case "canceled":
        return "text-orange-700";
      case "scheduled":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-2xl p-2 shadow-md border border-gray-100 h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-start mb-2">
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-lg font-semibold text-gray-800 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 rounded-lg transition-all duration-200"
          >
            <span>Activities</span>
            <FaChevronRight size={14} />
          </button>
        </div>

        {/* Activities List */}
        <div className="pl-2 flex-1 space-y-1 overflow-y-auto max-h-24 scrollbar-hide">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between gap-1 border-b-2 pb-2"
            >
              {/* Left: Activity message */}
              <div className="flex items-center">
                <div
                  className={`text-sm font-medium ${getActivityColor(
                    activity.type
                  )}`}
                >
                  {activity.message}
                </div>
              </div>

              {/* Right: Timestamp */}
              <div className="text-xs text-gray-500 flex items-center">
                <FaRegClock size={12} />
                <span>{activity.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
