import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export function AuditLogsIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <path d="M9 11H15" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 15H13" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 19H13" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round" fill="#6366F1" fillOpacity="0.1" />
      <path d="M14 2V8H20" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3" stroke="#6366F1" strokeWidth="2" fill="white" />
      <path d="M18.5 18.5L21 21" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
