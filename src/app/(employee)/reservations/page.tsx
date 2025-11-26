"use client";

import { withStaffAuth } from '@/hoc/withAuth';
import { Table } from '../components/Table';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/presentation/hooks/useBookings';
import { useToast } from '@/presentation/components/ui/Notification';
import { Clock, RefreshCw, Filter, Calendar, User, Car, Battery, CheckCircle2, Loader2, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

function StatusBadge({ value }: { value: string }) {
  // Backend returns: Pending, Cancelled, Completed (PascalCase)
  // Note: "Confirmed" exists in enum but is never returned to frontend (immediately becomes "Completed")
  const valueLower = value.toLowerCase();
  const map: Record<string, { style: string; text: string }> = {
    pending: { 
      style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', 
      text: 'Pending' 
    },
    cancelled: { 
      style: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', 
      text: 'Cancelled' 
    },
    completed: { 
      style: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', 
      text: 'Completed' 
    },
    // Handle "confirmed" if it somehow appears (shouldn't happen)
    confirmed: { 
      style: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200', 
      text: 'Confirmed' 
    },
  };
  const config = map[valueLower] || { 
    style: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200', 
    text: value 
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.style}`}>
      {config.text}
    </span>
  );
}

function SwapDetails({ swapTransaction }: { swapTransaction: any }) {
  if (!swapTransaction) return null;

  const swapTransactionId = swapTransaction.SwapTransactionID || swapTransaction.swapTransactionID || swapTransaction.transactionID || swapTransaction.TransactionID || '—';
  const oldBatteryId = swapTransaction.OldBatteryID || swapTransaction.oldBatteryID || swapTransaction.oldBatteryId || '—';
  const newBatteryId = swapTransaction.NewBatteryID || swapTransaction.newBatteryID || swapTransaction.newBatteryId || '—';
  
  // Cost: Check if value exists (including 0) - use null/undefined check instead of truthy
  const costValue = swapTransaction.Cost ?? swapTransaction.cost ?? swapTransaction.amount ?? null;
  const cost = costValue !== null && costValue !== undefined ? costValue : null;
  
  // SwapDate: SwapTransactionDTOs từ getAll() không có CreatedAt, cần lấy từ booking time hoặc booking data
  // Thử nhiều nguồn để lấy ngày swap
  const swapDate = swapTransaction.swapDate || 
                   swapTransaction.createdAt || 
                   swapTransaction.CreatedAt || 
                   swapTransaction.UpdatedAt || 
                   swapTransaction.updatedAt ||
                   swapTransaction.BookingTime || // Có thể dùng booking time làm fallback
                   swapTransaction.bookingTime ||
                   null;
  
  const swapStatus = swapTransaction.SwapStatus || swapTransaction.swapStatus || swapTransaction.status || '—';

  // Format swap date
  let formattedSwapDate = '—';
  if (swapDate) {
    try {
      const date = new Date(swapDate);
      if (!isNaN(date.getTime())) {
        formattedSwapDate = date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {
      console.warn('[Reservations] Failed to format swapDate:', swapDate);
    }
  }

  // Format cost - Check if cost is not null/undefined (including 0)
  const formattedCost = cost !== null && cost !== undefined 
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'VND',
      }).format(cost) 
    : '—';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-blue-900">Swap Information</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600 font-medium">Swap Transaction ID:</span>
          <span className="ml-2 text-gray-900">{swapTransactionId}</span>
        </div>
        <div>
          <span className="text-gray-600 font-medium">Swap Status:</span>
          <span className="ml-2">
            <StatusBadge value={swapStatus} />
          </span>
        </div>
        <div>
          <span className="text-gray-600 font-medium">Old Battery:</span>
          <span className="ml-2 text-gray-900 font-mono">{oldBatteryId}</span>
        </div>
        <div>
          <span className="text-gray-600 font-medium">New Battery:</span>
          <span className="ml-2 text-gray-900 font-mono">{newBatteryId}</span>
        </div>
        <div>
          <span className="text-gray-600 font-medium">Cost:</span>
          <span className="ml-2 text-gray-900 font-semibold">{formattedCost}</span>
        </div>
        <div>
          <span className="text-gray-600 font-medium">Swap Date:</span>
          <span className="ml-2 text-gray-900">{formattedSwapDate}</span>
        </div>
      </div>
    </div>
  );
}

export default withStaffAuth(function ReservationsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('upcoming'); // upcoming, completed, cancelled, all
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 items per page
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Get stationId from user profile - resolve from stationName if needed
  const [stationId, setStationId] = useState<string | undefined>(
    (user as any)?.stationId || (user as any)?.StationId || (user as any)?.stationID
  );
  
  // Resolve stationID from stationName if not available
  useEffect(() => {
    const resolveStationId = async () => {
      // If stationId is already a valid GUID, use it
      if (stationId && /^[0-9a-f-]{36}$/i.test(stationId)) {
        return;
      }
      
      // If user has stationName but no valid stationId, try to resolve it
      const stationName = user?.stationName;
      if (stationName && !stationId) {
        try {
          const { getStationIdByName } = await import('@/application/services/Hoang/stationService');
          const resolvedId = await getStationIdByName(stationName);
          if (resolvedId) {
            console.log('[Reservations] Resolved stationID from stationName:', resolvedId);
            setStationId(resolvedId);
          }
        } catch (e) {
          console.error('[Reservations] Error resolving stationID from name:', e);
        }
      }
    };
    
    if (user && !authLoading) {
      resolveStationId();
    }
  }, [user, stationId, authLoading]);
  
  // Debug log
  useEffect(() => {
    console.log('[Reservations] User and stationId check:', {
      hasUser: !!user,
      userId: user?.userId,
      stationId,
      stationName: user?.stationName,
      authLoading,
      userKeys: user ? Object.keys(user) : []
    });
  }, [user, stationId, authLoading]);

  // Use custom hook to fetch bookings - ONLY when user is loaded and has stationId
  // Pass undefined if not ready to prevent premature API calls
  const { bookings, loading, error, refetch, updateStatus } = useBookings(
    (!authLoading && stationId) ? stationId : undefined
  );

  // Fetch swap transactions to check which bookings have completed swaps
  const [swapTransactions, setSwapTransactions] = useState<any[]>([]);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  
  useEffect(() => {
    const fetchSwapTransactions = async () => {
      if (!stationId || authLoading) return;
      
      try {
        setLoadingSwaps(true);
        const { swapTransactionRepository } = await import('@/infrastructure/repositories/Hoang/SwapTransactionRepository');
        const swaps = await swapTransactionRepository.getAll();
        setSwapTransactions(swaps);
        console.log('[Reservations] Loaded swap transactions:', swaps.length);
      } catch (err) {
        console.error('[Reservations] Failed to load swap transactions:', err);
      } finally {
        setLoadingSwaps(false);
      }
    };

    fetchSwapTransactions();
  }, [stationId, authLoading]);

  // Refetch swap transactions when bookings refresh
  useEffect(() => {
    const fetchSwapTransactions = async () => {
      if (!stationId) return;
      
      try {
        const { swapTransactionRepository } = await import('@/infrastructure/repositories/Hoang/SwapTransactionRepository');
        const swaps = await swapTransactionRepository.getAll();
        setSwapTransactions(swaps);
      } catch (err) {
        console.error('[Reservations] Failed to refresh swap transactions:', err);
      }
    };

    fetchSwapTransactions();
  }, [bookings.length, stationId]);

  // Show error toast if any
  useEffect(() => {
    if (error) {
      showToast({ type: 'error', message: error.message || 'Failed to load bookings' });
    }
  }, [error, showToast]);

  // Handle cancel booking
  const handleCancelBooking = useCallback(async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      console.log('[Reservations] Cancelling booking:', bookingId);
      // Backend expects lowercase "cancelled" but frontend type uses PascalCase
      await updateStatus(bookingId, 'Cancelled');
      showToast({ type: 'success', message: 'Booking cancelled successfully!' });
      // Refetch to update the list
      await refetch();
      // Reset to page 1 if current page becomes empty
      setCurrentPage(1);
    } catch (err: any) {
      console.error('[Reservations] Failed to cancel booking:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to cancel booking';
      showToast({ type: 'error', message: errorMessage });
    }
  }, [updateStatus, refetch, showToast]);

  // Handle check-in (redirect to check-in page)
  // Flow mới: Đi thẳng đến check-in, không cần confirm trước
  const handleCheckIn = useCallback((bookingId: string) => {
    if (!bookingId) {
      console.error('[Reservations] Cannot check-in: bookingId is missing');
      showToast({ type: 'error', message: 'Booking ID is missing. Please refresh the page.' });
      return;
    }
    console.log('[Reservations] Navigating to check-in with bookingId:', bookingId);
    router.push(`/check-in?bookingId=${bookingId}`);
  }, [router, showToast]);

  // Define columns with dynamic action buttons
  // Ở tab "Completed" (đã swap xong), không hiển thị cột status
  const columns = useMemo(() => {
    const baseColumns = [
      { 
        key: 'expand', 
        header: '', 
        render: (row: any) => {
          if (!row.isSwapCompleted || !row.swapTransaction) return null;
          const isExpanded = expandedRows.has(row.id);
          return (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newExpanded = new Set(expandedRows);
                if (isExpanded) {
                  newExpanded.delete(row.id);
                } else {
                  newExpanded.add(row.id);
                }
                setExpandedRows(newExpanded);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="View swap information"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
          );
        }
      },
    { key: 'time', header: 'Time' },
    { key: 'driver', header: 'Customer' },
    { key: 'vehicle', header: 'License Plate' },
    { key: 'battery', header: 'Battery Type' },
    ];

    // Chỉ thêm cột status ở tab "Đang có booking tới" (upcoming)
    if (filterStatus === 'upcoming') {
      baseColumns.push({
        key: 'status', 
        header: 'Status', 
        render: (row: any) => (
          <div className="flex items-center gap-2">
            <StatusBadge value={row.status} />
          </div>
        )
      });
    }

    // Thêm cột actions
    baseColumns.push({
      key: 'actions', 
      header: 'Actions', 
      render: (row: any) => {
        // Backend returns: Pending, Cancelled, Completed (PascalCase)
        // Note: "Confirmed" exists in enum but is never returned (immediately becomes "Completed")
        const statusLower = (row.status || '').toLowerCase();
        const isPending = statusLower === 'pending';
        const isCompleted = statusLower === 'completed'; // Booking đã completed (có subscription)
        const isCancelled = statusLower === 'cancelled';
        const isSwapCompleted = row.isSwapCompleted === true; // Đã swap xong

        return (
          <div className="flex items-center gap-2">
            {/* Pending: Staff không xử lý pending bookings (chỉ customer tự xử lý thanh toán) */}
            {isPending && (
              <span className="text-xs text-amber-600 font-medium">
                ⏳ Waiting for payment/subscription
              </span>
            )}

            {/* Đang có booking tới: Booking đã completed (có subscription) nhưng chưa swap xong
                → Hiển thị nút "Continue Swap" và "Cancel" */}
            {isCompleted && !isSwapCompleted && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (row.id) {
                      handleCheckIn(row.id);
                    } else {
                      console.error('[Reservations] Row ID is missing:', row);
                      showToast({ type: 'error', message: 'Booking ID is missing. Please refresh the page.' });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
                  disabled={!row.id}
                >
                  <Battery className="w-3.5 h-3.5" />
                  Continue Swap
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (row.id) {
                      handleCancelBooking(row.id);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 shadow-sm transition-colors cursor-pointer"
                  title="Cancel booking"
                  disabled={!row.id}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Swap completed: No actions, just show info */}
            {isCompleted && isSwapCompleted && (
              <span className="text-xs text-blue-600 font-medium">
                ✓ Swap Completed
              </span>
            )}

            {/* Cancelled: Show cancelled text */}
            {isCancelled && (
              <span className="text-xs text-rose-600 font-medium">
                ✗ Cancelled
              </span>
            )}
          </div>
        );
      }
    });

    return baseColumns;
  }, [filterStatus, expandedRows, handleCancelBooking, handleCheckIn, showToast]);

  // Transform bookings to table data
  // Note: Booking status = "completed" = booking đang chờ swap (chưa swap xong)
  //       Swap status = "completed" = đã swap xong
  const data = useMemo(() => {
    console.log('[Reservations] Total bookings:', bookings.length);
    console.log('[Reservations] All bookings:', bookings);
    console.log('[Reservations] Swap transactions:', swapTransactions.length);
    
    // Create a map of bookingId -> swap transaction (full object)
    const swapMap = new Map<string, any>();
    swapTransactions.forEach((swap: any) => {
      const bookingId = swap.BookingID || swap.bookingID || swap.bookingId || swap.BookingId || (swap as any).booking_id || (swap as any).booking_ID;
      if (bookingId) {
        swapMap.set(bookingId, swap);
      }
    });
    
    // Create a map of bookingId -> swap transaction status for filtering
    const swapStatusMap = new Map<string, string>();
    swapTransactions.forEach((swap: any) => {
      const bookingId = swap.BookingID || swap.bookingID || swap.bookingId || swap.BookingId || (swap as any).booking_id || (swap as any).booking_ID;
      const swapStatus = swap.SwapStatus || swap.swapStatus || swap.status || swap.Status || '';
      if (bookingId && swapStatus) {
        swapStatusMap.set(bookingId, swapStatus.toLowerCase());
      }
    });
    
    // Transform all bookings - không filter ở đây, filter sẽ được thực hiện ở filtered useMemo
    // Logic mới:
    // - "upcoming": status = "completed" AND swap status != "completed" (chưa swap xong)
    // - "completed": swap status = "completed" (đã swap xong)
    // - "cancelled": status = "cancelled"
    // - "all": tất cả
    const rows = bookings
      .map((b) => {
      // Log first booking to see structure
      if (bookings.indexOf(b) === 0) {
        console.log('[Reservations] Sample booking data:', b);
        console.log('[Reservations] Available keys:', Object.keys(b));
      }
      
      // Backend BookingDTOs fields (PascalCase):
      // - BookingID, UserName, VehicleName, StationName, BatteryType, PlanName, BookingTime, CreatedAt, Status
      const status = (b as any).Status || (b as any).status || b.bookingStatus || 'Pending';
      
      // Extract driver name - Backend returns UserName (PascalCase)
      const driverName = (b as any).UserName || (b as any).userName || (b as any).customerName || (b as any).driverName || (b as any).fullName || '—';
      
      // Extract vehicle info - Backend returns VehicleName (tên xe), not license plate
      // Note: Backend BookingDTOs doesn't include LicensePlate, only VehicleName
      const vehicleInfo = (b as any).VehicleName || (b as any).vehicleName || (b as any).vehiclePlate || (b as any).licensePlate || (b as any).vehicleId || (b as any).plateNumber || '—';
      
      // Extract booking ID - Backend returns BookingID (PascalCase)
      const bookingId = (b as any).BookingID || b.bookingID || (b as any).id || (b as any).bookingId;
      
      if (!bookingId) {
        console.error('[Reservations] No ID found for booking:', b);
      }
      
      // Get swap transaction for this booking
      const swapTransaction = swapMap.get(bookingId);
      const swapStatus = swapStatusMap.get(bookingId);
      // Chỉ coi là đã swap xong khi swapStatus thực sự là "completed"
      const isSwapCompleted = swapStatus === 'completed';
      
      // Đảm bảo swapTransaction chỉ được gán khi thực sự đã swap xong
      // Nếu chưa swap xong, không gán swapTransaction để tránh hiển thị nhầm
      // Merge booking data vào swapTransaction để có thêm thông tin (BookingTime, CreatedAt)
      let finalSwapTransaction = undefined;
      if (isSwapCompleted && swapTransaction) {
        finalSwapTransaction = {
          ...swapTransaction,
          // Thêm booking time và createdAt từ booking data
          BookingTime: (b as any).BookingTime || (b as any).bookingTime || swapTransaction.BookingTime,
          bookingTime: (b as any).BookingTime || (b as any).bookingTime || swapTransaction.bookingTime,
          CreatedAt: (b as any).CreatedAt || (b as any).createdAt || swapTransaction.CreatedAt,
          createdAt: (b as any).CreatedAt || (b as any).createdAt || swapTransaction.createdAt,
        };
      }
      
      // Get booking time - Backend returns BookingTime (PascalCase, DateTime)
      const bookingTimeStr = (b as any).BookingTime || (b as any).bookingTime || (b as any).time || (b as any).bookingHour || '';
      let sortDate: Date | null = null;
      
      if (bookingTimeStr) {
        try {
          sortDate = new Date(bookingTimeStr);
        } catch (e) {
          console.warn('[Reservations] Failed to parse bookingTime:', bookingTimeStr);
        }
      }
      
      // Try createdAt or updatedAt as fallback for sorting
      if (!sortDate) {
        const createdAtStr = (b as any).createdAt || (b as any).CreatedAt || (b as any).created_at;
        const updatedAtStr = (b as any).updatedAt || (b as any).UpdatedAt || (b as any).updated_at;
        const fallbackDateStr = createdAtStr || updatedAtStr;
        if (fallbackDateStr) {
          try {
            sortDate = new Date(fallbackDateStr);
          } catch (e) {
            console.warn('[Reservations] Failed to parse createdAt/updatedAt:', fallbackDateStr);
          }
        }
      }
      
      // Format booking time for display
      let displayTime = '--';
      if (bookingTimeStr) {
        try {
          const date = new Date(bookingTimeStr);
          if (!isNaN(date.getTime())) {
            // Format: "YYYY-MM-DD HH:mm" or "DD/MM/YYYY HH:mm"
            displayTime = date.toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        } catch (e) {
          console.warn('[Reservations] Failed to format bookingTime:', bookingTimeStr);
        }
      }
      
      return {
        id: bookingId,
        time: displayTime,
        driver: driverName,
        vehicle: vehicleInfo, // VehicleName from backend (tên xe)
        battery: (b as any).BatteryType || b.batteryType || '—', // Backend returns BatteryType (PascalCase)
        status,
        raw: b,
        sortDate: sortDate || new Date(0), // Use epoch if no date available (will sort last)
        swapTransaction: finalSwapTransaction, // Chỉ include swap transaction khi đã swap xong
        isSwapCompleted, // Flag to indicate if swap is completed
      };
    });
    
    // Sort by booking time (newest first)
    rows.sort((a, b) => {
      const dateA = a.sortDate.getTime();
      const dateB = b.sortDate.getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    
    return rows;
  }, [bookings, swapTransactions, filterStatus]);

  // Auto-refresh every 5 seconds to catch status changes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      console.log('[Reservations] Auto-refreshing bookings...');
      refetch();
    }, 5000); // 5 seconds to see status changes quickly
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  // Listen for bookings-refresh event (triggered after swap completion)
  useEffect(() => {
    const handleBookingsRefresh = async () => {
      console.log('[Reservations] Received bookings-refresh event, refreshing...');
      // Refresh both bookings and swap transactions
      await refetch();
      
      // Also refresh swap transactions
      if (stationId) {
        try {
          const { swapTransactionRepository } = await import('@/infrastructure/repositories/Hoang/SwapTransactionRepository');
          const swaps = await swapTransactionRepository.getAll();
          setSwapTransactions(swaps);
          console.log('[Reservations] Refreshed swap transactions after swap completion:', swaps.length);
        } catch (err) {
          console.error('[Reservations] Failed to refresh swap transactions:', err);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('bookings-refresh', handleBookingsRefresh);
      return () => {
        window.removeEventListener('bookings-refresh', handleBookingsRefresh);
      };
    }
  }, [refetch, stationId]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [q, filterStatus]);

  const filtered = useMemo(() => {
    let items = data;
    
    // Filter by status tab - Logic mới:
    // - "upcoming": status = "completed" AND swap status != "completed" (đang có booking tới, chưa swap xong)
    // - "completed": swap status = "completed" (đã swap xong)
    // - "cancelled": status = "cancelled"
    // - "all": tất cả
    if (filterStatus === 'upcoming') {
      // Đang có booking tới: status = "completed" nhưng chưa swap xong
      items = items.filter(d => {
        const statusLower = d.status.toLowerCase();
        return statusLower === 'completed' && !d.isSwapCompleted;
      });
    } else if (filterStatus === 'completed') {
      // Completed: đã swap xong (swap status = "completed")
      items = items.filter(d => d.isSwapCompleted === true);
    } else if (filterStatus === 'cancelled') {
      items = items.filter(d => d.status.toLowerCase() === 'cancelled');
    }
    // 'all' shows everything
    
    // Filter by search query
    const s = q.trim().toLowerCase();
    if (s) {
      items = items.filter(d =>
        (d.driver || '').toLowerCase().includes(s) || 
        (d.vehicle || '').toLowerCase().includes(s) || 
        (d.id || '').toLowerCase().includes(s)
      );
    }
    
    return items;
  }, [q, data, filterStatus]);

  // Count by status - Logic mới:
  // - "upcoming": status = "completed" nhưng chưa swap xong (đang có booking tới)
  // - "completed": đã swap xong (swap status = "completed")
  // - "cancelled": status = "cancelled"
  const upcomingCount = useMemo(() => {
    // Đang có booking tới: status = "completed" nhưng chưa swap xong
    return data.filter(d => {
      const statusLower = d.status.toLowerCase();
      return statusLower === 'completed' && !d.isSwapCompleted;
    }).length;
  }, [data]);
  
  const completedSwapsCount = useMemo(() => {
    // Đã swap xong: swap status = "completed"
    return data.filter(d => d.isSwapCompleted === true).length;
  }, [data]);
  
  const cancelledCount = data.filter(d => d.status.toLowerCase() === 'cancelled').length;

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filtered.slice(startIdx, endIdx);
  }, [filtered, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Show loading if auth is still loading or no stationId yet
  const isInitializing = authLoading || !stationId;

  // Debug log
  console.log('[Reservations] Rendering with stats:', {
    upcomingCount,
    completedSwapsCount,
    cancelledCount,
    bookingsLength: bookings.length,
    swapTransactionsLength: swapTransactions.length
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-emerald-700 font-medium mb-1">Upcoming Bookings</div>
              <div className="text-3xl font-bold text-emerald-900">{upcomingCount}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-blue-700 font-medium mb-1">Completed Swaps</div>
              <div className="text-3xl font-bold text-blue-900">{completedSwapsCount}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-5 border border-rose-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-rose-700 font-medium mb-1">Cancelled</div>
              <div className="text-3xl font-bold text-rose-900">{cancelledCount}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center text-white flex-shrink-0">
              <User className="w-6 h-6 line-through" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
              <button
              onClick={() => setFilterStatus('upcoming')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filterStatus === 'upcoming'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
              Upcoming
              </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filterStatus === 'completed'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilterStatus('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filterStatus === 'cancelled'
                  ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cancelled
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filterStatus === 'all'
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="Search by name, plate, ID..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 w-full sm:w-64 pl-10 pr-4 rounded-lg border-2 border-gray-200 text-black placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={loading}
              className="h-10 w-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-10 px-3 rounded-lg flex items-center gap-2 font-medium text-sm transition-all ${
                autoRefresh
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
              title="Auto refresh (5s)"
            >
              <Clock className="w-4 h-4" />
              {autoRefresh ? 'Auto' : 'Manual'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {(isInitializing || (loading && data.length === 0)) ? (
        <div className="p-12 bg-white rounded-xl shadow-sm text-center border border-gray-100">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {isInitializing ? 'Initializing...' : 'Loading bookings...'}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-xl shadow-sm text-center border border-gray-100">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bookings found</p>
        </div>
      ) : (
        <>
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        className="px-5 py-3 border-b border-gray-200 sticky top-0 z-10 bg-white/95 backdrop-blur text-xs font-medium uppercase tracking-wide"
                      >
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row) => {
                    const isExpanded = expandedRows.has(row.id);
                    const hasSwapDetails = row.isSwapCompleted && row.swapTransaction;
                    return (
                      <React.Fragment key={row.id}>
                        <tr className="even:bg-gray-50/60 hover:bg-blue-50/60 transition-colors">
                          {columns.map((c) => (
                            <td key={c.key} className="px-5 py-3 border-b border-gray-100 text-gray-900">
                              {c.render ? c.render(row) : String(row[c.key] ?? '')}
                            </td>
                          ))}
                        </tr>
                        {hasSwapDetails && isExpanded && (
                          <tr key={`${row.id}-details`}>
                            <td colSpan={columns.length} className="px-5 py-3 border-b border-gray-100">
                              <SwapDetails swapTransaction={row.swapTransaction} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    const showEllipsis = 
                      (page === currentPage - 2 && currentPage > 3) ||
                      (page === currentPage + 2 && currentPage < totalPages - 2);
                    
                    if (showEllipsis) {
                      return <span key={page} className="px-2 text-gray-500">...</span>;
                    }
                    
                    if (!showPage) return null;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                          page === currentPage
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});
