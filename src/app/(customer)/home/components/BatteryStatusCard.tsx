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

  useEffect(() => {
    const fetchBatteryInfo = async () => {
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
        console.log('[BatteryStatusCard] Fetching battery for vehicle:', selectedVehicle.vehicleID);
        const battery = await batteryRepo.getByVehicle(selectedVehicle.vehicleID);
        console.log('[BatteryStatusCard] Battery response:', battery);
        
        if (battery && battery.currentPercentage !== null && battery.currentPercentage !== undefined) {
          // Xe có pin - hiển thị thông tin pin
          const percentage = Number(battery.currentPercentage);
          console.log('[BatteryStatusCard] Battery percentage:', percentage);
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
          console.log('[BatteryStatusCard] Calculated range:', calculatedRange, 'km for category:', selectedVehicle.category);
          setRemainingRange(calculatedRange);
        } else {
          // Xe chưa có pin (API trả về null hoặc không có currentPercentage)
          console.log('[BatteryStatusCard] No battery found or no currentPercentage');
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
          setError("Không thể tải thông tin pin");
          setBatteryLevel(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBatteryInfo();
  }, [selectedVehicle?.vehicleID, batteryRepo]);

  // Không có xe được chọn
  if (!selectedVehicle) {
    return (
      <div className="flex justify-center items-center overflow-visible">
        <div className="text-center p-5">
          <p className="text-gray-600 text-sm">Chưa chọn xe</p>
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
          <p className="text-gray-600 text-sm">Đang tải thông tin pin...</p>
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
            <div className="text-xs text-gray-500">Trạng thái pin</div>
            <div className="text-2xl font-bold text-gray-900">
              Chưa có pin
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-100">
            <div className="flex-1">
              <div className="text-sm font-bold text-blue-700 uppercase">
                Cần đặt lịch đổi pin
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Xe của bạn chưa có pin. Hãy đặt lịch đổi pin đầu tiên.
              </div>
            </div>
            <button
              onClick={onFindStation}
              className="px-4 py-2 bg-white border border-blue-700 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              Đặt lịch
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
