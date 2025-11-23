'use client';

import { withCustomerAuth } from '@/hoc/withAuth';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { swapTransactionRepository } from '@/infrastructure/repositories/Hoang/SwapTransactionRepository';
import { SwapTransaction } from '@/domain/dto/Hoang/SwapTransaction';
import { 
  FaHistory, 
  FaSpinner, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaBatteryHalf,
  FaBatteryFull,
  FaDollarSign,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';

// Status badge component
function SwapStatusBadge({ status }: { status: string }) {
  const statusLower = (status || '').toLowerCase();
  
  const statusConfig: Record<string, { style: string; label: string; icon: React.ReactNode }> = {
    completed: {
      style: 'bg-green-50 text-green-700 ring-1 ring-green-200',
      label: 'Completed',
      icon: <FaCheckCircle className="w-3 h-3" />
    },
    paid: {
      style: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      label: 'Paid',
      icon: <FaCheckCircle className="w-3 h-3" />
    },
    in_progress: {
      style: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
      label: 'In Progress',
      icon: <FaClock className="w-3 h-3" />
    },
    initiated: {
      style: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
      label: 'Initiated',
      icon: <FaClock className="w-3 h-3" />
    },
    cancelled: {
      style: 'bg-red-50 text-red-700 ring-1 ring-red-200',
      label: 'Cancelled',
      icon: <FaTimesCircle className="w-3 h-3" />
    },
    failed: {
      style: 'bg-red-50 text-red-700 ring-1 ring-red-200',
      label: 'Failed',
      icon: <FaExclamationTriangle className="w-3 h-3" />
    },
  };
  
  const config = statusConfig[statusLower] || {
    style: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
    label: status || 'Unknown',
    icon: <FaClock className="w-3 h-3" />
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.style}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Format date helper
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateString;
  }
}

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

const HistoryPage = () => {
  const { user } = useAuth();
  const [swapTransactions, setSwapTransactions] = useState<SwapTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<SwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("all"); // all, today, week, month

  // Filter transactions when data or filter changes
  useEffect(() => {
    filterTransactionsByTime();
  }, [swapTransactions, timeFilter]);

  // Filter transactions by time
  const filterTransactionsByTime = () => {
    if (timeFilter === "all") {
      setFilteredTransactions(swapTransactions);
      return;
    }

    const now = new Date();
    const filtered = swapTransactions.filter((transaction) => {
      const transactionDate = new Date(transaction.swapDate || transaction.createdAt || '');
      
      switch (timeFilter) {
        case "today":
          return transactionDate.toDateString() === now.toDateString();
        case "week":
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return transactionDate >= weekAgo;
        case "month":
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return transactionDate >= monthAgo;
        default:
          return true;
      }
    });

    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    const loadSwapHistory = async () => {
      if (!user?.userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('[History] Loading swap history for current user');
        // Use getMySwapTransactions which calls /me/swap-transactions endpoint
        const swaps = await swapTransactionRepository.getMySwapTransactions();
        
        // Sort by swap date (newest first)
        const sortedSwaps = (swaps || []).sort((a, b) => {
          const dateA = a.swapDate || a.createdAt || '';
          const dateB = b.swapDate || b.createdAt || '';
          
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          try {
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          } catch (e) {
            return 0;
          }
        });
        
        console.log('[History] Loaded swap transactions:', sortedSwaps);
        setSwapTransactions(sortedSwaps);
      } catch (err: any) {
        console.log('[History] Failed to load swap history:', err);
        setError(err?.message || 'Unable to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    loadSwapHistory();
  }, [user?.userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="text-4xl text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FaHistory className="text-3xl text-indigo-600" />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Transaction History
                </h1>
              </div>
              <p className="text-gray-600">
                View all your battery swap transactions
              </p>
            </div>
            
            {/* Time Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-800 whitespace-nowrap">Time Period:</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-4 py-2 text-sm font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:border-indigo-400 transition-colors text-gray-900"
              >
                <option value="all" className="font-semibold">All Time</option>
                <option value="today" className="font-semibold">Today</option>
                <option value="week" className="font-semibold">Last 7 Days</option>
                <option value="month" className="font-semibold">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {filteredTransactions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Swaps</p>
              <p className="text-2xl font-bold text-indigo-600">{filteredTransactions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredTransactions.filter(t => (t.status || t.swapStatus || '').toLowerCase() === 'initiated').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredTransactions.filter(t => (t.status || t.swapStatus || '').toLowerCase() === 'completed').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredTransactions.filter(t => (t.status || t.swapStatus || '').toLowerCase() === 'cancelled').length}
              </p>
            </div>
          </div>
        )}

        {/* Swap Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {swapTransactions.length === 0 ? "No Transactions Yet" : "No Transactions Found"}
            </h3>
            <p className="text-gray-500">
              {swapTransactions.length === 0 
                ? "You haven't made any battery swap transactions"
                : `No transactions found for ${timeFilter === "today" ? "today" : timeFilter === "week" ? "the last 7 days" : timeFilter === "month" ? "the last 30 days" : "this period"}`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((swap) => {
              const bookingTime = swap.bookingTime || swap.swapDate || swap.createdAt || '';
              const createdAt = swap.createdAt || '';
              const driverName = swap.driverName || 'Customer';
              const phoneNumber = swap.phoneNumber || '—';
              const stationName = swap.stationName || 'Unknown Station';
              const vehiclePlate = swap.vehiclePlate || '—';
              const amount = swap.amount || swap.cost || 0;
              const status = swap.status || swap.swapStatus || 'unknown';
              const oldBattery = swap.oldBatteryCode || swap.oldBatteryID || '—';
              const newBattery = swap.newBatteryCode || swap.newBatteryID || '—';
              const transactionId = swap.swapTransactionID || '—';

              return (
                <div
                  key={swap.swapTransactionID}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="p-4 md:p-6">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {driverName}
                          </h3>
                          <span className="text-sm text-gray-500">• {phoneNumber}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          ID: {transactionId.substring(0, 8)}...
                        </p>
                      </div>
                      <SwapStatusBadge status={status} />
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {/* Booking Time */}
                      <div className="flex items-start gap-3">
                        <FaCalendarAlt className="text-indigo-500 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Booking Time</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {bookingTime ? formatDate(bookingTime) : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Created At */}
                      <div className="flex items-start gap-3">
                        <FaClock className="text-blue-500 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Created Date</p>
                          <p className="text-sm font-medium text-gray-700">
                            {createdAt ? formatDate(createdAt) : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Station */}
                      <div className="flex items-start gap-3">
                        <FaMapMarkerAlt className="text-red-500 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Swap Station</p>
                          <p className="text-sm font-medium text-gray-900">
                            {stationName}
                          </p>
                        </div>
                      </div>

                      {/* Vehicle Plate */}
                      {vehiclePlate !== '—' && (
                        <div className="flex items-start gap-3">
                          <FaBatteryHalf className="text-gray-400 mt-1" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">License Plate</p>
                            <p className="text-sm font-medium text-gray-900">
                              {vehiclePlate}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Old Battery */}
                      {oldBattery !== '—' && (
                        <div className="flex items-start gap-3">
                          <FaBatteryHalf className="text-orange-400 mt-1" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Old Battery</p>
                            <p className="text-sm font-medium text-gray-900">
                              {oldBattery}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* New Battery */}
                      {newBattery !== '—' && (
                        <div className="flex items-start gap-3">
                          <FaBatteryFull className="text-green-500 mt-1" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">New Battery</p>
                            <p className="text-sm font-medium text-gray-900">
                              {newBattery}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default withCustomerAuth(HistoryPage);
