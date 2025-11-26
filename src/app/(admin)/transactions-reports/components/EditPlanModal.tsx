"use client";

import { useState, useEffect } from "react";
import { SubscriptionPlanDTO, UpdateSubscriptionPlanDTO } from "@/infrastructure/repositories/Hoang/SubscriptionPlanRepository";
import { Modal } from "@/presentation/components/ui/Modal";

interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateSubscriptionPlanDTO) => Promise<void>;
  plan: SubscriptionPlanDTO | null;
  isSubmitting: boolean;
}

export function EditPlanModal({
  isOpen,
  onClose,
  onSubmit,
  plan,
  isSubmitting,
}: EditPlanModalProps) {
  const [formData, setFormData] = useState<UpdateSubscriptionPlanDTO>({
    name: plan?.name || "",
    planGroup: plan?.planGroup || "",
    tier: plan?.tier || "",
    price: plan?.price || 0,
    description: plan?.description || "",
    durationDays: plan?.durationDays || 30,
    maxSwapsPerPeriod: plan?.maxSwapsPerPeriod ?? null,
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        planGroup: plan.planGroup,
        tier: plan.tier,
        price: plan.price,
        description: plan.description || "",
        durationDays: plan.durationDays,
        maxSwapsPerPeriod: plan.maxSwapsPerPeriod ?? null,
      });
    }
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.planGroup || !formData.price || formData.price <= 0) {
      return;
    }
    await onSubmit(formData);
  };

  if (!plan) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Subscription Plan">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan Name *
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
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
            {isSubmitting ? "Updating..." : "Update Plan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

