import { apiService } from './apiService';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  resource_type: string | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export const notificationService = {
  async notify(
    userId: string,
    type: string,
    title: string,
    message: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await apiService.post('/notifications', {
        user_id: userId,
        type,
        title,
        message,
        resource_type: resourceType || null,
        resource_id: resourceId || null,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error('Exception creating notification:', error);
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const data = await apiService.get('/notifications/unread/count');
      return data.count || 0;
    } catch (error) {
      console.error('Exception fetching unread count:', error);
      return 0;
    }
  },

  async getNotifications(): Promise<Notification[]> {
    try {
      return await apiService.get('/notifications');
    } catch (error) {
      console.error('Exception fetching notifications:', error);
      return [];
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiService.post(`/notifications/${notificationId}/read`, {});
    } catch (error) {
      console.error('Exception marking notification as read:', error);
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await apiService.post('/notifications/read-all', {});
    } catch (error) {
      console.error('Exception marking all notifications as read:', error);
    }
  },

  async notifyResourceCollaborators(
    resourceType: 'file' | 'folder',
    resourceId: string,
    creatorId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // For now, simplify and just log the intent. 
    // Backend will handle finding collaborators in the next update.
    console.log('Notifying collaborators for:', resourceType, resourceId);
  }
};
