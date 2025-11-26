"use client";

import { SubscriptionPlanDTO } from "@/infrastructure/repositories/Hoang/SubscriptionPlanRepository";
import { Modal } from "@/presentation/components/ui/Modal";

interface DeletePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  plan: SubscriptionPlanDTO | null;
  isDeleting: boolean;
}

export function DeletePlanModal({
  isOpen,
  onClose,
  onConfirm,
  plan,
  isDeleting,
}: DeletePlanModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Subscription Plan">
      <div className="space-y-4">
        <p className="text-gray-700">
          Are you sure you want to delete the subscription plan{" "}
          <span className="font-semibold">{plan?.name}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}


