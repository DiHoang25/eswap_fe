"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { withCustomerAuth } from '@/hoc/withAuth';
import { FaSpinner } from "react-icons/fa";

const BookingPage = () => {
  const router = useRouter();

  // State management
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<string>("all"); // all, today, week, month

  // Fetch all bookings on mount
  useEffect(() => {
    fetchAllBookings();
  }, []);

  // Filter bookings when data or filter changes
  useEffect(() => {
    filterBookingsByTime();
  }, [allBookings, timeFilter]);

  // Filter bookings by time
  const filterBookingsByTime = () => {
    if (timeFilter === "all") {
      setFilteredBookings(allBookings);
      return;
    }

    const now = new Date();
    const filtered = allBookings.filter((booking) => {
      const bookingDate = new Date(booking.bookingTime);
      
      switch (timeFilter) {
        case "today":
          return bookingDate.toDateString() === now.toDateString();
        case "week":
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return bookingDate >= weekAgo;
        case "month":
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return bookingDate >= monthAgo;
        default:
          return true;
      }
    });

    setFilteredBookings(filtered);
  };

  // Fetch all bookings
  const fetchAllBookings = async () => {
    console.log("fetchAllBookings called");
    setLoadingBookings(true);
    try {
      let token = localStorage.getItem("accessToken");
      
      // Fallback: try to get from cookie
      if (!token) {
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(c => c.trim().startsWith('accessToken='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }
      
      console.log("Token exists:", !!token);
      if (!token) {
        console.log("No token found in localStorage or cookie");
        setError("Please login again to view bookings");
        setLoadingBookings(false);
        return;
      }

      // Get selectedVehicleId from localStorage (optional filter)
      const selectedVehicleId = localStorage.getItem("selectedVehicleId");
      
      // Build URL with query params
      // Note: Không filter theo vehicleId để lấy tất cả bookings của user
      const params = new URLSearchParams();
      // Tạm comment để lấy tất cả bookings
      // if (selectedVehicleId) {
      //   params.append("vehicleId", selectedVehicleId);
      // }
      const queryString = params.toString();
      const url = `/api/booking/get-user${queryString ? `?${queryString}` : ''}`;
      
      console.log("Fetching all bookings from:", url);
      console.log("Selected vehicle ID (not filtering):", selectedVehicleId);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      console.log("=== BOOKINGS API DEBUG ===");
      console.log("Full response:", JSON.stringify(result, null, 2));
      console.log("Response structure:", {
        success: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        isArray: Array.isArray(result.data),
        dataKeys: result.data ? Object.keys(result.data) : null,
      });
      
      // Parse response từ proxy: { success: true, data: { success: true, message: "OK", data: [...], pagination: null } }
      let bookingsData: any[] = [];
      
      if (result.success && result.data?.data && Array.isArray(result.data.data)) {
        console.log("Found bookings:", result.data.data.length);
        bookingsData = result.data.data;
      } else if (Array.isArray(result.data)) {
        console.log("Data is array:", result.data.length);
        bookingsData = result.data;
      } else {
        console.log("No bookings found");
        bookingsData = [];
      }
      
      // Sort bookings by date (newest first)
      const sortedBookings = bookingsData.sort((a, b) => {
        const dateA = new Date(a.bookingTime || a.createdAt || 0);
        const dateB = new Date(b.bookingTime || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setAllBookings(sortedBookings);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
            <button
              onClick={() => router.push("/findstation")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm"
            >
              Book New Swap
            </button>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              Your Bookings
            </h2>
            
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

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loadingBookings ? (
            <div className="text-center py-12">
              <FaSpinner className="text-4xl text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading your bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {allBookings.length === 0 ? "No Bookings Yet" : "No Bookings Found"}
              </h3>
              <p className="text-gray-500 mb-6">
                {allBookings.length === 0 
                  ? "You haven't made any battery swap bookings yet."
                  : `No bookings found for ${timeFilter === "today" ? "today" : timeFilter === "week" ? "the last 7 days" : timeFilter === "month" ? "the last 30 days" : "this period"}.`
                }
              </p>
              {allBookings.length === 0 && (
                <button
                  onClick={() => router.push("/findstation")}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                  Find a Station
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.bookingID}
                  className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {booking.stationName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        ID: {booking.bookingID}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : booking.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-600 font-medium">Vehicle:</span>
                      <p className="text-gray-900 font-semibold">
                        {booking.vehicleName}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Battery:</span>
                      <p className="text-gray-900 font-semibold">
                        {booking.batteryType}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Time:</span>
                      <p className="text-gray-900 font-semibold">
                        {new Date(booking.bookingTime).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Pending status - require subscription */}
                  {booking.status === "pending" && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-amber-800 mb-1">
                              Subscription Required
                            </h4>
                            <p className="text-xs text-amber-700 mb-3">
                              You need an active subscription plan to proceed with this battery swap. Please purchase a plan to continue.
                            </p>
                            <button
                              onClick={() => router.push("/billing-plan")}
                              className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                            >
                              View Subscription Plans
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withCustomerAuth(BookingPage);
