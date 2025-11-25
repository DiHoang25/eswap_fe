"use client";
import React from "react";
import { FaSearch } from "react-icons/fa";

interface Station {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
}

interface RecentStationsListProps {
  stations?: any[];
  loading?: boolean;
  onSearch?: () => void;
  onStationSelect?: (station: Station) => void;
}

function transformStationData(station: any): Station {
  return {
    id: station.stationID || station.station_id || station.id || Math.random().toString(),
    name: station.stationName || station.name || 'Unknown Station',
    address: station.stationLocation || station.location || station.address || '',
    imageUrl: station.imageUrl || station.image || '/logo.png',
  };
}

export default function RecentStationsList({
  stations = [],
  loading = false,
  onSearch,
  onStationSelect,
}: RecentStationsListProps) {
  const transformedStations = stations.map(transformStationData);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 h-full">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-800">Stations</h3>
            <button
              onClick={onSearch}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaSearch size={16} />
            </button>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (transformedStations.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 h-full">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-800">Stations</h3>
            <button
              onClick={onSearch}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaSearch size={16} />
            </button>
          </div>
          <div className="flex items-center justify-center flex-1">
            <p className="text-gray-500 text-sm">No stations available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 h-full">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-800">Stations</h3>
          
        </div>
        {/* Stations List - Scrollable with visible scrollbar */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-visible min-h-0">
          {transformedStations.map((station) => (
            <div
              key={station.id}
              onClick={() => onStationSelect?.(station)}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {/* Station Image */}
              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={station.imageUrl || "/logo.png"}
                  alt={station.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Station Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-800 truncate">
                  {station.name}
                </h4>
                <p
                  className="text-sm text-gray-500 overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {station.address}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
