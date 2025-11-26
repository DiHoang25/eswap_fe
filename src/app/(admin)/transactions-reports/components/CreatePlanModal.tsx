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
    durationDays: 30,
    maxSwapsPerPeriod: null,
  });
  const [error, setError] = useState<string>("");

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
        durationDays: 30,
        maxSwapsPerPeriod: null,
      });
      setError("");
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
        return "SUV";
      default:
        return "motorcycle";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validation
    if (!formData.batteryModel) {
      setError("Please select a battery model");
      return;
    }
    if (!formData.name || formData.name.trim() === "") {
      setError("Please enter a plan name");
      return;
    }
    if (!formData.planGroup) {
      setError("Please select a plan group");
      return;
    }
    if (!formData.tier || formData.tier.trim() === "") {
      setError("Please enter a tier");
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setError("Please enter a valid price (greater than 0)");
      return;
    }
    if (!formData.durationDays || formData.durationDays <= 0) {
      setError("Please enter a valid duration (greater than 0)");
      return;
    }

    try {
      await onSubmit(formData);
      // Modal will be closed by parent component on success
    } catch (err: any) {
      // Extract error message from various possible formats
      let errorMessage = "Failed to create plan";
      
      // Priority: err.message > err.response.data (string) > err.response.data.message/Message
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
      
      console.log("[CreatePlanModal] Setting error message:", errorMessage);
      setError(errorMessage);
      
      // Scroll to top to show error
      const formElement = document.querySelector('form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
            Battery Model *
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={formData.batteryModel}
            onChange={(e) =>
              setFormData({ ...formData, batteryModel: e.target.value })
            }
            required
          >
            <option value="">Select battery model</option>
            {batteryTypes.map((bt) => (
              <option key={bt.batteryTypeID} value={bt.batteryTypeModel}>
                {bt.batteryTypeModel} ({bt.batteryTypeCapacity}kWh)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan Name *
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={
              formData.batteryModel
                ? `e.g., ${suggestedKeyword} plan - ${formData.tier || "Basic"}`
                : "Enter plan name"
            }
            required
          />
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
              Plan Group *
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={formData.planGroup}
              onChange={(e) =>
                setFormData({ ...formData, planGroup: e.target.value })
              }
              required
            >
              <option value="">Select plan group</option>
              <option value="Pay_Per_Swap">Pay Per Swap</option>
              <option value="Daily_Rental">Daily Rental</option>
              <option value="Monthly_Subscription">Monthly Subscription</option>
              <option value="Annual_Subscription">Annual Subscription</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tier *
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              placeholder="e.g., Basic, Standard, Premium"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (VND) *
            </label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="1000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (Days) *
            </label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={formData.durationDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  durationDays: parseInt(e.target.value) || 1,
                })
              }
              min="1"
              max="365"
              required
            />
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

