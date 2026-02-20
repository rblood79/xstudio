/**
 * 노드 타입별 CanvasKit 렌더 함수
 *
 * React 함수 컴포넌트(BoxSprite, TextSprite, ImageSprite)가
 * PixiJS 컨테이너에 `__skiaRender` 프로퍼티로 부착할 렌더 함수를 제공한다.
 *
 * SkiaRenderer가 PixiJS 씬 그래프를 순회하며 각 노드의
 * __skiaRender를 호출하여 CanvasKit으로 렌더링한다.
 *
 * @see docs/WASM.md §5.11 노드별 renderSkia() 구현
 */

import type { CanvasKit, Canvas, FontMgr, Paragraph, Image as SkImage, EmbindEnumEntity } from 'canvaskit-wasm';
import type { EffectStyle, FillStyle } from './types';
import type { ClipPathShape } from '../sprites/styleConverter';
import { applyFill } from './fills';
import { beginRenderEffects, endRenderEffects } from './effects';
import { toSkiaBlendMode } from './blendModes';
import { SkiaDisposable } from './disposable';
import { colord } from 'colord';
import { resolveFontVariantFeatures, resolveFontStretchWidth } from '../layout/engines/cssResolver';

// ============================================
// Text paragraph cache (Pencil-style)
// ============================================

const MAX_PARAGRAPH_CACHE_SIZE = 500;
const paragraphCache = new Map<string, Paragraph>();
let lastParagraphFontMgr: FontMgr | null = null;

function clearParagraphCache(): void {
  for (const paragraph of paragraphCache.values()) {
    paragraph.delete();
  }
  paragraphCache.clear();
}

export function clearTextParagraphCache(): void {
  clearParagraphCache();
}

// Vite HMR에서 모듈이 교체될 때 네이티브 paragraph 누수를 방지한다.
// (Paragraph는 GC 대상이 아니므로 명시적 delete가 필요)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearParagraphCache();
  });
}

function getCachedParagraph(key: string): Paragraph | undefined {
  const cached = paragraphCache.get(key);
  if (!cached) return undefined;
  // LRU: bump to the end
  paragraphCache.delete(key);
  paragraphCache.set(key, cached);
  return cached;
}

function setCachedParagraph(key: string, paragraph: Paragraph): void {
  const existing = paragraphCache.get(key);
  if (existing) {
    existing.delete();
    paragraphCache.delete(key);
  }

  paragraphCache.set(key, paragraph);
  if (paragraphCache.size <= MAX_PARAGRAPH_CACHE_SIZE) return;

  const oldestKey = paragraphCache.keys().next().value as string | undefined;
  if (!oldestKey) return;
  const oldest = paragraphCache.get(oldestKey);
  oldest?.delete();
  paragraphCache.delete(oldestKey);
}

// ============================================
// PixiJS 씬 노드에 부착하는 Skia 렌더 데이터 타입
// ============================================

/** PixiJS Container에 부착되는 Skia 렌더 정보 */
export interface SkiaNodeData {
  type: 'box' | 'text' | 'image' | 'container' | 'line';
  /** 이 노드를 소유한 element의 ID (AI 이펙트 타겟팅용) */
  elementId?: string;
  /** 노드 로컬 위치/크기 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 가시성 */
  visible: boolean;
  /** 이펙트 목록 */
  effects?: EffectStyle[];
  /** CSS mix-blend-mode (예: 'multiply', 'screen') */
  blendMode?: string;
  /** Box 전용 */
  box?: {
    fillColor: Float32Array;
    /** 그라디언트/이미지 등 고급 필 (있으면 fillColor 대신 사용) */
    fill?: FillStyle;
    /**
     * 모서리 반경
     * - number: 모든 모서리에 동일 적용
     * - [tl, tr, br, bl]: 각 모서리별 개별 적용 (CSS 순서)
     */
    borderRadius: number | [number, number, number, number];
    strokeColor?: Float32Array;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';
    /** QW-3: CSS outline (focus ring — box 외부에 그려짐) */
    outlineColor?: Float32Array;
    outlineWidth?: number;
    outlineOffset?: number;
  };
  /** Text 전용 */
  text?: {
    content: string;
    fontFamilies: string[];
    fontSize: number;
    fontWeight?: number;
    fontStyle?: number;
    color: Float32Array;
    align?: EmbindEnumEntity | 'left' | 'center' | 'right';
    letterSpacing?: number;
    wordSpacing?: number;
    lineHeight?: number;
    /** CanvasKit TextDecoration 비트마스크: underline=1, overline=2, lineThrough=4 */
    decoration?: number;
    paddingLeft: number;
    paddingTop: number;
    maxWidth: number;
    /** false이면 updateTextChildren에서 자동 중앙 정렬 스킵 (Card 등 다중 텍스트) */
    autoCenter?: boolean;
    verticalAlign?: 'top' | 'middle' | 'bottom' | 'baseline';
    whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';
    wordBreak?: 'normal' | 'break-all' | 'keep-all';
    overflowWrap?: 'normal' | 'break-word' | 'anywhere';
    /** text-overflow: ellipsis 처리 여부 */
    textOverflow?: 'ellipsis' | 'clip';
    /** text-decoration-style: solid, dashed, dotted, double, wavy */
    decorationStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'wavy';
    /** text-decoration-color (미지정 시 text color 사용) */
    decorationColor?: Float32Array;
    /** text-indent: 첫 줄 들여쓰기 (px) */
    textIndent?: number;
    /** CSS font-variant 값 (예: 'small-caps', 'oldstyle-nums') */
    fontVariant?: string;
    /** CSS font-stretch 값 (예: 'condensed', '75%') */
    fontStretch?: string;
  };
  /** Image 전용 */
  image?: {
    skImage: SkImage | null;
    contentX: number;
    contentY: number;
    contentWidth: number;
    contentHeight: number;
  };
  /** Line 전용 */
  line?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    strokeColor: Float32Array;
    strokeWidth: number;
  };
  /** CSS transform → CanvasKit 3x3 matrix (Float32Array(9)) */
  transform?: Float32Array;
  /** CSS clip-path 도형 (inset, circle, ellipse, polygon) */
  clipPath?: ClipPathShape;
  /** overflow:hidden/scroll/auto 시 자식을 경계에서 클리핑 */
  clipChildren?: boolean;
  /** overflow:scroll/auto 시 자식 좌표에 적용할 스크롤 오프셋 */
  scrollOffset?: { scrollTop: number; scrollLeft: number };
  /** 콘텐츠 기반 최소 높이 (Card 등 auto-height UI 컴포넌트용)
   *  Yoga가 텍스트 bounds를 아직 반영하지 못한 경우의 폴백으로 사용 */
  contentMinHeight?: number;
  /** z-index 값 (stacking order 정렬용) */
  zIndex?: number;
  /** 새로운 stacking context를 생성하는지 여부 */
  isStackingContext?: boolean;
  /** 자식 노드 데이터 */
  children?: SkiaNodeData[];
}

// ============================================
// Stacking Order
// ============================================

/**
 * CSS stacking order에 따른 자식 정렬 (안정 정렬)
 */
function sortByStackingOrder(children: SkiaNodeData[]): SkiaNodeData[] {
  const indexed = children.map((child, i) => ({ child, originalIndex: i }));
  indexed.sort((a, b) => {
    const zA = a.child.zIndex ?? 0;
    const zB = b.child.zIndex ?? 0;
    if (zA !== zB) return zA - zB;
    return a.originalIndex - b.originalIndex;
  });
  return indexed.map(item => item.child);
}

// ============================================
// 렌더 함수
// ============================================

/**
 * 단일 노드를 CanvasKit으로 렌더링한다.
 * 재귀적으로 자식도 렌더링한다.
 */
export function renderNode(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  cullingBounds: DOMRect,
  fontMgr?: FontMgr,
): void {
  const left = cullingBounds.x;
  const top = cullingBounds.y;
  renderNodeInternal(
    ck,
    canvas,
    node,
    left,
    top,
    left + cullingBounds.width,
    top + cullingBounds.height,
    fontMgr,
  );
}

function renderNodeInternal(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  cullLeft: number,
  cullTop: number,
  cullRight: number,
  cullBottom: number,
  fontMgr?: FontMgr,
): void {
  if (!node.visible) return;

  // AABB 컬링 — width/height=0 가상 컨테이너는 스킵 (자식에서 개별 컬링)
  if (node.width > 0 || node.height > 0) {
    const nodeLeft = node.x;
    const nodeTop = node.y;
    const nodeRight = nodeLeft + node.width;
    const nodeBottom = nodeTop + node.height;
    if (
      cullLeft > nodeRight ||
      cullRight < nodeLeft ||
      cullTop > nodeBottom ||
      cullBottom < nodeTop
    ) return;
  }

  // 캔버스 상태 저장 + 로컬 변환
  canvas.save();
  canvas.translate(node.x, node.y);

  // CSS transform 적용 (transform-origin 포함 3x3 matrix)
  if (node.transform) {
    canvas.concat(node.transform);
  }

  // CSS clip-path 적용
  if (node.clipPath) {
    const clipP = buildClipPath(ck, node.clipPath, node.width, node.height);
    if (clipP) {
      canvas.clipPath(clipP, ck.ClipOp.Intersect, true);
      clipP.delete();
    }
  }

  // blend mode 적용 (non-default인 경우 saveLayer로 분리)
  let hasBlendLayer = false;
  if (node.blendMode && node.blendMode !== 'normal') {
    const blendPaint = new ck.Paint();
    blendPaint.setBlendMode(toSkiaBlendMode(ck, node.blendMode) as Parameters<typeof blendPaint.setBlendMode>[0]);
    canvas.saveLayer(blendPaint);
    blendPaint.delete();
    hasBlendLayer = true;
  }

  // 이펙트 시작
  const layerCount = node.effects
    ? beginRenderEffects(ck, canvas, node.effects)
    : 0;

  // 타입별 렌더링
  switch (node.type) {
    case 'box':
      renderBox(ck, canvas, node);
      break;
    case 'text':
      if (fontMgr) renderText(ck, canvas, node, fontMgr);
      break;
    case 'image':
      renderImage(ck, canvas, node);
      break;
    case 'line':
      renderLine(ck, canvas, node);
      break;
    case 'container':
      // 컨테이너는 자체 콘텐츠 없음
      break;
  }

  // 자식 재귀 렌더링 — canvas.translate() 후 좌표계가 부모 로컬로 변환되었으므로
  // cullingBounds도 부모 오프셋만큼 역변환하여 좌표계를 일치시킨다.
  if (node.children) {
    // overflow:hidden/scroll/auto → 자식을 부모 경계에서 클리핑
    if (node.clipChildren && node.width > 0 && node.height > 0) {
      canvas.save();
      const clipRect = ck.LTRBRect(0, 0, node.width, node.height);
      canvas.clipRect(clipRect, ck.ClipOp.Intersect, true);
    }

    // overflow:scroll/auto → 스크롤 오프셋을 canvas 변환으로 적용
    const hasScrollOffset = node.scrollOffset &&
      (node.scrollOffset.scrollTop !== 0 || node.scrollOffset.scrollLeft !== 0);
    if (hasScrollOffset) {
      canvas.save();
      canvas.translate(-node.scrollOffset!.scrollLeft, -node.scrollOffset!.scrollTop);
    }

    const childCullLeft = cullLeft - node.x + (node.scrollOffset?.scrollLeft ?? 0);
    const childCullTop = cullTop - node.y + (node.scrollOffset?.scrollTop ?? 0);
    const childCullRight = cullRight - node.x + (node.scrollOffset?.scrollLeft ?? 0);
    const childCullBottom = cullBottom - node.y + (node.scrollOffset?.scrollTop ?? 0);
    const hasZIndex = node.children.some(c => c.zIndex !== undefined);
    const childrenToRender = hasZIndex ? sortByStackingOrder(node.children) : node.children;
    for (const child of childrenToRender) {
      renderNodeInternal(
        ck,
        canvas,
        child,
        childCullLeft,
        childCullTop,
        childCullRight,
        childCullBottom,
        fontMgr,
      );
    }

    // 스크롤 오프셋 변환 복원
    if (hasScrollOffset) {
      canvas.restore();
    }

    if (node.clipChildren && node.width > 0 && node.height > 0) {
      canvas.restore();
    }
  }

  // 이펙트 종료
  endRenderEffects(canvas, layerCount);
  // blend mode 레이어 복원
  if (hasBlendLayer) canvas.restore();
  // 캔버스 복원 (translate)
  canvas.restore();
}

/**
 * 개별 모서리 radius를 가진 둥근 사각형 Path 생성
 * CSS border-radius 순서: [top-left, top-right, bottom-right, bottom-left]
 */
function createRoundRectPath(
  ck: CanvasKit,
  x: number,
  y: number,
  width: number,
  height: number,
  radii: [number, number, number, number],
): ReturnType<CanvasKit['Path']['prototype']['constructor']> {
  const [tl, tr, br, bl] = radii;
  const maxRadius = Math.min(width, height) / 2;
  const rTL = Math.min(Math.max(0, tl), maxRadius);
  const rTR = Math.min(Math.max(0, tr), maxRadius);
  const rBR = Math.min(Math.max(0, br), maxRadius);
  const rBL = Math.min(Math.max(0, bl), maxRadius);

  const path = new ck.Path();

  // 시작점: top-left 모서리 끝
  path.moveTo(x + rTL, y);

  // Top edge
  path.lineTo(x + width - rTR, y);

  // Top-right corner
  if (rTR > 0) {
    path.arcToTangent(x + width, y, x + width, y + rTR, rTR);
  } else {
    path.lineTo(x + width, y);
  }

  // Right edge
  path.lineTo(x + width, y + height - rBR);

  // Bottom-right corner
  if (rBR > 0) {
    path.arcToTangent(x + width, y + height, x + width - rBR, y + height, rBR);
  } else {
    path.lineTo(x + width, y + height);
  }

  // Bottom edge
  path.lineTo(x + rBL, y + height);

  // Bottom-left corner
  if (rBL > 0) {
    path.arcToTangent(x, y + height, x, y + height - rBL, rBL);
  } else {
    path.lineTo(x, y + height);
  }

  // Left edge
  path.lineTo(x, y + rTL);

  // Top-left corner
  if (rTL > 0) {
    path.arcToTangent(x, y, x + rTL, y, rTL);
  } else {
    path.lineTo(x, y);
  }

  path.close();
  return path;
}

/**
 * ClipPathShape → CanvasKit Path 변환
 * 반환된 Path는 호출측에서 delete() 해야 한다.
 */
function buildClipPath(
  ck: CanvasKit,
  shape: ClipPathShape,
  width: number,
  height: number,
): ReturnType<CanvasKit['Path']['prototype']['constructor']> | null {
  switch (shape.type) {
    case 'inset': {
      const { top, right, bottom, left, borderRadius } = shape;
      const x = left;
      const y = top;
      const w = width - left - right;
      const h = height - top - bottom;
      if (w <= 0 || h <= 0) return null;
      const path = new ck.Path();
      if (borderRadius > 0) {
        const r = Math.min(borderRadius, Math.min(w, h) / 2);
        const rrect = ck.RRectXY(ck.LTRBRect(x, y, x + w, y + h), r, r);
        path.addRRect(rrect);
      } else {
        path.addRect(ck.LTRBRect(x, y, x + w, y + h));
      }
      return path;
    }

    case 'circle': {
      const { radius, cx, cy } = shape;
      const path = new ck.Path();
      path.addCircle(cx, cy, radius);
      return path;
    }

    case 'ellipse': {
      const { rx, ry, cx, cy } = shape;
      const path = new ck.Path();
      path.addOval(ck.LTRBRect(cx - rx, cy - ry, cx + rx, cy + ry));
      return path;
    }

    case 'polygon': {
      const { points } = shape;
      if (points.length < 3) return null;
      const path = new ck.Path();
      path.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        path.lineTo(points[i].x, points[i].y);
      }
      path.close();
      return path;
    }

    default:
      return null;
  }
}

// ============================================
// Border 렌더 헬퍼
// ============================================

type BorderRadius = number | [number, number, number, number];

type SkiaPaint = ReturnType<InstanceType<CanvasKit['Paint']>['constructor']>;

function parseSkiaColor(color: Float32Array): string {
  const r = Math.round(color[0] * 255);
  const g = Math.round(color[1] * 255);
  const b = Math.round(color[2] * 255);
  return `rgb(${r},${g},${b})`;
}

function hexToSkiaColor(hex: string, alpha: number): Float32Array {
  const c = colord(hex);
  const rgb = c.toRgb();
  return Float32Array.of(rgb.r / 255, rgb.g / 255, rgb.b / 255, alpha);
}

function drawStrokeShape(
  ck: CanvasKit,
  canvas: Canvas,
  paint: SkiaPaint,
  inset: number,
  width: number,
  height: number,
  br: BorderRadius,
  hasRadius: boolean,
  isArrayRadius: boolean,
): void {
  const strokeRect = ck.LTRBRect(inset, inset, width - inset, height - inset);
  if (hasRadius) {
    if (isArrayRadius) {
      const radii = br as [number, number, number, number];
      const innerRadii: [number, number, number, number] = [
        Math.max(0, radii[0] - inset),
        Math.max(0, radii[1] - inset),
        Math.max(0, radii[2] - inset),
        Math.max(0, radii[3] - inset),
      ];
      const path = createRoundRectPath(ck, inset, inset, width - inset * 2, height - inset * 2, innerRadii);
      canvas.drawPath(path, paint);
      path.delete();
    } else {
      const adjustedRadius = Math.max(0, (br as number) - inset);
      const rrect = ck.RRectXY(strokeRect, adjustedRadius, adjustedRadius);
      canvas.drawRRect(rrect, paint);
    }
  } else {
    canvas.drawRect(strokeRect, paint);
  }
}

function renderSolidBorder(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  paint: SkiaPaint,
  sw: number,
  br: BorderRadius,
  hasRadius: boolean,
  isArrayRadius: boolean,
  strokeStyle: 'solid' | 'dashed' | 'dotted' | undefined,
): void {
  const inset = sw / 2;
  paint.setStyle(ck.PaintStyle.Stroke);
  paint.setStrokeWidth(sw);
  paint.setColor(node.box!.strokeColor!);

  let dashEffect: ReturnType<typeof ck.PathEffect.MakeDash> | null = null;
  if (strokeStyle === 'dashed') {
    const dashLen = Math.max(sw * 3, 4);
    const gapLen = Math.max(sw * 2, 3);
    dashEffect = ck.PathEffect.MakeDash([dashLen, gapLen]);
    paint.setPathEffect(dashEffect);
  } else if (strokeStyle === 'dotted') {
    dashEffect = ck.PathEffect.MakeDash([sw, sw * 1.5]);
    paint.setPathEffect(dashEffect);
    paint.setStrokeCap(ck.StrokeCap.Round);
  }

  drawStrokeShape(ck, canvas, paint, inset, node.width, node.height, br, hasRadius, isArrayRadius);

  if (dashEffect) {
    paint.setPathEffect(null);
    dashEffect.delete();
  }
}

function renderDoubleBorder(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  paint: SkiaPaint,
  sw: number,
  br: BorderRadius,
  hasRadius: boolean,
  isArrayRadius: boolean,
): void {
  if (sw < 3) {
    renderSolidBorder(ck, canvas, node, paint, sw, br, hasRadius, isArrayRadius, 'solid');
    return;
  }

  const lineW = sw / 3;
  const color = node.box!.strokeColor!;

  paint.setStyle(ck.PaintStyle.Stroke);
  paint.setColor(color);
  paint.setStrokeWidth(lineW);

  drawStrokeShape(ck, canvas, paint, lineW / 2, node.width, node.height, br, hasRadius, isArrayRadius);
  drawStrokeShape(ck, canvas, paint, sw - lineW / 2, node.width, node.height, br, hasRadius, isArrayRadius);
}

function renderGrooveRidgeBorder(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  paint: SkiaPaint,
  sw: number,
  br: BorderRadius,
  hasRadius: boolean,
  isArrayRadius: boolean,
  style: 'groove' | 'ridge',
): void {
  const halfSw = sw / 2;
  const color = node.box!.strokeColor!;
  const alpha = color[3];
  const baseHex = parseSkiaColor(color);

  const darkColor = hexToSkiaColor(colord(baseHex).darken(0.3).toHex(), alpha);
  const lightColor = hexToSkiaColor(colord(baseHex).lighten(0.3).toHex(), alpha);

  const outerColor = style === 'groove' ? darkColor : lightColor;
  const innerColor = style === 'groove' ? lightColor : darkColor;

  paint.setStyle(ck.PaintStyle.Stroke);
  paint.setStrokeWidth(halfSw);

  paint.setColor(outerColor);
  drawStrokeShape(ck, canvas, paint, halfSw / 2, node.width, node.height, br, hasRadius, isArrayRadius);

  paint.setColor(innerColor);
  drawStrokeShape(ck, canvas, paint, halfSw + halfSw / 2, node.width, node.height, br, hasRadius, isArrayRadius);
}

function renderInsetOutsetBorder(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  paint: SkiaPaint,
  sw: number,
  br: BorderRadius,
  hasRadius: boolean,
  isArrayRadius: boolean,
  style: 'inset' | 'outset',
): void {
  const color = node.box!.strokeColor!;
  const alpha = color[3];
  const baseHex = parseSkiaColor(color);

  const darkColor = hexToSkiaColor(colord(baseHex).darken(0.3).toHex(), alpha);
  const lightColor = hexToSkiaColor(colord(baseHex).lighten(0.3).toHex(), alpha);

  const tlColor = style === 'inset' ? darkColor : lightColor;
  const brColor = style === 'inset' ? lightColor : darkColor;

  const inset = sw / 2;

  canvas.save();
  const tlClipPath = new ck.Path();
  tlClipPath.moveTo(0, 0);
  tlClipPath.lineTo(node.width, 0);
  tlClipPath.lineTo(node.width - sw, sw);
  tlClipPath.lineTo(sw, sw);
  tlClipPath.lineTo(sw, node.height - sw);
  tlClipPath.lineTo(0, node.height);
  tlClipPath.close();
  canvas.clipPath(tlClipPath, ck.ClipOp.Intersect, true);
  tlClipPath.delete();

  paint.setStyle(ck.PaintStyle.Stroke);
  paint.setStrokeWidth(sw);
  paint.setColor(tlColor);
  drawStrokeShape(ck, canvas, paint, inset, node.width, node.height, br, hasRadius, isArrayRadius);
  canvas.restore();

  canvas.save();
  const brClipPath = new ck.Path();
  brClipPath.moveTo(node.width, node.height);
  brClipPath.lineTo(0, node.height);
  brClipPath.lineTo(sw, node.height - sw);
  brClipPath.lineTo(node.width - sw, node.height - sw);
  brClipPath.lineTo(node.width - sw, sw);
  brClipPath.lineTo(node.width, 0);
  brClipPath.close();
  canvas.clipPath(brClipPath, ck.ClipOp.Intersect, true);
  brClipPath.delete();

  paint.setColor(brColor);
  drawStrokeShape(ck, canvas, paint, inset, node.width, node.height, br, hasRadius, isArrayRadius);
  canvas.restore();
}

/** Box 노드 렌더링 */
function renderBox(ck: CanvasKit, canvas: Canvas, node: SkiaNodeData): void {
  if (!node.box) return;

  const scope = new SkiaDisposable();
  try {
    const paint = scope.track(new ck.Paint());
    paint.setAntiAlias(true);
    paint.setStyle(ck.PaintStyle.Fill);

    // 고급 fill(그라디언트/이미지)이 있으면 applyFill 사용, 없으면 단색 fillColor 폴백
    let fillShader: { delete(): void } | null = null;
    if (node.box.fill) {
      fillShader = applyFill(ck, paint, node.box.fill);
      // 셰이더 생성 실패 시 fillColor로 폴백
      if (!fillShader) {
        paint.setColor(node.box.fillColor);
      }
    } else {
      paint.setColor(node.box.fillColor);
    }

    const rect = ck.LTRBRect(0, 0, node.width, node.height);
    const br = node.box.borderRadius;
    const isArrayRadius = Array.isArray(br);
    const hasRadius = isArrayRadius ? br.some(r => r > 0) : br > 0;

    if (hasRadius) {
      if (isArrayRadius) {
        // 개별 모서리 radius: Path로 그리기
        const path = createRoundRectPath(ck, 0, 0, node.width, node.height, br);
        canvas.drawPath(path, paint);
        path.delete();
      } else {
        const rrect = ck.RRectXY(rect, br, br);
        canvas.drawRRect(rrect, paint);
      }
    } else {
      canvas.drawRect(rect, paint);
    }

    // fill 렌더링 후 shader를 paint에서 분리하고 리소스 해제
    // paint.setShader(null)을 먼저 호출하여 dangling pointer 방지
    if (fillShader) {
      paint.setShader(null);
      fillShader.delete();
    }

    // Stroke (border-box: stroke를 요소 내부에 완전히 포함)
    // CanvasKit stroke는 경로 중앙에 그려지므로 strokeWidth/2 만큼 inset 필요
    if (node.box.strokeColor && node.box.strokeWidth) {
      const sw = node.box.strokeWidth;
      const strokeStyle = node.box.strokeStyle;

      paint.setShader(null);

      if (strokeStyle === 'double') {
        renderDoubleBorder(ck, canvas, node, paint, sw, br, hasRadius, isArrayRadius);
      } else if (strokeStyle === 'groove' || strokeStyle === 'ridge') {
        renderGrooveRidgeBorder(ck, canvas, node, paint, sw, br, hasRadius, isArrayRadius, strokeStyle);
      } else if (strokeStyle === 'inset' || strokeStyle === 'outset') {
        renderInsetOutsetBorder(ck, canvas, node, paint, sw, br, hasRadius, isArrayRadius, strokeStyle);
      } else {
        renderSolidBorder(ck, canvas, node, paint, sw, br, hasRadius, isArrayRadius, strokeStyle);
      }
    }

    // QW-3: CSS outline 렌더링 (focus ring — box 외부에 그려짐)
    if (node.box.outlineColor && node.box.outlineWidth && node.box.outlineWidth > 0) {
      const ow = node.box.outlineWidth;
      const oo = node.box.outlineOffset ?? 0;
      const expansion = oo + ow / 2;
      const ox = -expansion;
      const oy = -expansion;
      const ow2 = node.width + expansion * 2;
      const oh2 = node.height + expansion * 2;

      const outlinePaint = scope.track(new ck.Paint());
      outlinePaint.setAntiAlias(true);
      outlinePaint.setStyle(ck.PaintStyle.Stroke);
      outlinePaint.setStrokeWidth(ow);
      outlinePaint.setColor(node.box.outlineColor);

      const br = node.box.borderRadius;
      const isArrayBr = Array.isArray(br);
      const hasBr = isArrayBr ? br.some(r => r > 0) : br > 0;

      if (hasBr) {
        if (isArrayBr) {
          const radii = br as [number, number, number, number];
          const expanded: [number, number, number, number] = [
            Math.max(0, radii[0] + oo),
            Math.max(0, radii[1] + oo),
            Math.max(0, radii[2] + oo),
            Math.max(0, radii[3] + oo),
          ];
          const path = createRoundRectPath(ck, ox, oy, ow2, oh2, expanded);
          canvas.drawPath(path, outlinePaint);
          path.delete();
        } else {
          const expandedR = Math.max(0, (br as number) + oo);
          const outlineRect = ck.LTRBRect(ox, oy, ox + ow2, oy + oh2);
          canvas.drawRRect(ck.RRectXY(outlineRect, expandedR, expandedR), outlinePaint);
        }
      } else {
        canvas.drawRect(ck.LTRBRect(ox, oy, ox + ow2, oy + oh2), outlinePaint);
      }
    }
  } finally {
    scope.dispose();
  }
}

/** Line 노드 렌더링 */
function renderLine(ck: CanvasKit, canvas: Canvas, node: SkiaNodeData): void {
  if (!node.line) return;
  const paint = new ck.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(ck.PaintStyle.Stroke);
  paint.setStrokeWidth(node.line.strokeWidth);
  paint.setStrokeCap(ck.StrokeCap.Round);
  paint.setColor(node.line.strokeColor);
  canvas.drawLine(node.line.x1, node.line.y1, node.line.x2, node.line.y2, paint);
  paint.delete();
}

/** Text 노드 렌더링 */
function renderText(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  fontMgr: FontMgr,
): void {
  if (!node.text) return;

  // FontMgr이 교체되면(폰트 로드/갱신) 기존 paragraph는 무효가 될 수 있으므로 캐시를 비운다.
  if (lastParagraphFontMgr !== fontMgr) {
    clearParagraphCache();
    lastParagraphFontMgr = fontMgr;
  }

  // white-space 전처리
  const whiteSpace = node.text.whiteSpace ?? 'normal';
  let processedText = node.text.content;
  if (whiteSpace === 'normal' || whiteSpace === 'pre-line') {
    processedText = processedText.replace(/[ \t]+/g, ' ');
  }

  // nowrap/pre: 줄바꿈 없이 한 줄로 렌더링
  const layoutMaxWidth = whiteSpace === 'nowrap' || whiteSpace === 'pre'
    ? 100000
    : node.text.maxWidth;

  // wordBreak/overflowWrap: break-all 또는 break-word/anywhere일 때 단어 중간 줄바꿈 허용
  const wordBreak = node.text.wordBreak ?? 'normal';
  const overflowWrap = node.text.overflowWrap ?? 'normal';
  const allowBreakAll = wordBreak === 'break-all'
    || overflowWrap === 'break-word'
    || overflowWrap === 'anywhere';

  // key는 텍스트 shaping/layout에 영향을 주는 값만 포함한다.
  const color = node.text.color;
  const colorKey = `${color[0].toFixed(3)},${color[1].toFixed(3)},${color[2].toFixed(3)},${color[3].toFixed(3)}`;
  const heightMultiplier = node.text.lineHeight
    ? node.text.lineHeight / node.text.fontSize
    : 0;
  // text-indent: 첫 줄 들여쓰기 (px)
  const textIndent = node.text.textIndent ?? 0;
  // text-overflow: ellipsis 여부 (nowrap 조합에서만 의미)
  const isEllipsis = node.text.textOverflow === 'ellipsis';
  // decoration color key
  const dc = node.text.decorationColor;
  const decorationColorKey = dc
    ? `${dc[0].toFixed(3)},${dc[1].toFixed(3)},${dc[2].toFixed(3)},${dc[3].toFixed(3)}`
    : '';
  const key = [
    processedText,
    layoutMaxWidth,
    node.text.fontFamilies.join('|'),
    node.text.fontSize,
    node.text.fontWeight ?? 400,
    node.text.fontStyle ?? 0,
    node.text.fontVariant ?? 'normal',
    node.text.fontStretch ?? 'normal',
    node.text.letterSpacing ?? 0,
    node.text.wordSpacing ?? 0,
    heightMultiplier,
    typeof node.text.align === 'string' ? node.text.align : 'enum',
    node.text.decoration ?? 0,
    node.text.decorationStyle ?? 'solid',
    decorationColorKey,
    colorKey,
    whiteSpace,
    wordBreak,
    overflowWrap,
    isEllipsis ? '1' : '0',
    textIndent,
  ].join('\u0000');

  // verticalAlign에 따른 drawY 계산 함수
  const computeDrawY = (paragraph: Paragraph): number => {
    const verticalAlign = node.text!.verticalAlign;
    if (!verticalAlign || verticalAlign === 'top' || verticalAlign === 'baseline') {
      return node.text!.paddingTop;
    }
    const textHeight = paragraph.getHeight();
    switch (verticalAlign) {
      case 'middle':
        return (node.height - textHeight) / 2;
      case 'bottom':
        return node.height - textHeight;
      default:
        return node.text!.paddingTop;
    }
  };

  const cached = getCachedParagraph(key);
  if (cached) {
    const drawY = computeDrawY(cached);
    canvas.drawParagraph(cached, node.text.paddingLeft + textIndent, drawY);
    return;
  }

  const scope = new SkiaDisposable();
  try {
    // string align → CanvasKit TextAlign enum 변환
    let textAlign: EmbindEnumEntity;
    const rawAlign = node.text.align;
    if (typeof rawAlign === 'string') {
      const alignMap: Record<string, EmbindEnumEntity> = {
        left: ck.TextAlign.Left,
        center: ck.TextAlign.Center,
        right: ck.TextAlign.Right,
      };
      textAlign = alignMap[rawAlign] ?? ck.TextAlign.Left;
    } else {
      textAlign = rawAlign ?? ck.TextAlign.Left;
    }

    // fontWeight → CanvasKit FontWeight enum 변환
    const fontWeightMap: Record<number, EmbindEnumEntity> = {
      100: ck.FontWeight.Thin,
      200: ck.FontWeight.ExtraLight,
      300: ck.FontWeight.Light,
      400: ck.FontWeight.Normal,
      500: ck.FontWeight.Medium,
      600: ck.FontWeight.SemiBold,
      700: ck.FontWeight.Bold,
      800: ck.FontWeight.ExtraBold,
      900: ck.FontWeight.Black,
    };
    const fontWeight = fontWeightMap[node.text.fontWeight ?? 400] ?? ck.FontWeight.Normal;

    // fontStyle → CanvasKit FontSlant enum 변환
    // 0 = upright, 1 = italic, 2 = oblique
    const fontSlantMap: Record<number, EmbindEnumEntity> = {
      0: ck.FontSlant.Upright,
      1: ck.FontSlant.Italic,
      2: ck.FontSlant.Oblique,
    };
    const fontSlant = fontSlantMap[node.text.fontStyle ?? 0] ?? ck.FontSlant.Upright;

    // font-stretch → CanvasKit FontWidth enum
    const fontStretchStr = node.text.fontStretch ?? 'normal';
    const fontWidthIndex = resolveFontStretchWidth(fontStretchStr);
    const fontWidthEnumValues = ck.FontWidth;
    const fontWidthEntries: [string, EmbindEnumEntity][] = [
      ['UltraCondensed', fontWidthEnumValues.UltraCondensed],
      ['ExtraCondensed', fontWidthEnumValues.ExtraCondensed],
      ['Condensed', fontWidthEnumValues.Condensed],
      ['SemiCondensed', fontWidthEnumValues.SemiCondensed],
      ['Normal', fontWidthEnumValues.Normal],
      ['SemiExpanded', fontWidthEnumValues.SemiExpanded],
      ['Expanded', fontWidthEnumValues.Expanded],
      ['ExtraExpanded', fontWidthEnumValues.ExtraExpanded],
      ['UltraExpanded', fontWidthEnumValues.UltraExpanded],
    ];
    const fontWidth = fontWidthEntries[fontWidthIndex - 1]?.[1] ?? fontWidthEnumValues.Normal;

    // font-variant → OpenType fontFeatures
    const fontVariantStr = node.text.fontVariant ?? 'normal';
    const fontFeatureTags = resolveFontVariantFeatures(fontVariantStr);

    const heightMultiplierOpt = heightMultiplier > 0 ? heightMultiplier : undefined;

    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontFamilies: node.text.fontFamilies,
        fontSize: node.text.fontSize,
        fontStyle: { weight: fontWeight, slant: fontSlant, width: fontWidth },
        color: node.text.color,
        letterSpacing: node.text.letterSpacing ?? 0,
        wordSpacing: node.text.wordSpacing ?? 0,
        ...(heightMultiplierOpt !== undefined ? { heightMultiplier: heightMultiplierOpt } : {}),
        ...(fontFeatureTags.length > 0 ? { fontFeatures: fontFeatureTags } : {}),
        // textDecoration: CanvasKit TextDecoration 비트마스크
        ...(node.text.decoration ? {
          decoration: node.text.decoration,
          // text-decoration-color: 미지정 시 텍스트 color 사용
          decorationColor: node.text.decorationColor ?? node.text.color,
          decorationThickness: 1,
          // text-decoration-style → CanvasKit DecorationStyle enum
          ...(() => {
            if (!node.text!.decorationStyle || node.text!.decorationStyle === 'solid') return {};
            const ckDs = (ck as unknown as Record<string, Record<string, EmbindEnumEntity>>).DecorationStyle;
            if (!ckDs) return {};
            const styleMap: Record<string, EmbindEnumEntity | undefined> = {
              dashed: ckDs.Dashed,
              dotted: ckDs.Dotted,
              double: ckDs.Double,
              wavy: ckDs.Wavy,
            };
            const resolved = styleMap[node.text!.decorationStyle];
            return resolved ? { decorationStyle: resolved } : {};
          })(),
        } : {}),
      },
      textAlign,
      // text-overflow: ellipsis → maxLines:1 + ellipsis 문자열
      ...(isEllipsis ? { maxLines: 1, ellipsis: '...' } : {}),
      // NOTE: CanvasKit 0.40 ParagraphStyle에는 wordBreak/breakStrategy API가 없다.
      // allowBreakAll(wordBreak: break-all, overflowWrap: break-word/anywhere) 상태는
      // key에 포함되어 캐시를 분리하며, 향후 CanvasKit API 업데이트 시 여기서 처리 예정.
    });

    const builder = scope.track(ck.ParagraphBuilder.Make(paraStyle, fontMgr));
    builder.addText(processedText);
    const paragraph = builder.build();
    // text-overflow ellipsis 시 nowrap layoutMaxWidth가 매우 크므로
    // 실제 컨테이너 maxWidth로 재레이아웃하여 잘림 처리
    paragraph.layout(isEllipsis ? node.text.maxWidth : layoutMaxWidth);
    setCachedParagraph(key, paragraph);
    const drawY = computeDrawY(paragraph);
    // text-indent: 첫 줄 들여쓰기 → paddingLeft에 offset 추가
    canvas.drawParagraph(paragraph, node.text.paddingLeft + textIndent, drawY);
  } finally {
    scope.dispose();
  }
}

/** Image 노드 렌더링 */
function renderImage(ck: CanvasKit, canvas: Canvas, node: SkiaNodeData): void {
  if (!node.image?.skImage) return;

  const scope = new SkiaDisposable();
  try {
    const paint = scope.track(new ck.Paint());
    paint.setAntiAlias(true);

    const srcRect = ck.LTRBRect(
      0,
      0,
      node.image.skImage.width(),
      node.image.skImage.height(),
    );
    const dstRect = ck.LTRBRect(
      node.image.contentX,
      node.image.contentY,
      node.image.contentX + node.image.contentWidth,
      node.image.contentY + node.image.contentHeight,
    );

    canvas.drawImageRect(node.image.skImage, srcRect, dstRect, paint);
  } finally {
    scope.dispose();
  }
}
