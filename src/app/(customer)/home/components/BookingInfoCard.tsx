"use client";
import React from "react";

interface BookingInfoCardProps {
  booking?: any;
  loading?: boolean;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const days = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
    const day = days[date.getDay()];
    const dayNum = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}, ${dayNum} thg ${month}, ${year}`;
  } catch {
    return dateString;
  }
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `at ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status?.toLowerCase()) {
    case 'completed':
      return { bg: 'bg-green-500', text: 'text-green-600' };
    case 'confirmed':
    case 'booked':
    case 'checked':
      return { bg: 'bg-blue-500', text: 'text-blue-600' };
    case 'pending':
    case 'queue':
      return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
    case 'cancelled':
      return { bg: 'bg-red-500', text: 'text-red-600' };
    default:
      return { bg: 'bg-gray-500', text: 'text-gray-600' };
  }
}

function getStatusText(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'Completed';
    case 'confirmed':
      return 'Confirmed';
    case 'booked':
      return 'Booked';
    case 'checked':
      return 'Checked';
    case 'pending':
      return 'Pending';
    case 'queue':
      return 'In Queue';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
}

export default function BookingInfoCard({
  booking,
  loading = false,
}: BookingInfoCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-2 px-4 shadow-md border-2 border-indigo-600">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  // No booking state - return null to hide the component
  if (!booking) {
    return null;
  }

  const bookingTime = booking.bookingTime || booking.preferred_time || booking.createdAt;
  const date = bookingTime ? formatDate(bookingTime) : 'N/A';
  const time = bookingTime ? formatTime(bookingTime) : '';
  const price = booking.amount || booking.cost || 0;
  const stationName = booking.stationName || 'N/A';
  const bookingId = booking.bookingID || booking.booking_id || 'N/A';
  const address = booking.stationLocation || booking.address || '';
  const status = booking.bookingStatus || booking.status || 'Pending';
  const statusColors = getStatusColor(status);
  const statusText = getStatusText(status);

  return (
    <div className="bg-white rounded-2xl p-2 px-4 shadow-md border-2 border-indigo-600">
      <div className="flex flex-col justify-between">
        {/* Top Row - Date/Time and Price */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-bold text-blue-700">
              {date} {time}
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800">{formatCurrency(price)}</div>
          </div>
        </div>

        {/* Bottom Section - 2 Columns Layout */}
        <div className="grid grid-cols-3 gap-1">
          {/* Left Column (chiếm 2/3) */}
          <div className="col-span-2 space-y-1">
            <div>
              <div className="text-sm font-bold text-gray-600">
                {stationName}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{address}</div>
            </div>
          </div>

          {/* Right Column (chiếm 1/3) */}
          <div className="space-y-1 justify-items-end">
            <div>
              <div className="text-sm  text-gray-700">
                Booking ID: {bookingId}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${statusColors.bg} rounded-full`}></div>
              <span className={`text-sm font-medium ${statusColors.text}`}>
                {statusText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
