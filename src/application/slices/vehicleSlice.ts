import { Vehicle } from "@/domain/entities/Vehicle";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  fetchAllVehicles,
  fetchVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../services/vehicleService";
import {
  selectVehicleUseCase,
  getLastSelectedVehicleIdUseCase,
} from "../usecases/vehicle/SelectVehicle.usecase";

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null; // timestamp of last successful fetch
}

const initialState: VehicleState = {
  vehicles: [],
  selectedVehicle: null,
  loading: false,
  error: null,
  lastFetched: null,
};

const vehicleSlice = createSlice({
  name: "vehicle",
  initialState,
  reducers: {
    // Action đồng bộ - sử dụng use case
    clearSelectedVehicle(state) {
      // Sử dụng use case để clear selection
      selectVehicleUseCase(null);
      state.selectedVehicle = null;
    },
    invalidateVehiclesCache(state) {
      state.lastFetched = null;
    },
    setSelectedVehicle(state, action: PayloadAction<Vehicle>) {
      // Sử dụng use case để lưu selection
      selectVehicleUseCase(action.payload);
      state.selectedVehicle = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Xử lý action bất đồng bộ ở đây
    builder
      // fetchAllVehicles
      .addCase(fetchAllVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = action.payload;
        state.lastFetched = Date.now();

        // Tự động chọn xe đầu tiên nếu chưa có xe được chọn
        if (action.payload.length > 0 && !state.selectedVehicle) {
          // Kiểm tra xem có xe nào đã được chọn trước đó không (từ localStorage)
          const lastSelectedId = getLastSelectedVehicleIdUseCase();
          const previouslySelected = lastSelectedId
            ? action.payload.find((v) => v.vehicleID === lastSelectedId)
            : null;

          // Ưu tiên xe đã chọn trước đó, không thì chọn xe đầu tiên
          const vehicleToSelect = previouslySelected || action.payload[0];
          selectVehicleUseCase(vehicleToSelect);
          state.selectedVehicle = vehicleToSelect;
        }
      })
      .addCase(fetchAllVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch vehicles";
      })
      // fetchVehicleById
      .addCase(fetchVehicleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicleById.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.selectedVehicle = action.payload;
        }
      })
      .addCase(fetchVehicleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch vehicle";
      })
      // createVehicle
      .addCase(createVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles.push(action.payload);
        state.lastFetched = Date.now();
        // Tự động chọn xe vừa tạo nếu chưa có xe nào được chọn
        if (!state.selectedVehicle) {
          selectVehicleUseCase(action.payload);
          state.selectedVehicle = action.payload;
        }
      })
      .addCase(createVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create vehicle";
      })
      // updateVehicle
      .addCase(updateVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.vehicles.findIndex(
          (v) => v.vehicleID === action.payload.vehicleID
        );
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
        // Cập nhật selected vehicle nếu đang được chọn
        if (
          state.selectedVehicle &&
          state.selectedVehicle.vehicleID === action.payload.vehicleID
        ) {
          selectVehicleUseCase(action.payload);
          state.selectedVehicle = action.payload;
        }
        state.lastFetched = Date.now();
      })
      .addCase(updateVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update vehicle";
      })
      // deleteVehicle
      .addCase(deleteVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = state.vehicles.filter(
          (v) => v.vehicleID !== action.payload
        );
        // Clear selected vehicle nếu đang chọn xe bị xóa
        if (
          state.selectedVehicle &&
          state.selectedVehicle.vehicleID === action.payload
        ) {
          selectVehicleUseCase(null);
          state.selectedVehicle = null;
          // Chọn xe đầu tiên nếu còn xe
          if (state.vehicles.length > 0) {
            selectVehicleUseCase(state.vehicles[0]);
            state.selectedVehicle = state.vehicles[0];
          }
        }
        state.lastFetched = Date.now();
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete vehicle";
      });
  },
});

export const {
  clearSelectedVehicle,
  invalidateVehiclesCache,
  setSelectedVehicle,
} = vehicleSlice.actions;
export default vehicleSlice.reducer;
