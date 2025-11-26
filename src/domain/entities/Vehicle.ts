export interface Vehicle {
  vehicleID: string;
  vehicleName: string;
  category: string;
  vin: string;
  licensePlate: string;
  modelYear: string;
  color: string;
  batteryTypeID: string;
  batteryTypeModel: string | null;
  batteryID?: string | null; // ID của pin hiện tại đang gắn trên xe (null nếu chưa có pin)
  userID: string;
  status: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleListResponse {
  success: boolean;
  message: string;
  data: Vehicle[];
}
