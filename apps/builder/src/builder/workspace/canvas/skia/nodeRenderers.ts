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
    align?: EmbindEnumEntity | 'left' | 'center' | 'right';
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

  // AABB 컬링 — width/height=0 가상 컨테이너는 스킵 (자식에서 개별 컬링)
  if (node.width > 0 || node.height > 0) {
    const nodeBounds = new DOMRect(node.x, node.y, node.width, node.height);
    if (!intersectsAABB(cullingBounds, nodeBounds)) return;
  }

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

  // 자식 재귀 렌더링 — canvas.translate() 후 좌표계가 부모 로컬로 변환되었으므로
  // cullingBounds도 부모 오프셋만큼 역변환하여 좌표계를 일치시킨다.
  if (node.children) {
    const childBounds = new DOMRect(
      cullingBounds.x - node.x,
      cullingBounds.y - node.y,
      cullingBounds.width,
      cullingBounds.height,
    );
    for (const child of node.children) {
      renderNode(ck, canvas, child, childBounds, fontMgr);
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

    // Stroke (border-box: stroke를 요소 내부에 완전히 포함)
    // CanvasKit stroke는 경로 중앙에 그려지므로 strokeWidth/2 만큼 inset 필요
    if (node.box.strokeColor && node.box.strokeWidth) {
      const sw = node.box.strokeWidth;
      const inset = sw / 2;
      paint.setStyle(ck.PaintStyle.Stroke);
      paint.setStrokeWidth(sw);
      paint.setColor(node.box.strokeColor);

      const strokeRect = ck.LTRBRect(inset, inset, node.width - inset, node.height - inset);
      if (node.box.borderRadius > 0) {
        const adjustedRadius = Math.max(0, node.box.borderRadius - inset);
        const rrect = ck.RRectXY(strokeRect, adjustedRadius, adjustedRadius);
        canvas.drawRRect(rrect, paint);
      } else {
        canvas.drawRect(strokeRect, paint);
      }
    }
  } finally {
    scope.dispose();
  }
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

    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontFamilies: node.text.fontFamilies,
        fontSize: node.text.fontSize,
        color: node.text.color,
        letterSpacing: node.text.letterSpacing ?? 0,
      },
      textAlign,
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
