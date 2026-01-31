/**
 * CanvasKit 이펙트 파이프라인
 *
 * saveLayer 기반으로 Opacity, Background Blur, Drop Shadow를 적용한다.
 * Pencil §10.9.5 패턴을 따른다.
 *
 * @see docs/WASM.md §5.6 이펙트 파이프라인
 */

import type { CanvasKit, Canvas } from 'canvaskit-wasm';
import type { EffectStyle } from './types';
import { SkiaDisposable } from './disposable';

/**
 * 이펙트를 시작한다 (saveLayer 스택에 레이어 추가).
 *
 * 각 이펙트는 `canvas.saveLayer()`를 호출하여 오프스크린 레이어를 생성하고,
 * Paint의 알파/필터를 통해 하위 콘텐츠에 효과를 적용한다.
 *
 * @returns 스택에 추가된 레이어 수 — endRenderEffects()에서 동일 횟수만큼 restore() 해야 한다.
 */
export function beginRenderEffects(
  ck: CanvasKit,
  canvas: Canvas,
  effects: EffectStyle[],
): number {
  let layerCount = 0;
  const scope = new SkiaDisposable();

  try {
    for (const effect of effects) {
      switch (effect.type) {
        case 'opacity': {
          const paint = scope.track(new ck.Paint());
          paint.setAlphaf(effect.value);
          canvas.saveLayer(paint);
          layerCount++;
          break;
        }

        case 'background-blur': {
          const filter = scope.track(
            ck.ImageFilter.MakeBlur(
              effect.sigma,
              effect.sigma,
              ck.TileMode.Clamp,
              null,
            ),
          );
          const paint = scope.track(new ck.Paint());
          paint.setImageFilter(filter);
          canvas.saveLayer(paint);
          layerCount++;
          break;
        }

        case 'drop-shadow': {
          const filter = scope.track(
            effect.inner
              ? ck.ImageFilter.MakeDropShadowOnly(
                  effect.dx,
                  effect.dy,
                  effect.sigmaX,
                  effect.sigmaY,
                  effect.color,
                  null,
                )
              : ck.ImageFilter.MakeDropShadow(
                  effect.dx,
                  effect.dy,
                  effect.sigmaX,
                  effect.sigmaY,
                  effect.color,
                  null,
                ),
          );
          const paint = scope.track(new ck.Paint());
          paint.setImageFilter(filter);
          canvas.saveLayer(paint);
          layerCount++;
          break;
        }
      }
    }
  } finally {
    // Paint/Filter 네이티브 객체를 즉시 해제.
    // saveLayer()가 내부적으로 참조를 복사하므로 JS 측 객체는 바로 삭제 가능.
    scope.dispose();
  }

  return layerCount;
}

/**
 * beginRenderEffects()에서 추가한 레이어를 모두 복원한다.
 *
 * 각 restore()는 오프스크린 레이어를 부모 캔버스에 합성하면서
 * 해당 레이어의 이펙트(알파, 필터)를 적용한다.
 */
export function endRenderEffects(canvas: Canvas, layerCount: number): void {
  for (let i = 0; i < layerCount; i++) {
    canvas.restore();
  }
}
