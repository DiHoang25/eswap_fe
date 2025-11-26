"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/application/hooks/useRedux";
import {
  fetchAllVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "@/application/services/vehicleService";
import { fetchAllBatteryTypes } from "@/application/services/batteryTypeService";
import { Vehicle } from "@/domain/entities/Vehicle";
import { CreateVehicleInput, UpdateVehicleInput } from "@/domain/repositories/VehicleRepository";
import { FaPlus, FaEdit, FaTrash, FaCar } from "react-icons/fa";
import CreateVehicleModal from "./components/CreateVehicleModal";
import EditVehicleModal from "./components/EditVehicleModal";
import DeleteVehicleModal from "./components/DeleteVehicleModal";

export default function VehiclesPage() {
  const dispatch = useAppDispatch();
  const { vehicles, loading, error } = useAppSelector((state) => state.vehicle);
  const { batteryTypes } = useAppSelector((state) => state.batteryType);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Fetch vehicles and battery types on mount
  useEffect(() => {
    dispatch(fetchAllVehicles());
    if (batteryTypes.length === 0) {
      dispatch(fetchAllBatteryTypes());
    }
  }, [dispatch, batteryTypes.length]);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    dispatch(fetchAllVehicles());
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedVehicle(null);
    dispatch(fetchAllVehicles());
  };

  const handleDeleteClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setIsDeleteModalOpen(false);
    setSelectedVehicle(null);
    dispatch(fetchAllVehicles());
  };

  const getBatteryTypeInfo = (batteryTypeID: string) => {
    const batteryType = batteryTypes.find(
      (bt) => bt.batteryTypeID === batteryTypeID
    );
    return batteryType
      ? `${batteryType.batteryTypeModel} (${batteryType.batteryTypeCapacity}kWh)`
      : "Unknown";
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      ElectricMotorbike: "Electric Motorcycle",
      SmallElectricCar: "Small Electric Car",
      ElectricSUV: "Electric SUV",
    };
    return categoryMap[category] || category;
  };

  const getStatusBadgeColor = (status: string) => {
    const statusMap: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Inactive: "bg-gray-100 text-gray-800",
      Maintenance: "bg-yellow-100 text-yellow-800",
      Banned: "bg-red-100 text-red-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-br from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            My Vehicles
          </h1>
          <p className="text-gray-600 mt-1">
            Manage information and settings for your vehicles
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium shadow-md"
        >
          <FaPlus size={18} />
          Add New Vehicle
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

     

      {/* Loading State */}
      {loading && vehicles.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading vehicles...</p>
          </div>
        </div>
      ) : vehicles.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FaCar size={64} className="text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No vehicles yet
          </h3>
          <p className="text-gray-500 mb-6 text-center max-w-md">
            Get started by adding your first vehicle to use our battery swap service
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
          >
            <FaPlus size={18} />
            Add New Vehicle
          </button>
        </div>
      ) : (
        /* Vehicles Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.vehicleID}
              className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              {/* Vehicle Image */}
              <div className="relative h-48 bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Image
                  src="/car.png"
                  alt={vehicle.vehicleName}
                  width={200}
                  height={100}
                  className="object-contain"
                />
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      vehicle.status
                    )}`}
                  >
                    {vehicle.status}
                  </span>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {vehicle.vehicleName}
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">License Plate:</span>
                    <span>{vehicle.licensePlate || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Type:</span>
                    <span>{getCategoryLabel(vehicle.category)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Battery:</span>
                    <span>{getBatteryTypeInfo(vehicle.batteryTypeID)}</span>
                  </div>
                  {vehicle.color && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Color:</span>
                      <span>{vehicle.color}</span>
                    </div>
                  )}
                  {vehicle.modelYear && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Year:</span>
                      <span>{vehicle.modelYear}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEditClick(vehicle)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors duration-200 font-medium"
                  >
                    <FaEdit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(vehicle)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200 font-medium"
                  >
                    <FaTrash size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateVehicleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedVehicle && (
        <>
          <EditVehicleModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedVehicle(null);
            }}
            vehicle={selectedVehicle}
            onSuccess={handleEditSuccess}
          />
          <DeleteVehicleModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedVehicle(null);
            }}
            vehicle={selectedVehicle}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
}

