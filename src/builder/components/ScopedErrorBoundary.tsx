/**
 * Scoped Error Boundary
 *
 * 🚀 Phase 7: 패널/컴포넌트 단위 에러 격리 및 자동 복구
 *
 * 특징:
 * 1. 에러가 전체 앱으로 전파되지 않도록 격리
 * 2. 자동 복구 시도 (지수 백오프)
 * 3. 사용자 친화적 Fail-soft UI
 * 4. 에러 리포팅 통합
 *
 * @since 2025-12-10 Phase 7 Error Boundary
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { iconProps, iconEditProps, iconLarge } from '../../utils/ui/uiConstants';

// ============================================
// Types
// ============================================

export interface ErrorBoundaryProps {
  /** 컴포넌트/패널 이름 (에러 리포팅용) */
  name: string;
  /** 에러 발생 시 표시할 커스텀 fallback UI */
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  /** 에러 발생 시 콜백 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** 복구 시도 최대 횟수 */
  maxRetries?: number;
  /** 자동 복구 시도 여부 */
  autoRecover?: boolean;
  /** 자동 복구 지연 시간 (ms) */
  autoRecoverDelay?: number;
  /** 최소화 모드 (작은 영역용) */
  compact?: boolean;
  /** 자식 컴포넌트 */
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}

// ============================================
// Scoped Error Boundary Component
// ============================================

/**
 * 스코프 기반 에러 바운더리
 *
 * @example
 * ```tsx
 * // 패널 래핑
 * <ScopedErrorBoundary name="PropertiesPanel">
 *   <PropertiesPanel />
 * </ScopedErrorBoundary>
 *
 * // 커스텀 fallback
 * <ScopedErrorBoundary
 *   name="Canvas"
 *   fallback={({ error, reset }) => (
 *     <div>
 *       <p>Canvas error: {error.message}</p>
 *       <button onClick={reset}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <Canvas />
 * </ScopedErrorBoundary>
 * ```
 */
export class ScopedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps = {
    maxRetries: 3,
    autoRecover: true,
    autoRecoverDelay: 1000,
    compact: false,
  };

  private autoRecoverTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { name, onError, autoRecover, maxRetries, autoRecoverDelay } = this.props;

    // 상태 업데이트
    this.setState({ errorInfo });

    // 에러 로깅
    console.error(`[ErrorBoundary:${name}]`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // 에러 콜백
    onError?.(error, errorInfo);

    // 자동 복구 시도
    if (autoRecover && this.state.retryCount < (maxRetries ?? 3)) {
      const delay = (autoRecoverDelay ?? 1000) * Math.pow(2, this.state.retryCount); // 지수 백오프

      console.log(`[ErrorBoundary:${name}] Auto-recovering in ${delay}ms (attempt ${this.state.retryCount + 1}/${maxRetries})`);

      this.setState({ isRecovering: true });

      this.autoRecoverTimeout = setTimeout(() => {
        this.setState((state) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: state.retryCount + 1,
          isRecovering: false,
        }));
      }, delay);
    }
  }

  componentWillUnmount(): void {
    if (this.autoRecoverTimeout) {
      clearTimeout(this.autoRecoverTimeout);
    }
  }

  handleReset = (): void => {
    if (this.autoRecoverTimeout) {
      clearTimeout(this.autoRecoverTimeout);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
    });
  };

  handleDismiss = (): void => {
    // 에러 상태 유지하면서 UI만 숨김 (optional)
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    const { hasError, error, retryCount, isRecovering } = this.state;
    const { children, fallback, name, maxRetries, compact } = this.props;

    if (hasError && error) {
      // 커스텀 fallback (함수형)
      if (typeof fallback === 'function') {
        return fallback({ error, reset: this.handleReset });
      }

      // 커스텀 fallback (컴포넌트)
      if (fallback) {
        return fallback;
      }

      // 기본 Fail-soft UI
      return (
        <FailSoftUI
          name={name}
          error={error}
          onRetry={this.handleReset}
          onDismiss={this.handleDismiss}
          retryCount={retryCount}
          maxRetries={maxRetries ?? 3}
          isRecovering={isRecovering}
          compact={compact ?? false}
        />
      );
    }

    return children;
  }
}

// ============================================
// Fail-soft UI Component
// ============================================

interface FailSoftUIProps {
  name: string;
  error: Error;
  onRetry: () => void;
  onDismiss?: () => void;
  retryCount: number;
  maxRetries: number;
  isRecovering: boolean;
  compact: boolean;
}

/**
 * 에러 발생 시 표시되는 Fail-soft UI
 */
function FailSoftUI({
  name,
  error,
  onRetry,
  onDismiss,
  retryCount,
  maxRetries,
  isRecovering,
  compact,
}: FailSoftUIProps): ReactNode {
  const canRetry = retryCount < maxRetries;

  // 컴팩트 모드 (작은 영역용)
  if (compact) {
    return (
      <div className="scoped-error-boundary-compact">
        <AlertTriangle size={iconProps.size} />
        <span>{name} error</span>
        {canRetry && (
          <button
            onClick={onRetry}
            disabled={isRecovering}
            className="scoped-error-retry-btn-compact"
          >
            <RefreshCw size={iconEditProps.size} className={isRecovering ? 'spinning' : ''} />
          </button>
        )}
      </div>
    );
  }

  // 전체 모드
  return (
    <div className="scoped-error-boundary">
      <div className="scoped-error-boundary-header">
        <AlertTriangle size={iconLarge.size} className="scoped-error-icon" />
        <h3 className="scoped-error-title">{name} Error</h3>
        {onDismiss && (
          <button onClick={onDismiss} className="scoped-error-dismiss-btn">
            <X size={iconProps.size} />
          </button>
        )}
      </div>

      <div className="scoped-error-boundary-content">
        <p className="scoped-error-message">{error.message}</p>

        {isRecovering && (
          <p className="scoped-error-recovering">
            <RefreshCw size={iconEditProps.size} className="spinning" />
            Recovering...
          </p>
        )}

        {!isRecovering && retryCount > 0 && (
          <p className="scoped-error-retry-count">
            Retry attempt: {retryCount}/{maxRetries}
          </p>
        )}
      </div>

      <div className="scoped-error-boundary-actions">
        {canRetry ? (
          <button
            onClick={onRetry}
            disabled={isRecovering}
            className="scoped-error-retry-btn"
          >
            <RefreshCw size={iconProps.size} className={isRecovering ? 'spinning' : ''} />
            Retry
          </button>
        ) : (
          <p className="scoped-error-max-retries">
            Max retries reached. Please refresh the page.
          </p>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && error.stack && (
        <details className="scoped-error-details">
          <summary>Stack trace</summary>
          <pre>{error.stack}</pre>
        </details>
      )}
    </div>
  );
}

// ============================================
// CSS (인라인 또는 별도 파일로 이동 가능)
// ============================================

// Note: CSS는 src/builder/components/styles/ScopedErrorBoundary.css로 분리 권장

export default ScopedErrorBoundary;
