/**
 * SubscriptionPlan Repository Implementation
 * Implements CRUD operations for subscription plans
 */

import api from '@/lib/api';

// Backend DTOs
export interface SubscriptionPlanDTO {
  planID: string;
  name: string;
  planGroup: string;
  tier: string;
  price: number;
  description?: string;
  durationDays: number;
  maxSwapsPerPeriod?: number | null;
  batteryTypeID?: string;
  batteryModel?: string;
  isActive?: boolean;
}

export interface CreateSubscriptionPlanDTO {
  batteryModel: string;
  name: string;
  planGroup: string;
  tier: string;
  price: number;
  description?: string;
  durationDays: number;
  maxSwapsPerPeriod?: number | null;
}

export interface UpdateSubscriptionPlanDTO {
  name?: string;
  price?: number;
  planGroup?: string;
  tier?: string;
  description?: string;
  durationDays?: number;
  maxSwapsPerPeriod?: number | null;
}

export class SubscriptionPlanRepository {
  private readonly basePath = '/subscription-plans';

  async getAll(): Promise<SubscriptionPlanDTO[]> {
    const response = await api.get(this.basePath);
    const data = response.data?.data || response.data;
    
    if (!Array.isArray(data)) {
      return [];
    }
    
    // Map from PascalCase to camelCase
    return data.map((plan: any) => ({
      planID: plan.PlanID || plan.planID,
      name: plan.Name || plan.name,
      planGroup: plan.PlanGroup || plan.planGroup,
      tier: plan.Tier || plan.tier,
      price: plan.Price || plan.price,
      description: plan.Description || plan.description,
      durationDays: plan.DurationDays || plan.durationDays,
      maxSwapsPerPeriod: plan.MaxSwapsPerPeriod !== undefined ? plan.MaxSwapsPerPeriod : (plan.maxSwapsPerPeriod !== undefined ? plan.maxSwapsPerPeriod : null),
      batteryTypeID: plan.BatteryTypeID || plan.batteryTypeID,
      batteryModel: plan.BatteryModel || plan.batteryModel,
      isActive: plan.IsActive !== undefined ? plan.IsActive : (plan.isActive !== undefined ? plan.isActive : true),
    }));
  }

  async getById(id: string): Promise<SubscriptionPlanDTO> {
    const response = await api.get(`${this.basePath}/${id}`);
    return response.data?.data || response.data;
  }

  async create(data: CreateSubscriptionPlanDTO): Promise<SubscriptionPlanDTO> {
    try {
      // Backend DTO uses PascalCase, so we need to map camelCase to PascalCase
      // Backend expects:
      // - BatteryModel: string (required)
      // - Name: string (required)
      // - PlanGroup: string (required)
      // - Tier: string (optional)
      // - Price: decimal (required)
      // - Description: string? (optional, can be null)
      // - DurationDays: int (required, 1-365)
      // - MaxSwapsPerPeriod: int? (optional, 1-240, can be null)
      const requestPayload: any = {
        BatteryModel: data.batteryModel,
        Name: data.name,
        PlanGroup: data.planGroup,
        Price: data.price,
        DurationDays: data.durationDays,
      };

      // Add optional fields only if they have values
      if (data.tier && data.tier.trim() !== "") {
        requestPayload.Tier = data.tier;
      }
      
      if (data.description && data.description.trim() !== "") {
        requestPayload.Description = data.description;
      }
      
      // MaxSwapsPerPeriod: only include if it's a valid number (1-240)
      // Backend validation requires it to be between 1-240 if provided
      if (data.maxSwapsPerPeriod !== null && data.maxSwapsPerPeriod !== undefined) {
        if (data.maxSwapsPerPeriod >= 1 && data.maxSwapsPerPeriod <= 240) {
          requestPayload.MaxSwapsPerPeriod = data.maxSwapsPerPeriod;
        } else {
          console.warn("[SubscriptionPlanRepository] MaxSwapsPerPeriod out of range (1-240), omitting:", data.maxSwapsPerPeriod);
        }
      }

      console.log("[SubscriptionPlanRepository] Sending create request:", JSON.stringify(requestPayload, null, 2));
      console.log("[SubscriptionPlanRepository] Request payload type check:", {
        BatteryModel: typeof requestPayload.BatteryModel,
        Name: typeof requestPayload.Name,
        PlanGroup: typeof requestPayload.PlanGroup,
        Price: typeof requestPayload.Price,
        DurationDays: typeof requestPayload.DurationDays,
      });
      
      const response = await api.post(this.basePath, requestPayload);
      
      // Backend returns CreatedAtAction (201) with the created plan in response.data
      // CreatedAtAction structure: the plan object is directly in response.data
      console.log("[SubscriptionPlanRepository] Create response status:", response.status);
      console.log("[SubscriptionPlanRepository] Create response data:", JSON.stringify(response.data, null, 2));
      
      // Map response from PascalCase to camelCase
      const mapResponse = (plan: any): SubscriptionPlanDTO => {
        return {
          planID: plan.PlanID || plan.planID,
          name: plan.Name || plan.name,
          planGroup: plan.PlanGroup || plan.planGroup,
          tier: plan.Tier || plan.tier,
          price: plan.Price || plan.price,
          description: plan.Description || plan.description,
          durationDays: plan.DurationDays || plan.durationDays,
          maxSwapsPerPeriod: plan.MaxSwapsPerPeriod !== undefined ? plan.MaxSwapsPerPeriod : (plan.maxSwapsPerPeriod !== undefined ? plan.maxSwapsPerPeriod : null),
          batteryTypeID: plan.BatteryTypeID || plan.batteryTypeID,
          batteryModel: plan.BatteryModel || plan.batteryModel,
          isActive: plan.IsActive !== undefined ? plan.IsActive : (plan.isActive !== undefined ? plan.isActive : true),
        };
      };
      
      let createdPlan: SubscriptionPlanDTO | null = null;
      
      // CreatedAtAction returns the created object directly in response.data
      if (response.data) {
        if (response.data.PlanID || response.data.planID) {
          createdPlan = mapResponse(response.data);
        } else if (response.data.data && (response.data.data.PlanID || response.data.data.planID)) {
          // Fallback: check nested structure
          createdPlan = mapResponse(response.data.data);
        } else if (Array.isArray(response.data) && response.data.length > 0) {
          // If response is an array (unlikely but handle it)
          const firstItem = response.data[0];
          if (firstItem.PlanID || firstItem.planID) {
            createdPlan = mapResponse(firstItem);
          }
        }
      }
      
      if (!createdPlan || !createdPlan.planID) {
        console.error("[SubscriptionPlanRepository] Unexpected response structure:", {
          status: response.status,
          data: response.data,
          headers: response.headers
        });
        throw new Error("Unexpected response structure from create API - planID not found");
      }
      
      console.log("[SubscriptionPlanRepository] Created plan mapped:", {
        planID: createdPlan.planID,
        name: createdPlan.name,
        batteryModel: createdPlan.batteryModel
      });
      
      // Verify the plan was actually saved and is queryable
      // When backend fixes IsActive issue, this verification will succeed
      try {
        console.log("[SubscriptionPlanRepository] Verifying plan was saved by fetching it...");
        const verifyDelay = 300; // Reduced delay - when backend is fixed, plan appears immediately
        await new Promise(resolve => setTimeout(resolve, verifyDelay));
        
        const verifyResponse = await api.get(`${this.basePath}/${createdPlan.planID}`);
        if (verifyResponse.data && (verifyResponse.data.PlanID || verifyResponse.data.planID)) {
          console.log("[SubscriptionPlanRepository] ✓ Plan verified in database");
          // Use the verified plan data which might be more complete
          createdPlan = mapResponse(verifyResponse.data.data || verifyResponse.data);
          
          // Check if IsActive is set (when backend is fixed)
          if (createdPlan.isActive === true) {
            console.log("[SubscriptionPlanRepository] ✓ Plan has IsActive = true - will appear in GetAllAsync");
          } else {
            console.warn("[SubscriptionPlanRepository] ⚠ Plan has IsActive =", createdPlan.isActive, "- may not appear in GetAllAsync until backend sets IsActive = true");
          }
        } else {
          console.warn("[SubscriptionPlanRepository] Plan created but not found when verifying - backend may need to set IsActive = true");
        }
      } catch (verifyError: any) {
        if (verifyError.response?.status === 404) {
          console.warn("[SubscriptionPlanRepository] Plan not found (404) - backend may need to set IsActive = true for it to appear in GetAllAsync");
        } else {
          console.warn("[SubscriptionPlanRepository] Could not verify plan:", verifyError.message);
        }
        // Don't throw - the plan might still be saved, just not immediately queryable
      }
      
      return createdPlan;
    } catch (error: any) {
      console.error("[SubscriptionPlanRepository] Create error:", error);
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        console.error("[SubscriptionPlanRepository] Error response:", {
          status,
          data: errorData,
          headers: error.response.headers
        });
        
        // Handle 409 Conflict - Plan name already exists
        if (status === 409) {
          // Backend returns Conflict(ex.Message) where ex.Message is the error message
          // Error message can be in different formats:
          // - Direct string: "Plan name 'xxx' already exists."
          // - Object with message property: { message: "..." }
          let errorMessage = "Plan name already exists";
          
          if (typeof errorData === "string") {
            errorMessage = errorData;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.Message) {
            errorMessage = errorData.Message;
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          }
          
          const conflictError = new Error(errorMessage);
          (conflictError as any).response = error.response;
          (conflictError as any).status = 409;
          throw conflictError;
        }
        
        // Handle 400 Bad Request - Validation errors
        if (status === 400 && errorData) {
          console.error("[SubscriptionPlanRepository] Validation error details:", errorData);
          
          if (errorData.errors) {
            // ModelState errors from ASP.NET Core
            const validationErrors: string[] = [];
            for (const key in errorData.errors) {
              const fieldErrors = errorData.errors[key];
              if (Array.isArray(fieldErrors)) {
                validationErrors.push(`${key}: ${fieldErrors.join(", ")}`);
              } else {
                validationErrors.push(`${key}: ${fieldErrors}`);
              }
            }
            const errorMessage = validationErrors.join("; ");
            console.error("[SubscriptionPlanRepository] Validation errors:", errorMessage);
            throw new Error(errorMessage);
          } else if (typeof errorData === "string") {
            throw new Error(errorData);
          } else if (errorData.message || errorData.Message) {
            throw new Error(errorData.message || errorData.Message);
          } else if (errorData.title) {
            // ASP.NET Core ProblemDetails format
            throw new Error(errorData.title + (errorData.detail ? `: ${errorData.detail}` : ""));
          } else {
            throw new Error("Validation failed. Please check all required fields.");
          }
        }
        
        // Handle 500 Internal Server Error
        if (status === 500) {
          const errorMessage = typeof errorData === "string" 
            ? errorData 
            : errorData?.message || errorData?.Message || "Internal server error occurred";
          console.error("[SubscriptionPlanRepository] Server error:", errorMessage);
          throw new Error(errorMessage);
        }
      }
      
      throw error;
    }
  }

  async update(id: string, data: UpdateSubscriptionPlanDTO): Promise<SubscriptionPlanDTO> {
    try {
      // Backend UpdateDtos uses PascalCase
      const requestPayload: any = {};
      if (data.name !== undefined) requestPayload.Name = data.name;
      if (data.price !== undefined) requestPayload.Price = data.price;
      if (data.planGroup !== undefined) requestPayload.PlanGroup = data.planGroup;
      if (data.tier !== undefined) requestPayload.Tier = data.tier;
      if (data.description !== undefined) requestPayload.Description = data.description;
      if (data.durationDays !== undefined) requestPayload.DurationDays = data.durationDays;
      if (data.maxSwapsPerPeriod !== undefined) requestPayload.MaxSwapsPerPeriod = data.maxSwapsPerPeriod;

      const response = await api.patch(`${this.basePath}/${id}`, requestPayload);
      
      // Map response from PascalCase to camelCase
      const plan = response.data?.data || response.data;
      if (plan) {
        return {
          planID: plan.PlanID || plan.planID,
          name: plan.Name || plan.name,
          planGroup: plan.PlanGroup || plan.planGroup,
          tier: plan.Tier || plan.tier,
          price: plan.Price || plan.price,
          description: plan.Description || plan.description,
          durationDays: plan.DurationDays || plan.durationDays,
          maxSwapsPerPeriod: plan.MaxSwapsPerPeriod !== undefined ? plan.MaxSwapsPerPeriod : (plan.maxSwapsPerPeriod !== undefined ? plan.maxSwapsPerPeriod : null),
          batteryTypeID: plan.BatteryTypeID || plan.batteryTypeID,
          batteryModel: plan.BatteryModel || plan.batteryModel,
          isActive: plan.IsActive !== undefined ? plan.IsActive : (plan.isActive !== undefined ? plan.isActive : true),
        };
      }
      throw new Error("Invalid response from update API");
    } catch (error: any) {
      console.error("[SubscriptionPlanRepository] Update error:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }
}

// Export singleton instance
export const subscriptionPlanRepository = new SubscriptionPlanRepository();

