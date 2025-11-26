"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/application/hooks/useRedux";
import { setMapView } from "@/application/slices/mapSlice";
import { searchStationsByLocationUseCase } from "@/application/usecases/station/SearchStationsByLocation.usecase";
import { getAllStationsUseCase } from "@/application/usecases/station/GetAllStations.usecase";
import { stationRepositoryAPI } from "@/infrastructure/repositories/StationRepositoryAPI.impl";
import { SearchStationResponse } from "@/domain/repositories/StationRepository";
import { Station } from "@/domain/entities/Station";
import { getBatteryTypeFromId } from "@/domain/entities/Battery";

type BatteryType = "Small" | "Medium" | "Large";

// Helper function to get battery type from vehicle
const getVehicleBatteryType = (vehicle: any): BatteryType | null => {
  if (!vehicle) return null;

  // Method 1: Try to get from batteryTypeID using prefix (LAR, MED, SMA)
  if (vehicle.batteryTypeID) {
    const typeFromId = getBatteryTypeFromId(vehicle.batteryTypeID);
    if (typeFromId !== "Unknown") {
      return typeFromId as BatteryType;
    }
  }

  // Method 2: Try to get from batteryTypeModel directly
  if (vehicle.batteryTypeModel) {
    const model = vehicle.batteryTypeModel.toLowerCase();
    if (model.includes("small") || model.includes("sma")) return "Small";
    if (model.includes("medium") || model.includes("med")) return "Medium";
    if (model.includes("large") || model.includes("lar")) return "Large";
  }

  // Method 3: Try category field (some vehicles might have category with battery info)
  if (vehicle.category) {
    const cat = vehicle.category.toLowerCase();
    if (cat.includes("small")) return "Small";
    if (cat.includes("medium")) return "Medium";
    if (cat.includes("large")) return "Large";
    // Map category to battery type
    if (cat.includes("motorcycle") || cat.includes("scooter")) return "Small";
    if (cat.includes("sedan") || cat.includes("hatchback")) return "Medium";
    if (cat.includes("suv") || cat.includes("truck")) return "Large";
  }

  return null;
};

export default function MapSideBar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { userLocation } = useAppSelector((state) => state.map);
  const { selectedVehicle } = useAppSelector((state) => state.vehicle);
  const [stations, setStations] = useState<SearchStationResponse[]>([]);
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get battery type from selected vehicle
  const vehicleBatteryType = getVehicleBatteryType(selectedVehicle);
  
  // Debug log
  useEffect(() => {
    if (selectedVehicle) {
      console.log("[MapSideBar] Selected vehicle:", {
        vehicleID: selectedVehicle.vehicleID,
        vehicleName: selectedVehicle.vehicleName,
        batteryTypeID: selectedVehicle.batteryTypeID,
        batteryTypeModel: selectedVehicle.batteryTypeModel,
        category: selectedVehicle.category,
        resolvedBatteryType: vehicleBatteryType,
      });
    }
  }, [selectedVehicle, vehicleBatteryType]);

  // Fetch all stations to get coordinates
  useEffect(() => {
    const fetchAllStations = async () => {
      try {
        const stationsData = await getAllStationsUseCase(stationRepositoryAPI);
        setAllStations(stationsData);
      } catch (error) {
        console.error("Error fetching all stations:", error);
      }
    };
    fetchAllStations();
  }, []);

  // Handle station click - move map to station location
  const handleStationClick = (station: SearchStationResponse) => {
    // Mark this station as selected
    setSelectedStation(station.stationName);

    // If station has coordinates, use them directly
    if (station.latitude && station.longitude) {
      dispatch(
        setMapView({
          center: [station.latitude, station.longitude],
          zoom: 17, // Zoom in closer when selecting a station
        })
      );
      return;
    }

    // Otherwise, find the station in allStations by name to get coordinates
    const fullStation = allStations.find(
      (s) => s.stationName === station.stationName
    );
    if (fullStation) {
      dispatch(
        setMapView({
          center: [fullStation.latitude, fullStation.longitude],
          zoom: 17,
        })
      );
    }
  };

  // Handle book button click
  const handleBookStation = (e: React.MouseEvent, stationName: string) => {
    e.stopPropagation(); // Prevent triggering handleStationClick

    // Find station ID from allStations
    const station = allStations.find((s) => s.stationName === stationName);
    if (station) {
      router.push(`/findstation/${station.stationID}`);
    }
  };

  useEffect(() => {
    const fetchNearbyStations = async () => {
      // Check if we have user location and vehicle battery type
      if (!userLocation) {
        setStations([]);
        return;
      }

      // Need a vehicle with valid battery type to search stations
      if (!vehicleBatteryType) {
        setStations([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const stationsData = await searchStationsByLocationUseCase(
          stationRepositoryAPI,
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            batteryType: vehicleBatteryType,
          }
        );

        // API already returns stations sorted by distance with distance and durationMinutes calculated
        setStations(stationsData);
      } catch (err) {
        console.error("Error fetching nearby stations:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Unable to load stations. Please try again.";
        setError(errorMessage);
        setStations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyStations();
  }, [userLocation, vehicleBatteryType]);

  // Show message if no user location
  if (!userLocation) {
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-center">
        <p className="text-gray-500 text-sm">
          Please enable location to find nearby stations
        </p>
      </div>
    );
  }

  // Show message if no vehicle selected or cannot determine battery type
  if (!selectedVehicle) {
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-center">
        <p className="text-gray-500 text-sm text-center">
          Please select a vehicle on Home page to find suitable stations
        </p>
      </div>
    );
  }

  if (!vehicleBatteryType) {
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-sm p-4 flex flex-col items-center justify-center">
        <p className="text-gray-500 text-sm text-center mb-2">
          Cannot determine battery type for: {selectedVehicle.vehicleName}
        </p>
        <p className="text-xs text-gray-400">
          BatteryTypeID: {selectedVehicle.batteryTypeID || "N/A"}<br/>
          BatteryTypeModel: {selectedVehicle.batteryTypeModel || "N/A"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Stations Near You
        </h2>
        {/* Vehicle and battery type info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Selected Vehicle</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedVehicle.vehicleName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Battery Type</p>
              <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                {vehicleBatteryType}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        ) : stations.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-500 text-sm">No nearby stations found</p>
          </div>
        ) : (
          <div className="p-2">
            {stations.map((station, index) => (
              <div
                key={`station-${index}`}
                onClick={() => handleStationClick(station)}
                className={`mb-2 p-4 bg-white border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                  selectedStation === station.stationName
                    ? "border-indigo-700 shadow-md ring-2 ring-gray-200"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {station.stationName}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {station.stationLocation}
                    </p>
                  </div>
                  <div className="ml-4 text-right flex flex-col gap-1">
                    <span className="text-sm font-medium text-indigo-700">
                      {station.distance.toFixed(2)} km
                    </span>
                    <span className="text-xs text-gray-500">
                      ~{station.durationMinutes} min
                    </span>
                    <button
                      onClick={(e) => handleBookStation(e, station.stationName)}
                      className="mt-1 bg-indigo-600 text-white py-1 px-3 rounded text-xs font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
