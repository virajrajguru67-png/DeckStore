import React, { ReactNode } from 'react';
import {
  Image,
  Video,
  Music,
  FileText,
  Table,
  Presentation,
  FileCode,
  Archive,
  File as FileIconType,
} from 'lucide-react';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function getFileIconComponent(
  mimeType: string | null | undefined,
  fileName?: string
): ReactNode {
  const extension = fileName ? getFileExtension(fileName) : '';
  
  // Check by MIME type first
  if (mimeType?.startsWith('image/')) {
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType?.startsWith('video/')) {
    return <Video className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType?.startsWith('audio/')) {
    return <Music className="h-5 w-5 text-green-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  
  // Office documents
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    extension === 'xlsx' || extension === 'xls'
  ) {
    return <Table className="h-5 w-5 text-green-600" />;
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    extension === 'pptx' || extension === 'ppt'
  ) {
    return <Presentation className="h-5 w-5 text-orange-500" />;
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    extension === 'docx' || extension === 'doc'
  ) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  
  // Text and code files
  if (
    mimeType?.startsWith('text/') ||
    mimeType === 'application/json' ||
    extension === 'txt' || extension === 'md' || extension === 'json' || extension === 'xml'
  ) {
    return <FileCode className="h-5 w-5 text-yellow-600" />;
  }
  
  // Archives
  if (
    mimeType?.includes('zip') ||
    mimeType?.includes('rar') ||
    mimeType?.includes('tar') ||
    extension === 'zip' || extension === 'rar' || extension === 'tar' || extension === 'gz'
  ) {
    return <Archive className="h-5 w-5 text-amber-600" />;
  }
  
  // Default file icon
  return <FileIconType className="h-5 w-5 text-muted-foreground" />;
}

export function getFileIconComponentLarge(
  mimeType: string | null | undefined,
  fileName?: string
): ReactNode {
  const extension = fileName ? getFileExtension(fileName) : '';
  
  // Check by MIME type first
  if (mimeType?.startsWith('image/')) {
    return <Image className="h-16 w-16 text-blue-500" />;
  }
  if (mimeType?.startsWith('video/')) {
    return <Video className="h-16 w-16 text-purple-500" />;
  }
  if (mimeType?.startsWith('audio/')) {
    return <Music className="h-16 w-16 text-green-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-16 w-16 text-red-500" />;
  }
  
  // Office documents
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    extension === 'xlsx' || extension === 'xls'
  ) {
    return <Table className="h-16 w-16 text-green-600" />;
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    extension === 'pptx' || extension === 'ppt'
  ) {
    return <Presentation className="h-16 w-16 text-orange-500" />;
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    extension === 'docx' || extension === 'doc'
  ) {
    return <FileText className="h-16 w-16 text-blue-600" />;
  }
  
  // Text and code files
  if (
    mimeType?.startsWith('text/') ||
    mimeType === 'application/json' ||
    extension === 'txt' || extension === 'md' || extension === 'json' || extension === 'xml'
  ) {
    return <FileCode className="h-16 w-16 text-yellow-600" />;
  }
  
  // Archives
  if (
    mimeType?.includes('zip') ||
    mimeType?.includes('rar') ||
    mimeType?.includes('tar') ||
    extension === 'zip' || extension === 'rar' || extension === 'tar' || extension === 'gz'
  ) {
    return <Archive className="h-16 w-16 text-amber-600" />;
  }
  
  // Default file icon
  return <FileIconType className="h-16 w-16 text-muted-foreground" />;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) return 'text';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
  return 'file';
}

export function canPreview(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('text/') ||
    mimeType.includes('json') ||
    mimeType.includes('xml') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint'
  );
}


