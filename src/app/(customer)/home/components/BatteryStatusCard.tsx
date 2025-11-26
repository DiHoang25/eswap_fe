"use client";
import React, { useEffect, useState, useMemo } from "react";
import BatteryCircle from "./BatteryCircle";
import { Vehicle } from "@/domain/entities/Vehicle";
import { BatteryRepository } from "@/infrastructure/repositories/Hoang/BatteryRepository";

interface BatteryStatusCardProps {
  selectedVehicle?: Vehicle | null;
  onFindStation?: () => void;
}

export default function BatteryStatusCard({
  selectedVehicle,
  onFindStation,
}: BatteryStatusCardProps) {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [remainingRange, setRemainingRange] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sử dụng useMemo để tránh tạo instance mới mỗi lần render
  const batteryRepo = useMemo(() => new BatteryRepository(), []);

  // Function để fetch battery info
  const fetchBatteryInfo = React.useCallback(async () => {
    if (!selectedVehicle) {
      setBatteryLevel(null);
      setRemainingRange(0);
      setError(null);
      setLoading(false);
      return;
    }

    // LUÔN gọi API để check xem xe có pin hay không
    // Vì Backend không trả về BatteryID trong VehicleResponseDto
    // Nên ta phải query từ bảng Batteries để biết chính xác
    setLoading(true);
    setError(null);
    try {
      const battery = await batteryRepo.getByVehicle(selectedVehicle.vehicleID);
      
      console.log('[BatteryStatusCard] Battery data:', {
        hasBattery: !!battery,
        batteryId: battery?.batteryId,
        currentPercentage: battery?.currentPercentage,
        vehicleId: selectedVehicle.vehicleID,
      });
      
      // Logic: Nếu có battery object → xe có pin (không phụ thuộc vào currentPercentage)
      // Chỉ hiển thị "Chưa có pin" khi battery === null (API trả về 404)
      if (battery) {
        // Xe có pin - hiển thị thông tin pin
        // Nếu currentPercentage = null/undefined → dùng 0% làm mặc định
        const percentage = battery.currentPercentage !== null && battery.currentPercentage !== undefined
          ? Number(battery.currentPercentage)
          : 0;
        
        setBatteryLevel(percentage);
        
        // Tính remaining range dựa trên phần trăm pin và loại xe
        // Giả sử: 100% = 200km cho xe máy, 300km cho ô tô nhỏ, 400km cho SUV
        const capacityMap: Record<string, number> = {
          "ElectricMotorbike": 200,
          "SmallElectricCar": 300,
          "ElectricSUV": 400,
        };
        const maxRange = capacityMap[selectedVehicle.category] || 200;
        const calculatedRange = Math.round((percentage / 100) * maxRange);
        setRemainingRange(calculatedRange);
      } else {
        // Xe chưa có pin (API trả về null - 404)
        setBatteryLevel(null);
        setRemainingRange(0);
      }
    } catch (err: any) {
      // Nếu API trả về 404/NotFound → xe chưa có pin (bình thường)
      // Nếu lỗi khác → hiển thị thông báo lỗi
      if (err?.response?.status === 404) {
        // Xe chưa có pin - đây là trạng thái bình thường
        setBatteryLevel(null);
        setRemainingRange(0);
        setError(null);
      } else {
        console.error("Failed to fetch battery info:", err);
        setError("Unable to load battery information");
        setBatteryLevel(null);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedVehicle, batteryRepo]);

  // Fetch battery info khi vehicle thay đổi
  useEffect(() => {
    fetchBatteryInfo();
  }, [fetchBatteryInfo]);

  // Auto-refresh mỗi 10 giây để cập nhật battery status sau khi swap
  // Tăng thời gian để tránh spam API và giảm 404 errors
  useEffect(() => {
    if (!selectedVehicle) return;

    const interval = setInterval(() => {
      // Chỉ refresh nếu không đang loading để tránh race condition
      if (!loading) {
        console.log('[BatteryStatusCard] Auto-refreshing battery status...');
        fetchBatteryInfo();
      }
    }, 10000); // Refresh mỗi 10 giây (tăng từ 5 giây)

    return () => clearInterval(interval);
  }, [selectedVehicle, fetchBatteryInfo, loading]);

  // Refresh khi page visibility change (user quay lại tab)
  useEffect(() => {
    if (!selectedVehicle) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[BatteryStatusCard] Page visible, refreshing battery status...');
        fetchBatteryInfo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedVehicle, fetchBatteryInfo]);

  // Listen to swap completion events
  useEffect(() => {
    if (!selectedVehicle) return;

    const handleSwapCompleted = () => {
      console.log('[BatteryStatusCard] Swap completed event detected, refreshing battery status...');
      // Delay và retry để đảm bảo backend đã cập nhật xong
      // Backend có thể cần thời gian để commit transaction
      setTimeout(() => {
        fetchBatteryInfo();
      }, 2000); // Tăng delay từ 1s lên 2s
      
      // Retry sau 5 giây nữa nếu vẫn chưa có battery
      setTimeout(() => {
        if (batteryLevel === null) {
          console.log('[BatteryStatusCard] Retrying battery fetch after swap completion...');
          fetchBatteryInfo();
        }
      }, 5000);
    };

    // Listen to custom events from employee check-in
    window.addEventListener('bookings-refresh', handleSwapCompleted);
    window.addEventListener('swap-completed', handleSwapCompleted);

    return () => {
      window.removeEventListener('bookings-refresh', handleSwapCompleted);
      window.removeEventListener('swap-completed', handleSwapCompleted);
    };
  }, [selectedVehicle, fetchBatteryInfo, batteryLevel]);

  // Không có xe được chọn
  if (!selectedVehicle) {
    return (
      <div className="flex justify-center items-center overflow-visible">
        <div className="text-center p-5">
          <p className="text-gray-600 text-sm">No vehicle selected</p>
        </div>
      </div>
    );
  }

  // Đang tải - hiển thị trước các điều kiện khác
  if (loading) {
    return (
      <div className="flex justify-center items-center overflow-visible">
        <div className="text-center p-5">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading battery information...</p>
        </div>
      </div>
    );
  }

  // Lỗi
  if (error) {
    return (
      <div className="flex justify-center items-center overflow-visible">
        <div className="text-center p-5">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Xe chưa có pin (sau khi gọi API, batteryLevel = null và không có lỗi)
  if (batteryLevel === null) {
    return (
      <div className="flex justify-center items-center overflow-visible">
        <div className="flex flex-col justify-center pr-6 p-5 gap-3 text-right">
          <div className="flex flex-col items-end justify-center -mb-2">
            <div className="text-xs text-gray-500">Battery Status</div>
            <div className="text-2xl font-bold text-gray-900">
              No Battery
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-100">
            <div className="flex-1">
              <div className="text-sm font-bold text-blue-700 uppercase">
                Book Battery Swap
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Your vehicle has no battery. Book your first battery swap.
              </div>
            </div>
            <button
              onClick={onFindStation}
              className="px-4 py-2 bg-white border border-blue-700 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              Book Now
            </button>
          </div>
        </div>
        <div className="flex items-center scale-130">
          <BatteryCircle percentage={0} />
        </div>
      </div>
    );
  }

  // Có pin - hiển thị bình thường
  const currentBatteryLevel = batteryLevel ?? 0;
  const showAlert = currentBatteryLevel <= 40;

  return (
    <div className="flex justify-center items-center overflow-visible">
      {/* Left Section - Range and Alert */}
      <div className="flex flex-col justify-center pr-6 p-5 gap-3 text-right">
        {/* Remaining Range */}
        <div className="flex flex-col items-end justify-center -mb-2">
          <div className="text-xs text-gray-500">Remaining Range</div>
          <div className="text-2xl font-bold text-gray-900">
            {remainingRange}
            <span className="text-lg text-gray-500"> km</span>
          </div>
        </div>

        {/* Alert Section - only show if battery <= 40% */}
        {showAlert && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-100">
            <div className="flex-1">
              <div className="text-sm font-bold text-amber-700 uppercase">
                LOW BATTERY
              </div>
            </div>
            <button
              onClick={onFindStation}
              className="px-4 py-2 bg-white border border-yellow-700 text-yellow-600 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors"
            >
              Find Station
            </button>
          </div>
        )}
      </div>

      {/* Right Section - Battery Circle */}
      <div className="flex items-center scale-130">
        <BatteryCircle percentage={currentBatteryLevel} />
      </div>
    </div>
  );
}
