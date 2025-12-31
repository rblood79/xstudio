/**
 * Slug Validator Utility
 *
 * Nested Routes & Slug System을 위한 Slug 검증 및 생성 유틸리티
 *
 * Slug 규칙:
 * - 영문, 숫자, 하이픈(-), 슬래시(/) 만 허용
 * - 빈 값 불가
 * - 연속 슬래시(//) 불가
 * - 끝 슬래시(/) 불가 (루트 경로 '/' 제외)
 */

// ============================================
// Types
// ============================================

export interface SlugValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================
// Validation
// ============================================

/**
 * Slug 유효성 검증
 *
 * @param slug - 검증할 slug
 * @returns 검증 결과 (valid: boolean, error?: string)
 *
 * @example
 * validateSlug('/products/shoes')
 * // → { valid: true }
 *
 * validateSlug('products//shoes')
 * // → { valid: false, error: 'Slug cannot contain consecutive slashes' }
 *
 * validateSlug('/products/')
 * // → { valid: false, error: 'Slug cannot end with a slash' }
 */
export function validateSlug(slug: string): SlugValidationResult {
  // 1. 빈 값 체크
  if (!slug.trim()) {
    return { valid: false, error: 'Slug cannot be empty' };
  }

  // 2. 유효 문자 체크 (영문, 숫자, 하이픈, 슬래시)
  if (!/^[a-z0-9\-/]+$/i.test(slug)) {
    return { valid: false, error: 'Slug can only contain letters, numbers, hyphens, and slashes' };
  }

  // 3. 연속 슬래시 체크
  if (/\/\/+/.test(slug)) {
    return { valid: false, error: 'Slug cannot contain consecutive slashes' };
  }

  // 4. 끝 슬래시 체크 (루트 경로 '/' 제외)
  if (slug.endsWith('/') && slug !== '/') {
    return { valid: false, error: 'Slug cannot end with a slash' };
  }

  return { valid: true };
}

// ============================================
// Generation
// ============================================

/**
 * 제목에서 Slug 자동 생성
 *
 * Title을 URL-friendly한 slug로 변환합니다.
 *
 * @param title - 변환할 제목
 * @returns 생성된 slug (앞에 '/'가 붙지 않음)
 *
 * @example
 * generateSlugFromTitle('Nike Shoes')
 * // → 'nike-shoes'
 *
 * generateSlugFromTitle('Summer  Sale  2024!!!')
 * // → 'summer-sale-2024'
 *
 * generateSlugFromTitle('제품 상세')
 * // → '' (한글은 제거됨)
 */
export function generateSlugFromTitle(title: string | undefined | null): string {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // 특수문자 제거
    .replace(/\s+/g, '-') // 공백 → 하이픈
    .replace(/-+/g, '-') // 연속 하이픈 제거
    .replace(/^-|-$/g, ''); // 앞뒤 하이픈 제거
}

/**
 * 고유한 Slug 생성
 *
 * 중복되지 않는 slug를 생성합니다.
 * 기본 slug가 중복이면 숫자를 붙여서 고유하게 만듭니다.
 *
 * @param baseSlug - 기본 slug
 * @param existingSlugs - 기존 slug 목록
 * @returns 고유한 slug
 *
 * @example
 * generateUniqueSlug('nike-shoes', ['nike-shoes', 'adidas-shoes'])
 * // → 'nike-shoes-2'
 *
 * generateUniqueSlug('new-page', ['new-page', 'new-page-2'])
 * // → 'new-page-3'
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

// ============================================
// Formatting
// ============================================

/**
 * Slug 정규화
 *
 * 입력된 slug를 정리하고 표준화합니다.
 *
 * @param slug - 정규화할 slug
 * @returns 정규화된 slug
 *
 * @example
 * normalizeSlug('//products//shoes/')
 * // → '/products/shoes'
 *
 * normalizeSlug('  products  ')
 * // → 'products'
 */
export function normalizeSlug(slug: string): string {
  let normalized = slug
    .trim()
    .toLowerCase()
    .replace(/\/+/g, '/'); // 연속 슬래시 제거

  // 끝 슬래시 제거 (루트 경로 제외)
  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * 절대 경로 여부 확인
 *
 * @param slug - 확인할 slug
 * @returns true면 절대 경로 (슬래시로 시작)
 *
 * @example
 * isAbsoluteSlug('/products')
 * // → true
 *
 * isAbsoluteSlug('products')
 * // → false
 */
export function isAbsoluteSlug(slug: string): boolean {
  return slug.startsWith('/');
}

/**
 * 상대 경로를 절대 경로로 변환
 *
 * @param slug - 변환할 slug
 * @returns 절대 경로로 변환된 slug
 *
 * @example
 * toAbsoluteSlug('products')
 * // → '/products'
 *
 * toAbsoluteSlug('/products')
 * // → '/products' (이미 절대 경로면 그대로)
 */
export function toAbsoluteSlug(slug: string): string {
  if (isAbsoluteSlug(slug)) {
    return slug;
  }
  return `/${slug}`;
}

/**
 * 절대 경로를 상대 경로로 변환
 *
 * @param slug - 변환할 slug
 * @returns 상대 경로로 변환된 slug
 *
 * @example
 * toRelativeSlug('/products')
 * // → 'products'
 *
 * toRelativeSlug('products')
 * // → 'products' (이미 상대 경로면 그대로)
 */
export function toRelativeSlug(slug: string): string {
  if (slug === '/') {
    return '';
  }
  return slug.replace(/^\/+/, '');
}
