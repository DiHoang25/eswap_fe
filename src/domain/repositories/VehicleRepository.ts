import { Vehicle } from "../entities/Vehicle";

export interface CreateVehicleInput {
  vehicleName: string;
  category: string; // "ElectricMotorbike" | "SmallElectricCar" | "ElectricSUV"
  vin?: string;
  licensePlate?: string;
  modelYear?: string;
  color?: string;
  batteryType?: string; // BatteryTypeID or BatteryModel
}

export interface UpdateVehicleInput {
  vehicleName?: string;
  vin?: string;
  licensePlate?: string;
  modelYear?: string;
  color?: string;
  batteryType?: string; // BatteryTypeID or BatteryModel
  status?: string;
}

export interface IVehicleRepository {
  /**
   * Lấy danh sách xe của người dùng
   */
  getAll(): Promise<Vehicle[]>;

  /**
   * Lấy thông tin xe theo ID
   */
  getById(vehicleId: string): Promise<Vehicle | null>;

  /**
   * Tạo xe mới
   */
  create(data: CreateVehicleInput): Promise<Vehicle>;

  /**
   * Cập nhật thông tin xe
   */
  update(vehicleId: string, data: UpdateVehicleInput): Promise<Vehicle>;

  /**
   * Xóa xe (soft delete)
   */
  delete(vehicleId: string): Promise<void>;
}
