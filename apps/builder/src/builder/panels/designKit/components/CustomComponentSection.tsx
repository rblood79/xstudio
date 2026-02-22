/**
 * CustomComponentSection - 커스텀 컴포넌트 등록/관리 UI
 *
 * G.1 Master-Instance 시스템의 사용자 인터페이스.
 * - 선택된 요소를 커스텀 컴포넌트로 등록
 * - 등록된 커스텀 컴포넌트 목록 표시
 * - 인스턴스 생성, 등록 해제, 인스턴스 분리 기능
 */

import { useCallback, useState } from 'react';
import { Plus, Unlink, Copy, Trash2, Box, Package } from 'lucide-react';
import type { Element } from '../../../../types/core/store.types';
import type { MasterComponentSummary } from '../../../../types/builder/component.types';

interface CustomComponentSectionProps {
  selectedElement: Element | null;
  canRegister: boolean;
  masterSummaries: MasterComponentSummary[];
  onRegister: (componentName: string) => void;
  onUnregister: (masterId: string) => void;
  onCreateInstance: (masterId: string) => void;
  onDetachInstance: () => void;
}

export function CustomComponentSection({
  selectedElement,
  canRegister,
  masterSummaries,
  onRegister,
  onUnregister,
  onCreateInstance,
  onDetachInstance,
}: CustomComponentSectionProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [componentName, setComponentName] = useState('');

  const handleStartRegister = useCallback(() => {
    if (!selectedElement) return;
    setComponentName(selectedElement.tag || 'Component');
    setIsRegistering(true);
  }, [selectedElement]);

  const handleConfirmRegister = useCallback(() => {
    if (!componentName.trim()) return;
    onRegister(componentName.trim());
    setIsRegistering(false);
    setComponentName('');
  }, [componentName, onRegister]);

  const handleCancelRegister = useCallback(() => {
    setIsRegistering(false);
    setComponentName('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmRegister();
      } else if (e.key === 'Escape') {
        handleCancelRegister();
      }
    },
    [handleConfirmRegister, handleCancelRegister],
  );

  const isSelectedInstance = selectedElement?.componentRole === 'instance';
  const isSelectedMaster = selectedElement?.componentRole === 'master';

  return (
    <div className="custom-component-section">
      <div className="custom-component-section-title">Custom Components</div>

      {/* 선택 상태에 따른 컨텍스트 액션 */}
      <div className="custom-component-actions">
        {/* 등록 가능한 일반 요소 선택 시 */}
        {canRegister && !isRegistering && (
          <button
            className="custom-component-action-btn primary"
            onClick={handleStartRegister}
            type="button"
          >
            <Plus size={14} />
            <span>Register as Component</span>
          </button>
        )}

        {/* 등록 폼 */}
        {isRegistering && (
          <div className="custom-component-register-form">
            <input
              className="custom-component-name-input"
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Component name"
              autoFocus
            />
            <div className="custom-component-register-actions">
              <button
                className="custom-component-action-btn primary"
                onClick={handleConfirmRegister}
                type="button"
                disabled={!componentName.trim()}
              >
                Register
              </button>
              <button
                className="custom-component-action-btn"
                onClick={handleCancelRegister}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Instance 선택 시 — Detach 버튼 */}
        {isSelectedInstance && (
          <button
            className="custom-component-action-btn"
            onClick={onDetachInstance}
            type="button"
            title="Detach from master (convert to independent element)"
          >
            <Unlink size={14} />
            <span>Detach Instance</span>
          </button>
        )}

        {/* Master 선택 시 — 안내 표시 */}
        {isSelectedMaster && (
          <div className="custom-component-master-info">
            <Package size={14} />
            <span>Master: {selectedElement?.componentName ?? selectedElement?.tag}</span>
          </div>
        )}
      </div>

      {/* 등록된 커스텀 컴포넌트 목록 */}
      {masterSummaries.length > 0 && (
        <div className="custom-component-list">
          {masterSummaries.map((master) => (
            <div key={master.id} className="custom-component-card">
              <div className="custom-component-card-icon">
                <Box size={14} />
              </div>
              <div className="custom-component-card-info">
                <div className="custom-component-card-name">{master.name}</div>
                <div className="custom-component-card-meta">
                  {master.tag} · {master.childCount} children · {master.instanceCount} instances
                </div>
              </div>
              <div className="custom-component-card-actions">
                <button
                  className="iconButton"
                  onClick={() => onCreateInstance(master.id)}
                  type="button"
                  aria-label={`Create instance of ${master.name}`}
                  title="Create instance"
                >
                  <Copy size={12} />
                </button>
                <button
                  className="iconButton"
                  onClick={() => onUnregister(master.id)}
                  type="button"
                  aria-label={`Unregister ${master.name}`}
                  title="Unregister component"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {masterSummaries.length === 0 && !canRegister && !isSelectedInstance && !isSelectedMaster && (
        <div className="custom-component-empty">
          Select an element and click "Register as Component" to create a reusable component.
        </div>
      )}
    </div>
  );
}
