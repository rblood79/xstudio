/**
 * KitPreview - 로드된 킷 미리보기
 *
 * 킷의 변수/테마/컴포넌트 수를 표시하고 적용/취소 액션 제공.
 */

import type { DesignKit } from '../../../../types/builder/designKit.types';

interface KitPreviewProps {
  kit: DesignKit;
  isApplying: boolean;
  onApply: () => void;
  onCancel: () => void;
}

export function KitPreview({ kit, isApplying, onApply, onCancel }: KitPreviewProps) {
  const totalTokens = kit.themes.reduce(
    (sum, theme) => sum + theme.tokens.length,
    0,
  );

  return (
    <div className="design-kit-preview">
      <div className="design-kit-preview-header">
        <span className="design-kit-preview-name">{kit.meta.name}</span>
        <span className="design-kit-preview-version">v{kit.meta.version}</span>
      </div>

      {kit.meta.description && (
        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px 0' }}>
          {kit.meta.description}
        </p>
      )}

      <div className="design-kit-preview-stats">
        <div className="design-kit-preview-stat">
          변수 <span className="design-kit-preview-stat-value">{kit.variables.length}</span>
        </div>
        <div className="design-kit-preview-stat">
          토큰 <span className="design-kit-preview-stat-value">{totalTokens}</span>
        </div>
        <div className="design-kit-preview-stat">
          컴포넌트 <span className="design-kit-preview-stat-value">{kit.components.length}</span>
        </div>
        <div className="design-kit-preview-stat">
          테마 <span className="design-kit-preview-stat-value">{kit.themes.length}</span>
        </div>
      </div>

      <div className="design-kit-preview-actions">
        <button type="button" onClick={onCancel} disabled={isApplying}>
          취소
        </button>
        <button
          type="button"
          className="primary"
          onClick={onApply}
          disabled={isApplying}
        >
          {isApplying ? '적용 중...' : '프로젝트에 적용'}
        </button>
      </div>
    </div>
  );
}
