# Logic Hiển Thị Pin Xe - Backend & Frontend

## 📋 Tổng Quan

Khi người dùng xem trang home, Frontend cần hiển thị thông tin pin của xe đang được chọn. Logic này phụ thuộc vào cách Backend quản lý `Vehicle.BatteryID` và `Battery.VehicleID`.

## 🔍 Logic Backend

### 1. Khi Tạo Xe Mới (`VehicleService.CreateAsync`)

```csharp
var vehicle = new Vehicle
{
    VehicleID = Guid.NewGuid().ToString(),
    BatteryID = null,  // ← Xe mới chưa có pin
    Status = VehicleStatus.Active,
    IsAvailable = true,
    // ... other fields
};
```

**Kết quả:**
- `Vehicle.BatteryID = null` (xe chưa có pin)
- Xe có thể đặt lịch đổi pin ngay

### 2. Khi Swap Hoàn Thành (`SwapTransactionRepository.UpdateStatusAsync`)

```csharp
// Line 134, 206
vehicle.BatteryID = swapTransaction.NewBatteryID;

// Line 131, 203
batteryNew.VehicleID = booking.VehicleID;
batteryNew.CurrentLocation = "in_vehicle";
```

**Kết quả:**
- `Vehicle.BatteryID = NewBatteryID` (xe đã có pin)
- `Battery.VehicleID = vehicleId` (pin được gắn vào xe)

### 3. API GetBatteryByVehicle (`BatteryController.GetBatteries`)

```csharp
if (vehicleId != null)
{
    var batteryByVehicle = await _batteryService.GetBatteryByVehicleAsync(vehicleId);
    if (batteryByVehicle == null)
    {
        return NotFound(new { message = "Battery not found for the specified vehicle." });
    }
    return Ok(batteryByVehicle);
}
```

**Logic:**
- Query từ bảng `Batteries` WHERE `VehicleID = vehicleId`
- Nếu tìm thấy → return `BatteryResponse` với `CurrentPercentage`
- Nếu không tìm thấy → return `404 NotFound`

### 4. VehicleResponseDto (Hiện Tại)

```csharp
public class VehicleResponseDto
{
    public string VehicleID { get; set; }
    // ... other fields ...
    // KHÔNG có BatteryID ← Vấn đề ở đây!
}
```

**Vấn đề:**
- Backend KHÔNG trả về `BatteryID` trong `VehicleResponseDto`
- Frontend không thể biết xe có pin hay không từ Vehicle response

## 🎯 Logic Frontend (Đã Cập Nhật)

### Cách Hoạt Động

1. **Luôn gọi API để check pin:**
   ```typescript
   // KHÔNG dựa vào selectedVehicle.batteryID (vì BE không trả về)
   // LUÔN gọi API GetBatteryByVehicleAsync
   const battery = await batteryRepo.getByVehicle(selectedVehicle.vehicleID);
   ```

2. **Xử lý response:**
   - **200 OK + có data:** Xe có pin → hiển thị `CurrentPercentage` và remaining range
   - **404 NotFound:** Xe chưa có pin → hiển thị "Chưa có pin" với nút "Đặt lịch"
   - **500/Network Error:** Lỗi thực sự → hiển thị thông báo lỗi

3. **Tính remaining range:**
   ```typescript
   const capacityMap = {
     "ElectricMotorbike": 200,  // 100% = 200km
     "SmallElectricCar": 300,   // 100% = 300km
     "ElectricSUV": 400,        // 100% = 400km
   };
   const maxRange = capacityMap[category] || 200;
   const remainingRange = (percentage / 100) * maxRange;
   ```

## 📊 Flow Diagram

```
User chọn xe
    ↓
Frontend: selectedVehicle (KHÔNG có batteryID vì BE không trả về)
    ↓
Frontend: Gọi API GET /api/batteries?vehicleId={vehicleId}
    ↓
    ├─→ 200 OK + BatteryResponse
    │       ↓
    │   Xe có pin
    │       ↓
    │   Hiển thị: CurrentPercentage, Remaining Range
    │
    └─→ 404 NotFound
            ↓
        Xe chưa có pin
            ↓
        Hiển thị: "Chưa có pin" + Nút "Đặt lịch"
```

## ✅ Giải Pháp Đã Áp Dụng

### 1. BatteryStatusCard Component

**Trước (SAI):**
```typescript
// Check batteryID từ Vehicle (nhưng BE không trả về)
if (!selectedVehicle.batteryID) {
  return "Chưa có pin"; // ← Luôn hiển thị này!
}
```

**Sau (ĐÚNG):**
```typescript
// Luôn gọi API để check
const battery = await batteryRepo.getByVehicle(vehicleId);

if (battery && battery.currentPercentage !== null) {
  // Xe có pin → hiển thị thông tin
} else {
  // Xe chưa có pin → hiển thị "Chưa có pin"
}
```

### 2. BatteryRepository.getByVehicle

**Trước:**
```typescript
catch (error) {
  return null; // ← Che giấu tất cả lỗi
}
```

**Sau:**
```typescript
catch (error) {
  if (error?.response?.status === 404) {
    return null; // 404 = Xe chưa có pin (bình thường)
  }
  throw error; // Lỗi khác → throw để xử lý
}
```

## 🔄 Các Trường Hợp

### Trường Hợp 1: Xe Mới Tạo (Chưa Swap)

- **Backend:** `Vehicle.BatteryID = null`
- **API Response:** `404 NotFound`
- **Frontend:** Hiển thị "Chưa có pin" + Nút "Đặt lịch"

### Trường Hợp 2: Xe Đã Swap (Có Pin)

- **Backend:** `Vehicle.BatteryID = "battery-guid"`, `Battery.VehicleID = vehicleId`
- **API Response:** `200 OK` + `BatteryResponse` với `CurrentPercentage = 85`
- **Frontend:** Hiển thị "85%" + "170 km" (nếu là xe máy)

### Trường Hợp 3: Lỗi Network/Server

- **API Response:** `500 Internal Server Error` hoặc network error
- **Frontend:** Hiển thị "Không thể tải thông tin pin"

## 💡 Lưu Ý Quan Trọng

1. **KHÔNG dựa vào `Vehicle.batteryID`:**
   - Backend không trả về field này trong `VehicleResponseDto`
   - Phải query từ bảng `Batteries` để biết chính xác

2. **404 là trạng thái bình thường:**
   - Xe mới tạo chưa có pin → 404 là hợp lý
   - Không phải lỗi, chỉ là "chưa có dữ liệu"

3. **Cần cập nhật Backend (Tùy chọn):**
   - Thêm `BatteryID` vào `VehicleResponseDto` để Frontend có thể check nhanh
   - Nhưng vẫn nên gọi API để lấy `CurrentPercentage` mới nhất

## 📝 Tóm Tắt

**Vấn đề ban đầu:**
- Frontend check `selectedVehicle.batteryID` (luôn null vì BE không trả về)
- → Luôn hiển thị "Chưa có pin" ngay cả khi xe đã có pin

**Giải pháp:**
- Frontend LUÔN gọi API `GetBatteryByVehicleAsync` để check
- Phân biệt 404 (xe chưa có pin) vs lỗi thực sự
- Hiển thị đúng thông tin dựa trên API response

**Kết quả:**
- ✅ Xe mới → "Chưa có pin" + Nút "Đặt lịch"
- ✅ Xe có pin → Hiển thị phần trăm và remaining range
- ✅ Lỗi → Hiển thị thông báo lỗi


