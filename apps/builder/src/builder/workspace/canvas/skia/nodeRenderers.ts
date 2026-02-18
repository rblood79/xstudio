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
import { applyFill } from './fills';
import { beginRenderEffects, endRenderEffects } from './effects';
import { toSkiaBlendMode } from './blendModes';
import { SkiaDisposable } from './disposable';

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
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
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
      const inset = sw / 2;
      // fill에서 설정된 gradient shader를 제거하여 stroke가 단색으로 그려지도록 한다
      paint.setShader(null);
      paint.setStyle(ck.PaintStyle.Stroke);
      paint.setStrokeWidth(sw);
      paint.setColor(node.box.strokeColor);

      // dashed/dotted border 지원 (CanvasKit PathEffect)
      let dashEffect: ReturnType<typeof ck.PathEffect.MakeDash> | null = null;
      if (node.box.strokeStyle === 'dashed') {
        const dashLen = Math.max(sw * 3, 4);
        const gapLen = Math.max(sw * 2, 3);
        dashEffect = ck.PathEffect.MakeDash([dashLen, gapLen]);
        paint.setPathEffect(dashEffect);
      } else if (node.box.strokeStyle === 'dotted') {
        dashEffect = ck.PathEffect.MakeDash([sw, sw * 1.5]);
        paint.setPathEffect(dashEffect);
        paint.setStrokeCap(ck.StrokeCap.Round);
      }

      const strokeRect = ck.LTRBRect(inset, inset, node.width - inset, node.height - inset);
      if (hasRadius) {
        if (isArrayRadius) {
          // 개별 모서리: stroke용 inner radius 계산
          const innerRadii: [number, number, number, number] = [
            Math.max(0, br[0] - inset),
            Math.max(0, br[1] - inset),
            Math.max(0, br[2] - inset),
            Math.max(0, br[3] - inset),
          ];
          const path = createRoundRectPath(ck, inset, inset, node.width - inset * 2, node.height - inset * 2, innerRadii);
          canvas.drawPath(path, paint);
          path.delete();
        } else {
          const adjustedRadius = Math.max(0, br - inset);
          const rrect = ck.RRectXY(strokeRect, adjustedRadius, adjustedRadius);
          canvas.drawRRect(rrect, paint);
        }
      } else {
        canvas.drawRect(strokeRect, paint);
      }

      // PathEffect 정리
      if (dashEffect) {
        paint.setPathEffect(null);
        dashEffect.delete();
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

  // key는 텍스트 shaping/layout에 영향을 주는 값만 포함한다.
  const color = node.text.color;
  const colorKey = `${color[0].toFixed(3)},${color[1].toFixed(3)},${color[2].toFixed(3)},${color[3].toFixed(3)}`;
  const heightMultiplier = node.text.lineHeight
    ? node.text.lineHeight / node.text.fontSize
    : 0;
  const key = [
    processedText,
    layoutMaxWidth,
    node.text.fontFamilies.join('|'),
    node.text.fontSize,
    node.text.fontWeight ?? 400,
    node.text.fontStyle ?? 0,
    node.text.letterSpacing ?? 0,
    heightMultiplier,
    typeof node.text.align === 'string' ? node.text.align : 'enum',
    node.text.decoration ?? 0,
    colorKey,
    whiteSpace,
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
    canvas.drawParagraph(cached, node.text.paddingLeft, drawY);
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

    const heightMultiplierOpt = heightMultiplier > 0 ? heightMultiplier : undefined;

    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontFamilies: node.text.fontFamilies,
        fontSize: node.text.fontSize,
        fontStyle: { weight: fontWeight, slant: fontSlant },
        color: node.text.color,
        letterSpacing: node.text.letterSpacing ?? 0,
        ...(heightMultiplierOpt !== undefined ? { heightMultiplier: heightMultiplierOpt } : {}),
        // textDecoration: CanvasKit TextDecoration 비트마스크
        ...(node.text.decoration ? {
          decoration: node.text.decoration,
          decorationColor: node.text.color,
          decorationThickness: 1,
        } : {}),
      },
      textAlign,
    });

    const builder = scope.track(ck.ParagraphBuilder.Make(paraStyle, fontMgr));
    builder.addText(processedText);
    const paragraph = builder.build();
    paragraph.layout(layoutMaxWidth);
    setCachedParagraph(key, paragraph);
    const drawY = computeDrawY(paragraph);
    canvas.drawParagraph(paragraph, node.text.paddingLeft, drawY);
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
