/**
 * Figma 통합 타입 정의
 * Figma API 및 플러그인 연동을 위한 타입
 */

import type { DesignToken } from './token.types';

// ===== Figma API 타입 =====

/**
 * Figma 파일 정보
 */
export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  role: 'owner' | 'viewer' | 'editor';
}

/**
 * Figma 색상 스타일
 */
export interface FigmaColorStyle {
  id: string;
  name: string;
  description?: string;
  styleType: 'FILL';
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  color?: {
    r: number; // 0-1
    g: number; // 0-1
    b: number; // 0-1
    a: number; // 0-1
  };
  gradient?: FigmaGradient;
}

/**
 * Figma 그라디언트
 */
export interface FigmaGradient {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR';
  stops: Array<{
    position: number; // 0-1
    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  }>;
}

/**
 * Figma 텍스트 스타일
 */
export interface FigmaTextStyle {
  id: string;
  name: string;
  description?: string;
  styleType: 'TEXT';
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number | { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
  letterSpacing: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
  textCase?: 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'UNDERLINE' | 'STRIKETHROUGH';
}

/**
 * Figma 효과 스타일 (Shadow, Blur)
 */
export interface FigmaEffectStyle {
  id: string;
  name: string;
  description?: string;
  styleType: 'EFFECT';
  effects: FigmaEffect[];
}

export interface FigmaEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  offset?: {
    x: number;
    y: number;
  };
  spread?: number;
}

/**
 * Figma Variable (신규 기능)
 */
export interface FigmaVariable {
  id: string;
  name: string;
  description?: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, FigmaVariableValue>;
  scopes: string[];
  hiddenFromPublishing: boolean;
}

export type FigmaVariableValue =
  | { type: 'COLOR'; color: { r: number; g: number; b: number; a: number } }
  | { type: 'FLOAT'; value: number }
  | { type: 'STRING'; value: string }
  | { type: 'BOOLEAN'; value: boolean }
  | { type: 'ALIAS'; id: string };

/**
 * Figma Variable Collection (모드 지원)
 */
export interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: Array<{
    modeId: string;
    name: string; // 'Light', 'Dark' 등
  }>;
  defaultModeId: string;
  variableIds: string[];
}

// ===== Import/Export 요청 타입 =====

/**
 * Figma 스타일 Import 요청
 */
export interface FigmaImportRequest {
  projectId: string;
  themeId: string;
  fileKey: string; // Figma 파일 키
  accessToken: string; // Figma Personal Access Token
  importColors?: boolean;
  importTextStyles?: boolean;
  importEffects?: boolean;
  importVariables?: boolean;
  conflictResolution?: 'skip' | 'overwrite' | 'rename'; // 충돌 해결 전략
}

/**
 * Figma 스타일 Export 요청
 */
export interface FigmaExportRequest {
  themeId: string;
  fileKey: string;
  accessToken: string;
  exportColors?: boolean;
  exportTextStyles?: boolean;
  exportEffects?: boolean;
  exportVariables?: boolean;
  mode?: 'create' | 'update'; // 생성 또는 업데이트
}

// ===== Import/Export 응답 타입 =====

/**
 * Figma Import 결과
 */
export interface FigmaImportResult {
  success: boolean;
  imported: {
    colors: number;
    textStyles: number;
    effects: number;
    variables: number;
    total: number;
  };
  skipped: number;
  errors: FigmaImportError[];
  tokens: DesignToken[];
}

/**
 * Figma Export 결과
 */
export interface FigmaExportResult {
  success: boolean;
  exported: {
    colors: number;
    textStyles: number;
    effects: number;
    variables: number;
    total: number;
  };
  errors: FigmaExportError[];
  figmaFileUrl: string;
}

/**
 * Import 에러
 */
export interface FigmaImportError {
  styleName: string;
  styleType: 'color' | 'text' | 'effect' | 'variable';
  reason: string;
  details?: string;
}

/**
 * Export 에러
 */
export interface FigmaExportError {
  tokenName: string;
  tokenType: string;
  reason: string;
  details?: string;
}

// ===== 변환 매핑 =====

/**
 * Figma → DesignToken 매핑
 */
export interface FigmaToTokenMapping {
  figmaId: string;
  figmaName: string;
  tokenName: string;
  tokenType: string;
  conversionNotes?: string;
}

/**
 * DesignToken → Figma 매핑
 */
export interface TokenToFigmaMapping {
  tokenId: string;
  tokenName: string;
  figmaId?: string; // 이미 생성된 경우
  figmaName: string;
  figmaType: 'style' | 'variable';
}

// ===== 충돌 해결 =====

/**
 * Import 충돌 정보
 */
export interface ImportConflict {
  figmaStyle: FigmaColorStyle | FigmaTextStyle | FigmaEffectStyle | FigmaVariable;
  existingToken?: DesignToken;
  suggestedTokenName: string;
  conflictType: 'name' | 'value' | 'both';
}

/**
 * 충돌 해결 전략
 */
export type ConflictResolution = 'skip' | 'overwrite' | 'rename' | 'merge';

/**
 * 충돌 해결 액션
 */
export interface ConflictResolutionAction {
  conflictId: string;
  resolution: ConflictResolution;
  newTokenName?: string; // rename 시 사용
}

// ===== Figma Plugin 메시지 타입 =====

/**
 * Plugin → UI 메시지
 */
export type FigmaPluginMessage =
  | { type: 'styles-exported'; styles: FigmaColorStyle[] | FigmaTextStyle[] }
  | { type: 'variables-exported'; variables: FigmaVariable[] }
  | { type: 'import-complete'; result: FigmaImportResult }
  | { type: 'export-complete'; result: FigmaExportResult }
  | { type: 'error'; message: string };

/**
 * UI → Plugin 메시지
 */
export type FigmaUIMessage =
  | { type: 'export-styles'; tokens: DesignToken[] }
  | { type: 'export-variables'; tokens: DesignToken[] }
  | { type: 'import-request'; options: FigmaImportRequest }
  | { type: 'cancel' };

// ===== Figma API 응답 타입 =====

/**
 * Figma API 파일 응답
 */
export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

/**
 * Figma API 스타일 응답
 */
export interface FigmaStylesResponse {
  meta: {
    styles: Array<{
      key: string;
      file_key: string;
      node_id: string;
      style_type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
      thumbnail_url: string;
      name: string;
      description: string;
      created_at: string;
      updated_at: string;
      user: {
        id: string;
        handle: string;
        img_url: string;
      };
    }>;
  };
}

// ===== 변환 옵션 =====

/**
 * Figma 색상 → HSL 변환 옵션
 */
export interface FigmaColorConversionOptions {
  preserveAlpha?: boolean; // 투명도 유지 (기본 true)
  roundValues?: boolean; // HSL 값 반올림 (기본 true)
}

/**
 * 토큰 네이밍 규칙
 */
export interface TokenNamingRules {
  prefix?: string; // 접두사 (예: 'figma.')
  separator?: string; // 구분자 (기본 '.')
  caseStyle?: 'camel' | 'kebab' | 'snake'; // 네이밍 스타일
  removeSpecialChars?: boolean; // 특수문자 제거
  maxLength?: number; // 최대 길이
}

/**
 * Figma 네이밍 → 토큰 네이밍 변환 규칙
 */
export interface FigmaNamingConversion {
  replaceSlashWithDot?: boolean; // '/' → '.' (기본 true)
  lowerCase?: boolean; // 소문자 변환 (기본 true)
  removeNumbers?: boolean; // 숫자 제거 (기본 false)
}

// ===== Sync 상태 =====

/**
 * Figma 동기화 상태
 */
export interface FigmaSyncStatus {
  themeId: string;
  fileKey: string;
  lastSyncAt: string;
  lastSyncDirection: 'import' | 'export';
  syncedTokenCount: number;
  conflicts: number;
  status: 'synced' | 'out-of-sync' | 'conflict' | 'error';
}

/**
 * Figma 동기화 기록
 */
export interface FigmaSyncHistory {
  id: string;
  themeId: string;
  fileKey: string;
  direction: 'import' | 'export';
  timestamp: string;
  changes: {
    added: number;
    updated: number;
    deleted: number;
  };
  conflicts: ImportConflict[];
  success: boolean;
  errorMessage?: string;
}
