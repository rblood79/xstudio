/**
 * SettingsPanel - 설정 관리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * Builder 설정, 테마, 저장 모드 등 시스템 설정 제공
 */

import React from "react";
import {
  Eye,
  Grid3x3,
  Magnet,
  Ruler,
  Square,
  Tag,
  Percent,
  Palette,
  ZoomIn,
  Save,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "react-aria-components";
import { useParams } from "react-router-dom";
import type { PanelProps } from "../core/types";
import { useStore } from "../../stores";
import { useUnifiedThemeStore } from "../../../stores/themeStore";
import { saveService } from "../../../services/save";
import {
  PropertySwitch,
  PropertySelect,
  PropertySlider,
  PropertySection,
} from "../common";
import { useThemes } from "../../../hooks/theme/useThemes";
import { ThemeService } from "../../../services/theme";

function SettingsContent() {
  const { projectId } = useParams<{ projectId: string }>();

  const showOverlay = useStore((state) => state.showOverlay);
  const setShowOverlay = useStore((state) => state.setShowOverlay);

  const showGrid = useStore((state) => state.showGrid);
  const setShowGrid = useStore((state) => state.setShowGrid);

  const snapToGrid = useStore((state) => state.snapToGrid);
  const setSnapToGrid = useStore((state) => state.setSnapToGrid);

  const gridSize = useStore((state) => state.gridSize);
  const setGridSize = useStore((state) => state.setGridSize);

  const showElementBorders = useStore((state) => state.showElementBorders);
  const setShowElementBorders = useStore(
    (state) => state.setShowElementBorders
  );

  const showElementLabels = useStore((state) => state.showElementLabels);
  const setShowElementLabels = useStore((state) => state.setShowElementLabels);

  const overlayOpacity = useStore((state) => state.overlayOpacity);
  const setOverlayOpacity = useStore((state) => state.setOverlayOpacity);

  const themeMode = useStore((state) => state.themeMode);
  const setThemeMode = useStore((state) => state.setThemeMode);

  const uiScale = useStore((state) => state.uiScale);
  const setUiScale = useStore((state) => state.setUiScale);

  // SaveMode 상태
  const isRealtimeMode = useStore((state) => state.isRealtimeMode);
  const pendingChanges = useStore((state) => state.pendingChanges);
  const setRealtimeMode = useStore((state) => state.setRealtimeMode);
  const pendingCount = pendingChanges.size;

  // Theme 관련 상태
  const activeTheme = useUnifiedThemeStore((state) => state.activeTheme);
  const loadActiveTheme = useUnifiedThemeStore(
    (state) => state.loadActiveTheme
  );
  const { themes } = useThemes({
    projectId: projectId || "",
    enableRealtime: false,
  });

  const [isSaving, setIsSaving] = React.useState(false);

  const handleThemeChange = async (themeId: string): Promise<void> => {
    if (!projectId) return;

    try {
      await ThemeService.activateTheme(themeId);
      await loadActiveTheme(projectId);
      console.log("[Setting] Theme switched to:", themeId);
    } catch (error) {
      console.error("[Setting] Failed to switch theme:", error);
    }
  };

  // Theme Mode에 따른 아이콘 결정
  const getThemeModeIcon = () => {
    if (themeMode === "dark") return Moon;
    if (themeMode === "light") return Sun;
    // auto인 경우 시스템 설정 확인
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return prefersDark ? Moon : Sun;
  };

  const themeModeOptions = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "auto", label: "Auto (System)" },
  ];

  const uiScaleOptions = [
    { value: "80", label: "80%" },
    { value: "100", label: "100%" },
    { value: "120", label: "120%" },
  ];

  const gridSizeOptions = [
    { value: "8", label: "8px" },
    { value: "16", label: "16px" },
    { value: "24", label: "24px" },
  ];

  const handleGridSizeChange = (value: string) => {
    const size = parseInt(value) as 8 | 16 | 24;
    setGridSize(size);
  };

  const handleThemeModeChange = (value: string) => {
    const mode = value as "light" | "dark" | "auto";
    setThemeMode(mode);
  };

  const handleUiScaleChange = (value: string) => {
    const scale = parseInt(value) as 80 | 100 | 120;
    setUiScale(scale);
  };

  const handleSave = (): void => {
    setIsSaving(true);
    saveService
      .saveAllPendingChanges()
      .then(() => {
        console.log("✅ 저장 완료");
      })
      .catch((error) => {
        console.error("❌ 저장 실패:", error);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleRealtimeModeChange = (enabled: boolean): void => {
    setRealtimeMode(enabled);

    if (enabled && pendingChanges.size > 0) {
      // 수동 → 실시간 전환 시 보류 중인 변경사항 자동 저장
      handleSave();
    }
  };

  return (
    <div className="panel-settings">
      {/* Save Mode Section */}
      <PropertySection title="Save Mode">
        <PropertySwitch
          label="Auto Save"
          isSelected={isRealtimeMode}
          onChange={handleRealtimeModeChange}
          icon={Save}
        />

        <Button
          onPress={handleSave}
          isDisabled={isRealtimeMode || pendingCount === 0 || isSaving}
          className="save-button"
        >
          {isSaving
            ? "Saving..."
            : `Save${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        </Button>
      </PropertySection>

      {/* Preview & Overlay Section */}
      <PropertySection title="Preview & Overlay">
        <PropertySwitch
          label="Show Selection Overlay"
          isSelected={showOverlay}
          onChange={setShowOverlay}
          icon={Eye}
        />
      </PropertySection>

      {/* Grid & Guides Section */}
      <PropertySection title="Grid & Guides">
        <PropertySwitch
          label="Show Grid"
          isSelected={showGrid}
          onChange={setShowGrid}
          icon={Grid3x3}
        />

        <PropertySwitch
          label="Snap to Grid"
          isSelected={snapToGrid}
          onChange={setSnapToGrid}
          icon={Magnet}
        />

        <PropertySelect
          label="Grid Size"
          value={String(gridSize)}
          onChange={handleGridSizeChange}
          options={gridSizeOptions}
          icon={Ruler}
        />
      </PropertySection>

      {/* Element Visualization Section */}
      <PropertySection title="Element Visualization">
        <PropertySwitch
          label="Show Element Borders"
          isSelected={showElementBorders}
          onChange={setShowElementBorders}
          icon={Square}
        />

        <PropertySwitch
          label="Show Element Labels"
          isSelected={showElementLabels}
          onChange={setShowElementLabels}
          icon={Tag}
        />

        <PropertySlider
          label="Overlay Opacity"
          value={overlayOpacity}
          onChange={setOverlayOpacity}
          min={0}
          max={100}
          step={5}
          icon={Percent}
        />
      </PropertySection>

      {/* Theme Settings Section */}
      <PropertySection title="Theme & Appearance">
        {/* Theme Select */}
        {projectId && themes.length > 0 && (
          <PropertySelect
            label="Theme Select"
            value={activeTheme?.id || ""}
            onChange={handleThemeChange}
            options={themes.map((theme) => ({
              value: theme.id,
              label: theme.name,
            }))}
            icon={Palette}
          />
        )}

        <PropertySelect
          label="Theme Mode"
          value={themeMode}
          onChange={handleThemeModeChange}
          options={themeModeOptions}
          icon={getThemeModeIcon()}
        />

        <PropertySelect
          label="UI Scale"
          value={String(uiScale)}
          onChange={handleUiScaleChange}
          options={uiScaleOptions}
          icon={ZoomIn}
        />
      </PropertySection>
    </div>
  );
}

export function SettingsPanel({ isActive }: PanelProps) {
  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  return <SettingsContent />;
}
