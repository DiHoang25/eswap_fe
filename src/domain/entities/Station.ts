export interface Station {
  stationID: string;
  stationName: string;
  stationLocation: string;
  slotNumber: number; //tổng số slot trong trạm
  stationCapacity: number; // tổng số pin trong trạm
  batteryOutSlots: number; //số pin có trong trạm nhưng chưa vào slot
  batteryInSlots: number; //số pin có trong slot
  AvailableSlots?: number; //số pin sẵn sàng cho customer (from backend)
  latitude: number;
  longitude: number;
}
