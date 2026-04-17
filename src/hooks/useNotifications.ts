import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService, Notification } from '@/services/notificationService';
import { useEffect } from 'react';

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}


