-- Migration to enhance analytics for shared documents
-- This adds tracking for duration and engagement metadata

ALTER TABLE public.share_access_logs 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS page_views JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS engagement_metadata JSONB DEFAULT '{}'::jsonb;

-- Create a table for document analytics summaries (optional, but good for performance)
CREATE TABLE IF NOT EXISTS public.document_analytics_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL,
    resource_type TEXT NOT NULL,
    total_views INTEGER DEFAULT 0,
    total_duration_seconds BIGINT DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    data_points JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_share_access_logs_engagement ON public.share_access_logs USING gin (engagement_metadata);
CREATE INDEX IF NOT EXISTS idx_doc_analytics_summary_resource ON public.document_analytics_summary (resource_id);

-- Add watermarking configuration to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS custom_branding_logo_url TEXT,
ADD COLUMN IF NOT EXISTS custom_branding_color TEXT DEFAULT '#0f172a',
ADD COLUMN IF NOT EXISTS enable_watermarking BOOLEAN DEFAULT false;

-- Add AI summary column to documents
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS ai_summary TEXT;
