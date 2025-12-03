/**
 * LayoutPresetSelector - 레이아웃 프리셋 선택 컴포넌트
 *
 * Phase 6: Layout 프리셋 시스템 메인 컴포넌트
 *
 * 기능:
 * 1. 카테고리별 프리셋 그리드 표시
 * 2. SVG 미리보기 썸네일
 * 3. 기존 Slot 감지 시 확인 다이얼로그
 * 4. 프리셋 적용 (History 단일 엔트리)
 */

import { memo, useCallback, useMemo, useState } from "react";
import { Layout, LayoutGrid, Columns2, LayoutDashboard } from "lucide-react";
import { Button } from "../../../../../shared/components";
import { PresetPreview } from "./PresetPreview";
import { ExistingSlotDialog } from "./ExistingSlotDialog";
import { usePresetApply } from "./usePresetApply";
import {
  LAYOUT_PRESETS,
  PRESET_CATEGORIES,
  PRESET_ORDER,
} from "./presetDefinitions";
import type { PresetApplyMode } from "./types";
import "./styles.css";

interface LayoutPresetSelectorProps {
  /** Layout ID */
  layoutId: string;
  /** Body Element ID */
  bodyElementId: string;
}

/**
 * 카테고리 아이콘 매핑
 */
const CATEGORY_ICONS: Record<string, typeof Layout> = {
  basic: Layout,
  sidebar: Columns2,
  complex: LayoutGrid,
  dashboard: LayoutDashboard,
};

export const LayoutPresetSelector = memo(function LayoutPresetSelector({
  layoutId,
  bodyElementId,
}: LayoutPresetSelectorProps) {
  // 선택된 프리셋 상태
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(
    null
  );
  // 다이얼로그 열림 상태
  const [dialogOpen, setDialogOpen] = useState(false);

  // 프리셋 적용 훅
  const { existingSlots, currentPresetKey, applyPreset, isApplying } = usePresetApply({
    layoutId,
    bodyElementId,
  });

  // 카테고리별 프리셋 그룹화
  const presetsByCategory = useMemo(() => {
    const groups: Record<string, string[]> = {
      basic: [],
      sidebar: [],
      complex: [],
      dashboard: [],
    };

    PRESET_ORDER.forEach((key) => {
      const preset = LAYOUT_PRESETS[key];
      if (preset) {
        groups[preset.category].push(key);
      }
    });

    return groups;
  }, []);

  // 프리셋 클릭 핸들러
  const handlePresetClick = useCallback(
    (presetKey: string) => {
      // ⭐ 동일한 프리셋이 이미 적용되어 있으면 무시
      if (currentPresetKey === presetKey) {
        console.log(`[Preset] "${presetKey}" is already applied, skipping`);
        return;
      }

      setSelectedPresetKey(presetKey);

      // 기존 Slot이 있으면 다이얼로그 표시
      if (existingSlots.length > 0) {
        setDialogOpen(true);
      } else {
        // 기존 Slot이 없으면 바로 적용
        applyPreset(presetKey, "replace");
      }
    },
    [existingSlots.length, currentPresetKey, applyPreset]
  );

  // 다이얼로그 확인 핸들러
  const handleDialogConfirm = useCallback(
    (mode: PresetApplyMode) => {
      if (selectedPresetKey && mode !== "cancel") {
        applyPreset(selectedPresetKey, mode);
      }
      setDialogOpen(false);
      setSelectedPresetKey(null);
    },
    [selectedPresetKey, applyPreset]
  );

  // 다이얼로그 닫기 핸들러
  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedPresetKey(null);
  }, []);

  return (
    <>
      {Object.entries(PRESET_CATEGORIES).map(([categoryKey, meta]) => {
        const presetKeys = presetsByCategory[categoryKey];
        if (!presetKeys || presetKeys.length === 0) return null;

        const CategoryIcon = CATEGORY_ICONS[categoryKey] || Layout;

        return (
          <div key={categoryKey} className="list-subgroup">
            <div className="list-subgroup-header">
              <CategoryIcon size={14} className="list-subgroup-icon" />
              <span className="list-subgroup-title">{meta.label}</span>
            </div>

            <div className="list-group" role="list">
              {presetKeys.map((presetKey) => {
                const preset = LAYOUT_PRESETS[presetKey];
                if (!preset) return null;

                const isSelected = selectedPresetKey === presetKey;
                const isApplied = currentPresetKey === presetKey;

                return (
                  <Button
                    key={presetKey}
                    variant="default"
                    className={`list-item preset-card ${isSelected ? "selected" : ""} ${isApplied ? "applied" : ""}`}
                    onPress={() => handlePresetClick(presetKey)}
                    isDisabled={isApplying}
                  >
                    <PresetPreview
                      areas={preset.previewAreas}
                      width={80}
                      height={60}
                    />
                    <span className="list-item-name">{preset.name}</span>
                    {isApplied && <span className="list-item-badge applied">적용됨</span>}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 기존 Slot 처리 다이얼로그 */}
      <ExistingSlotDialog
        isOpen={dialogOpen}
        existingSlots={existingSlots}
        presetName={
          selectedPresetKey ? LAYOUT_PRESETS[selectedPresetKey]?.name || "" : ""
        }
        onConfirm={handleDialogConfirm}
        onClose={handleDialogClose}
      />
    </>
  );
});

export default LayoutPresetSelector;
