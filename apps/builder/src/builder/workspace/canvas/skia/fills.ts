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
      // CanvasKit에 네이티브 mesh gradient API가 없으므로
      // 4코너 bilinear interpolation → 2x2 LinearGradient 블렌드로 근사.
      // 2x2 그리드(4색)만 지원. 더 큰 그리드는 좌상 4셀로 폴백.
      const c = fill.colors;
      if (!c || c.length < 4 || fill.width <= 0 || fill.height <= 0) return null;

      // Top-Left → Top-Right 수평 그래디언트 (상단 가중치용)
      const topShader = ck.Shader.MakeLinearGradient(
        [0, 0],
        [fill.width, 0],
        [c[0], c[1]],
        [0, 1],
        ck.TileMode.Clamp,
      );
      // Bottom-Left → Bottom-Right 수평 그래디언트 (하단 가중치용)
      const bottomShader = ck.Shader.MakeLinearGradient(
        [0, 0],
        [fill.width, 0],
        [c[2], c[3]],
        [0, 1],
        ck.TileMode.Clamp,
      );
      // 수직 블렌드: top(1→0) + bottom(0→1) 가중치
      const blendShader = ck.Shader.MakeBlend(
        ck.BlendMode.SrcOver,
        topShader,
        bottomShader,
      );
      paint.setShader(blendShader);

      // topShader/bottomShader는 blendShader가 참조 유지하므로 안전하게 해제
      topShader.delete();
      bottomShader.delete();
      return blendShader;
    }
  }
}
