import { supabase } from '@/integrations/supabase/client';

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
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase.from('activity_logs') as any).insert({
        user_id: user?.id || null,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId || null,
        metadata: metadata || {},
        ip_address: null,
      });

      if (error) {
        console.error('Error logging activity:', error);
      }
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
    let query = (supabase
      .from('activity_logs') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }

    return (data as ActivityLog[]) || [];
  },
};


