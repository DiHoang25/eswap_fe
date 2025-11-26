# Bug Report: Battery Not Showing After Swap Completion

## Summary
Sau khi đổi pin xong (swap completed), trang home của customer vẫn hiển thị "Chưa có pin" thay vì hiển thị pin mới. API `/api/batteries?vehicleId={vehicleId}` trả về 404 (Not Found).

## Root Cause Analysis

### 1. Backend Query Không Filter `IsDeleted`

**File**: `Gr4_SWP_BE3/Eswap/Infrastructure/Repositories/BatteryRepository.cs`
**Method**: `GetBatteryByVehicleAsync` (line 400-417)

**Vấn đề**:
```csharp
public async Task<BatteryResponse> GetBatteryByVehicleAsync(string vehicleId)
{
    var battery = await _context.Batteries
        .Where(b => b.VehicleID == vehicleId)  // ❌ KHÔNG filter IsDeleted == false
        .Select(b => new BatteryResponse
        {
            // ...
        }).FirstOrDefaultAsync();
    return battery;
}
```

**So sánh với method khác** (line 231):
```csharp
var battery = await _context.Batteries.FirstOrDefaultAsync(
    b => b.BatteryID == batteryId && b.IsDeleted == false  // ✅ CÓ filter IsDeleted
);
```

**Giải pháp**: Thêm filter `IsDeleted == false` vào query:
```csharp
public async Task<BatteryResponse> GetBatteryByVehicleAsync(string vehicleId)
{
    var battery = await _context.Batteries
        .Where(b => b.VehicleID == vehicleId && b.IsDeleted == false)  // ✅ Thêm filter
        .Select(b => new BatteryResponse
        {
            // ...
        }).FirstOrDefaultAsync();
    return battery;
}
```

### 2. Backend Không Có Null Check Cho `batteryNew`

**File**: `Gr4_SWP_BE3/Eswap/Infrastructure/Repositories/SwapTransactionRepository.cs`
**Method**: `MarkStatusCompleted` (line 163-239)

**Vấn đề**:
```csharp
var batteryNew = await _context.Batteries
    .FirstOrDefaultAsync(b => b.BatteryID == swapTransaction.NewBatteryID);
// ❌ KHÔNG có null check
batteryNew.CurrentLocation = Domain.Enums.CurrentLocationStatus.in_vehicle.ToString();
batteryNew.BatteryStatus = null;
batteryNew.VehicleID = booking.VehicleID;  // ← NullReferenceException nếu batteryNew = null
```

**Giải pháp**: Thêm null check:
```csharp
var batteryNew = await _context.Batteries
    .FirstOrDefaultAsync(b => b.BatteryID == swapTransaction.NewBatteryID);
    
if (batteryNew == null)
{
    throw new KeyNotFoundException($"Battery ID '{swapTransaction.NewBatteryID}' not found.");
}

// Cập nhật battery
batteryNew.CurrentLocation = Domain.Enums.CurrentLocationStatus.in_vehicle.ToString();
// ...
```

### 3. Backend Có Thể Chưa Commit Transaction Kịp

**File**: `Gr4_SWP_BE3/Eswap/Infrastructure/Repositories/SwapTransactionRepository.cs`
**Method**: `MarkStatusCompleted` (line 232)

**Vấn đề**: 
- `SaveChangesAsync()` được gọi ở cuối method (line 232)
- Frontend có thể query quá sớm, trước khi transaction commit xong
- Có thể cần thêm delay hoặc retry logic

**Giải pháp**: Đảm bảo transaction được commit trước khi return:
```csharp
await _context.SaveChangesAsync();
// Có thể thêm logging để verify
Console.WriteLine($"[MarkStatusCompleted] Battery {batteryNew.BatteryID} assigned to Vehicle {booking.VehicleID}");
return true;
```

## Test Cases

### Test Case 1: Battery Query After Swap
1. Tạo swap transaction với `NewBatteryID = "BATTERY_123"`
2. Gọi `MarkStatusCompleted` để hoàn tất swap
3. Verify: `batteryNew.VehicleID == booking.VehicleID`
4. Gọi `GetBatteryByVehicleAsync(booking.VehicleID)`
5. **Expected**: Trả về battery với `BatteryID = "BATTERY_123"`
6. **Actual**: Trả về `null` (404)

### Test Case 2: Soft Deleted Battery
1. Tạo battery và gán vào vehicle
2. Soft delete battery (`IsDeleted = true`)
3. Gọi `GetBatteryByVehicleAsync(vehicleId)`
4. **Expected**: Trả về `null` (vì battery đã bị soft delete)
5. **Actual**: Có thể vẫn trả về battery (nếu không filter `IsDeleted`)

### Test Case 3: Null Battery Check
1. Tạo swap transaction với `NewBatteryID = "INVALID_ID"`
2. Gọi `MarkStatusCompleted`
3. **Expected**: Throw `KeyNotFoundException` với message rõ ràng
4. **Actual**: Throw `NullReferenceException` (khó debug)

## Recommended Fix Priority

1. **HIGH**: Thêm filter `IsDeleted == false` vào `GetBatteryByVehicleAsync`
2. **HIGH**: Thêm null check cho `batteryNew` trong `MarkStatusCompleted`
3. **MEDIUM**: Thêm logging để verify transaction commit
4. **LOW**: Thêm retry logic trong frontend (đã implement)

## Frontend Workaround

Frontend đã được cải thiện với:
- Auto-refresh mỗi 10 giây
- Retry logic sau khi swap completed (2s và 5s)
- Better error handling và logging

Tuy nhiên, vấn đề gốc vẫn cần được fix ở backend.

## Related Files

- `Gr4_SWP_BE3/Eswap/Infrastructure/Repositories/BatteryRepository.cs` (line 400-417)
- `Gr4_SWP_BE3/Eswap/Infrastructure/Repositories/SwapTransactionRepository.cs` (line 163-239)
- `Gr4_SWP_BE3/Eswap/API/Controller/SwapTransactionController.cs` (line 62-96)
- `src/app/(customer)/home/components/BatteryStatusCard.tsx` (frontend component)


