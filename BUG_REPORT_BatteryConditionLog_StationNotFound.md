# Bug Report: Battery Condition Log - Station Not Found Error

## 📋 Tóm tắt
Khi tạo Battery Condition Log, backend trả về lỗi **500 Internal Server Error** với message "Station not found" mặc dù user đã đăng nhập với token có `StationID` claim hợp lệ.

## 🔍 Mô tả chi tiết

### Endpoint bị ảnh hưởng
- **Method**: `POST`
- **URL**: `/api/battery-condition-logs`
- **Authorization**: `Admin,Staff` roles required

### Lỗi xảy ra
```
Status: 500 Internal Server Error
Message: "Station not found"
Exception: System.Exception: Station not found
   at Eswap.Infrastructure.Repositories.BatteryConditionRepository.CreateBatteryConditionLogAsync
```

## 🐛 Nguyên nhân

### 1. Controller Logic (✅ Đúng)
**File**: `Gr4_SWP_BE3/Eswap/API/Controller/BatteryConditionController.cs`

```csharp
[HttpPost()]
[Authorize(Roles = "Admin,Staff")]
public async Task<IActionResult> CreateBatteryConditionLog([FromBody] CreateBatteryConditionLogDTOs logDto)
{
    string userID = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    string sta = User.FindFirst("StationID")?.Value;  // ✅ Lấy StationID từ token
    var createdLog = await _batteryConditionService.CreateBatteryConditionLogAsync(logDto, userID, sta);
    return Ok(createdLog);
}
```

**Controller đúng**: Lấy `StationID` từ token claim và truyền vào service.

### 2. Repository Logic (❌ SAI)
**File**: `Gr4_SWP_BE3/Eswap/Infrastructure/Repositories/BatteryConditionRepository.cs`

```csharp
public async Task<BatteryConditionLogDTOs> CreateBatteryConditionLogAsync(
    CreateBatteryConditionLogDTOs logDto, 
    string userID, 
    string stationID)  // ⚠️ Nhận stationID nhưng KHÔNG SỬ DỤNG
{
    var battery = await _context.Batteries.FindAsync(logDto.BatteryID);
    if (battery == null)
    {
        throw new Exception("Battery not found");
    }
    
    // ❌ BUG: Không dùng stationID parameter, mà dùng battery.LastStationID
    var station = await _context.Stations.FindAsync(battery.LastStationID);
    if (station == null)
    {
        throw new Exception("Station not found");  // ← Lỗi ở đây
    }
    // ...
}
```

**Vấn đề**:
- Repository nhận `stationID` từ token nhưng **KHÔNG SỬ DỤNG**
- Repository chỉ tìm station từ `battery.LastStationID`
- Nếu `battery.LastStationID` là `null` hoặc không tồn tại trong database → throw "Station not found"

## 📊 Luồng xử lý hiện tại (SAI)

```
1. User gửi request với token có StationID claim
   ↓
2. Controller lấy StationID từ token: "05a9efca-9d5c-42a6-a72e-7da04bbc4b99"
   ↓
3. Controller truyền StationID vào service/repository
   ↓
4. Repository NHẬN StationID nhưng BỎ QUA
   ↓
5. Repository chỉ dùng battery.LastStationID để tìm station
   ↓
6. Nếu battery.LastStationID = null hoặc không tồn tại → ❌ ERROR
```

## ✅ Giải pháp đề xuất

### Option 1: Ưu tiên StationID từ token (KHUYẾN NGHỊ)

Sửa `BatteryConditionRepository.cs` line 49:

```csharp
public async Task<BatteryConditionLogDTOs> CreateBatteryConditionLogAsync(
    CreateBatteryConditionLogDTOs logDto, 
    string userID, 
    string stationID)
{
    var battery = await _context.Batteries.FindAsync(logDto.BatteryID);
    if (battery == null)
    {
        throw new Exception("Battery not found");
    }
    
    // ✅ FIX: Ưu tiên dùng stationID từ token (user đang ở station đó)
    Station station = null;
    
    // 1. Thử dùng stationID từ token trước
    if (!string.IsNullOrEmpty(stationID))
    {
        station = await _context.Stations.FindAsync(stationID);
    }
    
    // 2. Fallback về battery.LastStationID nếu stationID từ token không có
    if (station == null && !string.IsNullOrEmpty(battery.LastStationID))
    {
        station = await _context.Stations.FindAsync(battery.LastStationID);
    }
    
    // 3. Validate station tồn tại
    if (station == null)
    {
        throw new Exception(
            $"Station not found. " +
            $"Token StationID: {stationID ?? "null"}, " +
            $"Battery LastStationID: {battery.LastStationID ?? "null"}"
        );
    }
    
    var user = await _context.Users.FindAsync(userID);
    if (user == null)
    {
        throw new Exception("User not found");
    }

    var log = new BatteryConditionLog
    {
        LogID = Guid.NewGuid().ToString(),
        User = user,
        BatteryID = logDto.BatteryID,
        Station = station,  // ✅ Dùng station đã tìm được
        Condition = logDto.Condition,
        Description = logDto.Description,
        ReportDate = DateOnly.FromDateTime(DateTime.Now),
    };
    
    battery.BatteryStatus = VehicleBatteryStatus.faulty.ToString();
    _context.Batteries.Update(battery);
    _context.BatteryConditionLogs.Add(log);
    await _context.SaveChangesAsync();
    
    return new BatteryConditionLogDTOs
    {
        LogID = log.LogID,
        UserName = user.Username,
        BatteryID = log.BatteryID,
        StationName = station.StationName,
        Condition = log.Condition,
        Description = log.Description,
        ReportDate = log.ReportDate
    };
}
```

### Option 2: Chỉ dùng StationID từ token

Nếu logic nghiệp vụ yêu cầu log phải được tạo tại station mà user đang làm việc:

```csharp
// Validate stationID từ token là bắt buộc
if (string.IsNullOrEmpty(stationID))
{
    throw new Exception("StationID is required in token. User must be assigned to a station.");
}

var station = await _context.Stations.FindAsync(stationID);
if (station == null)
{
    throw new Exception($"Station with ID '{stationID}' not found in database.");
}
```

### Option 3: Cải thiện error handling trong Controller

Thêm try-catch trong Controller để trả về error message rõ ràng hơn:

```csharp
[HttpPost()]
[Authorize(Roles = "Admin,Staff")]
public async Task<IActionResult> CreateBatteryConditionLog([FromBody] CreateBatteryConditionLogDTOs logDto)
{
    try
    {
        string userID = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        string sta = User.FindFirst("StationID")?.Value;
        
        // Validate required claims
        if (string.IsNullOrEmpty(userID))
        {
            return BadRequest(new { message = "User ID not found in token." });
        }
        
        if (string.IsNullOrEmpty(sta))
        {
            return BadRequest(new { message = "Station ID not found in token. User must be assigned to a station." });
        }
        
        var createdLog = await _batteryConditionService.CreateBatteryConditionLogAsync(logDto, userID, sta);
        return Ok(createdLog);
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { 
            message = ex.Message,
            details = ex.InnerException?.Message 
        });
    }
}
```

## 🔄 Luồng xử lý sau khi sửa (ĐÚNG)

```
1. User gửi request với token có StationID claim
   ↓
2. Controller lấy StationID từ token: "05a9efca-9d5c-42a6-a72e-7da04bbc4b99"
   ↓
3. Controller truyền StationID vào service/repository
   ↓
4. Repository ƯU TIÊN dùng StationID từ token để tìm station
   ↓
5. Nếu station từ token không tìm thấy → Fallback về battery.LastStationID
   ↓
6. Nếu cả hai đều không tìm thấy → Throw error với message rõ ràng
   ↓
7. ✅ Tạo log thành công
```

## 📝 Test Cases

### Test Case 1: StationID từ token hợp lệ
- **Input**: Token có `StationID = "05a9efca-9d5c-42a6-a72e-7da04bbc4b99"` (station tồn tại)
- **Expected**: ✅ Tạo log thành công, dùng station từ token

### Test Case 2: StationID từ token null, battery.LastStationID hợp lệ
- **Input**: Token không có `StationID`, `battery.LastStationID = "valid-station-id"`
- **Expected**: ✅ Tạo log thành công, dùng station từ `battery.LastStationID`

### Test Case 3: Cả hai đều null
- **Input**: Token không có `StationID`, `battery.LastStationID = null`
- **Expected**: ❌ Error với message rõ ràng

### Test Case 4: StationID từ token không tồn tại, battery.LastStationID hợp lệ
- **Input**: Token có `StationID = "invalid-id"`, `battery.LastStationID = "valid-station-id"`
- **Expected**: ✅ Fallback về `battery.LastStationID`, tạo log thành công

## 🎯 Ưu tiên sửa

**Khuyến nghị**: Sửa theo **Option 1** vì:
1. Linh hoạt: Hỗ trợ cả hai trường hợp (station từ token và từ battery)
2. An toàn: Fallback mechanism đảm bảo không mất dữ liệu
3. Logic hợp lý: Ưu tiên station mà user đang làm việc (từ token)

## 📌 Files cần sửa

1. **`Gr4_SWP_BE3/Eswap/Infrastructure/Repositories/BatteryConditionRepository.cs`**
   - Method: `CreateBatteryConditionLogAsync`
   - Line: ~49
   - Thay đổi: Sử dụng `stationID` parameter thay vì chỉ dùng `battery.LastStationID`

2. **`Gr4_SWP_BE3/Eswap/API/Controller/BatteryConditionController.cs`** (Optional)
   - Method: `CreateBatteryConditionLog`
   - Thêm try-catch và validation cho error handling tốt hơn

## 🔗 Liên quan

- Frontend component: `src/app/(employee)/check-in/OldBatteryConditionLog.tsx`
- Frontend repository: `src/infrastructure/repositories/Hoang/BatteryConditionRepository.ts`
- Backend service: `Gr4_SWP_BE3/Eswap/Application/Services/BatteryConditionService.cs`

## 📅 Ngày báo cáo
2025-11-25

## 👤 Người báo cáo
Frontend Development Team


