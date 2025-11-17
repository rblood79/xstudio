/**
 * Database Instance Manager
 *
 * 전역 데이터베이스 인스턴스를 관리합니다.
 * - IndexedDB (웹 브라우저)
 * - PGlite (Electron, 향후 추가 예정)
 */

import { IndexedDBAdapter } from './indexedDB/adapter';
import type { DatabaseAdapter } from './types';

// 전역 DB 인스턴스 (싱글톤)
let dbInstance: DatabaseAdapter | null = null;
let initPromise: Promise<DatabaseAdapter> | null = null;

/**
 * 데이터베이스 인스턴스 가져오기
 *
 * @example
 * ```typescript
 * const db = await getDB();
 * const elements = await db.elements.getByPage(pageId);
 * ```
 */
export async function getDB(): Promise<DatabaseAdapter> {
  // 이미 초기화된 인스턴스가 있으면 반환
  if (dbInstance) {
    return dbInstance;
  }

  // 초기화 중이면 대기
  if (initPromise) {
    return initPromise;
  }

  // 새로 초기화
  initPromise = (async () => {
    console.log('[DB] Initializing database...');

    // 향후 Electron 지원 시:
    // const adapter = import.meta.env.ELECTRON
    //   ? new PGliteAdapter()
    //   : new IndexedDBAdapter();

    const adapter = new IndexedDBAdapter();
    await adapter.init();

    dbInstance = adapter;
    initPromise = null;

    console.log('[DB] Database initialized successfully');
    return adapter;
  })();

  return initPromise;
}

/**
 * 데이터베이스 연결 닫기
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    initPromise = null;
    console.log('[DB] Database closed');
  }
}

/**
 * 데이터베이스 초기화 여부 확인
 */
export function isDBInitialized(): boolean {
  return dbInstance !== null;
}

// Re-export types
export type * from './types';
