/**
 * Panel Configurations
 *
 * 9개 패널의 설정 정의 및 PanelRegistry 등록
 */

import {
  //FileTree,
  ListTree,
  Box,
  Palette,
  Sparkles,
  Settings,
  Sliders,
  Paintbrush,
  Cable,
  Zap,
} from "lucide-react";
import type { PanelConfig } from "./types";
import { PanelRegistry } from "./PanelRegistry";

// Navigation panels
import { NodesPanel } from "../nodes/NodesPanel";
import { ComponentsPanel } from "../components/ComponentsPanel";
import { ThemesPanel } from "../themes/ThemesPanel";
import { AIPanel } from "../ai/AIPanel";
import { SettingsPanel } from "../settings/SettingsPanel";

// Editor panels
import { PropertiesPanel } from "../properties/PropertiesPanel";
import { StylesPanel } from "../styles/StylesPanel";
import { DataPanel } from "../data/DataPanel";
import { EventsPanel } from "../events/EventsPanel";

/**
 * 9개 패널 설정
 */
export const PANEL_CONFIGS: PanelConfig[] = [
  // Navigation panels
  {
    id: "nodes",
    name: "노드",
    nameEn: "Nodes",
    icon: ListTree,
    component: NodesPanel,
    category: "navigation",
    defaultPosition: "left",
    minWidth: 240,
    maxWidth: 400,
    description: "페이지 계층 구조 탐색",
    shortcut: "Ctrl+Shift+N",
  },
  {
    id: "components",
    name: "컴포넌트",
    nameEn: "Components",
    icon: Box,
    component: ComponentsPanel,
    category: "navigation",
    defaultPosition: "left",
    minWidth: 240,
    maxWidth: 400,
    description: "컴포넌트 라이브러리",
    shortcut: "Ctrl+Shift+C",
  },

  // Tool panels
  {
    id: "theme",
    name: "테마",
    nameEn: "Theme",
    icon: Palette,
    component: ThemesPanel,
    category: "tool",
    defaultPosition: "left",
    minWidth: 240,
    maxWidth: 400,
    description: "디자인 토큰 및 테마",
  },
  {
    id: "ai",
    name: "AI",
    nameEn: "AI",
    icon: Sparkles,
    component: AIPanel,
    category: "tool",
    defaultPosition: "left",
    minWidth: 240,
    maxWidth: 400,
    description: "AI 도구 및 제안",
  },

  // System panels
  {
    id: "settings",
    name: "설정",
    nameEn: "Settings",
    icon: Settings,
    component: SettingsPanel,
    category: "system",
    defaultPosition: "left",
    minWidth: 240,
    maxWidth: 400,
    description: "앱 설정 및 환경설정",
    shortcut: "Ctrl+,",
  },

  // Editor panels
  {
    id: "properties",
    name: "속성",
    nameEn: "Properties",
    icon: Sliders,
    component: PropertiesPanel,
    category: "editor",
    defaultPosition: "right",
    minWidth: 240,
    maxWidth: 240,
    description: "요소 속성 편집",
    shortcut: "Ctrl+Shift+P",
  },
  {
    id: "styles",
    name: "스타일",
    nameEn: "Styles",
    icon: Paintbrush,
    component: StylesPanel,
    category: "editor",
    defaultPosition: "right",
    minWidth: 240,
    maxWidth: 240,
    description: "CSS 스타일 편집",
    shortcut: "Ctrl+Shift+S",
  },
  {
    id: "data",
    name: "데이터",
    nameEn: "Data",
    icon: Cable,
    component: DataPanel,
    category: "editor",
    defaultPosition: "right",
    minWidth: 480,
    maxWidth: 480,
    description: "데이터 바인딩 설정",
    shortcut: "Ctrl+Shift+D",
  },
  {
    id: "events",
    name: "이벤트",
    nameEn: "Events",
    icon: Zap,
    component: EventsPanel,
    category: "editor",
    defaultPosition: "right",
    minWidth: 280,
    maxWidth: 500,
    description: "이벤트 핸들러 관리",
    shortcut: "Ctrl+Shift+E",
  },
];

/**
 * PanelRegistry에 모든 패널 등록
 */
export function registerAllPanels() {
  PANEL_CONFIGS.forEach((config) => {
    PanelRegistry.register(config);
  });
}

// 앱 시작 시 자동 등록
registerAllPanels();
