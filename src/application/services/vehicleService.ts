import { vehicleRepositoryAPI } from "@/infrastructure/repositories/VehicleRepositoryAPI.impl";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getAllVehiclesUseCase } from "../usecases/vehicle/GetAllVehicles.usecase";
import { getVehicleByIdUseCase } from "../usecases/vehicle/GetVehicleById.usecase";
import {
  CreateVehicleInput,
  UpdateVehicleInput,
} from "@/domain/repositories/VehicleRepository";

/**
 * Redux Thunk: Fetch tất cả xe
 */
export const fetchAllVehicles = createAsyncThunk(
  "vehicles/fetchAll",
  async () => {
    try {
      const response = await getAllVehiclesUseCase(vehicleRepositoryAPI);
      return response;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Redux Thunk: Fetch xe theo ID
 */
export const fetchVehicleById = createAsyncThunk(
  "vehicles/fetchById",
  async (vehicleId: string) => {
    try {
      const response = await getVehicleByIdUseCase(
        vehicleRepositoryAPI,
        vehicleId
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Redux Thunk: Tạo xe mới
 * Business logic được tích hợp trực tiếp vào đây
 */
export const createVehicle = createAsyncThunk(
  "vehicles/create",
  async (data: CreateVehicleInput) => {
    try {
      // Validate required fields
      if (!data.vehicleName || !data.category) {
        throw new Error("Vehicle name and category are required");
      }

      // Business logic validation có thể thêm ở đây:
      // - Kiểm tra format license plate
      // - Kiểm tra VIN format
      // - Kiểm tra model year range
      // - etc.

      const vehicle = await vehicleRepositoryAPI.create(data);
      return vehicle;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Redux Thunk: Cập nhật xe
 * Business logic được tích hợp trực tiếp vào đây
 */
export const updateVehicle = createAsyncThunk(
  "vehicles/update",
  async ({ vehicleId, data }: { vehicleId: string; data: UpdateVehicleInput }) => {
    try {
      // Validate vehicle ID
      if (!vehicleId) {
        throw new Error("Vehicle ID is required");
      }

      // Business logic validation có thể thêm ở đây:
      // - Kiểm tra xe có tồn tại không
      // - Kiểm tra quyền truy cập
      // - Validate format các trường
      // - etc.

      const vehicle = await vehicleRepositoryAPI.update(vehicleId, data);
      return vehicle;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Redux Thunk: Xóa xe
 * Business logic được tích hợp trực tiếp vào đây
 */
export const deleteVehicle = createAsyncThunk(
  "vehicles/delete",
  async (vehicleId: string) => {
    try {
      // Validate vehicle ID
      if (!vehicleId) {
        throw new Error("Vehicle ID is required");
      }

      // Business logic validation có thể thêm ở đây:
      // - Kiểm tra xe có tồn tại không
      // - Kiểm tra quyền truy cập
      // - Kiểm tra xe có đang trong booking không
      // - etc.

      await vehicleRepositoryAPI.delete(vehicleId);
      return vehicleId;
    } catch (error) {
      throw error;
    }
  }
);
