/**
 * CanvasKit 폰트 관리
 *
 * CanvasKit은 CSS @font-face를 사용할 수 없으므로
 * .woff2/.ttf 바이너리를 직접 로드하고 Typeface를 등록해야 한다.
 * IndexedDB에 폰트 바이너리를 캐싱하여 재방문 시 네트워크 요청을 줄인다.
 *
 * @see docs/WASM.md §5.7 폰트 관리
 */

import type { CanvasKit, FontMgr, Typeface } from 'canvaskit-wasm';
import { getCanvasKit } from './initCanvasKit';

const IDB_NAME = 'xstudio-fonts';
const IDB_VERSION = 1;
const IDB_STORE = 'fonts';

interface FontCacheEntry {
  family: string;
  buffer: ArrayBuffer;
  timestamp: number;
}

/**
 * CanvasKit용 폰트 매니저.
 *
 * 사용법:
 * ```ts
 * const fm = new SkiaFontManager();
 * await fm.loadFont('Pretendard', '/fonts/Pretendard-Regular.woff2');
 * const fontMgr = fm.getFontMgr();
 * ```
 */
export class SkiaFontManager {
  private fontMgr: FontMgr | null = null;
  private typefaces: Map<string, Typeface> = new Map();
  private buffers: Map<string, ArrayBuffer> = new Map();
  private dirty = true;

  /**
   * 폰트를 로드하고 CanvasKit Typeface로 등록한다.
   *
   * 1. IndexedDB 캐시 확인
   * 2. 캐시 미스 시 네트워크 fetch
   * 3. Typeface 생성 + IndexedDB 저장
   */
  async loadFont(family: string, url: string): Promise<void> {
    if (this.typefaces.has(family)) return;

    let buffer = await this.getFromCache(family);

    if (!buffer) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Font fetch 실패: ${family} (${url}) — ${response.status}`);
      }
      buffer = await response.arrayBuffer();
      await this.saveToCache(family, buffer);
    }

    const ck = getCanvasKit();
    const typeface = ck.Typeface.MakeFreeTypeFaceFromData(buffer);
    if (!typeface) {
      throw new Error(`Typeface 생성 실패: ${family}`);
    }

    this.typefaces.set(family, typeface);
    this.buffers.set(family, buffer);
    this.dirty = true;
  }

  /**
   * 등록된 모든 폰트로 구성된 FontMgr을 반환한다.
   * ParagraphBuilder에서 사용한다.
   */
  getFontMgr(): FontMgr {
    if (this.fontMgr && !this.dirty) return this.fontMgr;

    const ck = getCanvasKit();
    const bufferArray = Array.from(this.buffers.values());

    // 이전 FontMgr 해제
    if (this.fontMgr) {
      this.fontMgr.delete();
    }

    if (bufferArray.length === 0) {
      // 폰트가 없으면 null — 호출자는 폰트 로드 후 다시 시도해야 함
      this.fontMgr = null;
      this.dirty = false;
      // null 반환 대신 빈 FontMgr 생성 시도
      // CanvasKit-WASM에는 RefDefault가 없으므로
      // 폰트가 없으면 caller가 폰트를 먼저 로드해야 한다
      throw new Error('폰트가 로드되지 않았습니다. loadFont()를 먼저 호출하세요.');
    }

    const mgr = ck.FontMgr.FromData(...bufferArray);
    if (!mgr) {
      throw new Error('FontMgr 생성 실패');
    }
    this.fontMgr = mgr;
    this.dirty = false;
    return this.fontMgr;
  }

  /** 특정 폰트 패밀리가 로드되었는지 확인 */
  hasFont(family: string): boolean {
    return this.typefaces.has(family);
  }

  /** 로드된 폰트 패밀리 목록 */
  getFamilies(): string[] {
    return Array.from(this.typefaces.keys());
  }

  /** 모든 리소스 해제 */
  dispose(): void {
    for (const typeface of this.typefaces.values()) {
      typeface.delete();
    }
    this.typefaces.clear();
    this.buffers.clear();

    if (this.fontMgr) {
      this.fontMgr.delete();
      this.fontMgr = null;
    }
    this.dirty = true;
  }

  // ============================================
  // IndexedDB 캐싱
  // ============================================

  /** 캐시된 IDB 연결 (매 호출마다 새로 열지 않음) */
  private dbInstance: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    // 기존 연결 재사용
    if (this.dbInstance) return this.dbInstance;
    // 열기 진행 중이면 대기
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'family' });
        }
      };

      request.onsuccess = () => {
        this.dbInstance = request.result;
        // 연결 끊김 시 캐시 무효화
        this.dbInstance.onclose = () => {
          this.dbInstance = null;
          this.dbPromise = null;
        };
        resolve(this.dbInstance);
      };
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async getFromCache(family: string): Promise<ArrayBuffer | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(family);

        req.onsuccess = () => {
          const entry = req.result as FontCacheEntry | undefined;
          resolve(entry?.buffer ?? null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      // IndexedDB 사용 불가 시 캐시 스킵
      return null;
    }
  }

  private async saveToCache(
    family: string,
    buffer: ArrayBuffer,
  ): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const entry: FontCacheEntry = {
        family,
        buffer,
        timestamp: Date.now(),
      };
      store.put(entry);
    } catch {
      // IndexedDB 쓰기 실패 무시
    }
  }
}

// ============================================
// HMR 안전 싱글톤 (initCanvasKit.ts 패턴)
// ============================================

const FM_GLOBAL_KEY = '__XSTUDIO_SKIA_FONT_MANAGER__';

declare global {
  interface Window {
    [FM_GLOBAL_KEY]?: SkiaFontManager;
  }
}

function getOrCreateFontManager(): SkiaFontManager {
  // HMR 시 이전 인스턴스 재사용 (Typeface 누수 방지)
  const existing = window[FM_GLOBAL_KEY];
  if (existing) return existing;

  const fm = new SkiaFontManager();
  window[FM_GLOBAL_KEY] = fm;
  return fm;
}

/** 싱글톤 인스턴스 */
export const skiaFontManager = getOrCreateFontManager();
