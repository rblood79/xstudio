import type { CSSProperties } from 'react';
import { useCanvasSyncStore } from '../canvasSync';

const overlayStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  left: 8,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: '#00ff00',
  fontFamily: 'monospace',
  fontSize: 12,
  padding: '8px 12px',
  borderRadius: 4,
  pointerEvents: 'none',
  zIndex: 9999,
};

/**
 * GPU 메트릭 디버그 오버레이
 * 개발 환경에서만 표시
 */
export function GPUDebugOverlay() {
  const gpuMetrics = useCanvasSyncStore((state) => state.gpuMetrics);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div style={overlayStyle}>
      <div>FPS: {gpuMetrics.averageFps.toFixed(0)}</div>
      <div>Frame: {gpuMetrics.lastFrameTime.toFixed(2)}ms</div>
      <div>Textures: {gpuMetrics.textureCount}</div>
      <div>Sprites: {gpuMetrics.spriteCount}</div>
      <div>VRAM: {(gpuMetrics.vramUsed / 1024 / 1024).toFixed(1)}MB</div>
    </div>
  );
}

