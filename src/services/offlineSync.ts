import { indexedDbService } from './indexedDb';
import { fileService } from './fileService';
import { uploadService } from './uploadService';
import { File } from '@/types/file';

export class OfflineSyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline() {
    this.isOnline = true;
    this.syncPendingChanges();
  }

  private handleOffline() {
    this.isOnline = false;
  }

  async syncPendingChanges(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    try {
      const queue = await indexedDbService.getSyncQueue();

      for (const item of queue) {
        try {
          switch (item.action) {
            case 'upload':
              if (item.resourceType === 'file' && item.data) {
                // Re-upload file
                await uploadService.uploadFile(item.data.file, {
                  folderId: item.data.folderId,
                });
              }
              break;
            case 'update':
              // Handle updates
              break;
            case 'delete':
              // Handle deletes
              break;
          }
          await indexedDbService.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error('Error syncing item:', error);
          // Keep in queue for retry
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  async cacheFilesAndFolders(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const files = await fileService.getFiles(null);
      const folders = await fileService.getFolders(null);

      for (const file of files) {
        await indexedDbService.cacheFile(file);
      }

      for (const folder of folders) {
        await indexedDbService.cacheFolder(folder);
      }
    } catch (error) {
      console.error('Error caching files:', error);
    }
  }

  async getOfflineFiles(folderId: string | null = null): Promise<File[]> {
    if (this.isOnline) {
      // Cache while online
      await this.cacheFilesAndFolders();
      return await fileService.getFiles(folderId);
    }

    // Return from IndexedDB when offline
    return await indexedDbService.getFiles(folderId);
  }

  async queueUpload(file: globalThis.File, folderId: string | null): Promise<void> {
    if (this.isOnline) {
      // Upload immediately
      await uploadService.uploadFile(file, { folderId });
    } else {
      // Queue for later
      await indexedDbService.addToSyncQueue({
        action: 'upload',
        resourceType: 'file',
        resourceId: file.name,
        data: { file, folderId },
      });
    }
  }
}

export const offlineSyncService = new OfflineSyncService();


