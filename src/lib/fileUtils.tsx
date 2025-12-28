import React, { ReactNode } from 'react';
import {
  Video,
  Music,
  FileText,
  Table,
  Presentation,
  FileCode,
  Archive,
  File as FileIconType,
  Database,
} from 'lucide-react';
import { ImageFileIcon } from '@/components/ui/ImageFileIcon';
import { ExcelFileIcon } from '@/components/ui/ExcelFileIcon';
import { PowerPointFileIcon } from '@/components/ui/PowerPointFileIcon';
import { TextFileIcon } from '@/components/ui/TextFileIcon';
import { SqlFileIcon } from '@/components/ui/SqlFileIcon';
import { PdfFileIcon } from '@/components/ui/PdfFileIcon';

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
  fileName?: string,
  size: 'sm' | 'md' | 'lg' = 'md'
): ReactNode {
  const extension = fileName ? getFileExtension(fileName) : '';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  // Check by MIME type first
  if (mimeType === 'application/vnd.deckstore.document') {
    return <FileText className={`${iconSize} text-primary`} />;
  }
  if (mimeType?.startsWith('image/')) {
    const iconSizeNum = size === 'sm' ? 16 : size === 'lg' ? 64 : 20;
    return <ImageFileIcon size={iconSizeNum} />;
  }
  if (mimeType?.startsWith('video/')) {
    return <Video className={`${iconSize} text-purple-500`} />;
  }
  if (mimeType?.startsWith('audio/')) {
    return <Music className={`${iconSize} text-green-500`} />;
  }
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    const iconSizeNum = size === 'sm' ? 16 : size === 'lg' ? 64 : 20;
    return <PdfFileIcon size={iconSizeNum} />;
  }

  // Spreadsheets (Excel)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.oasis.opendocument.spreadsheet' ||
    extension === 'xlsx' || extension === 'xls' || extension === 'csv'
  ) {
    const iconSizeNum = size === 'sm' ? 16 : size === 'lg' ? 64 : 20;
    return <ExcelFileIcon size={iconSizeNum} />;
  }

  // OpenDocument Spreadsheet (ODS)
  if (extension === 'ods') {
    return <Table className={`${iconSize} text-green-600`} />;
  }

  // Presentations (PowerPoint)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    extension === 'pptx' || extension === 'ppt'
  ) {
    const iconSizeNum = size === 'sm' ? 16 : size === 'lg' ? 64 : 20;
    return <PowerPointFileIcon size={iconSizeNum} />;
  }

  // OpenDocument Presentation (ODP)
  if (mimeType === 'application/vnd.oasis.opendocument.presentation' || extension === 'odp') {
    return <Presentation className={`${iconSize} text-orange-500`} />;
  }

  // Word documents
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.oasis.opendocument.text' ||
    extension === 'docx' || extension === 'doc' || extension === 'odt'
  ) {
    return <FileText className={`${iconSize} text-blue-600`} />;
  }

  // SQL files
  if (extension === 'sql') {
    const iconSizeNum = size === 'sm' ? 16 : size === 'lg' ? 64 : 20;
    return <SqlFileIcon size={iconSizeNum} />;
  }

  // JSON files
  if (mimeType === 'application/json' || extension === 'json') {
    return <FileCode className={`${iconSize} text-yellow-500`} />;
  }

  // Text files
  if (
    extension === 'txt' || extension === 'log' || extension === 'readme'
  ) {
    const iconSizeNum = size === 'sm' ? 16 : size === 'lg' ? 64 : 20;
    return <TextFileIcon size={iconSizeNum} />;
  }

  // Markdown and other text-based files
  if (
    mimeType?.startsWith('text/') ||
    extension === 'md' || extension === 'markdown'
  ) {
    return <FileText className={`${iconSize} text-gray-400`} />;
  }

  // Code files
  if (
    extension === 'js' || extension === 'jsx' || extension === 'ts' || extension === 'tsx' ||
    extension === 'py' || extension === 'java' || extension === 'cpp' || extension === 'c' ||
    extension === 'cs' || extension === 'php' || extension === 'rb' || extension === 'go' ||
    extension === 'rs' || extension === 'swift' || extension === 'kt' || extension === 'scala' ||
    extension === 'html' || extension === 'css' || extension === 'scss' || extension === 'sass' ||
    extension === 'xml' || extension === 'yaml' || extension === 'yml' || extension === 'sh' ||
    extension === 'bash' || extension === 'zsh' || extension === 'ps1' || extension === 'vue' ||
    extension === 'svelte' || extension === 'dart' || extension === 'lua' || extension === 'pl'
  ) {
    return <FileCode className={`${iconSize} text-yellow-600`} />;
  }

  // Archives
  if (
    mimeType?.includes('zip') ||
    mimeType?.includes('rar') ||
    mimeType?.includes('tar') ||
    mimeType?.includes('gzip') ||
    extension === 'zip' || extension === 'rar' || extension === 'tar' || extension === 'gz' ||
    extension === '7z' || extension === 'bz2' || extension === 'xz'
  ) {
    return <Archive className={`${iconSize} text-amber-600`} />;
  }

  // Default file icon
  return <FileIconType className={`${iconSize} text-muted-foreground`} />;
}

export function getFileIconComponentLarge(
  mimeType: string | null | undefined,
  fileName?: string
): ReactNode {
  const extension = fileName ? getFileExtension(fileName) : '';

  // Check by MIME type first
  if (mimeType?.startsWith('image/')) {
    return <ImageFileIcon size={64} />;
  }
  if (mimeType?.startsWith('video/')) {
    return <Video className="h-16 w-16 text-purple-500" />;
  }
  if (mimeType?.startsWith('audio/')) {
    return <Music className="h-16 w-16 text-green-500" />;
  }
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return <PdfFileIcon size={64} />;
  }

  // Spreadsheets (Excel)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.oasis.opendocument.spreadsheet' ||
    extension === 'xlsx' || extension === 'xls' || extension === 'csv'
  ) {
    return <ExcelFileIcon size={64} />;
  }

  // OpenDocument Spreadsheet (ODS)
  if (extension === 'ods') {
    return <Table className="h-16 w-16 text-green-600" />;
  }

  // Presentations (PowerPoint)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    extension === 'pptx' || extension === 'ppt'
  ) {
    return <PowerPointFileIcon size={64} />;
  }

  // OpenDocument Presentation (ODP)
  if (mimeType === 'application/vnd.oasis.opendocument.presentation' || extension === 'odp') {
    return <Presentation className="h-16 w-16 text-orange-500" />;
  }

  // Word documents
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.oasis.opendocument.text' ||
    extension === 'docx' || extension === 'doc' || extension === 'odt'
  ) {
    return <FileText className="h-16 w-16 text-blue-600" />;
  }

  // SQL files
  if (extension === 'sql') {
    return <SqlFileIcon size={64} />;
  }

  // JSON files
  if (mimeType === 'application/json' || extension === 'json') {
    return <FileCode className="h-16 w-16 text-yellow-500" />;
  }

  // Text files
  if (
    extension === 'txt' || extension === 'log' || extension === 'readme'
  ) {
    return <TextFileIcon size={64} />;
  }

  // Markdown and other text-based files
  if (
    mimeType?.startsWith('text/') ||
    extension === 'md' || extension === 'markdown'
  ) {
    return <FileText className="h-16 w-16 text-gray-400" />;
  }

  // Code files
  if (
    extension === 'js' || extension === 'jsx' || extension === 'ts' || extension === 'tsx' ||
    extension === 'py' || extension === 'java' || extension === 'cpp' || extension === 'c' ||
    extension === 'cs' || extension === 'php' || extension === 'rb' || extension === 'go' ||
    extension === 'rs' || extension === 'swift' || extension === 'kt' || extension === 'scala' ||
    extension === 'html' || extension === 'css' || extension === 'scss' || extension === 'sass' ||
    extension === 'xml' || extension === 'yaml' || extension === 'yml' || extension === 'sh' ||
    extension === 'bash' || extension === 'zsh' || extension === 'ps1' || extension === 'vue' ||
    extension === 'svelte' || extension === 'dart' || extension === 'lua' || extension === 'pl'
  ) {
    return <FileCode className="h-16 w-16 text-yellow-600" />;
  }

  // Archives
  if (
    mimeType?.includes('zip') ||
    mimeType?.includes('rar') ||
    mimeType?.includes('tar') ||
    mimeType?.includes('gzip') ||
    extension === 'zip' || extension === 'rar' || extension === 'tar' || extension === 'gz' ||
    extension === '7z' || extension === 'bz2' || extension === 'xz'
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


