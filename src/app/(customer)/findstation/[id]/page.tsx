"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaBolt,
  FaMapMarkerAlt,
  FaClock,
  FaCar,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import { getAllStationsUseCase } from "@/application/usecases/station/GetAllStations.usecase";
import { stationRepositoryAPI } from "@/infrastructure/repositories/StationRepositoryAPI.impl";
import { Station } from "@/domain/entities/Station";
import { useAppSelector, useAppDispatch } from "@/application/hooks/useRedux";
import { fetchAllVehicles } from "@/application/services/vehicleService";
import { fetchAllBatteryTypes } from "@/application/services/batteryTypeService";
import { bookingRepositoryAPI } from "@/infrastructure/repositories/BookingRepositoryAPI.impl";
import { createBookingUseCase } from "@/application/usecases/booking";
import { useAuth } from "@/presentation/hooks/useAuth";

export default function StationBookingPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const stationId = params.id as string;

  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<Date>(new Date());
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Get vehicle info and battery types from Redux
  const { selectedVehicle } = useAppSelector((state) => state.vehicle);
  const { batteryTypes } = useAppSelector((state) => state.batteryType);
  const { user } = useAuth();

  // Initialize booking time to current time
  useEffect(() => {
    const now = new Date();
    now.setMinutes(0);
    now.setSeconds(0);
    setBookingTime(now);
  }, []);

  // Fetch vehicles and battery types when component mounts if not already loaded
  useEffect(() => {
    if (!selectedVehicle) {
      dispatch(fetchAllVehicles());
    }
    if (batteryTypes.length === 0) {
      dispatch(fetchAllBatteryTypes());
    }
  }, [dispatch, selectedVehicle, batteryTypes.length]);

  useEffect(() => {
    const fetchStationDetails = async () => {
      try {
        setLoading(true);
        const stations = await getAllStationsUseCase(stationRepositoryAPI);
        const foundStation = stations.find((s) => s.stationID === stationId);
        
        if (foundStation) {
          // Fetch availableSlots from search API using station's own location
          if (selectedVehicle && batteryTypes.length > 0) {
            try {
              const batteryType = batteryTypes.find(
                (bt) => bt.batteryTypeID === selectedVehicle.batteryTypeID
              );
              
              if (batteryType) {
                // Use station's coordinates to search
                const searchResults = await stationRepositoryAPI.search({
                  latitude: foundStation.latitude,
                  longitude: foundStation.longitude,
                  batteryType: batteryType.batteryTypeModel as "Small" | "Medium" | "Large",
                });
                
                // Find matching station in search results
                const searchStation = searchResults.find(
                  (s) => s.stationName === foundStation.stationName
                );
                
                if (searchStation) {
                  // Merge availableSlots from search API into station data
                  (foundStation as any).availableSlots = searchStation.availableSlots;
                  console.log("✅ Updated station with availableSlots:", searchStation.availableSlots);
                }
              }
            } catch (error) {
              console.error("Error fetching availableSlots from search API:", error);
            }
          }
          
          setStation(foundStation || null);

          // Update URL with station name for breadcrumb
          const url = new URL(window.location.href);
          url.searchParams.set("name", foundStation.stationName);
          window.history.replaceState({}, "", url);
        } else {
          setStation(null);
        }
      } catch (error) {
        console.error("Error fetching station:", error);
      } finally {
        setLoading(false);
      }
    };

    if (stationId) {
      fetchStationDetails();
    }
  }, [stationId, selectedVehicle, batteryTypes]);

  // Fetch user subscriptions
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoadingSubscription(true);
        let token = localStorage.getItem("accessToken");
        
        if (!token) {
          const cookies = document.cookie.split(';');
          const tokenCookie = cookies.find(c => c.trim().startsWith('accessToken='));
          if (tokenCookie) {
            token = tokenCookie.split('=')[1];
          }
        }

        if (!token) {
          setLoadingSubscription(false);
          return;
        }

        const response = await fetch('/api/me/user-subscriptions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const active = result.data.filter((sub: any) => sub.status === 'Active');
          setActiveSubscriptions(active);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const handleBooking = async () => {
    if (!station || !selectedVehicle) {
      setError("Please ensure you have selected a vehicle");
      return;
    }

    // Check if dev mode or has API token
    const devToken = process.env.NEXT_PUBLIC_API_TOKEN;
    const isDevMode = Boolean(devToken);

    // Get userId with fallback to localStorage
    let userId: string | undefined = user?.userId;
    
    // Fallback: try to get from localStorage if AuthContext hasn't loaded yet
    if (!userId) {
      try {
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          userId = userInfo?.userId;
          console.log("[Booking] Got userId from localStorage:", userId);
        }
      } catch (e) {
        console.error("[Booking] Error parsing userInfo from localStorage:", e);
      }
    }
    
    // Final fallback for dev mode
    if (!userId && isDevMode) {
      userId = "12345";
    }

    console.log("[Booking Debug] User object:", user);
    console.log("[Booking Debug] User ID:", userId);
    console.log("[Booking Debug] Is Dev Mode:", isDevMode);

    if (!userId) {
      setError("⚠️ Authentication Error - Please login to continue booking. If you're already logged in, try refreshing the page.");
      return;
    }

    // Validate booking time is not in the past
    const now = new Date();
    if (bookingTime < now) {
      setError("Booking time cannot be in the past");
      return;
    }

    setBookingLoading(true);
    setError("");

    try {
      const bookingRequest = {
        userID: userId,
        vehicleID: selectedVehicle.vehicleID,
        stationID: station.stationID,
        batteryTypeID: selectedVehicle.batteryTypeID,
        bookingDays: bookingTime.getDate(),
        bookingMonth: bookingTime.getMonth() + 1,
        bookingYear: bookingTime.getFullYear(),
        bookingHour: bookingTime.getHours(),
        bookingMinute: bookingTime.getMinutes(),
      };

      await createBookingUseCase(bookingRepositoryAPI, bookingRequest);

      setBookingSuccess(true);
      
      // Redirect to bookings list page after 2 seconds
      setTimeout(() => {
        router.push("/booking");
      }, 2000);
    } catch (err) {
      console.error("Error creating booking:", err);
      
      // Extract error message from various error formats
      let errorMessage = "Failed to create booking";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        // Check for axios error response
        if (errorObj.response?.data?.message) {
          errorMessage = errorObj.response.data.message;
        } else if (errorObj.response?.data) {
          errorMessage = typeof errorObj.response.data === 'string' 
            ? errorObj.response.data 
            : JSON.stringify(errorObj.response.data);
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }
      
      // Improve error messages for better UX
      if (errorMessage.includes("ongoing swap transaction")) {
        errorMessage = "⚠️ You have an ongoing swap transaction. Please complete it before creating a new booking.";
      } else if (errorMessage.includes("existing pending booking") || errorMessage.includes("pending booking")) {
        errorMessage = "⚠️ You already have a pending booking. Please complete or cancel it before creating a new one.";
      }
      
      setError(errorMessage);
    } finally {
      setBookingLoading(false);
    }
  };

  // Success modal
  if (bookingSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <FaCheckCircle className="text-5xl text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Successful!
          </h2>
          <p className="text-gray-600 mb-4">
            Redirecting to My Bookings...
          </p>
          <div className="flex items-center justify-center">
            <FaSpinner className="text-2xl text-indigo-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading station information...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Station Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The station you are looking for does not exist or has been removed
          </p>
          <button
            onClick={() => router.push("/findstation")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Find Station
          </button>
        </div>
      </div>
    );
  }

  // Priority: availableSlots from search API > batteryInSlots
  const availableBatteries = (station as any).availableSlots ?? station.batteryInSlots;
  const availabilityPercentage = Math.round(
    (availableBatteries / station.stationCapacity) * 100
  );

  // Check if booking time is in the past
  const isBookingTimeValid = () => {
    const now = new Date();
    return bookingTime >= now;
  };

  return (
    <div className="h-full relative">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 mb-4 transition-colors"
      >
        <FaArrowLeft />
        <span>Back</span>
      </button>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-3rem)]">
        {/* Left Column - Station Info */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
          {/* Station Header */}
          <div className="bg-linear-to-r from-indigo-600 to-indigo-800 text-white p-4">
            <h1 className="text-2xl font-bold mb-2">{station.stationName}</h1>
            <div className="flex items-start gap-2">
              <FaMapMarkerAlt className="mt-1 shrink-0" />
              <p className="text-indigo-100 text-sm">
                {station.stationLocation}
              </p>
            </div>
          </div>

          {/* Station Details - Scrollable if needed */}
          <div className="p-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {/* Available Batteries */}
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <FaBolt className="text-white text-lg" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Available</p>
                    <p className="text-xl font-bold text-green-700">
                      {availableBatteries}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Batteries */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {station.stationCapacity}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Batteries</p>
                    <p className="text-xl font-bold text-blue-700">
                      {station.stationCapacity}
                    </p>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {availabilityPercentage}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Availability</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {availabilityPercentage}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Availability Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  Battery Status
                </span>
                <span className="text-xs text-gray-600">
                  {availableBatteries}/{station.stationCapacity} available
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-linear-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${availabilityPercentage}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Status Message */}
            {availableBatteries > 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 font-medium text-sm">
                   This station has batteries available for swap
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 font-medium text-sm">
                   This station currently has no batteries available
                </p>
              </div>
            )}

            {/* Subscription Status */}
            <div className="mt-4">
              {loadingSubscription ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <FaSpinner className="text-indigo-600 animate-spin text-sm" />
                    <span className="text-sm text-gray-600">Checking subscription...</span>
                  </div>
                </div>
              ) : activeSubscriptions.length > 0 ? (
                <div className="bg-white border-2 border-green-500 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-green-800">
                      Active Subscription
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activeSubscriptions.map((sub, index) => (
                      <div key={sub.subscriptionID} className={index > 0 ? 'pt-2 border-t border-green-200' : ''}>
                        <p className="text-xs text-gray-700 mb-0.5">
                          <strong>Plan:</strong> {sub.planName}
                        </p>
                        <p className="text-xs text-gray-700 mb-0.5">
                          <strong>Battery:</strong> {sub.batteryType}
                        </p>
                        <p className="text-xs text-gray-600">
                          Valid until: {new Date(sub.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-600">
                          Remaining swaps: {sub.remainingSwaps !== null ? sub.remainingSwaps : 'Unlimited'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border-2 border-amber-500 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-amber-800">
                      No Active Subscription
                    </h4>
                  </div>
                  <p className="text-xs text-amber-700 mb-2">
                    You need a subscription plan to swap batteries
                  </p>
                  <button
                    onClick={() => router.push('/billing-plan')}
                    className="w-full px-3 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    View Subscription Plans
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Booking Form */}
        <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaClock className="text-indigo-600" />
            Book Battery Swap
          </h2>

          <div className="space-y-4 flex-1">
            {/* Vehicle Information */}
            {selectedVehicle ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FaCar className="text-indigo-600 mt-1 shrink-0 text-xl" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      Vehicle Information
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Model:</span>
                        <span className="text-xs font-medium text-gray-800">
                          {selectedVehicle.vehicleName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">License:</span>
                        <span className="text-xs font-medium text-gray-800">
                          {selectedVehicle.licensePlate}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Battery:</span>
                        <span className="text-xs font-medium text-indigo-700">
                          {(() => {
                            const batteryType = batteryTypes.find(
                              (bt) =>
                                bt.batteryTypeID ===
                                selectedVehicle.batteryTypeID
                            );
                            return batteryType
                              ? `${batteryType.batteryTypeModel} (${batteryType.batteryTypeCapacity}kWh)`
                              : "N/A";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                   No vehicle information available. Please add a vehicle in the vehicle management section.
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className={`border-l-4 p-4 rounded-lg ${
                error.includes("ongoing swap transaction") || error.includes("pending booking")
                  ? "bg-amber-50 border-amber-500"
                  : "bg-red-50 border-red-500"
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {error.includes("ongoing swap transaction") || error.includes("pending booking") ? (
                      <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      error.includes("ongoing swap transaction") || error.includes("pending booking")
                        ? "text-amber-800"
                        : "text-red-700"
                    }`}>
                      {error}
                    </p>
                    {(error.includes("ongoing swap transaction") || error.includes("pending booking")) && (
                      <button
                        onClick={() => router.push("/history")}
                        className="mt-2 text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
                      >
                        View My Bookings →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Booking Time Picker */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FaClock className="text-indigo-600" />
                <p className="text-sm font-semibold text-gray-800">
                  Select Booking Time
                </p>
              </div>
              
              {/* Date Input */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date:
                </label>
                <input
                  type="date"
                  value={bookingTime.toISOString().split('T')[0]}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    newDate.setHours(bookingTime.getHours());
                    newDate.setMinutes(bookingTime.getMinutes());
                    const now = new Date();
                    if (newDate >= now) {
                      setBookingTime(newDate);
                      setError("");
                    } else {
                      setError("Cannot select date in the past");
                    }
                  }}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Time Input */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hour:
                  </label>
                  <select
                    value={bookingTime.getHours()}
                    onChange={(e) => {
                      const newDate = new Date(bookingTime);
                      newDate.setHours(parseInt(e.target.value));
                      const now = new Date();
                      if (newDate >= now) {
                        setBookingTime(newDate);
                        setError("");
                      } else {
                        setError("Cannot select time in the past");
                      }
                    }}
                    className="w-full px-2 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                      const now = new Date();
                      const selectedDate = new Date(bookingTime);
                      selectedDate.setHours(0, 0, 0, 0);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      // Disable if selected date is today and hour is in the past
                      const isDisabled = selectedDate.getTime() === today.getTime() && hour < now.getHours();
                      
                      return (
                        <option key={hour} value={hour} disabled={isDisabled} style={isDisabled ? { color: '#ccc' } : {}}>
                          {String(hour).padStart(2, '0')}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Minute:
                  </label>
                  <select
                    value={bookingTime.getMinutes()}
                    onChange={(e) => {
                      const newDate = new Date(bookingTime);
                      newDate.setMinutes(parseInt(e.target.value));
                      const now = new Date();
                      if (newDate >= now) {
                        setBookingTime(newDate);
                        setError("");
                      } else {
                        setError("Cannot select time in the past");
                      }
                    }}
                    className="w-full px-2 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((minute) => {
                      const now = new Date();
                      const selectedDate = new Date(bookingTime);
                      selectedDate.setHours(0, 0, 0, 0);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      // Disable if selected date is today, same hour, and minute is in the past
                      const isDisabled = 
                        selectedDate.getTime() === today.getTime() && 
                        bookingTime.getHours() === now.getHours() && 
                        minute <= now.getMinutes();
                      
                      return (
                        <option key={minute} value={minute} disabled={isDisabled} style={isDisabled ? { color: '#ccc' } : {}}>
                          {String(minute).padStart(2, '0')}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Selected Time Display */}
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-900">
                  <strong>Selected:</strong> {bookingTime.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </p>
              </div>
            </div>

            {/* Booking Time Info */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FaClock className="text-indigo-600 mt-0.5 shrink-0 text-sm" />
                <div>
                  <p className="text-xs font-semibold text-gray-800 mb-1">
                    Swap Time Window
                  </p>
                  <p className="text-xs text-gray-600">
                    You have up to <strong className="text-indigo-700">1 hour</strong> from booking time to arrive at the station.
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Button */}
            <button
              onClick={handleBooking}
              disabled={!selectedVehicle || availableBatteries === 0 || bookingLoading || !isBookingTimeValid()}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {bookingLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Processing...
                </>
              ) : !selectedVehicle ? (
                "No Vehicle Selected"
              ) : availableBatteries === 0 ? (
                "No Batteries Available"
              ) : (
                "Book Now"
              )}
            </button>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Please arrive within 1 hour after booking. To cancel, please do so at least 30 minutes in advance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
