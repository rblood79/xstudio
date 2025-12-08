/**
 * DataTable Preset System Types
 *
 * DataTable Preset 선택기에서 사용되는 타입 정의
 *
 * @see docs/features/DATATABLE_PRESET_SYSTEM.md
 */

import type { DataField } from "../../../../types/builder/data.types";

/**
 * Preset 카테고리
 */
export type PresetCategory =
  | "users-auth"
  | "organization"
  | "ecommerce"
  | "manufacturing"
  | "system";

/**
 * 카테고리 메타 정보
 */
export interface PresetCategoryMeta {
  id: PresetCategory;
  name: string;
  icon: string;
  description: string;
}

/**
 * DataTable Preset 정의
 */
export interface DataTablePreset {
  /** 고유 ID */
  id: string;

  /** 표시 이름 */
  name: string;

  /** 설명 */
  description: string;

  /** 카테고리 */
  category: PresetCategory;

  /** 아이콘 (이모지 또는 lucide 아이콘 이름) */
  icon: string;

  /** 스키마 정의 */
  schema: DataField[];

  /** 샘플 데이터 생성 함수 */
  generateSampleData: (count: number) => Record<string, unknown>[];

  /** 기본 샘플 데이터 개수 */
  defaultSampleCount: number;
}

/**
 * 카테고리 메타 정보 목록
 */
export const PRESET_CATEGORIES: PresetCategoryMeta[] = [
  {
    id: "users-auth",
    name: "Users & Auth",
    icon: "Users",
    description: "사용자, 역할, 권한 관리",
  },
  {
    id: "organization",
    name: "Organization",
    icon: "Building2",
    description: "조직, 부서, 프로젝트 관리",
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    icon: "ShoppingCart",
    description: "상품, 카테고리, 주문 관리",
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    icon: "Factory",
    description: "제품, 부품, BOM 관리",
  },
  {
    id: "system",
    name: "System",
    icon: "Settings",
    description: "시스템 로그, 멤버십 관리",
  },
];
