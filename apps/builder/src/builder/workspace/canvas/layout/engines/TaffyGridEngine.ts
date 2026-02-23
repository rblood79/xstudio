/**
 * Taffy 기반 CSS Grid 레이아웃 엔진
 *
 * 기존 GridEngine의 커스텀 JS 구현 대신 Taffy WASM의 네이티브 Grid 지원을 사용합니다.
 * Feature Flag(taffyGrid)가 활성화된 경우에만 사용됩니다.
 *
 * CSS Grid 속성 → TaffyStyle 변환 포함:
 * - gridTemplateColumns / gridTemplateRows (트랙 배열)
 * - gridAutoFlow, gridAutoColumns, gridAutoRows
 * - gridColumn / gridRow (line 기반 배치: "1 / 3", "span 2")
 * - gridArea (숫자 기반 shorthand: "row-start / col-start / row-end / col-end")
 * - gap / rowGap / columnGap
 * - justifyContent / justifyItems / alignItems / alignContent
 * - justifySelf / alignSelf (아이템)
 *
 * @since 2026-02-17 Phase 6 - Grid → Taffy Grid 통합
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { TaffyLayout } from '../../wasm-bindings/taffyLayout';
import type { TaffyStyle, TaffyNodeHandle } from '../../wasm-bindings/taffyLayout';
import { DropflowBlockEngine } from './DropflowBlockEngine';
import { parseMargin, parsePadding, parseBorder } from './utils';
import { resolveStyle, ROOT_COMPUTED_STYLE } from './cssResolver';
import type { ComputedStyle } from './cssResolver';
import { resolveCSSSizeValue } from './cssValueParser';
import type { CSSValueContext } from './cssValueParser';

// ─── CSS 파싱 유틸리티 ────────────────────────────────────────────────

/**
 * CSS 값을 Taffy 차원 문자열로 변환
 * - number → "Npx"
 * - string (%, px 등) → 그대로 전달
 * - undefined | null | 'auto' → undefined
 */
function dimStr(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined;
  if (typeof value === 'number') return `${value}px`;
  return value;
}

/**
 * RC-3: CSS prop → number | string 파서 (단위 정규화 적용)
 *
 * rem, em, vh, vw, calc() 등을 resolveCSSSizeValue()로 해석.
 * % 값은 Taffy 네이티브 % 처리를 위해 문자열 그대로 반환.
 */
function parseCSSPropWithContext(
  value: unknown,
  ctx: CSSValueContext = {},
): number | string | undefined {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (value.endsWith('%')) return value;
    if (value === 'fit-content' || value === 'min-content' || value === 'max-content') return undefined;
    const px = resolveCSSSizeValue(value, ctx);
    if (px !== undefined && px >= 0) return px;
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return undefined;
}

/**
 * CSS grid-template 문자열을 트랙 배열로 파싱
 *
 * 예) "1fr 1fr 1fr" → ["1fr", "1fr", "1fr"]
 *     "200px auto 1fr" → ["200px", "auto", "1fr"]
 *     "repeat(3, 1fr)" → ["1fr", "1fr", "1fr"]
 *     "minmax(100px, 1fr) 200px" → ["minmax(100px, 1fr)", "200px"]
 *
 * repeat() 함수는 중첩 괄호를 고려하지 않는 단순 파서입니다.
 */
function parseGridTemplateToTrackArray(
  template: string | undefined,
  containerSize?: number,
  gap?: number,
): string[] {
  if (!template || template.trim() === '') return [];

  const result: string[] = [];
  // 최상위 토큰 분리 (중첩 괄호 고려)
  const tokens = tokenizeGridTemplate(template.trim());

  for (const token of tokens) {
    const t = token.trim();
    if (!t) continue;

    if (t.startsWith('repeat(')) {
      const expanded = expandRepeatToken(t, containerSize ?? 0, gap ?? 0);
      for (const e of expanded) {
        result.push(e);
      }
    } else {
      result.push(t);
    }
  }

  return result;
}

/**
 * 단일 repeat() 토큰을 전개합니다.
 *
 * 지원:
 * - repeat(3, 1fr) -> ["1fr", "1fr", "1fr"]
 * - repeat(2, 100px 200px) -> ["100px", "200px", "100px", "200px"]
 * - repeat(auto-fill, minmax(200px, 1fr)) -> containerSize 기반 동적 트랙 수
 * - repeat(auto-fit, ...) -> auto-fill과 동일 (빈 트랙 축소는 Taffy가 처리)
 */
function expandRepeatToken(
  expr: string,
  containerSize: number,
  gap: number,
): string[] {
  // "repeat(" ... ")" -> 내부 추출
  const inner = expr.slice(expr.indexOf('(') + 1, expr.lastIndexOf(')'));

  // 첫 번째 콤마 위치 (괄호 내 콤마 무시)
  let depth = 0;
  let firstComma = -1;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++;
    else if (inner[i] === ')') depth--;
    else if (inner[i] === ',' && depth === 0) {
      firstComma = i;
      break;
    }
  }

  if (firstComma === -1) return [expr]; // 파싱 실패 -> 원본 반환

  const countStr = inner.slice(0, firstComma).trim();
  const trackListStr = inner.slice(firstComma + 1).trim();
  const patternTokens = tokenizeGridTemplate(trackListStr);

  let repeatCount: number;
  if (countStr === 'auto-fill' || countStr === 'auto-fit') {
    // 패턴 당 최소 크기 합산
    let patternMinSize = 0;
    for (const token of patternTokens) {
      if (token.startsWith('minmax(')) {
        const minInner = token.slice(7, token.lastIndexOf(')'));
        const minPart = minInner.split(',')[0]?.trim() ?? '0';
        if (minPart.endsWith('px')) {
          patternMinSize += parseFloat(minPart) || 0;
        }
      } else if (token.endsWith('px')) {
        patternMinSize += parseFloat(token) || 0;
      }
      // fr, auto 등은 최소 크기 0
    }

    if (patternMinSize <= 0) {
      repeatCount = 1;
    } else {
      // 패턴 내부 토큰 간 gap 포함한 1회 반복 크기
      const patternTotalSize = patternMinSize + gap * (patternTokens.length - 1);
      // 반복 간 gap 포함: (containerSize + gap) / (patternTotalSize + gap)
      repeatCount = Math.max(1, Math.floor(
        (containerSize + gap) / (patternTotalSize + gap)
      ));
    }
  } else {
    repeatCount = parseInt(countStr, 10) || 1;
  }

  const tracks: string[] = [];
  for (let i = 0; i < repeatCount; i++) {
    for (const token of patternTokens) {
      tracks.push(token);
    }
  }

  return tracks;
}

/**
 * grid-template 문자열을 토큰 배열로 분리합니다.
 * minmax(100px, 1fr) 같은 함수 표현식은 하나의 토큰으로 처리합니다.
 */
function tokenizeGridTemplate(template: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < template.length; i++) {
    const ch = template[i];
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ' ' && depth === 0) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  return tokens;
}

/**
 * CSS grid-column / grid-row 단축 속성을 start/end로 분리합니다.
 *
 * 예) "1 / 3" → { start: "1", end: "3" }
 *     "span 2" → { start: "span 2", end: "auto" }
 *     "2" → { start: "2", end: "auto" }
 *     "1 / span 2" → { start: "1", end: "span 2" }
 */
function parseGridLineShorthand(value: string): { start: string; end: string } {
  const trimmed = value.trim();
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx !== -1) {
    return {
      start: trimmed.slice(0, slashIdx).trim(),
      end: trimmed.slice(slashIdx + 1).trim(),
    };
  }
  return { start: trimmed, end: 'auto' };
}

/**
 * CSS grid-area 단축 속성을 row-start / col-start / row-end / col-end로 분리합니다.
 *
 * 지원 형식:
 * - "1 / 2 / 3 / 4" (숫자 기반)
 * - "header" (이름 기반 — templateAreas에서 해석)
 */
function parseGridAreaShorthand(
  value: string,
  templateAreas?: TemplateAreasMap,
): { rowStart: string; colStart: string; rowEnd: string; colEnd: string } | null {
  if (value.includes('/')) {
    const parts = value.split('/').map(s => s.trim());
    if (parts.length === 4) {
      return {
        rowStart: parts[0],
        colStart: parts[1],
        rowEnd: parts[2],
        colEnd: parts[3],
      };
    }
    return null;
  }

  // 이름 기반 영역: templateAreas에서 찾아서 숫자로 변환
  if (templateAreas) {
    const area = templateAreas.get(value);
    if (area) {
      return {
        rowStart: String(area.rowStart),
        colStart: String(area.colStart),
        rowEnd: String(area.rowEnd),
        colEnd: String(area.colEnd),
      };
    }
  }

  return null;
}

/** grid-template-areas 파싱 결과 타입 */
type TemplateAreasMap = Map<string, {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}>;

/**
 * CSS grid-template-areas 문자열을 파싱하여 영역 맵 생성
 *
 * 입력: '"header header" "sidebar main" "footer footer"'
 * 출력: Map { "header" => {rowStart:1, rowEnd:2, colStart:1, colEnd:3}, ... }
 */
function parseGridTemplateAreas(template: string | undefined): TemplateAreasMap | undefined {
  if (!template) return undefined;

  const areas: TemplateAreasMap = new Map();
  const rows = template.match(/"[^"]+"/g);
  if (!rows) return undefined;

  rows.forEach((row, rowIndex) => {
    const cells = row.replace(/"/g, '').trim().split(/\s+/);
    cells.forEach((cellName, colIndex) => {
      if (cellName === '.') return;

      const existing = areas.get(cellName);
      if (existing) {
        existing.rowEnd = Math.max(existing.rowEnd, rowIndex + 2);
        existing.colEnd = Math.max(existing.colEnd, colIndex + 2);
      } else {
        areas.set(cellName, {
          rowStart: rowIndex + 1,
          rowEnd: rowIndex + 2,
          colStart: colIndex + 1,
          colEnd: colIndex + 2,
        });
      }
    });
  });

  return areas.size > 0 ? areas : undefined;
}

// ─── Style 변환 ────────────────────────────────────────────────────────

/**
 * Element의 CSS Grid 스타일을 TaffyStyle로 변환합니다.
 *
 * 컨테이너 속성(display, gridTemplate*, gap 등)과
 * 아이템 속성(gridColumn, gridRow, gridArea, alignSelf 등)을 모두 변환합니다.
 */
export function elementToTaffyGridStyle(
  element: Element,
  _computedStyle?: ComputedStyle,
  templateAreas?: TemplateAreasMap,
  ctx: CSSValueContext = {},
): TaffyStyle {
  const style = (element.props?.style || {}) as Record<string, unknown>;
  const result: TaffyStyle = {};

  // --- Display ---
  const display = style.display as string | undefined;
  if (display === 'grid' || display === 'inline-grid') {
    result.display = 'grid';
  } else if (display === 'none') {
    result.display = 'none';
  } else {
    result.display = 'grid';
  }

  // --- Position ---
  if (style.position === 'absolute' || style.position === 'fixed') {
    result.position = 'absolute';
  }

  // --- Size ---
  const widthStr = dimStr(parseCSSPropWithContext(style.width, ctx));
  const heightStr = dimStr(parseCSSPropWithContext(style.height, ctx));
  if (widthStr) result.width = widthStr;
  if (heightStr) result.height = heightStr;

  const minW = dimStr(parseCSSPropWithContext(style.minWidth, ctx));
  const minH = dimStr(parseCSSPropWithContext(style.minHeight, ctx));
  const maxW = dimStr(parseCSSPropWithContext(style.maxWidth, ctx));
  const maxH = dimStr(parseCSSPropWithContext(style.maxHeight, ctx));
  if (minW) result.minWidth = minW;
  if (minH) result.minHeight = minH;
  if (maxW) result.maxWidth = maxW;
  if (maxH) result.maxHeight = maxH;

  // --- Grid container: 트랙 정의 ---
  const gridTemplateColumns = style.gridTemplateColumns as string | undefined;
  const gridTemplateRows = style.gridTemplateRows as string | undefined;
  const gridAutoColumns = style.gridAutoColumns as string | undefined;
  const gridAutoRows = style.gridAutoRows as string | undefined;

  const colTracks = parseGridTemplateToTrackArray(gridTemplateColumns);
  const rowTracks = parseGridTemplateToTrackArray(gridTemplateRows);
  const autoColTracks = parseGridTemplateToTrackArray(gridAutoColumns);
  const autoRowTracks = parseGridTemplateToTrackArray(gridAutoRows);

  if (colTracks.length > 0) result.gridTemplateColumns = colTracks;
  if (rowTracks.length > 0) result.gridTemplateRows = rowTracks;
  if (autoColTracks.length > 0) result.gridAutoColumns = autoColTracks;
  if (autoRowTracks.length > 0) result.gridAutoRows = autoRowTracks;

  // --- Grid container: auto-flow ---
  const gridAutoFlow = style.gridAutoFlow as string | undefined;
  if (gridAutoFlow) {
    result.gridAutoFlow = gridAutoFlow as TaffyStyle['gridAutoFlow'];
  }

  // --- Grid container: 정렬 ---
  // place-items shorthand 파싱: "align-items justify-items" 또는 단일값
  // 개별 속성(alignItems, justifyItems)이 이미 설정되어 있으면 shorthand보다 우선합니다.
  let resolvedAlignItems = style.alignItems as string | undefined;
  let resolvedJustifyItems = style.justifyItems as string | undefined;
  if (style.placeItems) {
    const parts = String(style.placeItems).split(/\s+/);
    resolvedAlignItems = resolvedAlignItems ?? parts[0];
    resolvedJustifyItems = resolvedJustifyItems ?? (parts[1] ?? parts[0]);
  }

  // place-content shorthand 파싱: "align-content justify-content" 또는 단일값
  // 개별 속성(alignContent, justifyContent)이 이미 설정되어 있으면 shorthand보다 우선합니다.
  let resolvedAlignContent = style.alignContent as string | undefined;
  let resolvedJustifyContent = style.justifyContent as string | undefined;
  if (style.placeContent) {
    const parts = String(style.placeContent).split(/\s+/);
    resolvedAlignContent = resolvedAlignContent ?? parts[0];
    resolvedJustifyContent = resolvedJustifyContent ?? (parts[1] ?? parts[0]);
  }

  if (resolvedJustifyContent) {
    result.justifyContent = resolvedJustifyContent as TaffyStyle['justifyContent'];
  }
  if (resolvedJustifyItems) {
    result.justifyItems = resolvedJustifyItems as TaffyStyle['justifyItems'];
  }
  if (resolvedAlignItems) {
    result.alignItems = resolvedAlignItems as TaffyStyle['alignItems'];
  }
  if (resolvedAlignContent) {
    result.alignContent = resolvedAlignContent as TaffyStyle['alignContent'];
  }

  // --- Gap ---
  const gap = parseCSSPropWithContext(style.gap, ctx);
  const rowGap = parseCSSPropWithContext(style.rowGap, ctx);
  const columnGap = parseCSSPropWithContext(style.columnGap, ctx);
  if (gap !== undefined) {
    const gapStr = dimStr(gap);
    if (gapStr) {
      result.rowGap = gapStr;
      result.columnGap = gapStr;
    }
  }
  if (rowGap !== undefined) {
    const rg = dimStr(rowGap);
    if (rg) result.rowGap = rg;
  }
  if (columnGap !== undefined) {
    const cg = dimStr(columnGap);
    if (cg) result.columnGap = cg;
  }

  // --- Grid item: gridArea (숫자 기반 shorthand + 이름 기반 영역) ---
  const gridArea = style.gridArea as string | undefined;
  if (gridArea) {
    const area = parseGridAreaShorthand(gridArea, templateAreas);
    if (area) {
      result.gridRowStart = area.rowStart;
      result.gridRowEnd = area.rowEnd;
      result.gridColumnStart = area.colStart;
      result.gridColumnEnd = area.colEnd;
    } else if (import.meta.env.DEV) {
      console.warn(
        `[TaffyGridEngine] 유효하지 않은 gridArea 값: "${gridArea}"`,
        templateAreas ? '(정의된 영역: ' + [...templateAreas.keys()].join(', ') + ')' : '(templateAreas 미정의)',
      );
    }
  }

  // --- Grid item: gridColumn / gridRow (area가 해석되지 않은 경우만) ---
  if (!result.gridColumnStart && !result.gridRowStart) {
    const gridColumn = style.gridColumn as string | undefined;
    const gridRow = style.gridRow as string | undefined;

    if (gridColumn) {
      const { start, end } = parseGridLineShorthand(gridColumn);
      result.gridColumnStart = start;
      result.gridColumnEnd = end;
    }
    if (gridRow) {
      const { start, end } = parseGridLineShorthand(gridRow);
      result.gridRowStart = start;
      result.gridRowEnd = end;
    }
  }

  // --- Grid item: 직접 지정된 start/end (gridColumn/gridRow가 없는 경우) ---
  if (style.gridColumnStart !== undefined && !result.gridColumnStart) {
    result.gridColumnStart = String(style.gridColumnStart);
  }
  if (style.gridColumnEnd !== undefined && !result.gridColumnEnd) {
    result.gridColumnEnd = String(style.gridColumnEnd);
  }
  if (style.gridRowStart !== undefined && !result.gridRowStart) {
    result.gridRowStart = String(style.gridRowStart);
  }
  if (style.gridRowEnd !== undefined && !result.gridRowEnd) {
    result.gridRowEnd = String(style.gridRowEnd);
  }

  // --- Grid item: 자기 정렬 ---
  if (style.alignSelf) {
    result.alignSelf = style.alignSelf as TaffyStyle['alignSelf'];
  }
  if (style.justifySelf) {
    result.justifySelf = style.justifySelf as TaffyStyle['justifySelf'];
  }

  // --- Margin ---
  const margin = parseMargin(style);
  if (margin.top !== 0) result.marginTop = `${margin.top}px`;
  if (margin.right !== 0) result.marginRight = `${margin.right}px`;
  if (margin.bottom !== 0) result.marginBottom = `${margin.bottom}px`;
  if (margin.left !== 0) result.marginLeft = `${margin.left}px`;

  // --- Padding ---
  const padding = parsePadding(style);
  if (padding.top !== 0) result.paddingTop = `${padding.top}px`;
  if (padding.right !== 0) result.paddingRight = `${padding.right}px`;
  if (padding.bottom !== 0) result.paddingBottom = `${padding.bottom}px`;
  if (padding.left !== 0) result.paddingLeft = `${padding.left}px`;

  // --- Border ---
  const border = parseBorder(style);
  if (border.top !== 0) result.borderTop = `${border.top}px`;
  if (border.right !== 0) result.borderRight = `${border.right}px`;
  if (border.bottom !== 0) result.borderBottom = `${border.bottom}px`;
  if (border.left !== 0) result.borderLeft = `${border.left}px`;

  // --- Inset ---
  if (style.position === 'absolute' || style.position === 'fixed') {
    const top = parseCSSPropWithContext(style.top, ctx);
    const left = parseCSSPropWithContext(style.left, ctx);
    const right = parseCSSPropWithContext(style.right, ctx);
    const bottom = parseCSSPropWithContext(style.bottom, ctx);
    if (top !== undefined) result.insetTop = dimStr(top);
    if (left !== undefined) result.insetLeft = dimStr(left);
    if (right !== undefined) result.insetRight = dimStr(right);
    if (bottom !== undefined) result.insetBottom = dimStr(bottom);
  }

  return result;
}

// ─── TaffyGridEngine ──────────────────────────────────────────────────

/** Taffy Grid 미가용 시 Dropflow Block 엔진으로 폴백 */
const dropflowGridFallback = new DropflowBlockEngine();

/** 싱글톤 TaffyLayout 인스턴스 (TaffyFlexEngine과 공유하지 않고 독립 관리) */
let taffyGridInstance: TaffyLayout | null = null;
let taffyGridInitFailed = false;

/**
 * Taffy Grid WASM 엔진 가용 여부
 *
 * selectEngine()에서 조기 라우팅 판단에 사용.
 */
export function isTaffyGridAvailable(): boolean {
  return !taffyGridInitFailed;
}

function getTaffyGridLayout(): TaffyLayout | null {
  if (taffyGridInitFailed) return null;
  if (!taffyGridInstance) {
    try {
      taffyGridInstance = new TaffyLayout();
    } catch (err) {
      taffyGridInitFailed = true;
      if (import.meta.env.DEV) {
        console.warn('[TaffyGridEngine] TaffyLayout creation failed:', err);
      }
      return null;
    }
  }
  if (!taffyGridInstance.isAvailable()) {
    taffyGridInitFailed = true;
    return null;
  }
  return taffyGridInstance;
}

/**
 * Taffy 기반 CSS Grid 레이아웃 엔진
 *
 * 기존 GridEngine의 커스텀 JS 구현 대신 Taffy WASM의 네이티브 Grid 지원을 사용합니다.
 * Taffy 0.9의 CSS Grid 기능(features = ["grid"])을 활용합니다.
 *
 * shouldDelegate = false이므로 BuilderCanvas에서 calculate()를 직접 호출합니다.
 */
export class TaffyGridEngine implements LayoutEngine {
  readonly displayTypes = ['grid', 'inline-grid'];

  /**
   * Taffy 엔진은 자체적으로 레이아웃을 계산하므로 위임하지 않음
   */
  readonly shouldDelegate = false;

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext,
  ): ComputedLayout[] {
    // 빈 children은 WASM 호출 없이 즉시 반환
    if (children.length === 0) {
      return [];
    }

    const taffy = getTaffyGridLayout();

    // Taffy WASM이 아직 로드되지 않았으면 Dropflow Block 엔진으로 위임
    if (!taffy) {
      return dropflowGridFallback.calculate(parent, children, availableWidth, availableHeight, context);
    }

    // ── CSS 상속 체인 구성 ──────────────────────────────────────────
    // 부모의 computed style 결정:
    //   - context에 parentComputedStyle이 있으면 사용 (상위 엔진에서 전파됨)
    //   - 없으면 부모 요소 style을 ROOT_COMPUTED_STYLE 기반으로 직접 해석
    const parentRawStyle = parent.props?.style as Record<string, unknown> | undefined;
    const parentComputed = context?.parentComputedStyle
      ?? resolveStyle(parentRawStyle, ROOT_COMPUTED_STYLE);

    // RC-3: CSS 단위 해석용 컨텍스트 구성
    // parentSize: 부모의 computedStyle.fontSize를 em 단위 기준으로 전달
    // rootFontSize: rem 단위 기준 (16px 고정 — 루트 font-size 기본값)
    const cssCtx: CSSValueContext = {
      viewportWidth: context?.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1920),
      viewportHeight: context?.viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 1080),
      parentSize: parentComputed.fontSize,
      rootFontSize: 16,
    };

    try {
      return this.computeWithTaffy(taffy, parent, children, availableWidth, availableHeight, parentComputed, cssCtx);
    } finally {
      // 매 계산 후 트리를 클리어하여 메모리 누적 방지
      try {
        taffy.clear();
      } catch (cleanupError) {
        if (import.meta.env.DEV) {
          console.warn('[TaffyGridEngine] cleanup error:', cleanupError);
        }
      }
    }
  }

  private computeWithTaffy(
    taffy: TaffyLayout,
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    parentComputed: ComputedStyle,
    cssCtx: CSSValueContext = {},
  ): ComputedLayout[] {
    // grid-template-areas 파싱 (자식 gridArea 해석에 필요)
    const parentRawStyle = (parent.props?.style || {}) as Record<string, unknown>;
    const templateAreas = parseGridTemplateAreas(
      parentRawStyle.gridTemplateAreas as string | undefined,
    );

    // 1. 자식 노드 생성 (grid item 속성 포함)
    const childHandles: TaffyNodeHandle[] = [];
    const childMap = new Map<TaffyNodeHandle, Element>();

    for (const child of children) {
      const childRawStyle = child.props?.style as Record<string, unknown> | undefined;
      // 부모 computed style 기반으로 자식 CSS 상속 해석 (em 단위 등)
      const childComputed = resolveStyle(childRawStyle, parentComputed);
      const taffyStyle = elementToTaffyGridStyle(child, childComputed, templateAreas, cssCtx);
      // 자식 노드는 grid item이므로 display를 grid로 강제하지 않음
      // Taffy는 grid 컨테이너 내에서 아이템을 자동으로 처리함
      // grid item에서 display 속성은 아이템 자체의 inner display를 의미하므로 제거
      delete taffyStyle.display;
      const handle = taffy.createNode(taffyStyle);
      childHandles.push(handle);
      childMap.set(handle, child);
    }

    // 2. 부모 노드 생성 (grid container 속성)
    const parentStyle = elementToTaffyGridStyle(parent, parentComputed, undefined, cssCtx);
    // 부모의 display는 반드시 grid
    parentStyle.display = 'grid';
    // 부모의 width/height는 available space로 설정
    parentStyle.width = availableWidth;
    // RC-1: sentinel(-1) = height:auto → parentStyle.height 생략 → Taffy가 콘텐츠 기반 계산
    if (availableHeight >= 0) {
      parentStyle.height = availableHeight;
    }

    // repeat(auto-fill/auto-fit) 전개를 위해 gap과 containerSize 기반으로 재파싱
    const gapParsed = parseCSSPropWithContext(parentRawStyle.gap, cssCtx);
    const gapPx = typeof gapParsed === 'number' ? gapParsed :
      (typeof gapParsed === 'string' ? parseFloat(gapParsed) || 0 : 0);
    const colGapParsed = parseCSSPropWithContext(parentRawStyle.columnGap, cssCtx);
    const colGapPx = colGapParsed !== undefined ?
      (typeof colGapParsed === 'number' ? colGapParsed : parseFloat(String(colGapParsed)) || 0) : gapPx;
    const rowGapParsed = parseCSSPropWithContext(parentRawStyle.rowGap, cssCtx);
    const rowGapPx = rowGapParsed !== undefined ?
      (typeof rowGapParsed === 'number' ? rowGapParsed : parseFloat(String(rowGapParsed)) || 0) : gapPx;

    const colTracksWithSize = parseGridTemplateToTrackArray(
      parentRawStyle.gridTemplateColumns as string | undefined,
      availableWidth,
      colGapPx,
    );
    const rowTracksWithSize = parseGridTemplateToTrackArray(
      parentRawStyle.gridTemplateRows as string | undefined,
      availableHeight,
      rowGapPx,
    );
    if (colTracksWithSize.length > 0) parentStyle.gridTemplateColumns = colTracksWithSize;
    if (rowTracksWithSize.length > 0) parentStyle.gridTemplateRows = rowTracksWithSize;
    // 부모의 padding/border는 이미 availableWidth에서 제외되어 있으므로 0으로 리셋
    parentStyle.paddingTop = 0;
    parentStyle.paddingRight = 0;
    parentStyle.paddingBottom = 0;
    parentStyle.paddingLeft = 0;
    parentStyle.borderTop = 0;
    parentStyle.borderRight = 0;
    parentStyle.borderBottom = 0;
    parentStyle.borderLeft = 0;

    const rootHandle = taffy.createNodeWithChildren(parentStyle, childHandles);

    // 3. 레이아웃 계산
    taffy.computeLayout(rootHandle, availableWidth, availableHeight);

    // 4. 결과 수집 (배치 API 사용)
    const layoutMap = taffy.getLayoutsBatch(childHandles);
    const results: ComputedLayout[] = [];

    for (const handle of childHandles) {
      const child = childMap.get(handle);
      const layout = layoutMap.get(handle);
      if (!child || !layout) continue;

      const margin = parseMargin(child.props?.style as Record<string, unknown> | undefined);

      results.push({
        elementId: child.id,
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        margin: {
          top: margin.top,
          right: margin.right,
          bottom: margin.bottom,
          left: margin.left,
        },
      });
    }

    return results;
  }
}
