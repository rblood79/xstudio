import type { CSSProperties } from 'react';
import { enableDebugLogs } from '../../../../utils/featureFlags';
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

  if (!enableDebugLogs()) return null;

  return (
    <div style={overlayStyle}>
      <div>RAF FPS: {gpuMetrics.averageFps.toFixed(1)}</div>
      <div>RAF Frame: {gpuMetrics.lastFrameTime.toFixed(2)}ms</div>
      <div>Skia: {gpuMetrics.skiaFrameTimeAvgMs.toFixed(2)}ms</div>
      <div>Content: {gpuMetrics.contentRenderTimeMs.toFixed(2)}ms</div>
      <div>Blit: {gpuMetrics.blitTimeMs.toFixed(2)}ms</div>
      <div>Present/s: {gpuMetrics.presentFramesPerSec.toFixed(2)}</div>
      <div>Tree: {gpuMetrics.skiaTreeBuildTimeMs.toFixed(2)}ms</div>
      <div>Sel: {gpuMetrics.selectionBuildTimeMs.toFixed(2)}ms</div>
      <div>AI: {gpuMetrics.aiBoundsBuildTimeMs.toFixed(2)}ms</div>
      <div>Content/s: {gpuMetrics.contentRendersPerSec.toFixed(2)}</div>
      <div>Registry/s: {gpuMetrics.registryChangesPerSec.toFixed(2)}</div>
      <div>Idle: {(gpuMetrics.idleFrameRatio * 100).toFixed(0)}%</div>
      <div>Textures: {gpuMetrics.textureCount}</div>
      <div>Sprites: {gpuMetrics.spriteCount}</div>
      <div>VRAM: {(gpuMetrics.vramUsed / 1024 / 1024).toFixed(1)}MB</div>
    </div>
  );
}
