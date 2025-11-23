import { Vehicle } from "@/domain/entities/Vehicle";
import {
  IVehicleRepository,
  CreateVehicleInput,
  UpdateVehicleInput,
} from "@/domain/repositories/VehicleRepository";
import api from "@/lib/api";

class VehicleRepositoryAPI implements IVehicleRepository {
  /**
   * Lấy danh sách xe của người dùng
   */
  async getAll(): Promise<Vehicle[]> {
    const endpoint = "/me/vehicles";

    try {
      console.log("Fetching vehicles from URL:", endpoint);

      const response = await api.get(endpoint);

      console.log("Raw Vehicle API Response:", response.data);

      // Validate response structure
      if (!response.data) {
        throw new Error("Invalid API response: no data");
      }

      // API trả về array trực tiếp hoặc object với data array
      let vehiclesData: any[];

      if (Array.isArray(response.data)) {
        vehiclesData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        vehiclesData = response.data.data;
      } else {
        throw new Error("Invalid API response: expected array of vehicles");
      }

      // Map each vehicle to FE format
      const vehicles: Vehicle[] = vehiclesData.map((v) => this.mapVehicleResponse(v));

      console.log("Vehicles count:", vehicles.length);
      return vehicles;
    } catch (error) {
      const axiosError = error as {
        response?: { status: number; statusText: string; data: unknown };
        request?: unknown;
        message?: string;
      };

      if (axiosError.response) {
        console.error(
          `API error: ${axiosError.response.status}`,
          axiosError.response.data
        );
        throw new Error(
          `Failed to fetch vehicles: ${axiosError.response.status} ${axiosError.response.statusText}`
        );
      } else if (axiosError.request) {
        console.error(
          "Network error - no response received:",
          axiosError.request
        );
        throw new Error(
          "Failed to fetch vehicles: Network error. This might be a CORS issue."
        );
      } else {
        console.error("Error setting up request:", axiosError.message);
        throw new Error(
          `Failed to fetch vehicles: ${axiosError.message || "Unknown error"}`
        );
      }
    }
  }

  /**
   * Lấy thông tin xe theo ID
   */
  async getById(vehicleId: string): Promise<Vehicle | null> {
    const endpoint = `/vehicles/${vehicleId}`;

    try {
      console.log("Fetching vehicle from URL:", endpoint);

      const response = await api.get(endpoint);

      console.log("Raw Vehicle API Response:", response.data);

      if (!response.data) {
        return null;
      }

      // API có thể trả về object trực tiếp hoặc wrapper
      const vehicleData = response.data.data || response.data;

      // Map BE response to FE format
      return this.mapVehicleResponse(vehicleData);
    } catch (error) {
      const axiosError = error as {
        response?: { status: number; statusText: string; data: unknown };
        request?: unknown;
        message?: string;
      };

      if (axiosError.response?.status === 404) {
        return null;
      }

      if (axiosError.response) {
        console.error(
          `API error: ${axiosError.response.status}`,
          axiosError.response.data
        );
        throw new Error(
          `Failed to fetch vehicle: ${axiosError.response.status} ${axiosError.response.statusText}`
        );
      } else if (axiosError.request) {
        console.error(
          "Network error - no response received:",
          axiosError.request
        );
        throw new Error(
          "Failed to fetch vehicle: Network error. This might be a CORS issue."
        );
      } else {
        console.error("Error setting up request:", axiosError.message);
        throw new Error(
          `Failed to fetch vehicle: ${axiosError.message || "Unknown error"}`
        );
      }
    }
  }

  /**
   * Tạo xe mới
   */
  async create(data: CreateVehicleInput): Promise<Vehicle> {
    const endpoint = "/vehicles";

    try {
      console.log("Creating vehicle:", data);

      // Map FE format to BE format - match exactly with VehicleCreateDto
      // BE DTO structure:
      // - VehicleName: string (Required)
      // - Category: VehicleCategory enum (Required) - BE expects INT: 1=ElectricMotorbike, 2=SmallElectricCar, 3=ElectricSUV
      // - VIN: string? (Optional)
      // - LicensePlate: string? (Optional)
      // - ModelYear: string? (Optional, must be 4 digits if provided)
      // - Color: string? (Optional)
      // - BatteryType: string? (Optional in DTO, but required in service - BatteryModel name)
      
      // Convert category string to int enum value
      const categoryMap: Record<string, number> = {
        ElectricMotorbike: 1,
        SmallElectricCar: 2,
        ElectricSUV: 3,
      };
      
      const categoryValue = categoryMap[data.category];
      if (!categoryValue) {
        throw new Error(`Invalid category: ${data.category}. Must be one of: ElectricMotorbike, SmallElectricCar, ElectricSUV`);
      }
      
      const requestData: any = {
        VehicleName: data.vehicleName, // BE uses PascalCase
        Category: categoryValue, // Enum as INT: 1, 2, or 3
      };

      // Optional fields - match BE DTO property names (PascalCase)
      if (data.vin) requestData.VIN = data.vin;
      if (data.licensePlate) requestData.LicensePlate = data.licensePlate;
      if (data.modelYear) requestData.ModelYear = data.modelYear;
      if (data.color) requestData.Color = data.color;
      
      // BatteryType: Required in service (GetByModelAsync expects BatteryModel name)
      if (data.batteryType) {
        requestData.BatteryType = data.batteryType; // BatteryModel name (string)
      } else {
        throw new Error("BatteryType is required");
      }

      console.log("Request data to BE:", JSON.stringify(requestData, null, 2));

      const response = await api.post(endpoint, requestData);

      console.log("Vehicle created:", response.data);

      // Map BE response to FE format
      const vehicleData = response.data.data || response.data;
      return this.mapVehicleResponse(vehicleData);
    } catch (error) {
      const axiosError = error as {
        response?: { status: number; statusText: string; data: unknown };
        request?: unknown;
        message?: string;
      };

      if (axiosError.response) {
        // Log full error details
        const errorData = axiosError.response.data as any;
        
        // Extract error message from different possible formats
        let errorMessage = "";
        
        // Check for ModelState errors (ASP.NET Core validation)
        if (errorData?.errors && typeof errorData.errors === "object") {
          const modelStateErrors: string[] = [];
          for (const key in errorData.errors) {
            const fieldErrors = errorData.errors[key];
            if (Array.isArray(fieldErrors)) {
              modelStateErrors.push(`${key}: ${fieldErrors.join(", ")}`);
            } else {
              modelStateErrors.push(`${key}: ${fieldErrors}`);
            }
          }
          errorMessage = modelStateErrors.join("; ");
        } 
        // Check for simple message
        else if (errorData?.message) {
          errorMessage = errorData.message;
        }
        // Check for string error
        else if (typeof errorData === "string") {
          errorMessage = errorData;
        }
        // Fallback to stringify
        else {
          errorMessage = JSON.stringify(errorData);
        }
        
        console.error(
          `API error: ${axiosError.response.status}`,
          "Response data:",
          errorData
        );
        console.error("Parsed error message:", errorMessage);
        
        // Return more detailed error message
        throw new Error(
          errorMessage || `Failed to create vehicle: ${axiosError.response.statusText}`
        );
      } else if (axiosError.request) {
        console.error("Network error - no response received:", axiosError.request);
        throw new Error(
          "Failed to create vehicle: Network error. This might be a CORS issue."
        );
      } else {
        console.error("Error setting up request:", axiosError.message);
        throw new Error(
          `Failed to create vehicle: ${axiosError.message || "Unknown error"}`
        );
      }
    }
  }

  /**
   * Cập nhật thông tin xe
   */
  async update(vehicleId: string, data: UpdateVehicleInput): Promise<Vehicle> {
    const endpoint = `/vehicles/${vehicleId}`;

    try {
      console.log("Updating vehicle:", vehicleId, data);

      // Map FE format to BE format - match VehicleUpdateDto
      // BE DTO uses PascalCase property names
      const requestData: any = {};
      if (data.vehicleName !== undefined) requestData.VehicleName = data.vehicleName;
      if (data.vin !== undefined) requestData.VIN = data.vin;
      if (data.licensePlate !== undefined) requestData.LicensePlate = data.licensePlate;
      if (data.modelYear !== undefined) requestData.ModelYear = data.modelYear;
      if (data.color !== undefined) requestData.Color = data.color;
      // Only include batteryType if provided (BE expects BatteryModel name, not ID)
      if (data.batteryType !== undefined && data.batteryType) {
        requestData.BatteryType = data.batteryType;
      }
      // Status: BE expects string enum name (Active, Inactive, Maintenance, Banned)
      if (data.status !== undefined) requestData.Status = data.status;

      const response = await api.patch(endpoint, requestData);

      console.log("Vehicle updated:", response.data);

      // Map BE response to FE format
      const vehicleData = response.data.data || response.data;
      return this.mapVehicleResponse(vehicleData);
    } catch (error) {
      const axiosError = error as {
        response?: { status: number; statusText: string; data: unknown };
        request?: unknown;
        message?: string;
      };

      if (axiosError.response) {
        console.error(
          `API error: ${axiosError.response.status}`,
          axiosError.response.data
        );
        throw new Error(
          `Failed to update vehicle: ${axiosError.response.status} ${axiosError.response.statusText}`
        );
      } else if (axiosError.request) {
        console.error("Network error - no response received:", axiosError.request);
        throw new Error(
          "Failed to update vehicle: Network error. This might be a CORS issue."
        );
      } else {
        console.error("Error setting up request:", axiosError.message);
        throw new Error(
          `Failed to update vehicle: ${axiosError.message || "Unknown error"}`
        );
      }
    }
  }

  /**
   * Xóa xe (soft delete)
   */
  async delete(vehicleId: string): Promise<void> {
    const endpoint = `/vehicles/${vehicleId}`;

    try {
      console.log("Deleting vehicle:", vehicleId);

      await api.delete(endpoint);

      console.log("Vehicle deleted successfully");
    } catch (error) {
      const axiosError = error as {
        response?: { status: number; statusText: string; data: unknown };
        request?: unknown;
        message?: string;
      };

      if (axiosError.response) {
        console.error(
          `API error: ${axiosError.response.status}`,
          axiosError.response.data
        );
        throw new Error(
          `Failed to delete vehicle: ${axiosError.response.status} ${axiosError.response.statusText}`
        );
      } else if (axiosError.request) {
        console.error("Network error - no response received:", axiosError.request);
        throw new Error(
          "Failed to delete vehicle: Network error. This might be a CORS issue."
        );
      } else {
        console.error("Error setting up request:", axiosError.message);
        throw new Error(
          `Failed to delete vehicle: ${axiosError.message || "Unknown error"}`
        );
      }
    }
  }

  /**
   * Map BE response to FE Vehicle format
   */
  private mapVehicleResponse(data: any): Vehicle {
    return {
      vehicleID: data.vehicleID || data.VehicleID,
      vehicleName: data.vehicleName || data.VehicleName || "",
      category: data.category || data.Category || "",
      vin: data.vin || data.VIN || "",
      licensePlate: data.licensePlate || data.LicensePlate || "",
      modelYear: data.modelYear || data.ModelYear || "",
      color: data.color || data.Color || "",
      batteryTypeID: data.batteryTypeID || data.BatteryTypeID || "",
      batteryTypeModel: data.batteryType || data.BatteryType || null,
      batteryID: data.batteryID || data.BatteryID || null, // Map batteryID từ BE (null nếu chưa có pin)
      userID: data.userID || data.UserID || "",
      status: data.status || data.Status || "",
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : (data.IsAvailable !== undefined ? data.IsAvailable : true),
      createdAt: data.createdAt || data.CreatedAt || new Date().toISOString(),
      updatedAt: data.updatedAt || data.UpdatedAt || new Date().toISOString(),
    };
  }
}

export const vehicleRepositoryAPI = new VehicleRepositoryAPI();
