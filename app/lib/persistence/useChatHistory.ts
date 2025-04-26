import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { atom } from 'nanostores';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';
import { getMessages, getNextId, getUrlId, openDatabase, setMessages } from './db';
import { 
  memoryGetAll,
  memoryGetMessages, 
  memoryGetNextId,
  memoryGetUrlId,
  memorySetMessages,
  memoryDeleteById
} from './memory-fallback';

const logger = createScopedLogger('ChatHistory');

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

let dbInitialized = false;
let dbInitError = '';
let dbInitAttempts = 0;
let usingMemoryFallback = false;
const MAX_INIT_ATTEMPTS = 3;

/**
 * Try to initialize the IndexedDB database with retry logic
 * @returns The initialized database or undefined if initialization failed
 */
export const initDatabase = async (): Promise<IDBDatabase | undefined> => {
  try {
    if (!persistenceEnabled) {
      logger.info('Chat persistence is disabled via environment variable');
      return undefined;
    }
    
    if (typeof window === 'undefined') {
      logger.info('Not initializing IndexedDB in server environment');
      return undefined;
    }

    // Check if IndexedDB is actually available in this browser/context
    if (!window.indexedDB) {
      dbInitError = 'IndexedDB is not supported in this browser or is disabled';
      logger.error(dbInitError);
      usingMemoryFallback = true;
      return undefined;
    }
    
    // Try to detect private browsing mode which might cause IndexedDB issues
    try {
      // This is a common test for private browsing in Safari
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      dbInitError = 'LocalStorage unavailable. You may be in private browsing mode, which can prevent IndexedDB from working';
      logger.error(dbInitError);
      usingMemoryFallback = true;
      return undefined;
    }

    // Attempt to open the database with retry logic
    while (dbInitAttempts < MAX_INIT_ATTEMPTS) {
      try {
        dbInitAttempts++;
        logger.info(`Database initialization attempt ${dbInitAttempts}/${MAX_INIT_ATTEMPTS}`);
        
        const database = await openDatabase();
        
        if (database) {
          dbInitialized = true;
          logger.info('Database initialized successfully');
          return database;
        }
        
        // Wait a bit before retrying
        if (dbInitAttempts < MAX_INIT_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 500 * dbInitAttempts));
        }
      } catch (innerError) {
        const errorMessage = innerError instanceof Error ? innerError.message : 'Unknown error';
        logger.error(`Database initialization attempt ${dbInitAttempts} failed: ${errorMessage}`, innerError);
        
        // Wait a bit before retrying
        if (dbInitAttempts < MAX_INIT_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 500 * dbInitAttempts));
        }
      }
    }
    
    // If we got here, all attempts failed
    dbInitError = `Failed to initialize IndexedDB after ${MAX_INIT_ATTEMPTS} attempts. Chat history will not be saved.`;
    logger.error(dbInitError);
    usingMemoryFallback = true;
    return undefined;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    dbInitError = `Error initializing database: ${errorMessage}`;
    logger.error(dbInitError, error);
    usingMemoryFallback = true;
    return undefined;
  }
};

// Initialize the database
export const db = await initDatabase();

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  useEffect(() => {
    if (!db && !usingMemoryFallback) {
      setReady(true);

      if (persistenceEnabled && !ready) {
        const errorMessage = dbInitError || 'Chat persistence is unavailable';
        toast.error(errorMessage, {
          autoClose: 5000,
          toastId: 'persistence-error'
        });
        logger.error(errorMessage);
      }

      return;
    }

    if (mixedId) {
      const getMessagesPromise = db 
        ? getMessages(db, mixedId)
        : memoryGetMessages(mixedId);
        
      getMessagesPromise
        .then((storedMessages) => {
          if (storedMessages && storedMessages.messages.length > 0) {
            setInitialMessages(storedMessages.messages);
            setUrlId(storedMessages.urlId);
            description.set(storedMessages.description);
            chatId.set(storedMessages.id);
          } else {
            navigate(`/`, { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          const errorMessage = `Failed to load chat history: ${error.message}`;
          toast.error(errorMessage);
          logger.error(errorMessage, error);
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, [mixedId]);

  return {
    ready: !mixedId || ready,
    initialMessages,
    usingMemoryFallback,
    storeMessageHistory: async (messages: Message[]) => {
      if ((!db && !usingMemoryFallback) || messages.length === 0) {
        return;
      }

      try {
        // Get current ID or generate a new one
        let currentId = chatId.get();
        let currentUrlId = urlId;
        
        // Determine if we need a new ID and URL ID
        if (initialMessages.length === 0 && !currentId) {
          try {
            const nextId = db 
              ? await getNextId(db) 
              : await memoryGetNextId();
            
            currentId = nextId;
            chatId.set(nextId);
            
            // Only set URL ID if we don't have one yet
            if (!currentUrlId) {
              // Use firstArtifact ID if available, otherwise use the numeric ID
              const { firstArtifact } = workbenchStore;
              let generatedUrlId;
              
              if (firstArtifact?.id) {
                generatedUrlId = db
                  ? await getUrlId(db, firstArtifact.id)
                  : await memoryGetUrlId(firstArtifact.id);
              } else {
                generatedUrlId = nextId;
              }
              
              currentUrlId = generatedUrlId;
              navigateChat(currentUrlId);
              setUrlId(currentUrlId);
            }
          } catch (err) {
            logger.error("Error generating new IDs", err);
            throw new Error("Failed to create a new chat session");
          }
        }
        
        // Set description if available from firstArtifact
        const { firstArtifact } = workbenchStore;
        if (!description.get() && firstArtifact?.title) {
          description.set(firstArtifact.title);
        }

        // Ensure we have a valid ID before attempting to save
        if (!currentId) {
          throw new Error("Missing chat ID for storage");
        }
        
        // Add a small delay to prevent transaction conflicts
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Now save the messages using either IndexedDB or memory fallback
        if (db) {
          await setMessages(
            db,
            currentId,
            messages,
            currentUrlId,
            description.get()
          );
        } else {
          await memorySetMessages(
            currentId,
            messages,
            currentUrlId,
            description.get()
          );
        }
        
        logger.info(`Successfully saved chat history with ID: ${currentId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to store chat history: ${errorMessage}`, error);
        toast.error(`Failed to save chat: ${errorMessage}`, {
          toastId: 'save-chat-error',
          autoClose: 3000,
        });
      }
    },
  };
}

function navigateChat(nextId: string) {
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
