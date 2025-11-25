// bookingService: DEPRECATED - Use BookingRepository instead
// This service uses old architecture - prefer using BookingRepository
// Keeping for backward compatibility with existing code (dashboardstaff)
import api from '@/lib/api';

const bookingService = {
  async getAllBookingOfStation(stationID?: string, fromDate?: Date) {
    try {
      // Use axios instance which calls backend directly (same as BookingRepository)
      // Backend endpoint: GET /api/stations/bookings?fromDate=YYYY-MM-DD
      // Backend automatically filters by staff's station
      // If fromDate is provided, only return bookings from that date onwards
      const params: any = {};
      
      // Set fromDate to today (00:00:00) if not provided
      const today = fromDate || new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day
      params.fromDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      console.log('[bookingService] getAllBookingOfStation with params:', {
        stationID,
        fromDate: params.fromDate,
      });
      
      const response = await api.get('/stations/bookings', { params });
      
      // API returns array directly, not wrapped in {data: [...]}
      const data = response.data;
      
      console.log('[bookingService] getAllBookingOfStation response:', {
        stationID,
        fromDate: params.fromDate,
        responseType: Array.isArray(data) ? 'array' : typeof data,
        count: Array.isArray(data) ? data.length : 0,
      });
      
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('[bookingService] Failed to fetch bookings:', error);
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to fetch bookings');
    }
  },

  // For verifying reservation: get bookings of a user (customer)
  async getAllBookingOfUser(query?: Record<string, string>) {
    try {
      const response = await api.get('/bookings/customer', { params: query });
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('[bookingService] Failed to fetch user bookings:', error);
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to fetch user bookings');
    }
  },

  async updateBookingStatus(bookingID: string, bookingStatus: string) {
    try {
      // API expects query parameter, not body
      const response = await api.patch(`/bookings/${bookingID}`, null, {
        params: { status: bookingStatus }
      });
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('[bookingService] Failed to update booking status:', error);
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to update booking status');
    }
  },
};

export default bookingService;

