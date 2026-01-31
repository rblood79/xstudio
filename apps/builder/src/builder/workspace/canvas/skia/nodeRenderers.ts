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

import type { CanvasKit, Canvas, Paint, FontMgr, Image as SkImage, EmbindEnumEntity } from 'canvaskit-wasm';
import type { EffectStyle } from './types';
import { intersectsAABB } from './types';
import { applyFill } from './fills';
import { beginRenderEffects, endRenderEffects } from './effects';
import { SkiaDisposable } from './disposable';

// ============================================
// PixiJS 씬 노드에 부착하는 Skia 렌더 데이터 타입
// ============================================

/** PixiJS Container에 부착되는 Skia 렌더 정보 */
export interface SkiaNodeData {
  type: 'box' | 'text' | 'image' | 'container';
  /** 노드 로컬 위치/크기 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 가시성 */
  visible: boolean;
  /** 이펙트 목록 */
  effects?: EffectStyle[];
  /** Box 전용 */
  box?: {
    fillColor: Float32Array;
    borderRadius: number;
    strokeColor?: Float32Array;
    strokeWidth?: number;
  };
  /** Text 전용 */
  text?: {
    content: string;
    fontFamilies: string[];
    fontSize: number;
    fontWeight?: number;
    fontStyle?: number;
    color: Float32Array;
    align?: EmbindEnumEntity;
    letterSpacing?: number;
    lineHeight?: number;
    paddingLeft: number;
    paddingTop: number;
    maxWidth: number;
  };
  /** Image 전용 */
  image?: {
    skImage: SkImage | null;
    contentX: number;
    contentY: number;
    contentWidth: number;
    contentHeight: number;
  };
  /** 자식 노드 데이터 */
  children?: SkiaNodeData[];
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
  if (!node.visible) return;

  // AABB 컬링
  const nodeBounds = new DOMRect(node.x, node.y, node.width, node.height);
  if (!intersectsAABB(cullingBounds, nodeBounds)) return;

  // 캔버스 상태 저장 + 로컬 변환
  canvas.save();
  canvas.translate(node.x, node.y);

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
    case 'container':
      // 컨테이너는 자체 콘텐츠 없음
      break;
  }

  // 자식 재귀 렌더링
  if (node.children) {
    for (const child of node.children) {
      renderNode(ck, canvas, child, cullingBounds, fontMgr);
    }
  }

  // 이펙트 종료 + 캔버스 복원
  endRenderEffects(canvas, layerCount);
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
    paint.setColor(node.box.fillColor);

    const rect = ck.LTRBRect(0, 0, node.width, node.height);

    if (node.box.borderRadius > 0) {
      const rrect = ck.RRectXY(rect, node.box.borderRadius, node.box.borderRadius);
      canvas.drawRRect(rrect, paint);
    } else {
      canvas.drawRect(rect, paint);
    }

    // Stroke
    if (node.box.strokeColor && node.box.strokeWidth) {
      paint.setStyle(ck.PaintStyle.Stroke);
      paint.setStrokeWidth(node.box.strokeWidth);
      paint.setColor(node.box.strokeColor);

      if (node.box.borderRadius > 0) {
        const rrect = ck.RRectXY(rect, node.box.borderRadius, node.box.borderRadius);
        canvas.drawRRect(rrect, paint);
      } else {
        canvas.drawRect(rect, paint);
      }
    }
  } finally {
    scope.dispose();
  }
}

/**
 * CSS fontWeight 값(숫자)을 CanvasKit FontWeight enum으로 변환한다.
 *
 * CanvasKit FontMgr.FromData()에 여러 웨이트가 등록되어 있으면
 * ParagraphBuilder가 이 값으로 최적 폰트를 자동 선택한다.
 */
function toSkFontWeight(ck: CanvasKit, weight?: number): EmbindEnumEntity {
  if (!weight || weight <= 100) return ck.FontWeight.Thin;
  if (weight <= 200) return ck.FontWeight.ExtraLight;
  if (weight <= 300) return ck.FontWeight.Light;
  if (weight <= 400) return ck.FontWeight.Normal;
  if (weight <= 500) return ck.FontWeight.Medium;
  if (weight <= 600) return ck.FontWeight.SemiBold;
  if (weight <= 700) return ck.FontWeight.Bold;
  if (weight <= 800) return ck.FontWeight.ExtraBold;
  return ck.FontWeight.Black;
}

/** Text 노드 렌더링 */
function renderText(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  fontMgr: FontMgr,
): void {
  if (!node.text) return;

  const scope = new SkiaDisposable();
  try {
    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontFamilies: node.text.fontFamilies,
        fontSize: node.text.fontSize,
        fontStyle: {
          weight: toSkFontWeight(ck, node.text.fontWeight),
        },
        color: node.text.color,
        letterSpacing: node.text.letterSpacing ?? 0,
      },
      textAlign: node.text.align ?? ck.TextAlign.Left,
    });

    const builder = scope.track(ck.ParagraphBuilder.Make(paraStyle, fontMgr));
    builder.addText(node.text.content);
    const paragraph = scope.track(builder.build());
    paragraph.layout(node.text.maxWidth);

    canvas.drawParagraph(paragraph, node.text.paddingLeft, node.text.paddingTop);
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
