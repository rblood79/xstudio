import React from "react";
import {
  Menu,
  Eye,
  Undo,
  Redo,
  Play,
  Monitor,
  Tablet,
  Smartphone,
  Asterisk,
  Moon,
  Sun,
} from "lucide-react";
import {
  RadioGroup,
  Radio,
  Key,
  Label,
} from "react-aria-components";
import { Select, SelectItem } from "../components/Select";
import { iconProps } from "../../utils/uiConstants";
import { useStore } from "../stores";
import { useThemes } from "../../hooks/theme/useThemes";
import { ThemeService } from "../../services/theme";

export interface Breakpoint {
  id: string;
  label: string;
  max_width: string | number;
  max_height: string | number;
}

// 새로운 히스토리 시스템 타입
export interface HistoryInfo {
  current: number;
  total: number;
}

export interface BuilderHeaderProps {
  projectId?: string;
  projectName?: string;
  breakpoint: Set<Key>;
  breakpoints: Breakpoint[];
  onBreakpointChange: (value: Key) => void;
  historyInfo: HistoryInfo;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onPlay: () => void;
  onPublish: () => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
  projectId,
  projectName,
  breakpoint,
  breakpoints,
  onBreakpointChange,
  historyInfo,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  onPlay,
  onPublish,
}) => {
  // Theme 관련 상태
  const activeTheme = useStore((state) => state.activeTheme);
  const loadTheme = useStore((state) => state.loadTheme);
  const { themes, loading: themesLoading } = useThemes({
    projectId: projectId || "",
    enableRealtime: false,
  });

  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // 다크모드 초기화 (로컬 스토리지에서 복원)
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    if (shouldBeDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      setIsDarkMode(true);
    }
  }, []);

  const handleThemeChange = async (themeId: string): Promise<void> => {
    if (!projectId) return;

    try {
      await ThemeService.activateTheme(themeId);
      await loadTheme(projectId);
      console.log("[BuilderHeader] Theme switched to:", themeId);
    } catch (error) {
      console.error("[BuilderHeader] Failed to switch theme:", error);
    }
  };

  const handleDarkModeToggle = (): void => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    // 부모 문서에 data-theme 속성 설정
    if (newDarkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }

    // Preview iframe에도 다크모드 메시지 전송
    const previewIframe = document.querySelector(
      'iframe[title="preview"]'
    ) as HTMLIFrameElement;
    if (previewIframe?.contentWindow) {
      previewIframe.contentWindow.postMessage(
        {
          type: "SET_DARK_MODE",
          isDark: newDarkMode,
        },
        "*"
      );
    }

    console.log(
      "[BuilderHeader] Dark mode:",
      newDarkMode ? "enabled" : "disabled"
    );
  };

  return (
    <nav className="header">
      <div className="header_contents header_left">
        <button aria-label="Menu">
          <Menu
            color={"#fff"}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
        <div className="project-info">
          {projectName && <span className="project-name">{projectName}</span>}
          {/*projectId && <code className="project-id">ID: {projectId}</code>*/}
          {!projectId && !projectName && "No project loaded"}
        </div>
      </div>

      <div className="header_contents screen">
        <code className="code sizeInfo">
          {
            breakpoints.find((bp) => bp.id === Array.from(breakpoint)[0])
              ?.max_width
          }
          x
          {
            breakpoints.find((bp) => bp.id === Array.from(breakpoint)[0])
              ?.max_height
          }
        </code>

        <RadioGroup
          orientation="horizontal"
          value={Array.from(breakpoint)[0]?.toString()}
          onChange={(value) => onBreakpointChange(value)}
        >
          {breakpoints.map((bp) => (
            <Radio value={bp.id} key={bp.id} className="aria-Radio">
              {bp.id === "screen" && (
                <Asterisk
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              )}
              {bp.id === "desktop" && (
                <Monitor
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              )}
              {bp.id === "tablet" && (
                <Tablet
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              )}
              {bp.id === "mobile" && (
                <Smartphone
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              )}
              <Label>{bp.label}</Label>
            </Radio>
          ))}
        </RadioGroup>
        {projectId && themes.length > 0 && (
          <div className="theme-selector">
            <Select
              label=""
              selectedKey={activeTheme?.id || ""}
              onSelectionChange={(key) => handleThemeChange(String(key))}
              isDisabled={themesLoading}
              placeholder="Select a theme"
              aria-label="Select theme"
            >
              {themes.map((theme) => (
                <SelectItem key={theme.id} id={theme.id} textValue={theme.name}>
                  {theme.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
        <button
          aria-label="Toggle dark mode"
          onClick={handleDarkModeToggle}
          className="dark-mode-toggle"
          disabled={!(activeTheme?.supports_dark_mode ?? true)}
          title={
            !(activeTheme?.supports_dark_mode ?? true)
              ? "현재 테마는 다크모드를 지원하지 않습니다"
              : isDarkMode
              ? "라이트 모드로 전환"
              : "다크 모드로 전환"
          }
        >
          {isDarkMode ? (
            <Sun
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
          ) : (
            <Moon
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
          )}
        </button>
      </div>

      <div className="header_contents header_right">
        <span>
          {historyInfo ? `${historyInfo.current}/${historyInfo.total}` : "0/0"}
        </span>
        <button
          aria-label="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          className={!canUndo ? "disabled" : ""}
        >
          <Undo
            color={!canUndo ? "#999" : iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
        <button
          aria-label="Redo"
          onClick={onRedo}
          disabled={!canRedo}
          className={!canRedo ? "disabled" : ""}
        >
          <Redo
            color={!canRedo ? "#999" : iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
        <button aria-label="Preview" onClick={onPreview}>
          <Eye
            color={iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
        <button aria-label="Play" onClick={onPlay}>
          <Play
            color={iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
        <button aria-label="Publish" className="publish" onClick={onPublish}>
          Publish
        </button>
      </div>
    </nav>
  );
};
