import { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { Input } from "@/presentation/components/ui/Input";
import { Select, SelectOption } from "@/presentation/components/ui/Select";

interface CreateBatteryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBatteryData) => Promise<void>;
  stations: Array<{ stationID: string; stationName: string }>;
}

export interface CreateBatteryData {
  lastStationID: string;
  batteryTypeName: string;
  quantity: number;
  initialSoH: number;
  initialPercentage: number;
}

export default function CreateBatteryModal({
  isOpen,
  onClose,
  onSubmit,
  stations,
}: CreateBatteryModalProps) {
  const [formData, setFormData] = useState<CreateBatteryData>({
    lastStationID: "",
    batteryTypeName: "Small",
    quantity: 1,
    initialSoH: 100,
    initialPercentage: 100,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateBatteryData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        lastStationID: "",
        batteryTypeName: "Small",
        quantity: 1,
        initialSoH: 100,
        initialPercentage: 100,
      });
      setErrors({});
    }
  }, [isOpen]);

  const batteryTypeOptions: SelectOption[] = [
    { value: "Small", label: "Small (Motorcycle)" },
    { value: "Medium", label: "Medium (Small Car)" },
    { value: "Large", label: "Large (SUV)" },
  ];

  const stationOptions: SelectOption[] = stations.map((station) => ({
    value: station.stationID,
    label: station.stationName,
  }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateBatteryData, string>> = {};

    if (!formData.lastStationID) {
      newErrors.lastStationID = "Please select a station";
    }

    if (!formData.batteryTypeName) {
      newErrors.batteryTypeName = "Please select a battery type";
    }

    if (formData.quantity < 1 || formData.quantity > 1000) {
      newErrors.quantity = "Quantity must be between 1 and 1000";
    }

    if (formData.initialSoH < 0 || formData.initialSoH > 100) {
      newErrors.initialSoH = "SoH must be between 0 and 100";
    }

    if (formData.initialPercentage < 0 || formData.initialPercentage > 100) {
      newErrors.initialPercentage = "Percentage must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error creating batteries:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof CreateBatteryData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Batteries</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Station */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Station <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 max-h-40 overflow-y-auto"
                value={formData.lastStationID}
                onChange={(e) => handleChange("lastStationID", e.target.value)}
                size={1}
              >
                <option value="">Select station</option>
                {stations.map((station) => (
                  <option key={station.stationID} value={station.stationID}>
                    {station.stationName}
                  </option>
                ))}
              </select>
              {errors.lastStationID && (
                <p className="mt-1 text-sm text-red-600">{errors.lastStationID}</p>
              )}
            </div>

          {/* Battery Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Battery Type <span className="text-red-500">*</span>
            </label>
            <Select
              options={batteryTypeOptions}
              value={formData.batteryTypeName}
              onChange={(e) => handleChange("batteryTypeName", e.target.value)}
            />
            {errors.batteryTypeName && (
              <p className="mt-1 text-sm text-red-600">{errors.batteryTypeName}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleChange("quantity", parseInt(e.target.value) || 0)}
              min={1}
              max={1000}
              placeholder="Enter quantity (1-1000)"
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Initial SoH */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial State of Health (SoH) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.initialSoH}
              onChange={(e) => handleChange("initialSoH", parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              placeholder="Enter SoH (0-100)"
            />
            {errors.initialSoH && (
              <p className="mt-1 text-sm text-red-600">{errors.initialSoH}</p>
            )}
          </div>

          {/* Initial Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Charge Percentage <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.initialPercentage}
              onChange={(e) => handleChange("initialPercentage", parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              placeholder="Enter percentage (0-100)"
            />
            {errors.initialPercentage && (
              <p className="mt-1 text-sm text-red-600">{errors.initialPercentage}</p>
            )}
          </div>
        </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex-shrink-0 flex gap-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Batteries"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
