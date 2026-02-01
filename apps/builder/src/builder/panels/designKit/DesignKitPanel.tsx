/**
 * DesignKitPanel - 디자인 킷 브라우저 패널
 *
 * G.4 Design Kit System의 UI 진입점.
 * 킷 목록 브라우저, 킷 미리보기, 적용/내보내기 기능 제공.
 *
 * Gateway 패턴: isActive 체크 후 Content 렌더링.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.4
 */

import { useCallback, useRef, useState } from 'react';
import type { PanelProps } from '../core/types';
import { PanelHeader } from '../../components';
import { Package, Upload, Download } from 'lucide-react';
import { iconProps } from '../../../utils/ui/uiConstants';
import { useDesignKitStore } from '../../../stores/designKitStore';
import { useStore } from '../../stores';
import { KitBrowser } from './components/KitBrowser';
import { KitPreview } from './components/KitPreview';
import './DesignKitPanel.css';

/**
 * DesignKitPanel - Gateway 컴포넌트
 */
export function DesignKitPanel({ isActive }: PanelProps) {
  if (!isActive) return null;
  return <DesignKitPanelContent />;
}

/**
 * DesignKitPanelContent - 실제 콘텐츠
 */
function DesignKitPanelContent() {
  const { loadedKit, status, error, availableKits, appliedKitIds } = useDesignKitStore();
  const loadKitFromJSON = useDesignKitStore((s) => s.loadKitFromJSON);
  const applyKit = useDesignKitStore((s) => s.applyKit);
  const exportCurrentAsKit = useDesignKitStore((s) => s.exportCurrentAsKit);
  const clearLoadedKit = useDesignKitStore((s) => s.clearLoadedKit);

  const elements = useStore((s) => s.elements);
  const addElement = useStore((s) => s.addElement);
  const childrenMap = useStore((s) => s.childrenMap);

  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSON 파일 import
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      loadKitFromJSON(text);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [loadKitFromJSON],
  );

  // 현재 프로젝트 export
  const handleExport = useCallback(() => {
    const kit = exportCurrentAsKit(
      { name: 'My Kit', version: '1.0.0' },
      elements,
      childrenMap,
    );

    const json = JSON.stringify(kit, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kit.meta.name.replace(/\s+/g, '-').toLowerCase()}.kit.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportCurrentAsKit, elements, childrenMap]);

  // Kit 적용
  const handleApply = useCallback(async () => {
    if (!loadedKit) return;

    const projectId = useStore.getState().currentPageId ?? 'default';

    await applyKit(loadedKit, projectId, { elements, addElement });
    clearLoadedKit();
  }, [loadedKit, applyKit, elements, addElement, clearLoadedKit]);

  return (
    <div className="design-kit-panel">
      <PanelHeader
        icon={<Package size={iconProps.size} />}
        title="Design Kit"
        actions={
          <div className="design-kit-panel-actions">
            <button
              className="iconButton"
              onClick={handleImport}
              type="button"
              aria-label="Import Kit"
              title="킷 가져오기"
            >
              <Upload
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
            </button>
            <button
              className="iconButton"
              onClick={handleExport}
              type="button"
              aria-label="Export Kit"
              title="킷 내보내기"
            >
              <Download
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
            </button>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.kit.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div className="design-kit-panel-content">
        {/* 에러 표시 */}
        {error && (
          <div className="design-kit-error">
            <span>{error}</span>
          </div>
        )}

        {/* 로드된 Kit 미리보기 + 적용 버튼 */}
        {loadedKit && (
          <KitPreview
            kit={loadedKit}
            isApplying={status === 'applying'}
            onApply={handleApply}
            onCancel={clearLoadedKit}
          />
        )}

        {/* Kit 브라우저 */}
        <KitBrowser
          kits={availableKits}
          appliedKitIds={appliedKitIds}
          selectedKitId={selectedKitId}
          onSelectKit={setSelectedKitId}
        />
      </div>
    </div>
  );
}
