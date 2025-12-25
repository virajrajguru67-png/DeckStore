import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { File, Folder } from '@/types/file';

interface DeckStoreDB extends DBSchema {
  files: {
    key: string;
    value: File;
    indexes: { 'by-folder': string | null; 'by-name': string };
  };
  folders: {
    key: string;
    value: Folder;
    indexes: { 'by-parent': string | null };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: 'upload' | 'update' | 'delete';
      resourceType: 'file' | 'folder';
      resourceId: string;
      data?: any;
      timestamp: number;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      updatedAt: number;
    };
  };
}

let dbInstance: IDBPDatabase<DeckStoreDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<DeckStoreDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DeckStoreDB>('deck-store', 1, {
    upgrade(db) {
      // Files store
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('by-folder', 'folder_id');
        fileStore.createIndex('by-name', 'name');
      }

      // Folders store
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('by-parent', 'parent_folder_id');
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

export const indexedDbService = {
  async cacheFile(file: File): Promise<void> {
    const db = await getDB();
    await db.put('files', file);
  },

  async cacheFolder(folder: Folder): Promise<void> {
    const db = await getDB();
    await db.put('folders', folder);
  },

  async getFiles(folderId: string | null = null): Promise<File[]> {
    const db = await getDB();
    if (folderId) {
      return await db.getAllFromIndex('files', 'by-folder', folderId);
    }
    return await db.getAllFromIndex('files', 'by-folder', null);
  },

  async getFolders(parentId: string | null = null): Promise<Folder[]> {
    const db = await getDB();
    if (parentId) {
      return await db.getAllFromIndex('folders', 'by-parent', parentId);
    }
    return await db.getAllFromIndex('folders', 'by-parent', null);
  },

  async addToSyncQueue(action: {
    action: 'upload' | 'update' | 'delete';
    resourceType: 'file' | 'folder';
    resourceId: string;
    data?: any;
  }): Promise<void> {
    const db = await getDB();
    await db.put('syncQueue', {
      id: `${Date.now()}_${Math.random()}`,
      ...action,
      timestamp: Date.now(),
    });
  },

  async getSyncQueue(): Promise<any[]> {
    const db = await getDB();
    return await db.getAll('syncQueue');
  },

  async removeFromSyncQueue(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('syncQueue', id);
  },

  async clearCache(): Promise<void> {
    const db = await getDB();
    await db.clear('files');
    await db.clear('folders');
  },
};


