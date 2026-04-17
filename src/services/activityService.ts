import { apiService } from './apiService';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export const activityService = {
  async logActivity(
    actionType: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await apiService.post('/activity/log', {
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId || null,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error('Exception logging activity:', error);
    }
  },

  async getActivityLogs(
    filters?: {
      userId?: string;
      actionType?: string;
      resourceType?: string;
      limit?: number;
    }
  ): Promise<ActivityLog[]> {
    try {
      const params = new URLSearchParams(filters as any).toString();
      return await apiService.get(`/activity?${params}`);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  },
};
