import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export function AnalyticsIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <path d="M18 20V10" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 20V4" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 20V14" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="10" r="1.5" fill="#F43F5E" />
      <circle cx="12" cy="4" r="1.5" fill="#F43F5E" />
      <circle cx="6" cy="14" r="1.5" fill="#F43F5E" />
    </svg>
  );
}
