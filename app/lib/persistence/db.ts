import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { ChatHistoryItem } from './useChatHistory';

const logger = createScopedLogger('ChatHistory');

// this is used at the top level and never rejects
export async function openDatabase(): Promise<IDBDatabase | undefined> {
  // Check if IndexedDB is available in this browser/environment
  if (!window.indexedDB) {
    logger.error('IndexedDB is not supported in this browser');
    return undefined;
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('boltHistory', 2); // Increased version to trigger upgrade

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          const oldVersion = event.oldVersion;
          
          logger.info(`Database upgrade from version ${oldVersion} to version ${db.version}`);

          // Handle initial creation (version 0 to 1)
          if (oldVersion < 1) {
            if (!db.objectStoreNames.contains('chats')) {
              const store = db.createObjectStore('chats', { keyPath: 'id' });
              store.createIndex('id', 'id', { unique: true });
              // Make sure urlId can be null/undefined and won't cause conflicts
              store.createIndex('urlId', 'urlId', { unique: false });
              logger.info('Created chats object store with indexes');
            }
          }
          
          // Handle upgrade from version 1 to 2 to fix the urlId uniqueness issue
          if (oldVersion === 1 && db.version >= 2) {
            // Delete and recreate the urlId index without the unique constraint
            const store = request.transaction?.objectStore('chats');
            if (store) {
              // Delete the old index if it exists
              if (store.indexNames.contains('urlId')) {
                store.deleteIndex('urlId');
                logger.info('Deleted old urlId index');
              }
              
              // Create a new non-unique index
              store.createIndex('urlId', 'urlId', { unique: false });
              logger.info('Created new non-unique urlId index');
            }
          }
        } catch (err) {
          logger.error('Error during database upgrade', err);
        }
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        logger.info(`IndexedDB connection established successfully (version ${db.version})`);
        resolve(db);
      };

      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        logger.error('Failed to open IndexedDB', error);
        resolve(undefined);
      };

      request.onblocked = () => {
        logger.error('IndexedDB connection blocked - another connection may be open');
        resolve(undefined);
      };
    } catch (err) {
      logger.error('Unexpected error opening IndexedDB', err);
      resolve(undefined);
    }
  });
}

export async function getAll(db: IDBDatabase): Promise<ChatHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as ChatHistoryItem[]);
    request.onerror = () => reject(request.error);
  });
}

export async function setMessages(
  db: IDBDatabase,
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!db) {
        reject(new Error('Database connection is not available'));
        return;
      }

      if (!id) {
        reject(new Error('Missing required ID for chat storage'));
        return;
      }

      // Handle potential undefined values safely
      const sanitizedData = {
        id,
        messages: messages || [],
        urlId: urlId || null, // Convert undefined to null to avoid indexing issues
        description: description || null, // Convert undefined to null
        timestamp: new Date().toISOString(),
      };

      const transaction = db.transaction('chats', 'readwrite');
      
      // Add transaction lifecycle event handlers
      transaction.oncomplete = () => {
        logger.info(`Transaction completed successfully for chat ID: ${id}`);
        resolve();
      };
      
      transaction.onabort = (event) => {
        const error = transaction.error;
        if (error) {
          if (error.name === 'QuotaExceededError') {
            reject(new Error('Storage quota exceeded. Try deleting old chats to make space.'));
          } else {
            reject(error);
          }
        } else {
          reject(new Error('Transaction was aborted'));
        }
      };
      
      const store = transaction.objectStore('chats');

      // First check if the record exists to avoid constraint errors
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        try {
          const request = store.put(sanitizedData);
          
          request.onsuccess = () => {
            logger.info(`Successfully saved chat with ID: ${id}`);
            // Note: Don't resolve here, let the transaction.oncomplete handle it
          };
          
          request.onerror = () => {
            const error = request.error;
            if (error) {
              logger.error(`Error saving chat: ${error.name} - ${error.message}`);
              reject(error);
            } else {
              reject(new Error('Unknown error occurred while saving chat'));
            }
          };
        } catch (innerErr) {
          logger.error('Exception during store.put operation', innerErr);
          reject(innerErr);
        }
      };
      
      getRequest.onerror = (err) => {
        logger.error('Error checking for existing record', err);
        reject(new Error('Failed to check if record exists'));
      };
      
    } catch (err) {
      logger.error('Exception in setMessages', err);
      reject(err);
    }
  });
}

export async function getMessages(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return (await getMessagesById(db, id)) || (await getMessagesByUrlId(db, id));
}

export async function getMessagesByUrlId(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const index = store.index('urlId');
    const request = index.get(id);

    request.onsuccess = () => resolve(request.result as ChatHistoryItem);
    request.onerror = () => reject(request.error);
  });
}

export async function getMessagesById(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as ChatHistoryItem);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteById(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readwrite');
    const store = transaction.objectStore('chats');
    const request = store.delete(id);

    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function getNextId(db: IDBDatabase): Promise<string> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAllKeys();

    request.onsuccess = () => {
      const highestId = request.result.reduce((cur, acc) => Math.max(+cur, +acc), 0);
      resolve(String(+highestId + 1));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getUrlId(db: IDBDatabase, id: string): Promise<string> {
  const idList = await getUrlIds(db);

  if (!idList.includes(id)) {
    return id;
  } else {
    let i = 2;

    while (idList.includes(`${id}-${i}`)) {
      i++;
    }

    return `${id}-${i}`;
  }
}

async function getUrlIds(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction('chats', 'readonly');
      const store = transaction.objectStore('chats');
      const idList: string[] = [];

      const request = store.openCursor();

      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          // Only add the urlId if it exists and is not undefined
          if (cursor.value.urlId) {
            idList.push(cursor.value.urlId);
          }
          cursor.continue();
        } else {
          // Filter out undefined values and duplicates
          const filteredList = [...new Set(idList.filter(Boolean))];
          resolve(filteredList);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    } catch (err) {
      logger.error('Error in getUrlIds', err);
      // Return empty array instead of rejecting on error
      resolve([]);
    }
  });
}
