import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export function HiddenIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#64748B" strokeWidth="2" fill="#64748B" fillOpacity="0.1" />
      <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill="#64748B" />
    </svg>
  );
}
