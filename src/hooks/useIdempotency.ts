import { useState, useEffect } from 'react';

// Generate a unique idempotency key for the checkout session
export function generateIdempotencyKey(): string {
  return `idk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Hook to manage idempotency key per checkout session
export function useIdempotencyKey() {
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  // Generate a new key (call this after successful order or when starting fresh)
  const regenerateKey = () => {
    setIdempotencyKey(generateIdempotencyKey());
  };

  return { idempotencyKey, regenerateKey };
}

// Storage key for persisting idempotency key across page refreshes during checkout
const IDEMPOTENCY_STORAGE_KEY = 'checkout_idempotency_key';

export function getStoredIdempotencyKey(): string | null {
  try {
    return localStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeIdempotencyKey(key: string): void {
  try {
    localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, key);
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredIdempotencyKey(): void {
  try {
    localStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Hook that persists idempotency key during checkout flow
export function usePersistedIdempotencyKey() {
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => {
    const stored = getStoredIdempotencyKey();
    if (stored) return stored;
    const newKey = generateIdempotencyKey();
    storeIdempotencyKey(newKey);
    return newKey;
  });

  // Update storage when key changes
  useEffect(() => {
    storeIdempotencyKey(idempotencyKey);
  }, [idempotencyKey]);

  const regenerateKey = () => {
    const newKey = generateIdempotencyKey();
    setIdempotencyKey(newKey);
    storeIdempotencyKey(newKey);
  };

  const clearKey = () => {
    clearStoredIdempotencyKey();
    regenerateKey();
  };

  return { idempotencyKey, regenerateKey, clearKey };
}
