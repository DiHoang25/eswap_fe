"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/application/hooks/useRedux";
import { createVehicle } from "@/application/services/vehicleService";
import { fetchAllBatteryTypes } from "@/application/services/batteryTypeService";
import { CreateVehicleInput } from "@/domain/repositories/VehicleRepository";
import { Modal } from "@/presentation/components/ui/Modal";

interface CreateVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateVehicleModal: React.FC<CreateVehicleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.vehicle);
  const { batteryTypes } = useAppSelector((state) => state.batteryType);

  const [formData, setFormData] = useState<CreateVehicleInput>({
    vehicleName: "",
    category: "ElectricMotorbike",
    vin: "",
    licensePlate: "",
    modelYear: "",
    color: "",
    batteryType: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && batteryTypes.length === 0) {
      dispatch(fetchAllBatteryTypes());
    }
  }, [isOpen, dispatch, batteryTypes.length]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Vehicle Name validation
    if (!formData.vehicleName.trim()) {
      newErrors.vehicleName = "Vehicle name is required";
    } else if (formData.vehicleName.trim().length < 3) {
      newErrors.vehicleName = "Vehicle name must be at least 3 characters";
    } else if (formData.vehicleName.trim().length > 100) {
      newErrors.vehicleName = "Vehicle name must not exceed 100 characters";
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = "Vehicle type is required";
    }

    // Battery Type validation
    if (!formData.batteryType) {
      newErrors.batteryType = "Battery type is required";
    }

    // License Plate validation (required)
    if (!formData.licensePlate || !formData.licensePlate.trim()) {
      newErrors.licensePlate = "License plate is required";
    } else {
      const licensePlate = formData.licensePlate.trim();
      // Basic format validation (alphanumeric and hyphens)
      if (!/^[A-Z0-9-]{3,15}$/i.test(licensePlate)) {
        newErrors.licensePlate = "License plate format is invalid (e.g., 30A-12345)";
      }
    }

    // VIN validation (required)
    if (!formData.vin || !formData.vin.trim()) {
      newErrors.vin = "VIN is required";
    } else {
      const vin = formData.vin.trim();
      // VIN should be 17 characters (standard format)
      if (vin.length !== 17) {
        newErrors.vin = "VIN must be exactly 17 characters";
      } else if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
        newErrors.vin = "VIN contains invalid characters (excludes I, O, Q)";
      }
    }

    // Model Year validation (required)
    if (!formData.modelYear || !formData.modelYear.trim()) {
      newErrors.modelYear = "Model year is required";
    } else if (!/^\d{4}$/.test(formData.modelYear)) {
      newErrors.modelYear = "Model year must be 4 digits";
    } else {
      const currentYear = new Date().getFullYear();
      const year = parseInt(formData.modelYear, 10);
      if (year < 1900) {
        newErrors.modelYear = "Model year must be after 1900";
      } else if (year > currentYear + 1) {
        newErrors.modelYear = `Model year cannot exceed ${currentYear + 1}`;
      }
    }

    // Color validation (required)
    if (!formData.color || !formData.color.trim()) {
      newErrors.color = "Color is required";
    } else {
      const color = formData.color.trim();
      if (color.length < 2) {
        newErrors.color = "Color must be at least 2 characters";
      } else if (color.length > 30) {
        newErrors.color = "Color must not exceed 30 characters";
      } else if (!/^[a-zA-Z\s-]+$/.test(color)) {
        newErrors.color = "Color should only contain letters, spaces, and hyphens";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      // Map form data to API format
      const createData: CreateVehicleInput = {
        vehicleName: formData.vehicleName.trim(),
        category: formData.category,
        vin: formData.vin?.trim() || undefined,
        licensePlate: formData.licensePlate?.trim() || undefined,
        modelYear: formData.modelYear?.trim() || undefined,
        color: formData.color?.trim() || undefined,
        batteryType: formData.batteryType || undefined,
      };

      await dispatch(createVehicle(createData)).unwrap();
      onSuccess();
      // Reset form
      setFormData({
        vehicleName: "",
        category: "ElectricMotorbike",
        vin: "",
        licensePlate: "",
        modelYear: "",
        color: "",
        batteryType: "",
      });
      setErrors({});
    } catch (error: any) {
      console.error("Failed to create vehicle:", error);
      setErrors({
        submit: error.message || "An error occurred while creating the vehicle. Please try again.",
      });
    }
  };

  const handleChange = (
    field: keyof CreateVehicleInput,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={true}>
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold bg-linear-to-br from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Add New Vehicle
          </h2>
          <p className="text-gray-600 mt-1">
            Enter your vehicle information to start using our service
          </p>
        </div>

        {/* Form - Scrollable */}
        <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Vehicle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vehicleName}
              onChange={(e) => handleChange("vehicleName", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.vehicleName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., My Electric Motorcycle"
              disabled={loading}
            />
            {errors.vehicleName && (
              <p className="text-red-500 text-sm mt-1">{errors.vehicleName}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.category ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="ElectricMotorbike">Electric Motorcycle</option>
              <option value="SmallElectricCar">Small Electric Car</option>
              <option value="ElectricSUV">Electric SUV</option>
            </select>
            {errors.category && (
              <p className="text-red-500 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* License Plate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Plate <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) => handleChange("licensePlate", e.target.value.toUpperCase())}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.licensePlate ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., 30A-12345"
              disabled={loading}
            />
            {errors.licensePlate && (
              <p className="text-red-500 text-sm mt-1">{errors.licensePlate}</p>
            )}
          </div>

          {/* VIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VIN (Vehicle Identification Number) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => handleChange("vin", e.target.value.toUpperCase())}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.vin ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter vehicle VIN (17 characters)"
              maxLength={17}
              disabled={loading}
            />
            {errors.vin && (
              <p className="text-red-500 text-sm mt-1">{errors.vin}</p>
            )}
          </div>

          {/* Model Year and Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.modelYear}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 4) {
                    handleChange("modelYear", value);
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.modelYear ? "border-red-500" : "border-gray-300"
                }`}
                placeholder={new Date().getFullYear().toString()}
                maxLength={4}
                disabled={loading}
              />
              {errors.modelYear && (
                <p className="text-red-500 text-sm mt-1">{errors.modelYear}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange("color", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.color ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., Red, Blue, Black"
                disabled={loading}
              />
              {errors.color && (
                <p className="text-red-500 text-sm mt-1">{errors.color}</p>
              )}
            </div>
          </div>

          {/* Battery Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Battery Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.batteryType}
              onChange={(e) => handleChange("batteryType", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.batteryType ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading || batteryTypes.length === 0}
            >
              <option value="">Select battery type</option>
              {batteryTypes.map((bt) => (
                <option key={bt.batteryTypeID} value={bt.batteryTypeModel}>
                  {bt.batteryTypeModel} ({bt.batteryTypeCapacity}kWh)
                </option>
              ))}
            </select>
            {errors.batteryType && (
              <p className="text-red-500 text-sm mt-1">{errors.batteryType}</p>
            )}
            {batteryTypes.length === 0 && !errors.batteryType && (
              <p className="text-gray-500 text-sm mt-1">
                Loading battery types...
              </p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              {errors.submit}
            </div>
          )}

        </form>

        {/* Actions - Fixed at bottom */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors duration-200 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="vehicle-form"
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Creating...
              </span>
            ) : (
              "Create Vehicle"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateVehicleModal;

