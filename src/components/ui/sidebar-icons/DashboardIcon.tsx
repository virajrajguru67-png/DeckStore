import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export function DashboardIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <rect x="3" y="3" width="8" height="8" rx="2" fill="#3B82F6" fillOpacity="0.8" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="#10B981" fillOpacity="0.8" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="#F59E0B" fillOpacity="0.8" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="#8B5CF6" fillOpacity="0.8" />
    </svg>
  );
}
