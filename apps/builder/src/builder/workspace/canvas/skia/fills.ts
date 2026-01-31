/**
 * CanvasKit Fill Shader 시스템
 *
 * 6종의 Fill 타입을 CanvasKit Paint에 적용한다.
 * Pencil §10.9.6 패턴을 따른다.
 *
 * @see docs/WASM.md §5.5 Fill 시스템
 */

import type { CanvasKit, Paint } from 'canvaskit-wasm';
import type { FillStyle } from './types';

/**
 * FillStyle에 따라 CanvasKit Paint의 색상/셰이더를 설정한다.
 *
 * @param ck - CanvasKit 인스턴스
 * @param paint - 대상 Paint 객체
 * @param fill - Fill 정의
 *
 * @returns 생성된 Shader (호출자가 delete() 해야 함). Color fill은 null 반환.
 */
export function applyFill(
  ck: CanvasKit,
  paint: Paint,
  fill: FillStyle,
): { delete(): void } | null {
  switch (fill.type) {
    case 'color': {
      paint.setColor(ck.Color4f(
        fill.rgba[0],
        fill.rgba[1],
        fill.rgba[2],
        fill.rgba[3],
      ));
      return null;
    }

    case 'linear-gradient': {
      const shader = ck.Shader.MakeLinearGradient(
        fill.start,
        fill.end,
        fill.colors,
        fill.positions,
        ck.TileMode.Clamp,
      );
      paint.setShader(shader);
      return shader;
    }

    case 'radial-gradient': {
      const shader = ck.Shader.MakeTwoPointConicalGradient(
        fill.center,
        fill.startRadius,
        fill.center,
        fill.endRadius,
        fill.colors,
        fill.positions,
        ck.TileMode.Clamp,
      );
      paint.setShader(shader);
      return shader;
    }

    case 'angular-gradient': {
      const shader = ck.Shader.MakeSweepGradient(
        fill.cx,
        fill.cy,
        fill.colors,
        fill.positions,
        ck.TileMode.Clamp,
      );
      paint.setShader(shader);
      return shader;
    }

    case 'image': {
      // CanvasKit-WASM: Image.makeShaderOptions() 사용
      // (ck.Shader.MakeImageShader는 존재하지 않음)
      const skImage = fill.image as { makeShaderOptions?: (...args: unknown[]) => unknown } | null;
      if (skImage && typeof skImage.makeShaderOptions === 'function') {
        const shader = (skImage as {
          makeShaderOptions(tx: unknown, ty: unknown, fm: unknown, mm: unknown, lm?: unknown): unknown;
        }).makeShaderOptions(
          fill.tileMode,
          fill.tileMode,
          fill.sampling, // FilterMode
          ck.MipmapMode.None,
          fill.matrix,
        ) as { delete(): void };
        paint.setShader(shader as Parameters<typeof paint.setShader>[0]);
        return shader;
      }
      return null;
    }

    case 'mesh-gradient': {
      // CanvasKit 공개 API에 직접 mesh gradient 매핑 없음.
      // Phase 5 후반에 다음 전략 중 하나로 구현 예정:
      // 1. MakeSweepGradient + 다중 색상 정지점으로 근사
      // 2. Coons 패치를 ImageData로 전처리 → MakeImageShader
      // 3. 커스텀 SkSL(RuntimeEffect) 셰이더
      if (import.meta.env.DEV) {
        console.warn('[Skia] mesh-gradient Fill은 아직 미구현');
      }
      return null;
    }
  }
}
