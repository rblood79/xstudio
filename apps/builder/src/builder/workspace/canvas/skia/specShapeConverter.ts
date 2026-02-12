/**
 * Spec Shape[] → SkiaNodeData 변환기
 *
 * ComponentSpec의 render.shapes()가 반환하는 Shape 배열을
 * CanvasKit/Skia 렌더러가 이해하는 SkiaNodeData로 변환한다.
 */

import type { Shape, ColorValue } from '@xstudio/specs';
import type { SkiaNodeData } from './nodeRenderers';
import type { EffectStyle, FillStyle } from './types';
import { resolveColor, resolveToken, hexStringToNumber } from '@xstudio/specs';

// ========== Helpers ==========

/** Resolve a value that might be a TokenRef string to a number */
function resolveNum(value: unknown, theme: 'light' | 'dark', fallback: number = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.startsWith('{')) {
    const resolved = resolveToken(value as Parameters<typeof resolveToken>[0], theme);
    return typeof resolved === 'number' ? resolved : (parseFloat(String(resolved)) || fallback);
  }
  if (typeof value === 'string') return parseFloat(value) || fallback;
  return fallback;
}

/**
 * Resolve border radius that may be a number, array, or TokenRef.
 * SkiaNodeData.box.borderRadius supports number | [tl, tr, br, bl].
 */
function resolveRadius(
  value: unknown,
  theme: 'light' | 'dark',
): number | [number, number, number, number] {
  if (Array.isArray(value)) {
    return [
      resolveNum(value[0], theme, 0),
      resolveNum(value[1], theme, 0),
      resolveNum(value[2], theme, 0),
      resolveNum(value[3], theme, 0),
    ] as [number, number, number, number];
  }
  return resolveNum(value, theme, 0);
}

/** ColorValue → Float32Array color for Skia */
function colorValueToFloat32(value: ColorValue, theme: 'light' | 'dark', alpha: number = 1): Float32Array {
  const resolved = resolveColor(value, theme);
  let hex: number;
  if (typeof resolved === 'string') {
    hex = hexStringToNumber(resolved);
  } else {
    hex = resolved;
  }
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  return Float32Array.of(r, g, b, alpha);
}

/** Transparent color */
const TRANSPARENT = Float32Array.of(0, 0, 0, 0);

// ========== Main Converter ==========

/**
 * Shape[] → SkiaNodeData 변환
 *
 * Returns a container SkiaNodeData with the first roundRect/rect as the background box,
 * and all other shapes as children.
 *
 * 2-pass 처리: shadow/border(target 참조)가 target보다 먼저 선언되어도 정상 동작.
 */
export function specShapesToSkia(
  shapes: Shape[],
  theme: 'light' | 'dark',
  containerWidth: number,
  containerHeight: number,
): SkiaNodeData {
  // Collect converted nodes and track IDs for border/shadow targeting
  const nodeById = new Map<string, SkiaNodeData>();
  const children: SkiaNodeData[] = [];
  let lastNode: SkiaNodeData | null = null;

  // First background box data (extracted from first rect/roundRect)
  let bgBox: SkiaNodeData['box'] | undefined;
  let bgExtracted = false;

  // Deferred shapes: shadow/border with explicit target (forward reference)
  const deferredShapes: Shape[] = [];

  // ===== Pass 1: geometry shapes + targetless shadow/border =====
  for (const shape of shapes) {
    // Defer shadow/border with explicit target to Pass 2
    if ((shape.type === 'shadow' || shape.type === 'border') && shape.target) {
      deferredShapes.push(shape);
      continue;
    }

    processShape(shape);
  }

  // ===== Pass 2: deferred shadow/border (targets now registered) =====
  for (const shape of deferredShapes) {
    processShape(shape);
  }

  // Build the top-level container
  return {
    type: 'box',
    x: 0,
    y: 0,
    width: containerWidth,
    height: containerHeight,
    visible: true,
    box: bgBox ?? { fillColor: TRANSPARENT, borderRadius: 0 },
    children: children.length > 0 ? children : undefined,
  };

  // ===== Shape processor (shared by both passes) =====
  function processShape(shape: Shape): void {
    switch (shape.type) {
      case 'roundRect': {
        const w = shape.width === 'auto' ? containerWidth : shape.width;
        const h = shape.height === 'auto' ? containerHeight : shape.height;
        const fillColor = shape.fill
          ? colorValueToFloat32(shape.fill, theme, shape.fillAlpha ?? 1)
          : TRANSPARENT;
        const radius = resolveRadius(shape.radius, theme);

        const node: SkiaNodeData = {
          type: 'box',
          x: shape.x,
          y: shape.y,
          width: w,
          height: h,
          visible: true,
          box: { fillColor, borderRadius: radius },
        };

        // First rect/roundRect at origin with 'auto' dimensions = component background
        // Fixed-size shapes at origin (e.g., checkbox indicator 20x20) should NOT be extracted as bg
        if (!bgExtracted && shape.x === 0 && shape.y === 0
            && shape.width === 'auto' && shape.height === 'auto') {
          bgBox = node.box;
          bgExtracted = true;
        } else {
          children.push(node);
        }

        if (shape.id) nodeById.set(shape.id, bgExtracted && children.length === 0 ? { ...node, box: bgBox } : node);
        lastNode = bgExtracted && children.length === 0 ? { ...node, box: bgBox } : node;
        break;
      }

      case 'rect': {
        const w = shape.width === 'auto' ? containerWidth : shape.width;
        const h = shape.height === 'auto' ? containerHeight : shape.height;
        const fillColor = shape.fill
          ? colorValueToFloat32(shape.fill, theme, shape.fillAlpha ?? 1)
          : TRANSPARENT;

        const node: SkiaNodeData = {
          type: 'box',
          x: shape.x,
          y: shape.y,
          width: w,
          height: h,
          visible: true,
          box: { fillColor, borderRadius: 0 },
        };

        if (!bgExtracted && shape.x === 0 && shape.y === 0
            && shape.width === 'auto' && shape.height === 'auto') {
          bgBox = node.box;
          bgExtracted = true;
        } else {
          children.push(node);
        }

        if (shape.id) nodeById.set(shape.id, bgExtracted && children.length === 0 ? { ...node, box: bgBox } : node);
        lastNode = bgExtracted && children.length === 0 ? { ...node, box: bgBox } : node;
        break;
      }

      case 'circle': {
        // Circle → box with borderRadius = radius
        const diameter = shape.radius * 2;
        const fillColor = shape.fill
          ? colorValueToFloat32(shape.fill, theme, shape.fillAlpha ?? 1)
          : TRANSPARENT;

        const node: SkiaNodeData = {
          type: 'box',
          x: shape.x - shape.radius,  // center → top-left
          y: shape.y - shape.radius,
          width: diameter,
          height: diameter,
          visible: true,
          box: { fillColor, borderRadius: shape.radius },
        };

        children.push(node);
        if (shape.id) nodeById.set(shape.id, node);
        lastNode = node;
        break;
      }

      case 'line': {
        const strokeColor = colorValueToFloat32(shape.stroke, theme);

        // Resolve 'auto' values (used by Tabs, Panel line shapes)
        const x1 = (shape.x1 as unknown) === 'auto' ? containerWidth : shape.x1;
        const y1 = (shape.y1 as unknown) === 'auto' ? containerHeight : shape.y1;
        const x2 = (shape.x2 as unknown) === 'auto' ? containerWidth : shape.x2;
        const y2 = (shape.y2 as unknown) === 'auto' ? containerHeight : shape.y2;

        const node: SkiaNodeData = {
          type: 'line',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          visible: true,
          line: {
            x1,
            y1,
            x2,
            y2,
            strokeColor,
            strokeWidth: shape.strokeWidth,
          },
        };

        children.push(node);
        lastNode = node;
        break;
      }

      case 'border': {
        // Apply stroke to the target or last node
        const targetNode = shape.target
          ? nodeById.get(shape.target)
          : lastNode;

        if (targetNode) {
          const strokeColor = colorValueToFloat32(shape.color, theme);

          // If the target is the background box
          if (targetNode.box === bgBox && bgBox) {
            bgBox.strokeColor = strokeColor;
            bgBox.strokeWidth = shape.borderWidth;
          } else if (targetNode.box) {
            targetNode.box.strokeColor = strokeColor;
            targetNode.box.strokeWidth = shape.borderWidth;
          }
        } else {
          // No target found - render as standalone border box
          const bx = shape.x ?? 0;
          const by = shape.y ?? 0;
          const bw = shape.width === 'auto' ? containerWidth : (shape.width ?? containerWidth);
          const bh = shape.height === 'auto' ? containerHeight : (shape.height ?? containerHeight);
          const br = resolveRadius(shape.radius, theme);

          children.push({
            type: 'box',
            x: bx,
            y: by,
            width: bw,
            height: bh,
            visible: true,
            box: {
              fillColor: TRANSPARENT,
              borderRadius: br,
              strokeColor: colorValueToFloat32(shape.color, theme),
              strokeWidth: shape.borderWidth,
            },
          });
        }
        break;
      }

      case 'text': {
        if (!shape.text) break;

        const fillColor = shape.fill
          ? colorValueToFloat32(shape.fill, theme)
          : Float32Array.of(0, 0, 0, 1);  // default black

        // Resolve fontSize (might be TokenRef like '{typography.text-md}')
        const fontSize = resolveNum(shape.fontSize, theme, 14);

        // Calculate paddingTop based on baseline
        let paddingTop = shape.y;
        if (shape.baseline === 'middle') {
          // 수직 중앙 정렬: (컨테이너 높이 - 폰트 크기) / 2
          // fontSize 대신 lineHeight(≈fontSize * 1.2)를 사용하여 시각적 중앙에 더 가깝게 배치
          const lineHeight = fontSize * 1.2;
          paddingTop = shape.y + (containerHeight - lineHeight) / 2;
        }
        // baseline='top' → paddingTop = y (already)

        // Calculate paddingLeft based on align
        let paddingLeft = shape.x;
        let maxWidth = shape.maxWidth ?? containerWidth;

        // Auto-reduce maxWidth when text has padding offset (shape.x > 0) and no explicit maxWidth
        if (shape.x > 0 && shape.maxWidth == null) {
          if (shape.align === 'center') {
            // Center-aligned: symmetric padding (subtract from both sides)
            maxWidth = containerWidth - shape.x * 2;
          } else {
            // Left/right-aligned: subtract left padding only
            maxWidth = containerWidth - shape.x;
          }
          // Clamp to prevent negative maxWidth when container is smaller than padding
          if (maxWidth < 1) maxWidth = containerWidth;
        }

        // Parse fontWeight
        let fontWeight: number | undefined;
        if (shape.fontWeight !== undefined) {
          fontWeight = typeof shape.fontWeight === 'number' ? shape.fontWeight : parseInt(String(shape.fontWeight), 10) || 400;
          if (shape.fontWeight === 'bold') fontWeight = 700;
          if (shape.fontWeight === 'normal') fontWeight = 400;
          if (shape.fontWeight === 'medium') fontWeight = 500;
        }

        // Font families
        const fontFamilies = shape.fontFamily
          ? [shape.fontFamily, 'Inter', 'system-ui', 'sans-serif']
          : ['Inter', 'system-ui', 'sans-serif'];

        const node: SkiaNodeData = {
          type: 'text',
          x: 0,
          y: 0,
          width: containerWidth,
          height: containerHeight,
          visible: true,
          text: {
            content: shape.text,
            fontFamilies,
            fontSize,
            fontWeight,
            color: fillColor,
            align: shape.align ?? 'left',
            paddingLeft,
            paddingTop: Math.max(0, paddingTop),
            maxWidth,
            autoCenter: false,
          },
        };

        children.push(node);
        break;
      }

      case 'shadow': {
        // Apply shadow as effect to target or last node
        const targetNode = shape.target
          ? nodeById.get(shape.target)
          : lastNode;

        if (targetNode) {
          const shadowColor = colorValueToFloat32(shape.color, theme, shape.alpha ?? 0.3);
          const effect: EffectStyle = {
            type: 'drop-shadow',
            dx: shape.offsetX,
            dy: shape.offsetY,
            sigmaX: shape.blur / 2,
            sigmaY: shape.blur / 2,
            color: shadowColor,
            inner: shape.inset ?? false,
          };
          if (!targetNode.effects) targetNode.effects = [];
          targetNode.effects.push(effect);
        }
        break;
      }

      case 'container': {
        // Recursively convert children
        const containerNode = specShapesToSkia(
          shape.children,
          theme,
          shape.width === 'auto' ? containerWidth : (shape.width ?? containerWidth),
          shape.height === 'auto' ? containerHeight : (shape.height ?? containerHeight),
        );
        containerNode.x = shape.x;
        containerNode.y = shape.y;
        children.push(containerNode);
        break;
      }

      case 'gradient': {
        const w = shape.width === 'auto' ? containerWidth : shape.width;
        const h = shape.height === 'auto' ? containerHeight : shape.height;
        const colors = shape.gradient.stops.map(s => colorValueToFloat32(s.color, theme));
        const positions = shape.gradient.stops.map(s => s.offset);

        let fill: FillStyle;
        if (shape.gradient.type === 'linear') {
          const angle = (shape.gradient.angle ?? 0) * Math.PI / 180;
          fill = {
            type: 'linear-gradient',
            start: [w / 2 - Math.sin(angle) * w / 2, h / 2 - Math.cos(angle) * h / 2],
            end: [w / 2 + Math.sin(angle) * w / 2, h / 2 + Math.cos(angle) * h / 2],
            colors,
            positions,
          };
        } else {
          fill = {
            type: 'radial-gradient',
            center: [w / 2, h / 2],
            startRadius: 0,
            endRadius: Math.max(w, h) / 2,
            colors,
            positions,
          };
        }

        const radius = shape.radius ? resolveRadius(shape.radius, theme) : 0;
        const node: SkiaNodeData = {
          type: 'box',
          x: shape.x,
          y: shape.y,
          width: w,
          height: h,
          visible: true,
          box: { fillColor: TRANSPARENT, fill, borderRadius: radius },
        };

        // Gradient can also be a background (same logic as roundRect/rect)
        if (!bgExtracted && shape.x === 0 && shape.y === 0
            && shape.width === 'auto' && shape.height === 'auto') {
          bgBox = node.box;
          bgExtracted = true;
        } else {
          children.push(node);
        }

        if (shape.id) nodeById.set(shape.id, bgExtracted && children.length === 0 ? { ...node, box: bgBox } : node);
        lastNode = bgExtracted && children.length === 0 ? { ...node, box: bgBox } : node;
        break;
      }

      case 'image':
        // Skip - not supported in simple box rendering
        break;
    }
  }
}
