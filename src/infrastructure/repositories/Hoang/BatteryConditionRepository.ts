/**
 * BatteryCondition Repository Implementation
 * Implements IBatteryConditionRepository using API calls
 */

import { IBatteryConditionRepository } from '@/domain/repositories/Hoang/IBatteryConditionRepository';
import {
  BatteryCondition,
  CreateBatteryConditionData,
  UpdateBatteryConditionData,
} from '@/domain/dto/Hoang/BatteryCondition';
import api from '@/lib/api';

export class BatteryConditionRepository implements IBatteryConditionRepository {
  private readonly basePath = '/battery-condition-logs';

  async getAll(): Promise<BatteryCondition[]> {
    const response = await api.get(this.basePath);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  }

  async getById(id: string): Promise<BatteryCondition> {
    const response = await api.get(`${this.basePath}/${id}`);
    return response.data.data || response.data;
  }

  async getByStation(stationName: string): Promise<BatteryCondition[]> {
    const response = await api.get(`${this.basePath}/${stationName}/battery-condition-logs`);
    const data = response.data.data || response.data;
    const logs = Array.isArray(data) ? data : [];
    // Map backend DTO to frontend entity format
    return logs.map((log: any) => ({
      LogID: log.LogID,
      batteryConditionID: log.LogID,
      batteryID: log.BatteryID,
      stationName: log.StationName,
      checkDate: log.ReportDate ? new Date(log.ReportDate).toISOString() : undefined,
      ReportDate: log.ReportDate,
      condition: log.Condition,
      Condition: log.Condition,
      notes: log.Description,
      Description: log.Description,
      checkedBy: log.UserName,
      UserName: log.UserName,
    }));
  }

  async getByBattery(batteryID: string): Promise<BatteryCondition[]> {
    const response = await api.get(`${this.basePath}/battery/${batteryID}`);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  }

  async create(data: CreateBatteryConditionData): Promise<BatteryCondition> {
    try {
      // Map frontend data to backend DTO format
      const backendData = {
        BatteryID: data.batteryID,
        Condition: data.Condition || data.condition,
        Description: data.Description || data.notes || '',
      };
      
      console.log('[BatteryConditionRepository] Creating condition log:', {
        batteryID: data.batteryID,
        condition: backendData.Condition,
        description: backendData.Description,
        payload: JSON.stringify(backendData, null, 2),
      });
      
      const response = await api.post(this.basePath, backendData);
      console.log('[BatteryConditionRepository] Response status:', response.status);
      console.log('[BatteryConditionRepository] Response data:', JSON.stringify(response.data, null, 2));
      const result = response.data.data || response.data;
      
      console.log('[BatteryConditionRepository] ✅ Condition log created:', result);
      
      // Map backend response to frontend entity format
      return {
        LogID: result.LogID,
        batteryConditionID: result.LogID,
        batteryID: result.BatteryID,
        stationName: result.StationName,
        checkDate: result.ReportDate ? new Date(result.ReportDate).toISOString() : undefined,
        ReportDate: result.ReportDate,
        condition: result.Condition,
        Condition: result.Condition,
        notes: result.Description,
        Description: result.Description,
        checkedBy: result.UserName,
        UserName: result.UserName,
      };
    } catch (error: any) {
      // Log full error details for debugging
      console.error('[BatteryConditionRepository] ❌ Failed to create condition log:', {
        error: error,
        errorMessage: error?.message,
        errorName: error?.name,
        responseStatus: error?.response?.status,
        responseStatusText: error?.response?.statusText,
        responseData: error?.response?.data,
        responseHeaders: error?.response?.headers,
        requestUrl: error?.config?.url,
        requestMethod: error?.config?.method,
        requestData: error?.config?.data,
        batteryID: data.batteryID,
        condition: data.Condition || data.condition,
      });
      
      // Try to get response text if available
      let responseText = '';
      try {
        if (error?.response?.data) {
          if (typeof error.response.data === 'string') {
            responseText = error.response.data;
          } else {
            responseText = JSON.stringify(error.response.data, null, 2);
          }
        }
      } catch (e) {
        // Ignore
      }
      
      console.error('[BatteryConditionRepository] Full error response:', responseText);
      
      // Extract error message from various formats
      let errorMessage = 'Failed to create battery condition log';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.Message) {
          errorMessage = errorData.Message;
        } else if (errorData.title) {
          errorMessage = errorData.title;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Provide more specific error messages based on common backend errors
      if (error?.response?.status === 401) {
        errorMessage = 'Unauthorized. Please login again.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Forbidden. You do not have permission to create condition logs.';
      } else if (error?.response?.status === 400) {
        errorMessage = errorMessage || 'Invalid request. Please check the battery ID and condition.';
      } else if (error?.response?.status === 500) {
        // Check for specific backend error messages
        const lowerMessage = errorMessage.toLowerCase();
        const lowerResponseText = responseText.toLowerCase();
        
        if (lowerMessage.includes('battery not found') || lowerResponseText.includes('battery not found')) {
          errorMessage = 'Battery not found. Please check the battery ID.';
        } else if (lowerMessage.includes('station not found') || lowerResponseText.includes('station not found')) {
          // This is the main issue: Backend tries to find station from battery.LastStationID but it doesn't exist
          errorMessage = '⚠️ Station not found. The battery\'s LastStationID does not exist in the database. This is a backend issue - the battery may need to be reassigned to a valid station. Please contact administrator.';
        } else if (lowerMessage.includes('user not found') || lowerResponseText.includes('user not found')) {
          errorMessage = 'User not found. Please login again.';
        } else if (lowerMessage.includes('stationid') || lowerMessage.includes('station id') || lowerResponseText.includes('stationid')) {
          errorMessage = 'Station ID missing in token. Please contact administrator.';
        } else if (lowerMessage.includes('nameidentifier') || lowerMessage.includes('user id') || lowerResponseText.includes('nameidentifier')) {
          errorMessage = 'User ID missing in token. Please login again.';
        } else {
          // Extract the actual exception message from stack trace if available
          const exceptionMatch = responseText.match(/System\.Exception:\s*(.+?)\n/);
          if (exceptionMatch && exceptionMatch[1]) {
            errorMessage = `Server error: ${exceptionMatch[1]}`;
          } else {
            errorMessage = `Server error (500): ${errorMessage || 'The battery condition log could not be created. Please try again or contact support.'}`;
          }
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  async update(id: string, data: UpdateBatteryConditionData): Promise<BatteryCondition> {
    const response = await api.patch(`${this.basePath}/${id}`, data);
    return response.data.data || response.data;
  }
}

// Export singleton instance
export const batteryConditionRepository = new BatteryConditionRepository();

