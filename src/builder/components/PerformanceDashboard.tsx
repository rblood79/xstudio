/**
 * Performance Dashboard
 *
 * Performance Monitor 통계를 시각적으로 표시하는 대시보드
 * - 캐시 히트율
 * - Request Deduplication 효율
 * - Realtime Batcher 통계
 * - Query 성능 메트릭
 *
 * @example
 * // 개발 모드에서만 표시
 * {import.meta.env.DEV && <PerformanceDashboard />}
 */

import { usePerformanceStats } from '../hooks/usePerformanceStats';
import './PerformanceDashboard.css';

export interface PerformanceDashboardProps {
  /** 대시보드 표시 여부 (기본: true) */
  visible?: boolean;

  /** 통계 갱신 간격 (ms, 기본: 2000) */
  refreshInterval?: number;

  /** 간략 모드 (주요 메트릭만 표시, 기본: false) */
  compact?: boolean;
}

export function PerformanceDashboard({
  visible = true,
  refreshInterval = 2000,
  compact = false,
}: PerformanceDashboardProps) {
  const { stats, printStats, reset, isAutoRefresh, toggleAutoRefresh } = usePerformanceStats({
    refreshInterval,
    autoRefresh: visible,
  });

  if (!visible) {
    return null;
  }

  const elapsedSeconds = (stats.elapsedTime / 1000).toFixed(1);

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h3>📊 Performance Monitor</h3>
        <div className="dashboard-actions">
          <button
            onClick={toggleAutoRefresh}
            className={`action-btn ${isAutoRefresh ? 'active' : ''}`}
            title={isAutoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
          >
            {isAutoRefresh ? '⏸' : '▶'}
          </button>
          <button onClick={printStats} className="action-btn" title="Print to console">
            🖨
          </button>
          <button onClick={reset} className="action-btn" title="Reset stats">
            🔄
          </button>
        </div>
      </div>

      <div className="dashboard-stats">
        {/* Cache Metrics */}
        <div className="stat-section">
          <h4>📦 Cache</h4>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Hit Rate</span>
              <span className="stat-value highlight">{stats.cache.hitRate.toFixed(1)}%</span>
            </div>
            {!compact && (
              <>
                <div className="stat-item">
                  <span className="stat-label">Requests</span>
                  <span className="stat-value">{stats.cache.totalRequests}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Hits</span>
                  <span className="stat-value success">{stats.cache.hits}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Misses</span>
                  <span className="stat-value error">{stats.cache.misses}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Time</span>
                  <span className="stat-value">{stats.cache.avgResponseTime.toFixed(2)}ms</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Deduplication Metrics */}
        <div className="stat-section">
          <h4>🔄 Deduplication</h4>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Rate</span>
              <span className="stat-value highlight">{stats.deduplication.deduplicationRate.toFixed(1)}%</span>
            </div>
            {!compact && (
              <>
                <div className="stat-item">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{stats.deduplication.totalRequests}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Dedup</span>
                  <span className="stat-value success">{stats.deduplication.deduplicated}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Executed</span>
                  <span className="stat-value">{stats.deduplication.executed}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Batcher Metrics */}
        <div className="stat-section">
          <h4>📡 Batcher</h4>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Avg Batch</span>
              <span className="stat-value highlight">{stats.batcher.avgBatchSize.toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Filter</span>
              <span className="stat-value">{stats.batcher.filterEfficiency.toFixed(1)}%</span>
            </div>
            {!compact && (
              <>
                <div className="stat-item">
                  <span className="stat-label">Received</span>
                  <span className="stat-value">{stats.batcher.totalEvents}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Filtered</span>
                  <span className="stat-value error">{stats.batcher.filtered}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Batched</span>
                  <span className="stat-value success">{stats.batcher.batched}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Batches</span>
                  <span className="stat-value">{stats.batcher.batchCount}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Query Metrics */}
        <div className="stat-section">
          <h4>🔍 Queries</h4>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Active</span>
              <span className="stat-value highlight">{stats.query.activeQueries}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Fetch</span>
              <span className="stat-value">{stats.query.avgFetchTime.toFixed(2)}ms</span>
            </div>
            {!compact && (
              <>
                <div className="stat-item">
                  <span className="stat-label">Loading</span>
                  <span className="stat-value">{stats.query.loadingQueries}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Success</span>
                  <span className="stat-value success">{stats.query.successQueries}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Error</span>
                  <span className="stat-value error">{stats.query.errorQueries}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{stats.query.totalFetches}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        <span className="elapsed-time">⏱️ {elapsedSeconds}s elapsed</span>
      </div>
    </div>
  );
}
