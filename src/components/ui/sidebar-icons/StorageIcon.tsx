import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export function StorageIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" stroke="#06B6D4" strokeWidth="2" fill="#06B6D4" fillOpacity="0.1" />
      <path d="M3 5V19C3 20.6569 7.02944 22 12 22C16.9706 22 21 20.6569 21 19V5" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12C3 13.6569 7.02944 15 12 15C16.9706 15 21 13.6569 21 12" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="5" r="1" fill="#06B6D4" />
      <circle cx="12" cy="12" r="1" fill="#06B6D4" />
      <circle cx="12" cy="19" r="1" fill="#06B6D4" />
    </svg>
  );
}
