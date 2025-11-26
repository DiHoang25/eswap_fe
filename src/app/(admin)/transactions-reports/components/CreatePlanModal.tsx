"use client";

import { useState, useEffect } from "react";
import { BatteryType } from "@/domain/entities/BatteryType";
import { CreateSubscriptionPlanDTO } from "@/infrastructure/repositories/Hoang/SubscriptionPlanRepository";
import { Modal } from "@/presentation/components/ui/Modal";

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubscriptionPlanDTO) => Promise<void>;
  batteryTypes: BatteryType[];
  isSubmitting: boolean;
}

export function CreatePlanModal({
  isOpen,
  onClose,
  onSubmit,
  batteryTypes,
  isSubmitting,
}: CreatePlanModalProps) {
  const [formData, setFormData] = useState<CreateSubscriptionPlanDTO>({
    batteryModel: "",
    name: "",
    planGroup: "",
    tier: "",
    price: 0,
    description: "",
    durationDays: 0,
    maxSwapsPerPeriod: null,
  });
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Debug: Log battery types when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("[CreatePlanModal] Battery types available:", batteryTypes.length);
      console.log("[CreatePlanModal] Battery types:", batteryTypes.map(bt => ({
        id: bt.batteryTypeID,
        model: bt.batteryTypeModel,
        capacity: bt.batteryTypeCapacity
      })));
    }
  }, [isOpen, batteryTypes]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        batteryModel: "",
        name: "",
        planGroup: "",
        tier: "",
        price: 0,
        description: "",
        durationDays: 0,
        maxSwapsPerPeriod: null,
      });
      setError("");
      setFieldErrors({});
    }
  }, [isOpen]);

  // Get battery type (Small/Medium/Large) from battery model
  const getBatteryTypeFromModel = (batteryModel: string): "Small" | "Medium" | "Large" => {
    if (!batteryModel) return "Small";
    const model = batteryModel.toLowerCase();
    if (model.includes("small") || model.includes("sma")) return "Small";
    if (model.includes("medium") || model.includes("med")) return "Medium";
    if (model.includes("large") || model.includes("lar")) return "Large";
    const batteryType = batteryTypes.find((bt) => bt.batteryTypeModel === batteryModel);
    if (batteryType) {
      const prefix = batteryType.batteryTypeID?.substring(0, 3).toUpperCase();
      if (prefix === "LAR") return "Large";
      if (prefix === "MED") return "Medium";
      if (prefix === "SMA") return "Small";
    }
    return "Small";
  };

  // Get suggested keyword for plan name
  const getSuggestedKeyword = (batteryType: "Small" | "Medium" | "Large"): string => {
    switch (batteryType) {
      case "Small":
        return "motorcycle";
      case "Medium":
        return "small car";
      case "Large":
        return "SUV car";
      default:
        return "motorcycle";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Field-level validation
    const newFieldErrors: Record<string, string> = {};
    
    if (!formData.batteryModel) {
      newFieldErrors.batteryModel = "Battery model is required";
    }
    if (!formData.name || formData.name.trim() === "") {
      newFieldErrors.name = "Plan name is required";
    }
    if (!formData.planGroup) {
      newFieldErrors.planGroup = "Plan group is required";
    }
    if (!formData.tier || formData.tier.trim() === "") {
      newFieldErrors.tier = "Tier is required";
    }
    if (!formData.price || formData.price <= 0) {
      newFieldErrors.price = "Price must be greater than 0";
    }
    if (!formData.durationDays || formData.durationDays < 1) {
      newFieldErrors.durationDays = "Duration must be at least 1 day";
    }

    setFieldErrors(newFieldErrors);
    
    if (Object.keys(newFieldErrors).length > 0) {
      return;
    }

    try {
      await onSubmit(formData);
      // Modal will be closed by parent component on success
    } catch (err: any) {
      // Extract error message from various possible formats
      let errorMessage = "Failed to create plan";
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (errorData.Message) {
          errorMessage = errorData.Message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      }
      
      setError(errorMessage);
    }
  };

  // Clear field error when user types
  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const suggestedKeyword = formData.batteryModel
    ? getSuggestedKeyword(getBatteryTypeFromModel(formData.batteryModel))
    : "";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Subscription Plan">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Battery Model <span className="text-red-500">*</span>
          </label>
          <select
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
              fieldErrors.batteryModel ? "border-red-500" : "border-gray-300"
            }`}
            value={formData.batteryModel}
            onChange={(e) => handleFieldChange("batteryModel", e.target.value)}
          >
            <option value="">Select battery model</option>
            {batteryTypes.map((bt) => (
              <option key={bt.batteryTypeID} value={bt.batteryTypeModel}>
                {bt.batteryTypeModel} ({bt.batteryTypeCapacity}kWh)
              </option>
            ))}
          </select>
          {fieldErrors.batteryModel && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.batteryModel}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
              fieldErrors.name ? "border-red-500" : "border-gray-300"
            }`}
            value={formData.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            placeholder={
              formData.batteryModel
                ? `e.g., ${suggestedKeyword} ${formData.tier || "Basic"} Plan`
                : "Enter plan name"
            }
          />
          {fieldErrors.name && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
          )}
          {formData.batteryModel && (
            <div className="mt-1 text-xs text-gray-500">
              <span className="font-medium">💡 Hint:</span> Plan name should include "
              <span className="font-semibold text-indigo-600">{suggestedKeyword}</span>
              " to match with vehicle type filter.
            </div>
          )}
          {formData.name && formData.batteryModel && (
            <div className="mt-1">
              {formData.name.toLowerCase().includes(suggestedKeyword.toLowerCase()) ? (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <span>✓</span>
                  <span>Plan name contains correct keyword</span>
                </div>
              ) : (
                <div className="text-xs text-amber-600 flex items-center gap-1">
                  <span>⚠</span>
                  <span>
                    Plan name should include "<span className="font-semibold">{suggestedKeyword}</span>" for proper filtering
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Group <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.planGroup ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.planGroup}
              onChange={(e) => handleFieldChange("planGroup", e.target.value)}
            >
              <option value="">Select plan group</option>
              <option value="Pay_Per_Swap">Pay Per Swap</option>
              <option value="Daily_Rental">Daily Rental</option>
              <option value="Monthly_Subscription">Monthly Subscription</option>
              <option value="Annual_Subscription">Annual Subscription</option>
            </select>
            {fieldErrors.planGroup && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.planGroup}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.tier ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.tier}
              onChange={(e) => handleFieldChange("tier", e.target.value)}
              placeholder="e.g., Basic, Standard, Premium"
            />
            {fieldErrors.tier && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.tier}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (VND) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.price ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.price === 0 ? "" : formData.price}
              onChange={(e) => {
                const value = e.target.value;
                handleFieldChange("price", value === "" ? 0 : parseFloat(value));
              }}
              min="0"
              step="1000"
              placeholder="Enter price"
            />
            {fieldErrors.price && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.price}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (Days) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.durationDays ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.durationDays === 0 ? "" : formData.durationDays}
              onChange={(e) => {
                const value = e.target.value;
                handleFieldChange("durationDays", value === "" ? 0 : parseInt(value));
              }}
              min="1"
              max="365"
              placeholder="Enter days (min: 1)"
            />
            {fieldErrors.durationDays && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.durationDays}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Swaps Per Period
          </label>
          <input
            type="number"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={formData.maxSwapsPerPeriod ?? ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxSwapsPerPeriod:
                  e.target.value === "" ? null : parseInt(e.target.value) || null,
              })
            }
            min="1"
            max="240"
            placeholder="Leave empty for unlimited"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for unlimited swaps
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Plan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

