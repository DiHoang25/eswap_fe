# Yêu Cầu Backend - Vehicle Battery Information

## Tổng Quan
Frontend cần thông tin về pin hiện tại của xe (`BatteryID`) để hiển thị phần trăm pin và trạng thái pin trên trang home. Hiện tại, khi tạo xe mới, `BatteryID = null` (xe chưa có pin), và pin sẽ được gắn vào xe sau khi swap lần đầu.

## Yêu Cầu Cập Nhật Backend

### 1. Thêm `BatteryID` vào VehicleResponseDto

**File:** `Gr4_SWP_BE3/Eswap/Application/DTOs/VehicleDTO.cs`

Cần thêm field `BatteryID` vào các DTO sau:

```csharp
public class VehicleResponseDto
{
    // ... existing fields ...
    public string? BatteryID { get; set; } // ID của pin hiện tại đang gắn trên xe (null nếu chưa có pin)
    // ... existing fields ...
}

public class VehicleResponseMeDto
{
    // ... existing fields ...
    public string? BatteryID { get; set; } // ID của pin hiện tại đang gắn trên xe (null nếu chưa có pin)
    // ... existing fields ...
}
```

### 2. Cập Nhật VehicleService để Map BatteryID

**File:** `Gr4_SWP_BE3/Eswap/Application/Services/VehicleService.cs`

Cần thêm `BatteryID = v.BatteryID` vào các method sau:

#### GetAllAsync (line ~25-41)
```csharp
return vehicles.Select(v => new VehicleDTO.VehicleResponseDto
{
    // ... existing fields ...
    BatteryID = v.BatteryID,
    // ... existing fields ...
}).ToList();
```

#### GetByIdAsync (line ~50-66)
```csharp
return new VehicleDTO.VehicleResponseDto
{
    // ... existing fields ...
    BatteryID = v.BatteryID,
    // ... existing fields ...
};
```

#### CreateAsync (line ~102-117)
```csharp
return new VehicleDTO.VehicleResponseDto
{
    // ... existing fields ...
    BatteryID = vehicle.BatteryID, // Sẽ là null vì xe mới tạo chưa có pin
    // ... existing fields ...
};
```

### 3. Cập Nhật VehicleRepository.GetVehicleResponseMeDtoByIdAsync

**File:** `Gr4_SWP_BE3/Eswap/Infrastructure/Repositories/VehicleRepository.cs`

Cần thêm `BatteryID` và `BatteryTypeID` vào response (line ~65-83):

```csharp
return new VehicleDTO.VehicleResponseMeDto
{
    // ... existing fields ...
    BatteryTypeID = vehicle.BatteryTypeID,
    BatteryID = vehicle.BatteryID,
    // ... existing fields ...
};
```

## Logic Hiện Tại (Đã Đúng)

✅ **Khi tạo xe mới:**
- `BatteryID = null` (xe chưa có pin)
- `Status = Active`, `IsAvailable = true`

✅ **Khi đặt lịch đổi pin:**
- Backend xử lý đúng: `OldBatteryID = vehicle.BatteryID != null ? vehicle.BatteryID : null`
- Nếu xe chưa có pin thì `OldBatteryID = null`

✅ **Khi swap hoàn thành:**
- `vehicle.BatteryID = swapTransaction.NewBatteryID` (pin được gắn vào xe)

## Frontend Đã Xử Lý

Frontend đã được cập nhật để:
1. ✅ Map `batteryID` từ BE response (nếu có)
2. ✅ Hiển thị "Chưa có pin" khi `batteryID = null`
3. ✅ Gọi API `GET /api/batteries?vehicleId={vehicleId}` để lấy thông tin pin
4. ✅ Hiển thị phần trăm pin và remaining range khi có pin

## API Endpoint Hiện Tại (Đã Có)

✅ `GET /api/batteries?vehicleId={vehicleId}` - Trả về thông tin pin của xe
- Trả về `BatteryResponse` với `CurrentPercentage` (phần trăm pin)
- Trả về `null` nếu xe chưa có pin

## Tóm Tắt

**Cần làm:**
1. Thêm `BatteryID` vào `VehicleResponseDto` và `VehicleResponseMeDto`
2. Map `BatteryID` từ `Vehicle` entity trong các service methods
3. Đảm bảo `BatteryID` được trả về trong tất cả các API response liên quan đến Vehicle

**Không cần thay đổi:**
- Logic tạo xe (giữ nguyên `BatteryID = null`)
- Logic swap transaction (đã đúng)
- API endpoint `/api/batteries?vehicleId={vehicleId}` (đã có sẵn)

## Lưu Ý

- `BatteryID` là nullable (`string?`) vì xe mới tạo chưa có pin
- Frontend đã xử lý trường hợp `BatteryID = null` để hiển thị thông báo phù hợp
- Sau khi swap lần đầu, `BatteryID` sẽ được cập nhật và Frontend sẽ tự động hiển thị thông tin pin



