/**
 * 이벤트 템플릿 타입
 */

import type { EventType, EventAction } from "./eventTypes";

/**
 * 이벤트 템플릿
 */
export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  event: EventType;
  actions: Omit<EventAction, "id">[]; // id는 생성 시 자동 할당
  tags: string[];
  preview?: string;
  usageCount?: number;
  icon?: string;
}

/**
 * 템플릿 카테고리
 */
export type TemplateCategory =
  | "form"
  | "navigation"
  | "data"
  | "animation"
  | "notification"
  | "validation"
  | "custom";

/**
 * 템플릿 카테고리 메타데이터
 */
export interface TemplateCategoryMeta {
  id: TemplateCategory;
  label: string;
  icon: string;
  description: string;
}

/**
 * 템플릿 필터
 */
export interface TemplateFilter {
  category?: TemplateCategory;
  tags?: string[];
  search?: string;
  eventType?: EventType;
}

/**
 * 템플릿 카테고리 레이블
 */
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  form: "폼",
  navigation: "내비게이션",
  data: "데이터",
  animation: "애니메이션",
  notification: "알림",
  validation: "검증",
  custom: "커스텀"
};

/**
 * 템플릿 카테고리 메타데이터
 */
export const TEMPLATE_CATEGORIES: TemplateCategoryMeta[] = [
  {
    id: "form",
    label: "Form",
    icon: "📝",
    description: "폼 제출, 검증, 리셋 관련 템플릿"
  },
  {
    id: "navigation",
    label: "Navigation",
    icon: "🔗",
    description: "페이지 이동, 스크롤 관련 템플릿"
  },
  {
    id: "data",
    label: "Data",
    icon: "💾",
    description: "API 호출, 상태 관리 관련 템플릿"
  },
  {
    id: "animation",
    label: "Animation",
    icon: "✨",
    description: "애니메이션, 전환 효과 관련 템플릿"
  },
  {
    id: "notification",
    label: "Notification",
    icon: "💬",
    description: "토스트, 모달 알림 관련 템플릿"
  },
  {
    id: "validation",
    label: "Validation",
    icon: "✓",
    description: "폼 검증, 데이터 확인 관련 템플릿"
  },
  {
    id: "custom",
    label: "Custom",
    icon: "⚙️",
    description: "사용자 정의 커스텀 템플릿"
  }
];
