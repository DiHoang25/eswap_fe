"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSelector } from "@/application/hooks/useRedux";
import CarInfoCard from "./components/CarInfoCard";
import BatteryStatusCard from "./components/BatteryStatusCard";
import BookingInfoCard from "./components/BookingInfoCard";
import StatsSummaryCard from "./components/StatsSummaryCard";
import ActivitiesLog from "./components/ActivitiesLog";
import RecentStationsList from "./components/RecentStationsList";
import { MapSection } from "@/presentation/components/features";

function CustomerHomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { selectedVehicle } = useAppSelector((state) => state.vehicle);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  
  // Data states for home page components
  const [upcomingBooking, setUpcomingBooking] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [recentStations, setRecentStations] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Handle Google OAuth callback redirect - MUST run before auth check
  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    
    if (token) {
      console.log('[Home] Detected Google OAuth token, redirecting to /google-callback');
      setIsProcessingOAuth(true);
      
      // Backend redirected here instead of /google-callback
      // Forward to proper callback handler
      const params = new URLSearchParams();
      params.set('token', token);
      if (refreshToken) params.set('refreshToken', refreshToken);
      
      // Use window.location for hard redirect to ensure clean state
      window.location.href = `/google-callback?${params.toString()}`;
      return;
    }
  }, [searchParams]);

  // Manual auth check - redirect if not authenticated
  useEffect(() => {
    if (isProcessingOAuth) return; // Skip auth check if processing OAuth
    
    if (!loading && !user) {
      console.log('[Home] Not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [user, loading, router, isProcessingOAuth]);

  // Show loading during OAuth processing or auth check
  if (isProcessingOAuth || loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isProcessingOAuth ? 'Processing Google login...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }
  const handleFindStation = () => {
    console.log("Find station clicked");
    router.push('/findstation');
  };

  const handleViewAllActivities = () => {
    console.log("View all activities clicked");
    router.push('/history');
  };

  const handleSearchStations = () => {
    console.log("Search stations clicked");
    // TODO: Implement search functionality
  };

  const handleStationSelect = (station: {
    id: string;
    name: string;
    address: string;
    imageUrl?: string;
  }) => {
    console.log("Station selected:", station);
    // TODO: Navigate to station details or booking
  };

  // Fetch data for home page components
  useEffect(() => {
    if (isProcessingOAuth || loading || !user) return;

    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000; // 1 second

    const fetchHomeData = async () => {
      if (!isMounted) return;
      
      // Wait for auth to be ready and user to be loaded
      if (isProcessingOAuth || loading || !user || !user.userId) {
        console.log('[Home] Waiting for auth:', { isProcessingOAuth, loading, hasUser: !!user, hasUserId: !!user?.userId });
        return;
      }

      // Also check if token is available
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        console.log('[Home] No token available, waiting...');
        return;
      }

      console.log('[Home] Starting to fetch home data for user:', user.userId);
      setLoadingData(true);

      try {
        // Fetch upcoming booking
        try {
          const { bookingRepository } = await import('@/infrastructure/repositories/Hoang/BookingRepository');
          const bookings = await bookingRepository.getByCustomer(user.userId);
          // Find upcoming booking (status: Pending, Booked, Queue, Checked)
          const upcoming = bookings.find(b => 
            ['Pending', 'Booked', 'Queue', 'Checked'].includes(b.bookingStatus || '')
          );
          if (isMounted) {
            setUpcomingBooking(upcoming || null);
          }
        } catch (error: any) {
          console.error('[Home] Error fetching bookings:', error);
        }

        // Fetch swap transactions for activities
        try {
          const { swapTransactionRepository } = await import('@/infrastructure/repositories/Hoang/SwapTransactionRepository');
          const transactions = await swapTransactionRepository.getMySwapTransactions();
          if (isMounted) {
            setAllTransactions(transactions || []);
            // Sort by date (newest first) and take first 10 for activities
            const sorted = [...(transactions || [])].sort((a, b) => {
              const dateA = new Date(a.swapDate || a.createdAt || 0).getTime();
              const dateB = new Date(b.swapDate || b.createdAt || 0).getTime();
              return dateB - dateA;
            });
            setRecentActivities(sorted.slice(0, 10));
          }
        } catch (error: any) {
          console.error('[Home] Error fetching transactions:', error);
          if (isMounted) {
            setAllTransactions([]);
            setRecentActivities([]);
          }
        }

        // Fetch user subscriptions for stats
        try {
          const response = await fetch('/api/me/user-subscriptions', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const result = await response.json();
            const subscriptions = result.data?.data || result.data || [];
            // Find active subscription
            const activeSub = subscriptions.find((sub: any) => sub.Status === 'Active');
            if (isMounted) {
              setUserStats({
                subscription: activeSub || null,
                allSubscriptions: subscriptions,
              });
            }
          }
        } catch (error: any) {
          console.error('[Home] Error fetching subscriptions:', error);
        }

        // Fetch stations
        try {
          const { stationRepositoryAPI } = await import('@/infrastructure/repositories/Hoang/StationRepositoryAPI.impl');
          const stations = await stationRepositoryAPI.getAll();
          if (isMounted) {
            // Show all stations (no limit) - scrollbar will handle overflow
            setRecentStations(stations || []);
          }
        } catch (error: any) {
          console.error('[Home] Error fetching stations:', error);
          if (isMounted) {
            setRecentStations([]);
          }
        }

        setLoadingData(false);
      } catch (error: any) {
        console.error('[Home] Error fetching home data:', error);
        // Implement retry logic for network errors or auth issues
        if (
          (error?.message?.includes('Network') || error?.message?.includes('Failed to fetch') || error?.message?.includes('401')) &&
          retryCount < MAX_RETRIES
        ) {
          retryCount++;
          console.warn(`[Home] Retrying data fetch (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(fetchHomeData, RETRY_DELAY);
        } else {
          if (isMounted) {
            setLoadingData(false);
          }
        }
      }
    };

    fetchHomeData();

    return () => {
      isMounted = false;
    };
  }, [user, loading, isProcessingOAuth, user?.userId]);

  return (
    <div className="w-full">
      {/* Main Content - Scrollable */}
      <div className="space-y-6">
        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            {/* Car Info Card */}
            <div>
              <CarInfoCard />
            </div>

            {/* Battery Status Card */}
            <div className="min-h-[200px]">
              <BatteryStatusCard 
                selectedVehicle={selectedVehicle}
                onFindStation={handleFindStation} 
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-2">
            {/* Booking Info Card */}
            <div>
              <BookingInfoCard booking={upcomingBooking} loading={loadingData} />
            </div>

            {/* Stats Summary Card */}
            <div>
              <StatsSummaryCard 
                transactions={allTransactions}
                userStats={userStats}
                loading={loadingData}
              />
            </div>

            {/* Activities Log */}
            <div>
              <ActivitiesLog 
                transactions={allTransactions}
                loading={loadingData}
                onViewAll={handleViewAllActivities} 
              />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Stations List */}
          <div className="h-[500px]">
            <RecentStationsList
              stations={recentStations}
              loading={loadingData}
              onSearch={handleSearchStations}
              onStationSelect={handleStationSelect}
            />
          </div>

          {/* Map Section */}
          <div className="min-h-[400px]">
            <MapSection />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerHomePage;
