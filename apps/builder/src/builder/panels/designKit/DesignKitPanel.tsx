/**
 * DesignKitPanel - 디자인 킷 브라우저 + 커스텀 컴포넌트 등록 패널
 *
 * G.4 Design Kit System의 UI 진입점.
 * 킷 목록 브라우저, 킷 미리보기, 적용/내보내기 기능 제공.
 * G.1 커스텀 컴포넌트 등록/관리 기능 포함.
 *
 * Gateway 패턴: isActive 체크 후 Content 렌더링.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.4
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PanelProps } from '../core/types';
import { PanelHeader } from '../../components';
import { Package, Upload, Download } from 'lucide-react';
import { iconProps } from '../../../utils/ui/uiConstants';
import { useDesignKitStore } from '../../../stores/designKitStore';
import { useStore } from '../../stores';
import { KitBrowser } from './components/KitBrowser';
import { KitPreview } from './components/KitPreview';
import { KitComponentList } from './components/KitComponentList';
import { CustomComponentSection } from './components/CustomComponentSection';
import type { MasterComponentSummary } from '../../../types/builder/component.types';
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
  const loadBuiltinKit = useDesignKitStore((s) => s.loadBuiltinKit);
  const applyKit = useDesignKitStore((s) => s.applyKit);
  const exportCurrentAsKit = useDesignKitStore((s) => s.exportCurrentAsKit);
  const clearLoadedKit = useDesignKitStore((s) => s.clearLoadedKit);
  const loadAvailableKits = useDesignKitStore((s) => s.loadAvailableKits);

  // 패널 마운트 시 내장 킷 목록 로드
  useEffect(() => {
    loadAvailableKits();
  }, [loadAvailableKits]);

  const elements = useStore((s) => s.elements);
  const addElement = useStore((s) => s.addElement);
  const childrenMap = useStore((s) => s.childrenMap);
  const componentIndex = useStore((s) => s.componentIndex);
  const currentPageId = useStore((s) => s.currentPageId);
  const selectedElementId = useStore((s) => s.selectedElementId);
  const elementsMap = useStore((s) => s.elementsMap);
  const createInstance = useStore((s) => s.createInstance);
  const registerAsMaster = useStore((s) => s.registerAsMaster);
  const unregisterMaster = useStore((s) => s.unregisterMaster);
  const detachInstance = useStore((s) => s.detachInstance);

  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 킷 선택 시 내장 킷이면 자동 로드
  const handleSelectKit = useCallback(
    (kitId: string) => {
      setSelectedKitId(kitId);
      if (!loadedKit || loadedKit.meta.id !== kitId) {
        loadBuiltinKit(kitId);
      }
    },
    [loadedKit, loadBuiltinKit],
  );

  // G.1: 마스터 컴포넌트 목록 (MasterComponentSummary[] 형태)
  const masterSummaries = useMemo((): MasterComponentSummary[] => {
    const masters: MasterComponentSummary[] = [];
    for (const [id, el] of componentIndex.masterComponents) {
      const instanceCount = componentIndex.masterToInstances.get(id)?.size ?? 0;
      masters.push({
        id,
        name: el.componentName ?? el.tag ?? 'Component',
        tag: el.tag ?? 'Box',
        childCount: childrenMap.get(id)?.length ?? 0,
        instanceCount,
      });
    }
    return masters;
  }, [componentIndex, childrenMap]);

  // G.1: 선택된 요소 정보
  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return elementsMap.get(selectedElementId) ?? null;
  }, [selectedElementId, elementsMap]);

  const canRegisterAsMaster = useMemo(() => {
    if (!selectedElement) return false;
    if (selectedElement.componentRole === 'master') return false;
    if (selectedElement.componentRole === 'instance') return false;
    if (selectedElement.tag === 'body') return false;
    return true;
  }, [selectedElement]);

  // G.1: 인스턴스 생성 핸들러
  const handleCreateInstance = useCallback(
    (masterId: string) => {
      if (!currentPageId) return;
      // body 요소를 부모로 사용 (현재 페이지의 첫 번째 루트 자식)
      const bodyChildren = childrenMap.get('root') ?? [];
      const body = bodyChildren.find((el) => el.page_id === currentPageId);
      const parentId = body?.id ?? 'root';

      createInstance(masterId, parentId, currentPageId);
    },
    [currentPageId, childrenMap, createInstance],
  );

  // G.1: 컴포넌트 등록 핸들러
  const handleRegisterAsMaster = useCallback(
    (componentName: string) => {
      if (!selectedElementId) return;
      registerAsMaster(selectedElementId, componentName);
    },
    [selectedElementId, registerAsMaster],
  );

  // G.1: 컴포넌트 등록 해제 핸들러
  const handleUnregisterMaster = useCallback(
    (masterId: string) => {
      unregisterMaster(masterId);
    },
    [unregisterMaster],
  );

  // G.1: 인스턴스 분리 핸들러
  const handleDetachInstance = useCallback(() => {
    if (!selectedElementId) return;
    detachInstance(selectedElementId);
  }, [selectedElementId, detachInstance]);

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

        {/* G.1: 커스텀 컴포넌트 등록/관리 섹션 */}
        <CustomComponentSection
          selectedElement={selectedElement}
          canRegister={canRegisterAsMaster}
          masterSummaries={masterSummaries}
          onRegister={handleRegisterAsMaster}
          onUnregister={handleUnregisterMaster}
          onCreateInstance={handleCreateInstance}
          onDetachInstance={handleDetachInstance}
        />

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
          onSelectKit={handleSelectKit}
        />

        {/* G.1: 적용된 킷의 마스터 컴포넌트 목록 (kit-imported only) */}
        {appliedKitIds.length > 0 && masterSummaries.length > 0 && (
          <KitComponentList
            masters={masterSummaries}
            onCreateInstance={handleCreateInstance}
          />
        )}
      </div>
    </div>
  );
}
