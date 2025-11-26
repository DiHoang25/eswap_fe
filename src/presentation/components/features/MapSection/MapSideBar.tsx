"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/application/hooks/useRedux";
import { setMapView } from "@/application/slices/mapSlice";
import { searchStationsByLocationUseCase } from "@/application/usecases/station/SearchStationsByLocation.usecase";
import { getAllStationsUseCase } from "@/application/usecases/station/GetAllStations.usecase";
import { stationRepositoryAPI } from "@/infrastructure/repositories/StationRepositoryAPI.impl";
import { SearchStationResponse } from "@/domain/repositories/StationRepository";
import { Station } from "@/domain/entities/Station";

type BatteryType = "Small" | "Medium" | "Large";

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

  // Get battery type from selected vehicle's category
  const batteryType = useMemo((): BatteryType => {
    if (!selectedVehicle) return "Medium"; // Default fallback
    
    const category = selectedVehicle.category.toLowerCase();
    if (category.includes("motorcycle") || category.includes("electricmotorbike")) {
      return "Small";
    }
    if (category.includes("suv") || category.includes("electricsuv")) {
      return "Large";
    }
    // SmallElectricCar or default
    return "Medium";
  }, [selectedVehicle]);

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
      // Check if we have user location
      if (!userLocation) {
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
            batteryType: batteryType,
          }
        );

        // API already returns stations sorted by distance with distance and durationMinutes calculated
        setStations(stationsData);
      } catch (err) {
        console.error("Error fetching nearby stations:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Unable to load station list. Please try again.";
        setError(errorMessage);
        setStations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyStations();
  }, [userLocation, batteryType]);

  // Show message if no vehicle selected
  if (!selectedVehicle) {
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">No vehicle selected</p>
          <p className="text-gray-400 text-xs">
            Please select a vehicle from the home page first
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Stations Near You
        </h2>
        {/* Selected Vehicle Info */}
        <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Selected Vehicle</p>
              <p className="text-sm font-semibold text-gray-900">
                {selectedVehicle.vehicleName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedVehicle.category.replace(/([A-Z])/g, ' $1').trim()} • Battery: {batteryType}
              </p>
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
                      Book Now
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
