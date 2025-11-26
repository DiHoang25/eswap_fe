"use client";

import React, { useState } from "react";
import { useAppDispatch } from "@/application/hooks/useRedux";
import { deleteVehicle } from "@/application/services/vehicleService";
import { Vehicle } from "@/domain/entities/Vehicle";
import { Modal } from "@/presentation/components/ui/Modal";
import { FaExclamationTriangle } from "react-icons/fa";

interface DeleteVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  onSuccess: () => void;
}

const DeleteVehicleModal: React.FC<DeleteVehicleModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await dispatch(deleteVehicle(vehicle.vehicleID)).unwrap();
      onSuccess();
    } catch (err: any) {
      console.error("Failed to delete vehicle:", err);
      setError(err.message || "An error occurred while deleting the vehicle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={true}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <FaExclamationTriangle className="text-red-600" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Confirm Delete Vehicle
          </h2>
          <p className="text-gray-600">
            Are you sure you want to delete this vehicle?
          </p>
        </div>

        {/* Vehicle Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-600">Vehicle Name:</span>
              <p className="text-gray-800 font-semibold">{vehicle.vehicleName}</p>
            </div>
            {vehicle.licensePlate && (
              <div>
                <span className="text-sm font-medium text-gray-600">
                  License Plate:
                </span>
                <p className="text-gray-800">{vehicle.licensePlate}</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This action cannot be undone. The vehicle will be
            removed from your list and you will not be able to use it for new bookings.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors duration-200 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Deleting...
              </span>
            ) : (
              "Delete Vehicle"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteVehicleModal;

