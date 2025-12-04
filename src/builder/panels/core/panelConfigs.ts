/**
 * Panel Configurations
 *
 * 9개 패널의 설정 정의 및 PanelRegistry 등록
 */

import {
  File,
  Box,
  PaintRoller,
  Bot,
  Settings,
  Settings2,
  SwatchBook,
  Database,
  SquareMousePointer,
  FileEdit,
  Activity,
} from "lucide-react";
import type { PanelConfig } from "./types";
import { PanelRegistry } from "./PanelRegistry";

// Navigation panels
import { NodesPanel } from "../nodes/NodesPanel";
import { ComponentsPanel } from "../components/ComponentsPanel";
import { ThemesPanel } from "../themes/ThemesPanel";
import { AIPanel } from "../ai/AIPanel";
import { SettingsPanel } from "../settings/SettingsPanel";
import { DatasetPanel } from "../dataset/DatasetPanel";
import { DatasetEditorPanel } from "../dataset/DatasetEditorPanel";

// Editor panels
import { PropertiesPanel } from "../properties/PropertiesPanel";
import { StylesPanel } from "../styles/StylesPanel";
import { EventsPanel } from "../events/EventsPanel";

// Bottom panels
import { MonitorPanel } from "../monitor/MonitorPanel";

/**
 * 9개 패널 설정
 */
export const PANEL_CONFIGS: PanelConfig[] = [
  // Navigation panels
  {
    id: "nodes",
    name: "노드",
    nameEn: "Nodes",
    icon: File,
    component: NodesPanel,
    category: "navigation",
    defaultPosition: "left",
    minWidth: 233,
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
    minWidth: 249,
    maxWidth: 249,
    description: "컴포넌트 라이브러리",
    shortcut: "Ctrl+Shift+C",
  },
  {
    id: "dataset",
    name: "데이터셋",
    nameEn: "Dataset",
    icon: Database,
    component: DatasetPanel,
    category: "navigation",
    defaultPosition: "left",
    minWidth: 337,
    maxWidth: 337,
    description: "DataTables, APIs, Variables, Transformers 관리",
    shortcut: "Ctrl+Shift+T",
  },
  {
    id: "datasetEditor",
    name: "데이터셋 에디터",
    nameEn: "Dataset Editor",
    icon: FileEdit,
    component: DatasetEditorPanel,
    category: "editor",
    defaultPosition: "left",
    minWidth: 490,
    maxWidth: 490,
    description: "DataTable, API, Variable, Transformer 편집",
  },

  // Tool panels
  {
    id: "theme",
    name: "테마",
    nameEn: "Theme",
    icon: SwatchBook,
    component: ThemesPanel,
    category: "tool",
    defaultPosition: "left",
    minWidth: 490,
    maxWidth: 490,
    description: "디자인 토큰 및 테마",
  },
  {
    id: "ai",
    name: "AI",
    nameEn: "AI",
    icon: Bot,
    component: AIPanel,
    category: "tool",
    defaultPosition: "left",
    minWidth: 490,
    maxWidth: 490,
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
    minWidth: 233,
    maxWidth: 400,
    description: "앱 설정 및 환경설정",
    shortcut: "Ctrl+,",
  },

  // Editor panels
  {
    id: "properties",
    name: "속성",
    nameEn: "Properties",
    icon: Settings2,
    component: PropertiesPanel,
    category: "editor",
    defaultPosition: "right",
    minWidth: 233,
    maxWidth: 240,
    description: "요소 속성 편집",
    shortcut: "Ctrl+Shift+P",
  },
  {
    id: "styles",
    name: "스타일",
    nameEn: "Styles",
    icon: PaintRoller,
    component: StylesPanel,
    category: "editor",
    defaultPosition: "right",
    minWidth: 233,
    maxWidth: 233,
    description: "CSS 스타일 편집",
    shortcut: "Ctrl+Shift+S",
  },
  {
    id: "events",
    name: "이벤트",
    nameEn: "Events",
    icon: SquareMousePointer,
    component: EventsPanel,
    category: "editor",
    defaultPosition: "right",
    minWidth: 233,
    maxWidth: 500,
    description: "이벤트 핸들러 관리",
    shortcut: "Ctrl+Shift+E",
  },

  // Bottom panels
  {
    id: "monitor",
    name: "모니터",
    nameEn: "Monitor",
    icon: Activity,
    component: MonitorPanel,
    category: "system",
    defaultPosition: "bottom",
    minWidth: 600,
    description: "메모리 사용량 모니터링 및 최적화",
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
