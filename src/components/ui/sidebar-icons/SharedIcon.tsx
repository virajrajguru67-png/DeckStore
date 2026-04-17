import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export function SharedIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <circle cx="18" cy="5" r="3" stroke="#8B5CF6" strokeWidth="2" />
      <circle cx="6" cy="12" r="3" stroke="#8B5CF6" strokeWidth="2" />
      <circle cx="18" cy="19" r="3" stroke="#8B5CF6" strokeWidth="2" />
      <path d="M8.59 13.51L15.42 17.49" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.41 6.51L8.59 10.49" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="5" r="1" fill="#8B5CF6" />
      <circle cx="18" cy="19" r="1" fill="#8B5CF6" />
      <circle cx="6" cy="12" r="1" fill="#8B5CF6" />
    </svg>
  );
}
