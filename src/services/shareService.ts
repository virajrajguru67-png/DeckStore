import { apiService } from './apiService';
import { toast } from 'sonner';

export type ShareType = 'internal' | 'external_link';
export type AccessLevel = 'view' | 'download' | 'edit';

export interface Share {
  id: string;
  resource_type: 'file' | 'folder';
  resource_id: string;
  share_type: ShareType;
  shared_by: string;
  shared_with: string | null;
  access_level: AccessLevel;
  password_hash: string | null;
  expires_at: string | null;
  link_token: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export const shareService = {
  async createInternalShare(
    resourceType: 'file' | 'folder',
    resourceId: string,
    userId: string,
    accessLevel: AccessLevel
  ): Promise<Share | null> {
    try {
      return await apiService.post('/shares/internal', {
        resourceType,
        resourceId,
        userId,
        accessLevel
      });
    } catch (error) {
      console.error('Error creating internal share:', error);
      toast.error('Failed to create share');
      return null;
    }
  },

  async createExternalShare(
    resourceType: 'file' | 'folder',
    resourceId: string,
    accessLevel: AccessLevel,
    options?: {
      password?: string;
      expiresAt?: Date;
    }
  ): Promise<Share | null> {
    try {
      return await apiService.post('/shares/external', {
        resourceType,
        resourceId,
        accessLevel,
        ...options
      });
    } catch (error) {
      console.error('Error creating external share:', error);
      toast.error('Failed to create share link');
      return null;
    }
  },

  async getShares(resourceType: 'file' | 'folder', resourceId: string): Promise<Share[]> {
    try {
      return await apiService.get(`/shares?resourceType=${resourceType}&resourceId=${resourceId}`);
    } catch (error) {
      console.error('Error fetching shares:', error);
      return [];
    }
  },

  async getUserShares(): Promise<Share[]> {
    try {
      return await apiService.get('/shares/user');
    } catch (error) {
      console.error('Error fetching user shares:', error);
      return [];
    }
  },

  async getSharedWithMe(): Promise<Share[]> {
    try {
      return await apiService.get('/shares/received');
    } catch (error) {
      console.error('Error fetching shared items:', error);
      return [];
    }
  },

  async revokeShare(shareId: string): Promise<boolean> {
    try {
      await apiService.post(`/shares/${shareId}/revoke`, {});
      toast.success('Share revoked');
      return true;
    } catch (error) {
      console.error('Error revoking share:', error);
      toast.error('Failed to revoke share');
      return false;
    }
  },

  async accessShare(token: string, password?: string): Promise<Share | null> {
    try {
      const endpoint = password ? `/shares/access/${token}?password=${password}` : `/shares/access/${token}`;
      return await apiService.get(endpoint);
    } catch (error) {
      console.error('Error accessing share:', error);
      return null;
    }
  }
};
