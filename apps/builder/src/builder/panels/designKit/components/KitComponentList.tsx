/**
 * KitComponentList - 적용된 킷의 컴포넌트 목록
 *
 * 인스턴스 배치를 위한 Master 컴포넌트 목록 표시.
 * 클릭 시 createInstance() 호출.
 */

import { Box } from 'lucide-react';
import type { MasterComponentSummary } from '../../../../types/builder/component.types';

interface KitComponentListProps {
  masters: MasterComponentSummary[];
  onCreateInstance: (masterId: string) => void;
}

export function KitComponentList({
  masters,
  onCreateInstance,
}: KitComponentListProps) {
  if (masters.length === 0) {
    return (
      <div className="design-kit-browser-empty">
        킷 컴포넌트가 없습니다.
      </div>
    );
  }

  return (
    <div className="design-kit-browser">
      <div className="design-kit-browser-title">킷 컴포넌트</div>

      {masters.map((master) => (
        <div
          key={master.id}
          className="design-kit-card"
          onClick={() => onCreateInstance(master.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCreateInstance(master.id);
            }
          }}
        >
          <div className="design-kit-card-icon">
            <Box size={14} />
          </div>
          <div className="design-kit-card-info">
            <div className="design-kit-card-name">{master.name}</div>
            <div className="design-kit-card-meta">
              {master.tag} · {master.instanceCount} instances
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
