/**
 * FPSMeter Component
 *
 * FPS 모니터링 디스플레이
 * - 현재 FPS 및 통계 표시
 * - 미니 바 차트
 * - 상태 기반 색상
 */

import { Activity } from "lucide-react";
import type { FPSData } from "../hooks/useFPSMonitor";
import { iconEditProps } from "../../../../utils/ui/uiConstants";

interface FPSMeterProps {
  fps: FPSData;
}

function getFPSStatus(fps: number): "good" | "warning" | "poor" {
  if (fps >= 55) return "good";
  if (fps >= 30) return "warning";
  return "poor";
}

export function FPSMeter({ fps }: FPSMeterProps) {
  const status = getFPSStatus(fps.current);

  return (
    <div className="fps-meter" data-status={status}>
      <div className="fps-meter-header">
        <Activity size={iconEditProps.size} aria-hidden="true" />
        <span className="fps-meter-title">FPS</span>
      </div>

      <div className="fps-meter-value">
        <span className="fps-current">{fps.current}</span>
        <span className="fps-unit">fps</span>
      </div>

      <div className="fps-meter-stats">
        <div className="fps-stat">
          <span className="fps-stat-label">Avg</span>
          <span className="fps-stat-value">{fps.average}</span>
        </div>
        <div className="fps-stat">
          <span className="fps-stat-label">Min</span>
          <span className="fps-stat-value">{fps.min}</span>
        </div>
        <div className="fps-stat">
          <span className="fps-stat-label">Max</span>
          <span className="fps-stat-value">{fps.max}</span>
        </div>
      </div>

      {/* 미니 바 차트 */}
      <div className="fps-mini-chart" aria-hidden="true">
        {fps.history.slice(-30).map((value, i) => (
          <div
            key={i}
            className="fps-bar"
            style={{ height: `${Math.min(100, (value / 60) * 100)}%` }}
            data-status={getFPSStatus(value)}
          />
        ))}
      </div>

      {/* 스크린 리더용 */}
      <span className="sr-only">
        Current FPS: {fps.current}, Average: {fps.average}, Status: {status}
      </span>
    </div>
  );
}
