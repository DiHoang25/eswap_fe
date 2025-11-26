import { Vehicle } from "@/domain/entities/Vehicle";

/**
 * Use Case: Chọn xe hiện tại để hiển thị
 *
 * Business Logic:
 * - Validate xe được chọn
 * - Có thể lưu lựa chọn vào localStorage
 * - Log activity
 *
 * @param vehicle - Xe được chọn
 * @returns Promise<Vehicle> - Xe đã được chọn
 * @throws Error nếu vehicle không hợp lệ
 */
export function selectVehicleUseCase(
  vehicle: Vehicle | null
): Vehicle | null {
  // Validate input
  if (!vehicle) {
    // Clear selection from localStorage nếu cần
    if (typeof window !== "undefined") {
      localStorage.removeItem("selectedVehicleId");
      console.log('[SelectVehicle] Cleared vehicle selection');
    }
    return null;
  }

  // Validate vehicle object
  if (!vehicle.vehicleID) {
    console.error('[SelectVehicle] Invalid vehicle: missing vehicleID', vehicle);
    throw new Error("Invalid vehicle: missing vehicleID");
  }

  try {
    // Lưu selection vào localStorage để persist khi reload
    // Backend sẽ nhận vehicleID từ selectedVehicle trong Redux store
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedVehicleId", vehicle.vehicleID);
      console.log('[SelectVehicle] Saved vehicle selection:', vehicle.vehicleID, vehicle.vehicleName);
    }

    return vehicle;
  } catch (error) {
    console.error('[SelectVehicle] Error saving vehicle selection:', error);
    throw error;
  }
}

/**
 * Use Case: Lấy xe đã chọn trước đó từ localStorage
 *
 * @returns string | null - ID của xe đã chọn hoặc null
 */
export function getLastSelectedVehicleIdUseCase(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("selectedVehicleId");
  }
  return null;
}
