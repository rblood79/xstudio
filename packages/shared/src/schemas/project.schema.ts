/**
 * Project Export Schema
 *
 * Zod 스키마를 사용한 프로젝트 데이터 검증
 *
 * @since 2026-01-02 Phase 1
 */

import { z } from 'zod';
import { EXPORT_LIMITS } from '../types/export.types';

// ============================================
// Base Schemas
// ============================================

/**
 * Semver 버전 패턴
 */
const semverPattern = /^\d+\.\d+\.\d+$/;

/**
 * Slug 패턴 (/ 또는 소문자, 숫자, 하이픈, 언더스코어, 슬래시)
 */
const slugPattern = /^(\/|\/[a-z0-9\-_/]+)$/;

/**
 * UUID 패턴 (유연하게 - 하이픈 없는 것도 허용)
 */
const uuidPattern =
  /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

// ============================================
// Element Schema
// ============================================

/**
 * Element props 스키마 (유연하게 허용)
 */
const ElementPropsSchema = z.record(z.string(), z.unknown()).default({});

/**
 * Data Binding 스키마
 */
const DataBindingSchema = z
  .object({
    type: z.enum(['collection', 'value', 'field']),
    source: z.enum(['supabase', 'api', 'state', 'static', 'parent']),
    config: z.record(z.string(), z.unknown()),
  })
  .optional();

/**
 * Element 스키마
 */
export const ElementSchema = z.object({
  id: z.string().min(1, { message: 'Element ID is required' }),
  customId: z.string().optional(),
  tag: z.string().min(1, { message: 'Element tag is required' }),
  props: ElementPropsSchema,
  parent_id: z.string().nullable().optional(),
  order_num: z.number().int().min(0).optional().default(0),
  page_id: z.string().nullable().optional(),
  layout_id: z.string().nullable().optional(),
  slot_name: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  deleted: z.boolean().optional(),
  dataBinding: DataBindingSchema,
  events: z.array(z.unknown()).optional(),
});

export type ElementSchemaType = z.infer<typeof ElementSchema>;

// ============================================
// Page Schema
// ============================================

/**
 * Page 스키마
 */
export const PageSchema = z.object({
  id: z.string().min(1, { message: 'Page ID is required' }),
  title: z.string().min(1, { message: 'Page title is required' }),
  slug: z.string().regex(slugPattern, {
    message: 'Slug must be "/" or contain only lowercase letters, numbers, hyphens, underscores, and slashes',
  }),
  project_id: z.string().min(1, { message: 'Project ID is required' }),
  parent_id: z.string().nullable().optional(),
  order_num: z.number().int().min(0).optional().default(0),
  layout_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PageSchemaType = z.infer<typeof PageSchema>;

// ============================================
// Project Schema
// ============================================

/**
 * Project Info 스키마
 */
export const ProjectInfoSchema = z.object({
  id: z.string().regex(uuidPattern, {
    message: 'Project ID must be a valid UUID',
  }),
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(EXPORT_LIMITS.MAX_PROJECT_NAME_LENGTH, `Project name must be at most ${EXPORT_LIMITS.MAX_PROJECT_NAME_LENGTH} characters`),
});

/**
 * Metadata 스키마 (Phase 4)
 */
export const MetadataSchema = z
  .object({
    builderVersion: z.string().regex(semverPattern, {
      message: 'Builder version must follow semver format',
    }),
    exportedBy: z.string().max(120).optional(),
    description: z.string().max(EXPORT_LIMITS.MAX_DESCRIPTION_LENGTH).optional(),
    thumbnail: z.string().optional(),
  })
  .optional();

/**
 * 전체 Export 데이터 스키마
 */
export const ExportedProjectSchema = z
  .object({
    version: z.string().regex(semverPattern, {
      message: 'Version must follow semver format (e.g., 1.0.0)',
    }),
    exportedAt: z.string().datetime({
      message: 'exportedAt must be a valid ISO 8601 datetime',
    }),
    project: ProjectInfoSchema,
    pages: z
      .array(PageSchema)
      .min(1, 'At least one page is required')
      .max(EXPORT_LIMITS.MAX_PAGES, `Maximum ${EXPORT_LIMITS.MAX_PAGES} pages allowed`),
    elements: z
      .array(ElementSchema)
      .max(EXPORT_LIMITS.MAX_ELEMENTS, `Maximum ${EXPORT_LIMITS.MAX_ELEMENTS} elements allowed`),
    currentPageId: z.string().nullable().optional(),
    metadata: MetadataSchema,
  })
  .refine(
    (data) => {
      // currentPageId가 있으면 pages에 해당 ID가 존재해야 함
      if (data.currentPageId) {
        return data.pages.some((page) => page.id === data.currentPageId);
      }
      return true;
    },
    {
      message: 'currentPageId must reference an existing page',
      path: ['currentPageId'],
    }
  );

export type ExportedProjectSchemaType = z.infer<typeof ExportedProjectSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * 페이지 최소 타입 (검증에 필요한 필드만)
 */
interface PageLike {
  id: string;
  slug: string;
  parent_id?: string | null;
}

/**
 * 페이지 순환 참조 검사
 */
export function detectPageCycle(pages: PageLike[]): string | null {
  const pageMap = new Map(pages.map((p) => [p.id, p]));

  for (const page of pages) {
    const visited = new Set<string>();
    let current: PageLike | undefined = page;

    while (current?.parent_id) {
      if (visited.has(current.id)) {
        return current.id;
      }
      visited.add(current.id);
      current = pageMap.get(current.parent_id);
    }
  }

  return null;
}

/**
 * 존재하지 않는 parent_id 검사
 */
export function findInvalidParentIds(pages: PageLike[]): string[] {
  const pageIds = new Set(pages.map((p) => p.id));
  const invalid: string[] = [];

  for (const page of pages) {
    if (page.parent_id && !pageIds.has(page.parent_id)) {
      invalid.push(page.id);
    }
  }

  return invalid;
}

/**
 * 중복 slug 검사
 */
export function findDuplicateSlugs(pages: PageLike[]): string[] {
  const slugs = new Map<string, string[]>();

  for (const page of pages) {
    const existing = slugs.get(page.slug) || [];
    existing.push(page.id);
    slugs.set(page.slug, existing);
  }

  const duplicates: string[] = [];
  for (const [, pageIds] of slugs) {
    if (pageIds.length > 1) {
      duplicates.push(...pageIds);
    }
  }

  return duplicates;
}
