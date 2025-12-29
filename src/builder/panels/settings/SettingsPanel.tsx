/**
 * SettingsPanel - 설정 관리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * Builder 설정, 테마 등 시스템 설정 제공
 *
 * @updated 2025-12-29 - Save Mode, Preview & Overlay, Element Visualization 섹션 제거
 *   (WebGL 캔버스 전환 및 로컬 저장 방식으로 변경됨에 따라 불필요해짐)
 */

import {
  Grid3x3,
  Magnet,
  Ruler,
  Palette,
  ZoomIn,
  Moon,
  Sun,
  Settings,
} from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useParams } from "react-router-dom";
import type { PanelProps } from "../core/types";
import { useStore } from "../../stores";
import { useUnifiedThemeStore } from "../../../stores/themeStore";
import { useUiStore } from "../../../stores/uiStore";
import {
  PropertySwitch,
  PropertySelect,
  PropertySection,
  PanelHeader,
} from "../../components";
import { useThemes } from "../../../hooks/theme/useThemes";
import { ThemeService } from "../../../services/theme";
import { useThemeMessenger } from "../../hooks/useThemeMessenger";

function SettingsContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const { sendThemeTokens, sendDarkMode } = useThemeMessenger();

  // Grid & Guides 설정
  const showGrid = useStore((state) => state.showGrid);
  const setShowGrid = useStore((state) => state.setShowGrid);

  const snapToGrid = useStore((state) => state.snapToGrid);
  const setSnapToGrid = useStore((state) => state.setSnapToGrid);

  const gridSize = useStore((state) => state.gridSize);
  const setGridSize = useStore((state) => state.setGridSize);

  // UI 설정 (글로벌 uiStore에서 가져옴)
  const themeMode = useUiStore((state) => state.themeMode);
  const setThemeMode = useUiStore((state) => state.setThemeMode);

  const uiScale = useUiStore((state) => state.uiScale);
  const setUiScale = useUiStore((state) => state.setUiScale);

  // Theme 관련 상태
  const activeTheme = useUnifiedThemeStore((state) => state.activeTheme);
  const loadActiveTheme = useUnifiedThemeStore(
    (state) => state.loadActiveTheme
  );
  const { themes } = useThemes({
    projectId: projectId || "",
    enableRealtime: false,
  });

  const handleThemeChange = async (themeId: string): Promise<void> => {
    if (!projectId) return;

    try {
      await ThemeService.activateTheme(themeId);
      await loadActiveTheme(projectId);

      const { tokens } = useUnifiedThemeStore.getState();
      if (tokens.length > 0) {
        sendThemeTokens(tokens);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[SettingsPanel] Failed to switch theme:", error);
      }
    }
  };

  // Theme Mode에 따른 아이콘 결정
  const getThemeModeIcon = () => {
    if (themeMode === "dark") return Moon;
    if (themeMode === "light") return Sun;
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
    { value: "80", label: "Small" },
    { value: "100", label: "Default" },
    { value: "120", label: "Large" },
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

    const isDark =
      mode === "dark" ||
      (mode === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    sendDarkMode(isDark);
  };

  const handleUiScaleChange = (value: string) => {
    const scale = parseInt(value) as 80 | 100 | 120;
    setUiScale(scale);
  };

  return (
    <div className="settings-panel">
      <PanelHeader icon={<Settings size={iconProps.size} />} title="Settings" />

      <div className="panel-settings">
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
    </div>
  );
}

export function SettingsPanel({ isActive }: PanelProps) {
  if (!isActive) {
    return null;
  }

  return <SettingsContent />;
}
