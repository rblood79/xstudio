/**
 * Environment Detector
 *
 * Detects runtime environment and determines optimal database adapter.
 * Supports: Web, Electron (closed-network), Electron (internet)
 */

import type { Environment, EnvironmentInfo } from './types';

/**
 * Detect if running in Electron
 */
export function isElectron(): boolean {
  // Check for Electron-specific globals
  if (typeof window !== 'undefined') {
    // Renderer process
    return !!(
      window.process?.versions?.electron ||
      (window as any).electron ||
      navigator.userAgent.toLowerCase().includes('electron')
    );
  }

  // Node.js main process
  if (typeof process !== 'undefined') {
    return !!process.versions?.electron;
  }

  return false;
}

/**
 * Check internet connectivity
 */
export async function hasInternetAccess(): Promise<boolean> {
  // Browser API
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    if (!navigator.onLine) {
      return false;
    }
  }

  // Additional check: Try to fetch a lightweight endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃

    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect environment and preferred database
 */
export async function detectEnvironment(): Promise<EnvironmentInfo> {
  const electron = isElectron();
  const internet = await hasInternetAccess();

  let environment: Environment;
  let preferredDb: 'pglite' | 'supabase';

  if (electron) {
    if (internet) {
      // Electron + 인터넷: 사용자 선택 가능 (기본: PGlite)
      environment = 'electron-internet';
      preferredDb = 'pglite'; // 로컬 우선 (성능/오프라인 대비)
    } else {
      // Electron + 폐쇄망: PGlite만 가능
      environment = 'electron-closed';
      preferredDb = 'pglite';
    }
  } else {
    // 웹 브라우저: Supabase만 가능
    environment = 'web';
    preferredDb = 'supabase';
  }

  return {
    environment,
    isElectron: electron,
    hasInternet: internet,
    preferredDb,
  };
}

/**
 * Get user preference from localStorage
 */
export function getUserDbPreference(): 'pglite' | 'supabase' | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const preference = localStorage.getItem('xstudio-db-preference');
  return preference === 'pglite' || preference === 'supabase'
    ? preference
    : null;
}

/**
 * Set user preference to localStorage
 */
export function setUserDbPreference(preference: 'pglite' | 'supabase'): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('xstudio-db-preference', preference);
  }
}

/**
 * Clear user preference
 */
export function clearUserDbPreference(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('xstudio-db-preference');
  }
}

/**
 * Determine which database to use
 *
 * Priority:
 * 1. User preference (localStorage)
 * 2. Environment default
 */
export async function determineDatabase(): Promise<'pglite' | 'supabase'> {
  const envInfo = await detectEnvironment();
  const userPref = getUserDbPreference();

  // Web 환경: Supabase만 가능
  if (envInfo.environment === 'web') {
    return 'supabase';
  }

  // Electron 폐쇄망: PGlite만 가능
  if (envInfo.environment === 'electron-closed') {
    return 'pglite';
  }

  // Electron 인터넷: 사용자 선택 또는 기본값
  if (envInfo.environment === 'electron-internet') {
    // 사용자 선택이 있으면 우선
    if (userPref) {
      return userPref;
    }

    // 기본값: PGlite (로컬 우선)
    return envInfo.preferredDb;
  }

  // Fallback
  return 'supabase';
}

/**
 * Environment information for debugging
 */
export function getEnvironmentDebugInfo(): string {
  const electron = isElectron();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : 'unknown';

  return `
    🌐 Environment Debug Info
    ━━━━━━━━━━━━━━━━━━━━━━━━
    Electron:   ${electron ? '✅ Yes' : '❌ No'}
    Online:     ${online === true ? '✅ Yes' : online === false ? '❌ No' : '❓ Unknown'}
    Platform:   ${typeof navigator !== 'undefined' ? navigator.platform : process.platform}
    User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
  `.trim();
}
