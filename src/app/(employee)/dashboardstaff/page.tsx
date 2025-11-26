"use client";

import { withStaffAuth } from '@/hoc/withAuth';
import { StatCard } from '../components/StatCard';
import { Table } from '../components/Table';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import bookingService from '@/application/services/Hoang/bookingService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/presentation/components/ui/Notification';
import { useBatteries } from '@/presentation/hooks/useBatteries';
import { swapTransactionRepository } from '@/infrastructure/repositories/Hoang/SwapTransactionRepository';
import { Calendar, Battery, AlertTriangle, Clock, RefreshCw, ArrowRight, Repeat } from 'lucide-react';

function StatusBadge({ value }: { value: string }) {
  const statusLower = (value || '').toLowerCase();
  
  const map: Record<string, { style: string; label: string }> = {
    pending: { 
      style: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
      label: '⏳ Pending'
    },
    booked: { 
      style: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      label: '📅 Booked'
    },
    queue: { 
      style: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
      label: '⏱ Queue'
    },
    checked: { 
      style: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      label: '✓ Checked In'
    },
  };
  
  const config = map[statusLower] || { 
    style: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
    label: value
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.style}`}>
      {config.label}
    </span>
  );
}

function SwapStatusBadge({ value }: { value: string }) {
  const statusLower = (value || '').toLowerCase();
  
  // Backend enum: initiated, in_progress, completed, cancelled, paid, failed
  const map: Record<string, { style: string; label: string }> = {
    initiated: { 
      style: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      label: 'Initiated'
    },
    'in_progress': { 
      style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
      label: 'In Progress'
    },
    completed: { 
      style: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      label: 'Completed'
    },
    cancelled: { 
      style: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
      label: 'Cancelled'
    },
    paid: { 
      style: 'bg-green-50 text-green-700 ring-1 ring-green-200',
      label: 'Paid'
    },
    failed: { 
      style: 'bg-red-50 text-red-700 ring-1 ring-red-200',
      label: 'Failed'
    },
  };
  
  const config = map[statusLower] || { 
    style: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
    label: value || 'Unknown'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.style}`} title={`Status: ${value}`}>
      {config.label}
    </span>
  );
}

const columns = [
  { key: 'name', header: 'Customer' },
  { key: 'date', header: 'Date' },
  { key: 'time', header: 'Time' },
  { key: 'status', header: 'Status', render: (row: any) => <StatusBadge value={row.status} /> },
];

const initialData: any[] = [];

export default withStaffAuth(function StaffDashboard() {
  const [q, setQ] = useState('');
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [swapTransactions, setSwapTransactions] = useState<any[]>([]); // For display (getByStation - có UserName, LicensePlate, BookingTime)
  const [swapTransactionsForStatus, setSwapTransactionsForStatus] = useState<any[]>([]); // For status check (getAll - có BookingID)
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSwaps, setCurrentPageSwaps] = useState(1);
  const [itemsPerPage] = useState(10); // 10 items per page
  const [itemsPerPageSwaps] = useState(10); // 10 items per page for swaps
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // Get stationId from user
  const stationId = user?.stationId;
  
  // Use useBatteries hook (same as Inventory page) to get station-specific batteries
  const { batteries, inventory, refetch, refetchInventory } = useBatteries(stationId);
  
  // Listen for inventory refresh events (triggered after swap completion)
  useEffect(() => {
    const handleInventoryRefresh = () => {
      console.log('[Dashboard] 🔄 Refreshing inventory after swap completion...');
      refetch();
      refetchInventory();
      // Also refresh swap transactions
      loadSwapTransactions();
    };
    
    // Listen for bookings refresh events (triggered after swap completion)
    const handleBookingsRefresh = async () => {
      console.log('[Dashboard] 🔄 Refreshing bookings after swap completion...');
      // Reload bookings data
      if (user && isAuthenticated) {
        try {
          setLoading(true);
          let stationID = user?.stationId;
          const stationName = user?.stationName;
          
          // Resolve stationID if needed
          if (!stationID || !/^[0-9a-f-]{36}$/i.test(stationID)) {
            if (stationName) {
              try {
                const { getStationIdByName } = await import('@/application/services/Hoang/stationService');
                const resolvedId = await getStationIdByName(stationName);
                if (resolvedId) {
                  stationID = resolvedId;
                }
              } catch (e) {
                console.error('[Dashboard] Error resolving stationID:', e);
              }
            }
          }
          
          const list = await bookingService.getAllBookingOfStation(stationID);
          
          const rows = (list || []).map((b: any) => {
            const customerName = b.customerName || b.CustomerName || 
                                 b.username || b.userName || b.UserName ||
                                 b.fullName || b.FullName ||
                                 b.customer || b.Customer ||
                                 b.driver || b.Driver ||
                                 b.user?.name || b.user?.fullName ||
                                 b.Customer?.FullName || b.User?.FullName ||
                                 '—';
            
            const bookingTimeStr = b.bookingTime || b.BookingTime || b.time || b.bookingHour || '';
            let dateStr = '--';
            let timeStr = '--';
            let sortDate: Date | null = null;
            
            if (bookingTimeStr) {
              try {
                const dt = new Date(bookingTimeStr);
                dateStr = dt.toLocaleDateString('vi-VN');
                timeStr = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                sortDate = dt;
              } catch (e) {
                console.warn('[Dashboard] Failed to parse date:', bookingTimeStr);
              }
            }
            
            if (!sortDate) {
              const createdAtStr = b.createdAt || b.CreatedAt || b.created_at;
              const updatedAtStr = b.updatedAt || b.UpdatedAt || b.updated_at;
              const fallbackDateStr = createdAtStr || updatedAtStr;
              if (fallbackDateStr) {
                try {
                  sortDate = new Date(fallbackDateStr);
                } catch (e) {
                  console.warn('[Dashboard] Failed to parse createdAt/updatedAt:', fallbackDateStr);
                }
              }
            }
            
            const backendStatus = b.Status || b.status || b.bookingStatus || 'Pending';
            
            return {
              id: b.bookingID || b.id || b.BookingID || b.bookingId,
              name: customerName,
              date: dateStr,
              time: timeStr,
              status: backendStatus,
              raw: b,
              sortDate: sortDate || new Date(0),
            };
          });
          
          rows.sort((a, b) => {
            const dateA = a.sortDate.getTime();
            const dateB = b.sortDate.getTime();
            return dateB - dateA;
          });
          
          setData(rows);
        } catch (e: any) {
          console.error('[Dashboard] Error refreshing bookings:', e);
        } finally {
          setLoading(false);
        }
      }
      // Also refresh swap transactions
      loadSwapTransactions();
    };
    
    window.addEventListener('inventory-refresh', handleInventoryRefresh);
    window.addEventListener('bookings-refresh', handleBookingsRefresh);
    return () => {
      window.removeEventListener('inventory-refresh', handleInventoryRefresh);
      window.removeEventListener('bookings-refresh', handleBookingsRefresh);
    };
  }, [refetch, refetchInventory, user, isAuthenticated]);
  
  // Load swap transactions history
  const loadSwapTransactions = async () => {
    if (!stationId) return;
    
    try {
      setLoadingSwaps(true);
      
      // Load 2 loại data:
      // 1. getByStation() - để hiển thị trong table (có UserName, LicensePlate, BookingTime)
      // 2. getAll() - để check swap status (có BookingID)
      const [swapsForDisplay, swapsForStatus] = await Promise.all([
        swapTransactionRepository.getByStation(stationId), // SwapTransactionResponse với UserName, LicensePlate, BookingTime
        swapTransactionRepository.getAll(), // SwapTransactionDTOs với BookingID, SwapStatus
      ]);
      
      console.log('[Dashboard] ✅ Loaded swap transactions for display:', swapsForDisplay);
      console.log('[Dashboard] ✅ Loaded swap transactions for status:', swapsForStatus);
      
      // Sort by booking time (newest first) - similar to bookings
      const sortedSwaps = (swapsForDisplay || []).sort((a: any, b: any) => {
        const timeA = a.BookingTime || a.bookingTime || a.swapDate || a.CreatedAt || a.createdAt || '';
        const timeB = b.BookingTime || b.bookingTime || b.swapDate || b.CreatedAt || b.createdAt || '';
        
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1; // Put items without date at the end
        if (!timeB) return -1;
        
        try {
          const dateA = new Date(timeA).getTime();
          const dateB = new Date(timeB).getTime();
          return dateB - dateA; // Descending order (newest first)
        } catch (e) {
          return 0;
        }
      });
      
      setSwapTransactions(sortedSwaps); // For display
      setSwapTransactionsForStatus(swapsForStatus || []); // For status check
    } catch (error: any) {
      console.error('[Dashboard] ❌ Failed to load swap transactions:', error);
      showToast({
        type: 'error',
        message: 'Failed to load swap transaction history',
      });
    } finally {
      setLoadingSwaps(false);
    }
  };
  
  // Load swap transactions on mount
  useEffect(() => {
    loadSwapTransactions();
  }, [stationId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Get stationId from user context (from login response)
        let stationID = user?.stationId;
        const stationName = user?.stationName;
        
        // If stationID is not a valid GUID, try to resolve it from stationName
        if (!stationID || !/^[0-9a-f-]{36}$/i.test(stationID)) {
          if (stationName) {
            try {
              // Try to get stationID from stationName using stationService
              const { getStationIdByName } = await import('@/application/services/Hoang/stationService');
              const resolvedId = await getStationIdByName(stationName);
              if (resolvedId) {
                stationID = resolvedId;
                console.log('[dashboardstaff] Resolved stationID from stationName:', stationID);
              }
            } catch (e) {
              console.error('[dashboardstaff] Error resolving stationID from name:', e);
            }
          }
        }

        // Không có stationID vẫn tiếp tục: proxy sẽ tự fallback theo stationName nếu có
        
        // If still no stationID, try to get it from /api/auth/me as fallback
        // But only if user is authenticated (to avoid unnecessary calls)
        if (!stationID && isAuthenticated && typeof window !== 'undefined') {
          try {
            const meRes = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' });
            if (meRes.ok) {
              const mePayload = await meRes.json().catch(() => ({}));
              
              const src = mePayload?.data ?? mePayload?.user ?? mePayload ?? {};
              const candidate = src?.data ?? src; // sometimes payload.data.data
              stationID =
                candidate?.stationId || candidate?.StationID || candidate?.stationID || candidate?.StationId || undefined;
              if (stationID) {
                console.log('[dashboardstaff] Found stationID from /api/auth/me:', stationID);
              }
            } else {
              // Backend error (500, etc.) - use cached user data or skip
              console.warn('[dashboardstaff] /api/auth/me returned', meRes.status, '- using user context data');
            }
          } catch (e) {
            console.error('[dashboardstaff] Error fetching /api/auth/me:', e);
            // Continue with user context data or undefined
          }
        }
        
        // If still no stationID, log warning but continue (backend may auto-filter by token)
        if (!stationID && process.env.NODE_ENV === 'development') {
          console.warn('[dashboardstaff] No stationID available - user:', user);
          console.warn('[dashboardstaff] Backend may auto-filter bookings by JWT token');
        }

        // Load bookings
        const list = await bookingService.getAllBookingOfStation(stationID);
        
        // Debug: log first booking to see available fields
        if (list && list.length > 0) {
          console.log('[dashboardstaff] Sample booking:', list[0]);
          console.log('[dashboardstaff] Available fields:', Object.keys(list[0]));
        }
        
        const rows = (list || []).map((b: any) => {
          // Extract customer name - try many possible field names
          const customerName = b.customerName || b.CustomerName || 
                               b.username || b.userName || b.UserName ||
                               b.fullName || b.FullName ||
                               b.customer || b.Customer ||
                               b.driver || b.Driver ||
                               b.user?.name || b.user?.fullName ||
                               b.Customer?.FullName || b.User?.FullName ||
                               '—';
          
          // Format date and time from bookingTime
          const bookingTimeStr = b.bookingTime || b.BookingTime || b.time || b.bookingHour || '';
          let dateStr = '--';
          let timeStr = '--';
          let sortDate: Date | null = null;
          
          if (bookingTimeStr) {
            try {
              const dt = new Date(bookingTimeStr);
              // Format: DD/MM/YYYY
              dateStr = dt.toLocaleDateString('vi-VN');
              // Format: HH:mm
              timeStr = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              sortDate = dt;
            } catch (e) {
              console.warn('[dashboardstaff] Failed to parse date:', bookingTimeStr);
            }
          }
          
          // Try createdAt or updatedAt as fallback for sorting
          if (!sortDate) {
            const createdAtStr = b.createdAt || b.CreatedAt || b.created_at;
            const updatedAtStr = b.updatedAt || b.UpdatedAt || b.updated_at;
            const fallbackDateStr = createdAtStr || updatedAtStr;
            if (fallbackDateStr) {
              try {
                sortDate = new Date(fallbackDateStr);
              } catch (e) {
                console.warn('[dashboardstaff] Failed to parse createdAt/updatedAt:', fallbackDateStr);
              }
            }
          }
          
          // Backend trả về Status (PascalCase) với giá trị: "Pending", "Confirmed", "Cancelled", "Completed"
          // Map từ backend field Status hoặc status (camelCase)
          const backendStatus = b.Status || b.status || b.bookingStatus || 'Pending';
          
          return {
            id: b.bookingID || b.id || b.BookingID || b.bookingId,
            name: customerName,
            date: dateStr,
            time: timeStr,
            status: backendStatus, // Backend trả về: "Pending", "Confirmed", "Cancelled", "Completed"
            raw: b,
            sortDate: sortDate || new Date(0), // Use epoch if no date available (will sort last)
          };
        });
        
        // Sort by booking time (newest first)
        rows.sort((a, b) => {
          const dateA = a.sortDate.getTime();
          const dateB = b.sortDate.getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        
        if (mounted) setData(rows);

        // NOTE: Batteries now loaded via useBatteries hook (same as Inventory page)

      } catch (e: any) {
        showToast({ type: 'error', message: e?.message || 'Failed to load data' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    // Only load when auth state is known; if not authenticated yet, skip and let AuthProvider refresh
    if (isAuthenticated || (typeof window !== 'undefined' && localStorage.getItem('accessToken'))) {
      load();
    }
    return () => { mounted = false; };
  }, [showToast, user, isAuthenticated]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter(d =>
      (d.name || '').toLowerCase().includes(s) || 
      (d.date || '').toLowerCase().includes(s) || 
      (d.time || '').toLowerCase().includes(s) ||
      (d.id || '').toLowerCase().includes(s)
    );
  }, [q, data]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  // Pagination logic for bookings
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

  // Pagination logic for swap transactions
  const totalPagesSwaps = Math.ceil(swapTransactions.length / itemsPerPageSwaps);
  const paginatedSwapTransactions = useMemo(() => {
    const startIdx = (currentPageSwaps - 1) * itemsPerPageSwaps;
    const endIdx = startIdx + itemsPerPageSwaps;
    return swapTransactions.slice(startIdx, endIdx);
  }, [swapTransactions, currentPageSwaps, itemsPerPageSwaps]);

  const goToPageSwaps = (page: number) => {
    if (page >= 1 && page <= totalPagesSwaps) {
      setCurrentPageSwaps(page);
    }
  };

  // Calculate stats
  // Backend BookingStatus enum: pending, confirmed, cancelled, completed
  // Backend trả về status là PascalCase: Pending, Confirmed, Cancelled, Completed
  // "Ready to Swap" = bookings có status = "completed" nhưng chưa swap xong (swap status != "completed")
  const activeReservations = useMemo(() => {
    // Chỉ tính khi swap transactions đã load xong (tránh hiển thị sai khi đang load)
    // Nếu swapTransactionsForStatus đang empty và chưa load xong, return 0 để tránh flash
    if (loadingSwaps && swapTransactionsForStatus.length === 0) {
      return 0; // Đang load, chưa có data, không hiển thị
    }
    
    // Tạo map bookingId -> swap status từ swapTransactionsForStatus (getAll - có BookingID)
    const swapStatusMap = new Map<string, string>();
    swapTransactionsForStatus.forEach((swap: any) => {
      // getAll() trả về SwapTransactionDTOs có BookingID
      const bookingId = swap.BookingID || swap.bookingID || swap.bookingId || swap.BookingId || (swap as any).booking_id || (swap as any).booking_ID;
      const swapStatus = swap.SwapStatus || swap.swapStatus || swap.status || swap.Status || '';
      if (bookingId && swapStatus) {
        swapStatusMap.set(bookingId, swapStatus.toLowerCase());
        console.log('[Dashboard] Mapped swap transaction:', { bookingId, swapStatus: swapStatus.toLowerCase() });
      }
    });
    
    console.log('[Dashboard] Swap status map:', Array.from(swapStatusMap.entries()));
    console.log('[Dashboard] All bookings:', data.map(d => ({ id: d.id, status: d.status })));
    
    // Đếm bookings có status = "completed" nhưng chưa swap xong
    const result = data.filter(d => {
      const status = (d.status || '').toLowerCase();
      if (status !== 'completed') return false;
      
      // Check swap status
      const bookingId = d.id;
      const swapStatus = swapStatusMap.get(bookingId);
      const isNotSwapped = !swapStatus || swapStatus !== 'completed';
      
      if (!isNotSwapped) {
        console.log('[Dashboard] Booking already swapped:', { bookingId, swapStatus });
      }
      
      // Chưa swap xong = không có swap transaction hoặc swap status != "completed"
      return isNotSwapped;
    });
    
    console.log('[Dashboard] Ready to Swap count:', result.length, 'bookings:', result.map(r => r.id));
    
    return result.length;
  }, [data, swapTransactionsForStatus, loadingSwaps]);
  
  // Use inventory data from useBatteries hook (same as Inventory page)
  // This ensures consistency between Dashboard and Inventory
  const fullBatteries = inventory?.available || 0;
  const faultyBatteries = inventory?.damaged || 0;
  const totalBatteries = inventory?.total || batteries.length;
  
  console.log('[dashboardstaff] Stats:', {
    fullBatteries,
    faultyBatteries,
    totalBatteries,
    batteriesCount: batteries.length,
    activeReservations
  });

  return (
    <div className="space-y-6">
      {/* Hero Stats - Today's Performance */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Staff Dashboard</h2>
            <p className="text-blue-100">Today's Operations Overview</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100 mb-1">Date</div>
            <div className="text-xl font-semibold">{new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Battery className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm text-blue-100">Ready Batteries</div>
            </div>
            <div className="text-4xl font-bold">{fullBatteries}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm text-blue-100">Damaged Batteries</div>
            </div>
            <div className="text-4xl font-bold">{faultyBatteries}</div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-blue-700 font-medium mb-1">Ready to Swap</div>
              <div className="text-3xl font-bold text-blue-900">{activeReservations}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <Link href="/reservations" className="text-sm text-blue-700 font-medium hover:text-blue-800 flex items-center gap-1">
            View Details <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-emerald-700 font-medium mb-1">Total Batteries</div>
              <div className="text-3xl font-bold text-emerald-900">{totalBatteries}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <Battery className="w-6 h-6" />
            </div>
          </div>
          <Link href="/inventory" className="text-sm text-emerald-700 font-medium hover:text-emerald-800 flex items-center gap-1">
            Manage Inventory <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      

      {/* Recent Swap Transactions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Repeat className="w-6 h-6 text-emerald-600" />
              Recent Swap Transactions
            </h3>
            <p className="text-sm text-gray-600 mt-1">All swap transactions at this station (total: {swapTransactions.length})</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadSwapTransactions}
              disabled={loadingSwaps}
              className="h-10 w-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingSwaps ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {loadingSwaps ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading swap transactions...</p>
          </div>
        ) : swapTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <Repeat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No swap transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">License Plate</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Booking Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cost</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSwapTransactions.map((swap: any, index: number) => {
                    const userName = swap.UserName || swap.userName || swap.driverName || '—';
                    const licensePlate = swap.LicensePlate || swap.licensePlate || swap.vehiclePlate || '—';
                    const bookingTime = swap.BookingTime || swap.bookingTime || swap.swapDate || '—';
                    const cost = swap.Cost || swap.cost || swap.amount || 0;
                    const status = swap.SwapStatus || swap.swapStatus || swap.status || '—';
                    
                    return (
                      <tr key={swap.SwapTransactionID || swap.swapTransactionID || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">{userName}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{licensePlate}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{bookingTime}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                          {typeof cost === 'number' ? `₫${cost.toLocaleString('vi-VN')}` : cost}
                        </td>
                        <td className="py-3 px-4">
                          <SwapStatusBadge value={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls for Swap Transactions */}
            {totalPagesSwaps > 1 && (
              <div className="mt-6 flex items-center justify-center border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPageSwaps(currentPageSwaps - 1)}
                    disabled={currentPageSwaps === 1}
                    className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPagesSwaps }, (_, i) => i + 1).map(page => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = 
                        page === 1 || 
                        page === totalPagesSwaps || 
                        (page >= currentPageSwaps - 1 && page <= currentPageSwaps + 1);
                      
                      const showEllipsis = 
                        (page === currentPageSwaps - 2 && currentPageSwaps > 3) ||
                        (page === currentPageSwaps + 2 && currentPageSwaps < totalPagesSwaps - 2);
                      
                      if (showEllipsis) {
                        return <span key={page} className="px-2 text-gray-500">...</span>;
                      }
                      
                      if (!showPage) return null;
                      
                      return (
                        <button
                          key={page}
                          onClick={() => goToPageSwaps(page)}
                          className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                            page === currentPageSwaps
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
                    onClick={() => goToPageSwaps(currentPageSwaps + 1)}
                    disabled={currentPageSwaps === totalPagesSwaps}
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

      {/* All Bookings */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Booking History
            </h3>
            <p className="text-sm text-gray-600 mt-1">All station bookings (total: {data.length})</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Search by name, date, time..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-64 rounded-lg border-2 border-gray-200 px-3 text-black placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <button className="h-10 w-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No bookings found</p>
          </div>
        ) : (
          <>
            <Table columns={columns} data={paginatedData} />
            
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

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Link href="/reservations" className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">Check-in & Verify</div>
                <div className="text-sm text-gray-600">Verify reservations</div>
              </div>
            </div>
          </Link>

          <Link href="/check-in" className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200 hover:shadow-lg transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Battery className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">Check-in & Swap</div>
                <div className="text-sm text-gray-600">Complete swap transactions</div>
              </div>
            </div>
          </Link>

          <Link href="/inventory" className="group relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 hover:shadow-lg transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Battery className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">Inventory</div>
                <div className="text-sm text-gray-600">Manage battery inventory</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
});
