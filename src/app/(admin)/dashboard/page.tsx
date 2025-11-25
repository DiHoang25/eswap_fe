'use client';

import { useEffect, useState, useMemo } from 'react';
import { withAdminAuth } from '@/hoc/withAuth';
import { useAppDispatch, useAppSelector } from '@/application/hooks/useRedux';
import { fetchAllUsers } from '@/application/services/userService';
import { fetchAllStations } from '@/application/services/stationService';
import { fetchAllBatteries } from '@/application/services/batteryService';
import { swapTransactionRepository } from '@/infrastructure/repositories/Hoang/SwapTransactionRepository';
import { BatteryRepository } from '@/infrastructure/repositories/Hoang/BatteryRepository';
import api from '@/lib/api';
import { 
  FaUsers, 
  FaMapMarkerAlt, 
  FaBatteryFull, 
  FaExclamationTriangle,
  FaExchangeAlt,
  FaCalendarCheck
} from 'react-icons/fa';

export default withAdminAuth(function AdminDashboard() {
  const dispatch = useAppDispatch();
  
  // Get data from Redux
  const { users } = useAppSelector((state) => state.user);
  const { stations } = useAppSelector((state) => state.station);
  const { batteries, pagination: batteryPagination } = useAppSelector((state) => state.battery);
  
  // State for additional metrics
  const [totalSwapTransactions, setTotalSwapTransactions] = useState<number>(0);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [faultyBatteriesCount, setFaultyBatteriesCount] = useState<number>(0);
  const [loadingFaultyBatteries, setLoadingFaultyBatteries] = useState(false);
  
  // Battery repository instance (same as employee dashboard)
  const batteryRepository = new BatteryRepository();

  // Fetch data on mount
  useEffect(() => {
    if (users.length === 0) {
      dispatch(fetchAllUsers({ pageNumber: 1, pageSize: 100 }));
    }
    if (stations.length === 0) {
      dispatch(fetchAllStations());
    }
    if (batteries.length === 0) {
      // Fetch with large pageSize to get all batteries for accurate total count
      // Use totalItems from pagination response for accurate count
      dispatch(fetchAllBatteries({ pageNumber: 1, pageSize: 10000 }));
    }
    
    // Fetch additional metrics for admin dashboard
    const fetchMetrics = async () => {
      try {
        setLoadingMetrics(true);
        
        // Fetch total swap transactions (all time)
        try {
          const swapTransactions = await swapTransactionRepository.getAll();
          setTotalSwapTransactions(swapTransactions.length);
        } catch (error) {
          console.error('[Admin Dashboard] Failed to fetch swap transactions:', error);
        }
        
        // Fetch total bookings (Admin endpoint: GET /api/bookings) - all time
        try {
          const bookingsResponse = await api.get('/bookings');
          const bookingsData = bookingsResponse.data?.data || bookingsResponse.data || [];
          setTotalBookings(Array.isArray(bookingsData) ? bookingsData.length : 0);
        } catch (error) {
          console.error('[Admin Dashboard] Failed to fetch bookings:', error);
        }
      } finally {
        setLoadingMetrics(false);
      }
    };
    
    // Fetch faulty batteries from all stations (same logic as employee dashboard)
    const fetchFaultyBatteries = async () => {
      if (stations.length === 0) {
        console.log('[Admin Dashboard] No stations available yet, skipping faulty batteries fetch');
        return;
      }
      
      try {
        setLoadingFaultyBatteries(true);
        console.log('[Admin Dashboard] Fetching batteries from all stations:', stations.length);
        
        // Fetch batteries from all stations (same as employee dashboard)
        const allBatteriesPromises = stations.map(station => 
          batteryRepository.getByStation(station.stationID).catch(err => {
            // 404 means station has no batteries - this is normal, don't log as error
            const is404 = (err as any)?.response?.status === 404;
            if (!is404) {
              console.error(`[Admin Dashboard] Failed to fetch batteries for station ${station.stationID}:`, err);
            }
            return []; // Return empty array on error (404 or other errors)
          })
        );
        
        const allBatteriesArrays = await Promise.all(allBatteriesPromises);
        const allBatteries = allBatteriesArrays.flat();
        
        console.log('[Admin Dashboard] Total batteries fetched from all stations:', allBatteries.length);
        
        // Count faulty batteries (status === 'Damaged' after mapping, same as employee dashboard)
        // BatteryRepository.getByStation() maps "faulty" -> "Damaged" (PascalCase)
        const faultyCount = allBatteries.filter(b => b.status === 'Damaged').length;
        
        console.log('[Admin Dashboard] Faulty batteries count:', faultyCount, {
          total: allBatteries.length,
          statusBreakdown: {
            available: allBatteries.filter(b => b.status === 'Available').length,
            charging: allBatteries.filter(b => b.status === 'Charging').length,
            inUse: allBatteries.filter(b => b.status === 'In-Use').length,
            maintenance: allBatteries.filter(b => b.status === 'Maintenance').length,
            damaged: allBatteries.filter(b => b.status === 'Damaged').length,
          }
        });
        
        setFaultyBatteriesCount(faultyCount);
      } catch (error) {
        console.error('[Admin Dashboard] Failed to fetch faulty batteries:', error);
        setFaultyBatteriesCount(0);
      } finally {
        setLoadingFaultyBatteries(false);
      }
    };
    
    fetchMetrics();
    
    // Fetch faulty batteries when stations are loaded
    if (stations.length > 0) {
      fetchFaultyBatteries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations.length]);

  // Calculate statistics
  const totalUsers = users.length;
  const totalStations = stations.length;
  // Use pagination.totalItems if available, otherwise fallback to batteries.length
  // This ensures we show the correct total even if we only loaded a subset
  const totalBatteries = batteryPagination?.totalItems ?? batteries.length;

  // Battery statistics
  // Use faultyBatteriesCount from state (fetched from all stations using BatteryRepository.getByStation)
  // This matches the employee dashboard logic: BatteryRepository maps "faulty" -> "Damaged"
  const faultyBatteries = loadingFaultyBatteries ? 0 : faultyBatteriesCount;

  return (
    <div className="space-y-6">
      {/* Hero Stats - System Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
            <p className="text-blue-100">System Overview</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100 mb-1">Date</div>
            <div className="text-xl font-semibold">{new Date().toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <FaUsers className="w-5 h-5 text-white" />
                </div>
              <div className="text-sm text-blue-100">Total Users</div>
                </div>
            <div className="text-4xl font-bold">{totalUsers}</div>
              </div>
              
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <FaMapMarkerAlt className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm text-blue-100">Total Stations</div>
            </div>
            <div className="text-4xl font-bold">{totalStations}</div>
                    </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                <FaBatteryFull className="w-5 h-5 text-white" />
                </div>
              <div className="text-sm text-blue-100">Total Batteries</div>
            </div>
            <div className="text-4xl font-bold">{totalBatteries}</div>
      </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Faulty Batteries */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-6 border border-rose-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-rose-700 font-medium mb-1">Faulty Batteries</div>
              <div className="text-3xl font-bold text-rose-900">{faultyBatteries}</div>
              <div className="text-xs text-rose-600 mt-1">Requires attention</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center text-white">
              <FaExclamationTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Swap Transactions */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-indigo-700 font-medium mb-1">Total Swap Transactions</div>
              <div className="text-3xl font-bold text-indigo-900">
                {loadingMetrics ? '...' : totalSwapTransactions}
              </div>
              <div className="text-xs text-indigo-600 mt-1">All time</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white">
              <FaExchangeAlt className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-blue-700 font-medium mb-1">Total Bookings</div>
              <div className="text-3xl font-bold text-blue-900">
                {loadingMetrics ? '...' : totalBookings}
              </div>
              <div className="text-xs text-blue-600 mt-1">All bookings</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
              <FaCalendarCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

