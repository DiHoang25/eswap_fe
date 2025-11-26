/**
 * Vehicle Use Cases
 *
 * Use cases chứa business logic cho các operations liên quan đến xe
 * 
 * Note: Create, Update, Delete logic đã được gộp vào vehicleService.ts
 * để đơn giản hóa cấu trúc. Chỉ giữ lại các use cases phức tạp hơn.
 */

export { getAllVehiclesUseCase } from "./GetAllVehicles.usecase";
export { getVehicleByIdUseCase } from "./GetVehicleById.usecase";
export {
  selectVehicleUseCase,
  getLastSelectedVehicleIdUseCase,
} from "./SelectVehicle.usecase";
