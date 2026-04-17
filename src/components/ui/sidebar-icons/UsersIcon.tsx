import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export function UsersIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#3B82F6" fillOpacity="0.1" />
      <circle cx="9" cy="7" r="4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#3B82F6" fillOpacity="0.1" />
      <path d="M23 21V19C22.9993 17.3003 22.4631 15.6517 21.46 14.28" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13C16.9405 3.51868 17.7378 4.20456 18.2715 5.08479C18.8051 5.96502 19.0505 6.99616 18.9701 8.0223C18.8897 9.04845 18.4877 10.0195 17.8252 10.7891C17.1627 11.5588 16.271 12.0886 15.28 12.3" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
