/**
 * CanvasKit 이미지 캐시
 *
 * URL → CanvasKit Image(SkImage) 변환 및 캐싱을 담당한다.
 * fontManager.ts 패턴을 따르며, 이미지를 fetch → ArrayBuffer → MakeImageFromEncoded로 로딩한다.
 *
 * - refCount 기반 참조 관리
 * - LRU 퇴거 정책 (MAX_CACHE_SIZE 초과 시 최소 참조 엔트리 제거)
 * - CORS 모드 설정 (외부 이미지 지원)
 *
 * @see docs/WASM.md §5.11 이미지 렌더링
 */

import type { CanvasKit, Image as SkImage } from 'canvaskit-wasm';
import { isCanvasKitInitialized, getCanvasKit } from './initCanvasKit';

/** GPU 메모리 보호를 위한 캐시 상한 (엔트리 수) */
const MAX_CACHE_SIZE = 100;

interface CacheEntry {
  image: SkImage;
  refCount: number;
  /** 마지막 접근 시각 (LRU 퇴거용) */
  lastAccess: number;
}

/** URL → CanvasKit Image 캐시 */
const cache = new Map<string, CacheEntry>();

/** 진행 중인 로딩 Promise (중복 요청 방지) */
const pending = new Map<string, Promise<SkImage | null>>();

/**
 * URL에서 이미지를 로드하여 CanvasKit Image로 변환한다.
 * 캐시된 이미지가 있으면 즉시 반환한다.
 *
 * @returns CanvasKit Image 또는 null (로딩 실패)
 */
export async function loadSkImage(url: string): Promise<SkImage | null> {
  if (!url || !isCanvasKitInitialized()) return null;

  // 캐시 히트
  const entry = cache.get(url);
  if (entry) {
    entry.refCount++;
    entry.lastAccess = performance.now();
    return entry.image;
  }

  // 이미 로딩 중이면 대기 (refCount는 캐시 등록 후 별도 증가)
  const existing = pending.get(url);
  if (existing) {
    const image = await existing;
    if (image) {
      // 로딩 완료 후 캐시에 등록된 엔트리의 refCount 증가
      const cachedEntry = cache.get(url);
      if (cachedEntry) {
        cachedEntry.refCount++;
        cachedEntry.lastAccess = performance.now();
      }
    }
    return image;
  }

  const promise = fetchAndDecode(url);
  pending.set(url, promise);

  try {
    const image = await promise;
    pending.delete(url);

    if (image) {
      // 캐시 상한 초과 시 LRU 퇴거
      if (cache.size >= MAX_CACHE_SIZE) {
        evictLRU();
      }
      cache.set(url, { image, refCount: 1, lastAccess: performance.now() });
    }
    return image;
  } catch {
    pending.delete(url);
    return null;
  }
}

/**
 * 캐시에서 동기적으로 이미지를 조회한다.
 * 로딩이 완료된 이미지만 반환한다.
 */
export function getSkImage(url: string): SkImage | null {
  const entry = cache.get(url);
  if (entry) {
    entry.lastAccess = performance.now();
  }
  return entry?.image ?? null;
}

/**
 * 이미지 참조를 해제한다.
 * refCount가 0이 되면 CanvasKit Image를 삭제한다.
 */
export function releaseSkImage(url: string): void {
  const entry = cache.get(url);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.image.delete();
    cache.delete(url);
  }
}

/** 전체 캐시 초기화 */
export function clearImageCache(): void {
  for (const entry of cache.values()) {
    entry.image.delete();
  }
  cache.clear();
  pending.clear();
}

/** 캐시 크기 (디버그용) */
export function getImageCacheSize(): number {
  return cache.size;
}

// ============================================
// Internal
// ============================================

/**
 * refCount가 0인 엔트리 중 가장 오래된 것을 퇴거한다.
 * refCount > 0인 엔트리만 남은 경우 가장 오래된 것을 강제 퇴거.
 */
function evictLRU(): void {
  let oldest: { url: string; entry: CacheEntry } | null = null;
  let oldestUnref: { url: string; entry: CacheEntry } | null = null;

  for (const [url, entry] of cache) {
    // refCount 0인 것 우선 퇴거
    if (entry.refCount <= 0) {
      if (!oldestUnref || entry.lastAccess < oldestUnref.entry.lastAccess) {
        oldestUnref = { url, entry };
      }
    }
    if (!oldest || entry.lastAccess < oldest.entry.lastAccess) {
      oldest = { url, entry };
    }
  }

  const target = oldestUnref ?? oldest;
  if (target) {
    target.entry.image.delete();
    cache.delete(target.url);
  }
}

async function fetchAndDecode(url: string): Promise<SkImage | null> {
  try {
    const ck: CanvasKit = getCanvasKit();

    // CORS 모드: 외부 이미지(CDN, 사용자 업로드)도 로드 가능하도록 설정
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'same-origin',
    });
    if (!response.ok) {
      console.warn(`[imageCache] Fetch failed: ${url} (${response.status})`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    const image = ck.MakeImageFromEncoded(data);

    if (!image) {
      console.warn(`[imageCache] Decode failed: ${url}`);
      return null;
    }

    return image;
  } catch (e) {
    console.warn(`[imageCache] Load error: ${url}`, e);
    return null;
  }
}
