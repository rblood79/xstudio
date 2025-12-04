/**
 * Column Detector Utility
 *
 * API 응답 데이터에서 컬럼을 자동 감지하고 타입을 추론합니다.
 */

import type { DataFieldType, DataField } from "../../../../types/builder/data.types";

export interface DetectedColumn {
  key: string;
  label: string;
  type: DataFieldType;
  sampleValue: unknown;
  selected: boolean;
}

/**
 * 값의 타입을 추론합니다.
 */
function inferType(value: unknown): DataFieldType {
  if (value === null || value === undefined) {
    return "string";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  if (typeof value === "object") {
    return "object";
  }

  if (typeof value === "string") {
    // 이메일 패턴 체크
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "email";
    }

    // URL 패턴 체크
    if (/^https?:\/\/.+/.test(value)) {
      return "url";
    }

    // 이미지 URL 체크
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(value)) {
      return "image";
    }

    // ISO 날짜+시간 패턴 체크
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      return "datetime";
    }

    // ISO 날짜 패턴 체크
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return "date";
    }

    return "string";
  }

  return "string";
}

/**
 * 키를 레이블로 변환합니다.
 * snake_case, camelCase를 Title Case로 변환
 */
function keyToLabel(key: string): string {
  return key
    // snake_case → space separated
    .replace(/_/g, " ")
    // camelCase → space separated
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // 첫 글자 대문자
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * API 응답 데이터에서 컬럼을 감지합니다.
 *
 * @param data API 응답 데이터 (배열)
 * @returns 감지된 컬럼 목록
 */
export function detectColumns(data: unknown): DetectedColumn[] {
  // 배열이 아니면 빈 배열 반환
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // 첫 번째 아이템에서 키 추출
  const firstItem = data[0];
  if (typeof firstItem !== "object" || firstItem === null) {
    return [];
  }

  const columns: DetectedColumn[] = [];
  const keys = Object.keys(firstItem);

  for (const key of keys) {
    // 여러 아이템에서 샘플 값 수집하여 가장 정확한 타입 추론
    let inferredType: DataFieldType = "string";
    let sampleValue: unknown = null;

    // 최대 5개 아이템에서 타입 추론
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const item = data[i] as Record<string, unknown>;
      const value = item[key];

      if (value !== null && value !== undefined) {
        sampleValue = value;
        inferredType = inferType(value);

        // null이 아닌 값을 찾으면 타입 확정
        if (inferredType !== "string") {
          break;
        }
      }
    }

    columns.push({
      key,
      label: keyToLabel(key),
      type: inferredType,
      sampleValue,
      selected: true, // 기본적으로 모두 선택
    });
  }

  return columns;
}

/**
 * DetectedColumn 배열을 DataField 배열로 변환합니다.
 */
export function columnsToSchema(columns: DetectedColumn[]): DataField[] {
  return columns
    .filter((col) => col.selected)
    .map((col) => ({
      key: col.key,
      type: col.type,
      label: col.label,
      required: false,
    }));
}

/**
 * 데이터에서 선택된 컬럼만 추출합니다.
 */
export function extractSelectedData(
  data: unknown[],
  selectedKeys: string[]
): Record<string, unknown>[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => {
    const filtered: Record<string, unknown> = {};
    const record = item as Record<string, unknown>;

    for (const key of selectedKeys) {
      if (key in record) {
        filtered[key] = record[key];
      }
    }

    return filtered;
  });
}
