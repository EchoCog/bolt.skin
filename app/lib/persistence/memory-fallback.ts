/**
 * This module provides a memory-based fallback for chat persistence
 * when IndexedDB is unavailable. Data will only be persisted for the 
 * duration of the session.
 */
import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { ChatHistoryItem } from './useChatHistory';

const logger = createScopedLogger('MemoryPersistence');

// In-memory storage for chats
const memoryStore = new Map<string, ChatHistoryItem>();
let lastId = 0;

/**
 * Get all stored chat items
 */
export async function memoryGetAll(): Promise<ChatHistoryItem[]> {
  return Array.from(memoryStore.values());
}

/**
 * Store messages in memory
 */
export async function memorySetMessages(
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string,
): Promise<void> {
  try {
    memoryStore.set(id, {
      id,
      messages: messages || [],
      urlId: urlId || null,
      description: description || null,
      timestamp: new Date().toISOString(),
    });
    logger.info(`Successfully saved chat with ID: ${id} to memory`);
  } catch (err) {
    logger.error('Error saving messages to memory', err);
    throw new Error('Failed to save messages in memory fallback');
  }
}

/**
 * Get messages by ID or URL ID
 */
export async function memoryGetMessages(id: string): Promise<ChatHistoryItem> {
  // First check by direct ID
  if (memoryStore.has(id)) {
    return memoryStore.get(id);
  }
  
  // Then check by urlId
  for (const chat of memoryStore.values()) {
    if (chat.urlId === id) {
      return chat;
    }
  }
  
  return null;
}

/**
 * Delete a chat by ID
 */
export async function memoryDeleteById(id: string): Promise<void> {
  memoryStore.delete(id);
}

/**
 * Generate a new unique ID
 */
export async function memoryGetNextId(): Promise<string> {
  lastId++;
  return lastId.toString();
}

/**
 * Generate a unique URL ID
 */
export async function memoryGetUrlId(id: string): Promise<string> {
  const existingUrlIds = new Set(
    Array.from(memoryStore.values())
      .map(chat => chat.urlId)
      .filter(Boolean)
  );
  
  if (!existingUrlIds.has(id)) {
    return id;
  }
  
  let i = 2;
  while (existingUrlIds.has(`${id}-${i}`)) {
    i++;
  }
  
  return `${id}-${i}`;
}