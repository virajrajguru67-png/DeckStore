import { apiService } from './apiService';
import { toast } from 'sonner';
import type { Profile } from '@/types/database';
import { activityService } from './activityService';

export interface BrandingSettings {
    custom_branding_logo_url: string | null;
    custom_branding_color: string;
    enable_watermarking: boolean;
}

export const profileService = {
    async getProfile(id: string): Promise<Profile | null> {
        try {
            return await apiService.get(`/profiles/${id}`);
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    },

    async updateBranding(settings: Partial<BrandingSettings>) {
        try {
            await apiService.post('/profiles/branding', settings);
            toast.success('Branding settings updated');
            await activityService.logActivity('UPDATE_BRANDING', 'SYSTEM', null, settings);
            return true;
        } catch (error) {
            console.error('Error updating branding:', error);
            toast.error('Failed to update branding settings');
            return false;
        }
    },

    async uploadLogo(file: File) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const data = await apiService.upload('/profiles/upload-logo', formData);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Failed to upload logo');
            return null;
        }
    },

    async updateProfile(data: Partial<{ 
        full_name: string, 
        avatar_url: string,
        notification_email: boolean,
        notification_push: boolean,
        notification_weekly: boolean,
        two_factor_enabled: boolean
    }>) {
        try {
            await apiService.post('/profiles/update', data);
            toast.success('Settings updated successfully');
            await activityService.logActivity('UPDATE_PROFILE', 'USER', null, data);
            return true;
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to update settings');
            return false;
        }
    },

    async changePassword(currentPassword: string, newPassword: string) {
        try {
            await apiService.post('/auth/change-password', { currentPassword, newPassword });
            toast.success('Password updated successfully');
            await activityService.logActivity('CHANGE_PASSWORD', 'USER');
            return true;
        } catch (error) {
            console.error('Error changing password:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update password');
            return false;
        }
    }
};


