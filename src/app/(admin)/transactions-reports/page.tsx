"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/application/hooks/useRedux";
import { fetchAllBatteryTypes } from "@/application/services/batteryTypeService";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from "@heroui/react";
import { FaPlus, FaEdit, FaTrash, FaSyncAlt } from "react-icons/fa";
import { subscriptionPlanRepository, SubscriptionPlanDTO, CreateSubscriptionPlanDTO, UpdateSubscriptionPlanDTO } from "@/infrastructure/repositories/Hoang/SubscriptionPlanRepository";
import { Toast } from "@/presentation/components/ui/Toast";
import { withAdminAuth } from "@/hoc/withAuth";
import { CreatePlanModal } from "./components/CreatePlanModal";
import { EditPlanModal } from "./components/EditPlanModal";
import { DeletePlanModal } from "./components/DeletePlanModal";

export default withAdminAuth(function SubscriptionPlansManagement() {
  const dispatch = useAppDispatch();
  const { batteryTypes } = useAppSelector((state) => state.batteryType);

  const [plans, setPlans] = useState<SubscriptionPlanDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batteryTypeFilter, setBatteryTypeFilter] = useState<"all" | "Small" | "Medium" | "Large">("all");

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
    isVisible: boolean;
  }>({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  // Load battery types
  useEffect(() => {
    if (batteryTypes.length === 0) {
      dispatch(fetchAllBatteryTypes());
    }
  }, [dispatch, batteryTypes.length]);

  // Load subscription plans
  const loadPlans = async (mergeWithExisting = false) => {
    try {
      setLoading(true);
      const data = await subscriptionPlanRepository.getAll();
      console.log("[Subscription Plans] Loaded plans from API:", data.length);
      console.log("[Subscription Plans] Plan names:", data.map(p => p.name));
      
      // Log filtered plans count
      const currentFilter = batteryTypeFilter;
      const filteredCount = currentFilter === "all" 
        ? data.length 
        : data.filter(p => {
            const vehicleType = getVehicleType(p.name);
            const targetVehicleType = batteryTypeToVehicleType[currentFilter] || "Electric Motorcycle";
            return vehicleType === targetVehicleType;
          }).length;
      console.log("[Subscription Plans] Filtered plans count (filter:", currentFilter, "):", filteredCount);
      
      if (mergeWithExisting) {
        // Merge with existing plans to preserve newly created plans that might not be in API yet
        // This is a fallback for when backend hasn't set IsActive = true yet
        setPlans((prevPlans) => {
          const apiPlanIds = new Set(data.map(p => p.planID));
          // Keep plans from API (these are the "real" plans from database)
          const mergedPlans = [...data];
          // Add plans from previous state that are not in API (newly created plans waiting for backend fix)
          prevPlans.forEach(prevPlan => {
            if (!apiPlanIds.has(prevPlan.planID)) {
              console.log("[Subscription Plans] Keeping plan not in API yet (backend may need IsActive = true):", prevPlan.name);
              mergedPlans.push(prevPlan);
            }
          });
          console.log("[Subscription Plans] Merged plans count:", mergedPlans.length, "(API:", data.length, "+ pending:", mergedPlans.length - data.length, ")");
          return mergedPlans;
        });
      } else {
        // Normal reload - use fresh data from API
        setPlans(data);
      }
    } catch (error: any) {
      console.error("[Subscription Plans] Failed to load plans:", error);
      showToast("Failed to load subscription plans", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Helper functions
  const getBatteryTypeModel = (batteryTypeID?: string, batteryModel?: string): string => {
    // Priority: use batteryModel from API if available
    if (batteryModel) return batteryModel;
    // Fallback: lookup by batteryTypeID
    if (!batteryTypeID) return "Unknown";
    const batteryType = batteryTypes.find((bt) => bt.batteryTypeID === batteryTypeID);
    return batteryType?.batteryTypeModel || "Unknown";
  };

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

  const batteryTypeToVehicleType: Record<string, string> = {
    Small: "Electric Motorcycle",
    Medium: "Small Electric Car",
    Large: "Electric SUV/Large Car",
  };

  const getVehicleType = (planName: string): string => {
    const nameLower = planName.toLowerCase();
    if (nameLower.includes("motorcycle") || nameLower.includes("xe máy")) return "Electric Motorcycle";
    if (nameLower.includes("small car") || nameLower.includes("ô tô nhỏ")) return "Small Electric Car";
    if (nameLower.includes("suv") || nameLower.includes("ô tô suv") || nameLower.includes("ô tô điện suv")) return "Electric SUV/Large Car";
    return "Electric Vehicle";
  };

  // Filter plans based on battery type filter
  const filteredPlans = useMemo(() => {
    if (batteryTypeFilter === "all") {
      console.log("[Subscription Plans] Filter: all, showing", plans.length, "plans");
      return plans;
    }
    const targetVehicleType = batteryTypeToVehicleType[batteryTypeFilter] || "Electric Motorcycle";
    const filtered = plans.filter((plan) => {
      const vehicleType = getVehicleType(plan.name);
      const matches = vehicleType === targetVehicleType;
      if (!matches) {
        console.log("[Subscription Plans] Plan filtered out:", plan.name, "vehicleType:", vehicleType, "target:", targetVehicleType);
      }
      return matches;
    });
    console.log("[Subscription Plans] Filter:", batteryTypeFilter, "showing", filtered.length, "of", plans.length, "plans");
    return filtered;
  }, [plans, batteryTypeFilter]);

  // Handle create
  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async (data: CreateSubscriptionPlanDTO) => {
    try {
      setIsSubmitting(true);
      const createdPlan = await subscriptionPlanRepository.create(data);
      
      console.log("[Subscription Plans] Created plan response:", createdPlan);
      console.log("[Subscription Plans] Current plans count before add:", plans.length);
      
      // Determine battery type from the created plan
      const batteryType = getBatteryTypeFromModel(data.batteryModel);
      console.log("[Subscription Plans] Determined battery type:", batteryType);
      
      // Add the created plan to state immediately (optimistic update)
      if (createdPlan && createdPlan.planID) {
        // Ensure the plan has all required fields
        const planToAdd: SubscriptionPlanDTO = {
          ...createdPlan,
          batteryModel: createdPlan.batteryModel || data.batteryModel,
          name: createdPlan.name || data.name,
        };
        
        setPlans((prevPlans) => {
          // Check if plan already exists to avoid duplicates
          const exists = prevPlans.some(p => p.planID === planToAdd.planID);
          if (exists) {
            console.log("[Subscription Plans] Plan already in state, updating instead");
            return prevPlans.map(p => p.planID === planToAdd.planID ? planToAdd : p);
          }
          console.log("[Subscription Plans] Adding plan to state:", planToAdd.name);
          const newPlans = [...prevPlans, planToAdd];
          console.log("[Subscription Plans] New plans count:", newPlans.length);
          return newPlans;
        });
        
        // Check if the plan will be visible with the current filter
        const planVehicleType = getVehicleType(planToAdd.name);
        const targetVehicleType = batteryTypeToVehicleType[batteryType] || "Electric Motorcycle";
        const willBeVisible = planVehicleType === targetVehicleType;
        
        console.log("[Subscription Plans] Plan vehicle type:", planVehicleType, "target:", targetVehicleType, "will be visible:", willBeVisible);
        
        // Set filter to match the created plan's battery type
        // This ensures the newly created plan is visible
        if (willBeVisible) {
          setBatteryTypeFilter(batteryType);
          console.log("[Subscription Plans] Filter set to:", batteryType);
        } else {
          // If plan won't be visible, set filter to "all" to show it
          console.log("[Subscription Plans] Plan won't be visible with filter, setting to 'all'");
          setBatteryTypeFilter("all");
        }
      } else {
        // Fallback: set filter based on battery model
        setBatteryTypeFilter(batteryType);
        console.log("[Subscription Plans] Filter set to:", batteryType, "(fallback)");
      }
      
      // Reload plans after a delay to ensure backend has processed
      // When backend fixes IsActive issue, plan will appear in GetAllAsync immediately
      setTimeout(async () => {
        try {
          console.log("[Subscription Plans] Reloading plans after create...");
          const reloadedData = await subscriptionPlanRepository.getAll();
          console.log("[Subscription Plans] Reloaded plans from API:", reloadedData.length);
          
          // Check if the created plan is now in the API (after backend fix)
          const planExistsInAPI = reloadedData.some(p => p.planID === createdPlan.planID);
          
          if (planExistsInAPI) {
            console.log(`[Subscription Plans] ✓ Plan "${createdPlan.name}" found in API - backend fix working!`);
            // Use fresh data from API (no merge needed)
            setPlans(reloadedData);
          } else {
            console.warn(`[Subscription Plans] Plan "${createdPlan.name}" not found in API yet. Using merge mode to preserve it.`);
            // Use merge mode to preserve the newly created plan
            await loadPlans(true);
            
            // Retry once more after delay (in case backend needs more time)
            setTimeout(async () => {
              try {
                console.log("[Subscription Plans] Retry reloading plans...");
                const retryData = await subscriptionPlanRepository.getAll();
                const planNowExists = retryData.some(p => p.planID === createdPlan.planID);
                
                if (planNowExists) {
                  console.log(`[Subscription Plans] ✓ Plan "${createdPlan.name}" now found in API!`);
                  setPlans(retryData);
                } else {
                  console.warn(`[Subscription Plans] Plan "${createdPlan.name}" still not in API. Backend may need to set IsActive = true.`);
                  // Keep using merge mode to preserve the plan
                  await loadPlans(true);
                }
              } catch (err) {
                console.error("[Subscription Plans] Failed to retry reload:", err);
              }
            }, 1500);
          }
        } catch (err) {
          console.error("[Subscription Plans] Failed to reload after create:", err);
          // Fallback: use merge mode
          await loadPlans(true);
        }
      }, 800); // Reduced delay - when backend is fixed, plan appears immediately
      
      showToast("Subscription plan created successfully", "success");
      setShowCreateModal(false);
    } catch (error: any) {
      console.error("[Subscription Plans] Failed to create plan:", error);
      
      // Extract error message from various formats
      let errorMessage = "Failed to create subscription plan";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (errorData.Message) {
          errorMessage = errorData.Message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      showToast(errorMessage, "error");
      // Re-throw error so modal can also display it
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (plan: SubscriptionPlanDTO) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (data: UpdateSubscriptionPlanDTO) => {
    if (!selectedPlan) return;

    try {
      setIsSubmitting(true);
      await subscriptionPlanRepository.update(selectedPlan.planID, data);
      showToast("Subscription plan updated successfully", "success");
      setShowEditModal(false);
      setSelectedPlan(null);
      await loadPlans();
    } catch (error: any) {
      console.error("[Subscription Plans] Failed to update plan:", error);
      const errorMessage =
        error?.response?.data?.Message ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update subscription plan";
      showToast(errorMessage, "error");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = (plan: SubscriptionPlanDTO) => {
    setSelectedPlan(plan);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPlan) return;

    try {
      setIsDeleting(true);
      await subscriptionPlanRepository.delete(selectedPlan.planID);
      showToast("Subscription plan deleted successfully", "success");
      setShowDeleteModal(false);
      setSelectedPlan(null);
      await loadPlans();
    } catch (error: any) {
      console.error("[Subscription Plans] Failed to delete plan:", error);
      const errorMessage =
        error?.response?.data?.Message ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete subscription plan";
      showToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Format helpers
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const formatDuration = (days: number): string => {
    if (days === 1) return "1 day";
    if (days < 30) return `${days} days`;
    if (days === 30) return "1 month";
    if (days < 365) return `${Math.floor(days / 30)} months`;
    if (days === 365) return "1 year";
    return `${Math.floor(days / 365)} years`;
  };

  const formatSwapLimit = (maxSwaps?: number | null): string => {
    if (maxSwaps === null || maxSwaps === undefined) return "Unlimited";
    return `${maxSwaps} swaps`;
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Subscription Plans Management</h2>
            <p className="text-gray-600">
              Manage subscription plans for battery swap services
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={batteryTypeFilter}
              onChange={(e) => setBatteryTypeFilter(e.target.value as "all" | "Small" | "Medium" | "Large")}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Battery Types ({plans.length})</option>
              <option value="Small">Small - Motorcycle ({plans.filter(p => getVehicleType(p.name) === "Electric Motorcycle").length})</option>
              <option value="Medium">Medium - Small Car ({plans.filter(p => getVehicleType(p.name) === "Small Electric Car").length})</option>
              <option value="Large">Large - SUV/Large Car ({plans.filter(p => getVehicleType(p.name) === "Electric SUV/Large Car").length})</option>
            </select>
            <button
              onClick={() => loadPlans(false)}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <FaPlus />
              Create Plan
            </button>
          </div>
        </div>

        <Table aria-label="Subscription plans table">
          <TableHeader>
            <TableColumn>PLAN NAME</TableColumn>
            <TableColumn>BATTERY TYPE</TableColumn>
            <TableColumn>PLAN GROUP</TableColumn>
            <TableColumn>TIER</TableColumn>
            <TableColumn>PRICE</TableColumn>
            <TableColumn>DURATION</TableColumn>
            <TableColumn>SWAP LIMIT</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={loading}
            loadingContent={<span>Loading plans...</span>}
            emptyContent={loading ? "Loading..." : "No subscription plans found"}
          >
            {filteredPlans.map((plan) => (
              <TableRow key={plan.planID}>
                <TableCell>
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    {plan.description && (
                      <div className="text-xs text-gray-500">{plan.description}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getBatteryTypeModel(plan.batteryTypeID, plan.batteryModel)}</TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color="primary">
                    {plan.planGroup}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color="secondary">
                    {plan.tier}
                  </Chip>
                </TableCell>
                <TableCell className="font-medium">{formatPrice(plan.price)}</TableCell>
                <TableCell>{formatDuration(plan.durationDays)}</TableCell>
                <TableCell>{formatSwapLimit(plan.maxSwapsPerPeriod)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreatePlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmitCreate}
        batteryTypes={batteryTypes}
        isSubmitting={isSubmitting}
      />

      <EditPlanModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPlan(null);
        }}
        onSubmit={handleSubmitEdit}
        plan={selectedPlan}
        isSubmitting={isSubmitting}
      />

      <DeletePlanModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedPlan(null);
        }}
        onConfirm={handleConfirmDelete}
        plan={selectedPlan}
        isDeleting={isDeleting}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={3000}
      />
    </div>
  );
});
