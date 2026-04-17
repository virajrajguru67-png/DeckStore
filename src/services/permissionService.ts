import { apiService } from './apiService';

export const permissionService = {
  async getUserPermissions(resourceType: 'file' | 'folder', resourceId: string) {
    try {
      return await apiService.get(`/permissions?type=${resourceType}&id=${resourceId}`);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  },

  async checkPermission(resourceType: 'file' | 'folder', resourceId: string, permissionType: string): Promise<boolean> {
    try {
      const data = await apiService.get(`/permissions/check?type=${resourceType}&id=${resourceId}&permission=${permissionType}`);
      return data.hasPermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }
};
