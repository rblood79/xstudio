/**
 * KitBrowser - 디자인 킷 목록 브라우저
 *
 * 사용 가능한 킷 목록을 카드 형태로 표시.
 * 적용 완료된 킷에는 배지 표시.
 */

import { Package } from 'lucide-react';
import type { DesignKitMeta } from '../../../../types/builder/designKit.types';

interface KitBrowserProps {
  kits: DesignKitMeta[];
  appliedKitIds: string[];
  selectedKitId: string | null;
  onSelectKit: (kitId: string) => void;
}

export function KitBrowser({
  kits,
  appliedKitIds,
  selectedKitId,
  onSelectKit,
}: KitBrowserProps) {
  return (
    <div className="design-kit-browser">
      <div className="design-kit-browser-title">킷 라이브러리</div>

      {kits.length === 0 ? (
        <div className="design-kit-browser-empty">
          킷이 없습니다.
          <br />
          상단 Import 버튼으로 .kit.json 파일을 가져오세요.
        </div>
      ) : (
        kits.map((kit) => {
          const isApplied = appliedKitIds.includes(kit.id);
          const isSelected = selectedKitId === kit.id;

          return (
            <div
              key={kit.id}
              className="design-kit-card"
              data-selected={isSelected}
              data-applied={isApplied}
              onClick={() => onSelectKit(kit.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectKit(kit.id);
                }
              }}
            >
              <div className="design-kit-card-icon">
                <Package size={16} />
              </div>
              <div className="design-kit-card-info">
                <div className="design-kit-card-name">{kit.name}</div>
                <div className="design-kit-card-meta">
                  v{kit.version}
                  {kit.author && ` · ${kit.author}`}
                </div>
              </div>
              {isApplied && (
                <div className="design-kit-card-badge">적용됨</div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
