/**
 * 컬럼 타입 자동 추론 유틸리티
 *
 * API 데이터에서 컬럼을 자동으로 감지하고 타입을 추론합니다.
 * Table, ListBox, Select 등 Collection 컴포넌트에서 사용됩니다.
 */

import type { FieldType, FieldDefinition, ColumnMapping } from "../types/builder/unified.types";

/**
 * 값의 타입을 자동으로 추론
 *
 * @param value - 추론할 값
 * @returns 추론된 FieldType
 *
 * @example
 * ```typescript
 * inferFieldType("john@example.com")  // "email"
 * inferFieldType(42)                  // "number"
 * inferFieldType("https://example.com/image.png")  // "image"
 * ```
 */
export function inferFieldType(value: unknown): FieldType {
  if (value === null || value === undefined) return "string";

  const type = typeof value;

  if (type === "number") return "number";
  if (type === "boolean") return "boolean";

  if (type === "string") {
    const strValue = value as string;

    // URL 패턴
    if (/^https?:\/\/.+/.test(strValue)) {
      // 이미지 확장자
      if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(strValue)) {
        return "image";
      }
      return "url";
    }

    // 이메일 패턴
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
      return "email";
    }

    // ISO 날짜 패턴 (예: 2024-01-15, 2024-01-15T10:30:00Z)
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(strValue)) {
      return "date";
    }
  }

  return "string";
}

/**
 * 데이터 배열에서 컬럼을 자동 감지하고 ColumnMapping 생성
 *
 * @param data - 데이터 배열
 * @returns 자동 감지된 ColumnMapping
 *
 * @example
 * ```typescript
 * const data = [
 *   { id: 1, name: "John", email: "john@example.com", age: 30 },
 *   { id: 2, name: "Jane", email: "jane@example.com", age: 25 }
 * ];
 *
 * const columns = detectColumnsFromData(data);
 * // {
 * //   id: { key: "id", label: "Id", type: "number", visible: true, order: 0 },
 * //   name: { key: "name", label: "Name", type: "string", visible: true, order: 1 },
 * //   email: { key: "email", label: "Email", type: "email", visible: true, order: 2 },
 * //   age: { key: "age", label: "Age", type: "number", visible: true, order: 3 }
 * // }
 * ```
 */
export function detectColumnsFromData(
  data: Record<string, unknown>[]
): ColumnMapping {
  if (!data || data.length === 0) return {};

  const firstItem = data[0];
  const columnMapping: ColumnMapping = {};

  Object.entries(firstItem).forEach(([key, value], index) => {
    columnMapping[key] = {
      key,
      label: formatFieldLabel(key),
      type: inferFieldType(value),
      visible: true,
      order: index,
    };
  });

  return columnMapping;
}

/**
 * 필드 키를 사람이 읽기 좋은 레이블로 변환
 *
 * @param key - 필드 키 (예: "user_name", "firstName", "USER_EMAIL")
 * @returns 포맷된 레이블 (예: "User Name", "First Name", "User Email")
 *
 * @example
 * ```typescript
 * formatFieldLabel("user_name")     // "User Name"
 * formatFieldLabel("firstName")     // "First Name"
 * formatFieldLabel("USER_EMAIL")    // "User Email"
 * formatFieldLabel("id")            // "Id"
 * ```
 */
export function formatFieldLabel(key: string): string {
  // snake_case → Title Case
  if (key.includes("_")) {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // camelCase → Title Case
  if (/[a-z][A-Z]/.test(key)) {
    return key
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // UPPERCASE → Title Case
  if (key === key.toUpperCase()) {
    return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  }

  // 기본: 첫 글자만 대문자
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * ColumnMapping에서 visible=true인 컬럼만 필터링하고 order 순서대로 정렬
 *
 * @param columnMapping - 전체 ColumnMapping
 * @returns 정렬된 visible 컬럼 배열
 *
 * @example
 * ```typescript
 * const columnMapping = {
 *   id: { key: "id", visible: false, order: 0 },
 *   name: { key: "name", visible: true, order: 2 },
 *   email: { key: "email", visible: true, order: 1 }
 * };
 *
 * const visible = getVisibleColumns(columnMapping);
 * // [
 * //   { key: "email", visible: true, order: 1 },
 * //   { key: "name", visible: true, order: 2 }
 * // ]
 * ```
 */
export function getVisibleColumns(
  columnMapping: ColumnMapping
): FieldDefinition[] {
  return Object.values(columnMapping)
    .filter((field) => field.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * 타입별 기본 표시 포맷 가져오기
 *
 * @param type - FieldType
 * @returns 타입에 맞는 포맷 힌트
 */
export function getDefaultFormatForType(type: FieldType): string {
  switch (type) {
    case "date":
      return "YYYY-MM-DD";
    case "number":
      return "0,0";
    case "boolean":
      return "✓/✗";
    case "email":
      return "mailto link";
    case "url":
      return "hyperlink";
    case "image":
      return "thumbnail";
    default:
      return "text";
  }
}
