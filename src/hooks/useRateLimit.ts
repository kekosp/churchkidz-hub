import { useState, useCallback } from "react";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitState {
  attempts: number;
  windowStart: number;
}

const STORAGE_KEY_PREFIX = "rate_limit_";

/**
 * Hook for client-side rate limiting of operations
 * Persists rate limit state in localStorage to survive page refreshes
 */
export const useRateLimit = (operationKey: string, config: RateLimitConfig) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${operationKey}`;
  
  const getStoredState = (): RateLimitState => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate stored data structure
        if (typeof parsed.attempts === "number" && typeof parsed.windowStart === "number") {
          return parsed;
        }
      }
    } catch {
      // Invalid stored data, reset
    }
    return { attempts: 0, windowStart: Date.now() };
  };

  const [state, setState] = useState<RateLimitState>(getStoredState);

  const updateState = useCallback((newState: RateLimitState) => {
    setState(newState);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newState));
    } catch {
      // localStorage might be full or disabled
    }
  }, [storageKey]);

  const checkRateLimit = useCallback((): { allowed: boolean; remainingAttempts: number; resetTime: number } => {
    const now = Date.now();
    const currentState = getStoredState();
    
    // Check if window has expired
    if (now - currentState.windowStart >= config.windowMs) {
      // Reset the window
      const newState = { attempts: 0, windowStart: now };
      updateState(newState);
      return { 
        allowed: true, 
        remainingAttempts: config.maxAttempts,
        resetTime: now + config.windowMs
      };
    }
    
    // Within window, check attempts
    const allowed = currentState.attempts < config.maxAttempts;
    return { 
      allowed,
      remainingAttempts: Math.max(0, config.maxAttempts - currentState.attempts),
      resetTime: currentState.windowStart + config.windowMs
    };
  }, [config.maxAttempts, config.windowMs, updateState]);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    const currentState = getStoredState();
    
    // Check if window has expired
    if (now - currentState.windowStart >= config.windowMs) {
      // Start new window with 1 attempt
      updateState({ attempts: 1, windowStart: now });
    } else {
      // Increment attempts within current window
      updateState({ 
        attempts: currentState.attempts + 1, 
        windowStart: currentState.windowStart 
      });
    }
  }, [config.windowMs, updateState]);

  const getRemainingTime = useCallback((): number => {
    const currentState = getStoredState();
    const now = Date.now();
    const remaining = (currentState.windowStart + config.windowMs) - now;
    return Math.max(0, remaining);
  }, [config.windowMs]);

  const formatRemainingTime = useCallback((): string => {
    const remainingMs = getRemainingTime();
    const minutes = Math.ceil(remainingMs / (1000 * 60));
    if (minutes <= 1) {
      const seconds = Math.ceil(remainingMs / 1000);
      return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    }
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }, [getRemainingTime]);

  return {
    checkRateLimit,
    recordAttempt,
    getRemainingTime,
    formatRemainingTime
  };
};
