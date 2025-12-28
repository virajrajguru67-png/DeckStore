import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandingSettings {
    custom_branding_logo_url: string | null;
    custom_branding_color: string;
    enable_watermarking: boolean;
}

export const profileService = {
    async getProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return data;
    },

    async updateBranding(settings: Partial<BrandingSettings>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await (supabase.from('profiles') as any)
            .update(settings as any)
            .eq('id', user.id);

        if (error) {
            console.error('Error updating branding:', error);
            toast.error('Failed to update branding settings');
            return false;
        }

        toast.success('Branding settings updated');
        return true;
    },

    async uploadLogo(file: File) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/branding/logo_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading logo:', uploadError);
            toast.error('Failed to upload logo');
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('files')
            .getPublicUrl(filePath);

        return publicUrl;
    }
};
