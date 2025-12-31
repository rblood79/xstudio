/**
 * Layout Preset Definitions
 *
 * Phase 6: 미리 정의된 레이아웃 프리셋
 */

import type { LayoutPreset, PresetCategoryMeta } from "./types";

export const LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  // ========== Basic Presets ==========
  fullscreen: {
    id: "fullscreen",
    name: "전체화면",
    description: "단일 전체 화면 콘텐츠",
    category: "basic",
    slots: [
      { name: "content", required: true, description: "전체 화면 콘텐츠" },
    ],
    containerStyle: {
      display: "flex",
      minHeight: "100vh",
    },
    previewAreas: [
      {
        name: "content",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        isSlot: true,
        required: true,
      },
    ],
  },

  "vertical-2": {
    id: "vertical-2",
    name: "수직 2단",
    description: "Header + Content",
    category: "basic",
    slots: [
      { name: "header", required: false, description: "상단 헤더 영역" },
      { name: "content", required: true, description: "메인 콘텐츠 영역" },
    ],
    containerStyle: {
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
    },
    previewAreas: [
      { name: "header", x: 0, y: 0, width: 100, height: 15, isSlot: true },
      {
        name: "content",
        x: 0,
        y: 15,
        width: 100,
        height: 85,
        isSlot: true,
        required: true,
      },
    ],
  },

  "vertical-3": {
    id: "vertical-3",
    name: "수직 3단",
    description: "Header + Content + Footer",
    category: "basic",
    slots: [
      { name: "header", required: false, description: "상단 헤더 영역" },
      { name: "content", required: true, description: "메인 콘텐츠 영역" },
      { name: "footer", required: false, description: "하단 푸터 영역" },
    ],
    containerStyle: {
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
    },
    previewAreas: [
      { name: "header", x: 0, y: 0, width: 100, height: 12, isSlot: true },
      {
        name: "content",
        x: 0,
        y: 12,
        width: 100,
        height: 76,
        isSlot: true,
        required: true,
      },
      { name: "footer", x: 0, y: 88, width: 100, height: 12, isSlot: true },
    ],
  },

  // ========== Sidebar Presets ==========
  "sidebar-left": {
    id: "sidebar-left",
    name: "좌측 사이드바",
    description: "Sidebar + Content",
    category: "sidebar",
    slots: [
      {
        name: "sidebar",
        required: false,
        description: "좌측 사이드바",
        defaultStyle: { width: "250px" },
      },
      { name: "content", required: true, description: "메인 콘텐츠" },
    ],
    containerStyle: {
      display: "flex",
      flexDirection: "row",
      minHeight: "100vh",
    },
    previewAreas: [
      { name: "sidebar", x: 0, y: 0, width: 25, height: 100, isSlot: true },
      {
        name: "content",
        x: 25,
        y: 0,
        width: 75,
        height: 100,
        isSlot: true,
        required: true,
      },
    ],
  },

  "sidebar-right": {
    id: "sidebar-right",
    name: "우측 사이드바",
    description: "Content + Sidebar",
    category: "sidebar",
    slots: [
      { name: "content", required: true, description: "메인 콘텐츠" },
      {
        name: "sidebar",
        required: false,
        description: "우측 사이드바",
        defaultStyle: { width: "250px" },
      },
    ],
    containerStyle: {
      display: "flex",
      flexDirection: "row",
      minHeight: "100vh",
    },
    previewAreas: [
      {
        name: "content",
        x: 0,
        y: 0,
        width: 75,
        height: 100,
        isSlot: true,
        required: true,
      },
      { name: "sidebar", x: 75, y: 0, width: 25, height: 100, isSlot: true },
    ],
  },

  // ========== Complex Presets ==========
  "holy-grail": {
    id: "holy-grail",
    name: "Holy Grail",
    description: "Header + (Sidebar + Content + Aside) + Footer",
    category: "complex",
    slots: [
      { name: "header", required: false },
      { name: "sidebar", required: false, defaultStyle: { width: "200px" } },
      { name: "content", required: true },
      { name: "aside", required: false, defaultStyle: { width: "200px" } },
      { name: "footer", required: false },
    ],
    containerStyle: {
      display: "grid",
      gridTemplateAreas: `
        "header header header"
        "sidebar content aside"
        "footer footer footer"
      `,
      gridTemplateColumns: "200px 1fr 200px",
      gridTemplateRows: "auto 1fr auto",
      minHeight: "100vh",
    },
    previewAreas: [
      { name: "header", x: 0, y: 0, width: 100, height: 12, isSlot: true },
      { name: "sidebar", x: 0, y: 12, width: 20, height: 76, isSlot: true },
      {
        name: "content",
        x: 20,
        y: 12,
        width: 60,
        height: 76,
        isSlot: true,
        required: true,
      },
      { name: "aside", x: 80, y: 12, width: 20, height: 76, isSlot: true },
      { name: "footer", x: 0, y: 88, width: 100, height: 12, isSlot: true },
    ],
  },

  "complex-3col": {
    id: "complex-3col",
    name: "3열 레이아웃",
    description: "Header + 3 Columns + Footer",
    category: "complex",
    slots: [
      { name: "header", required: false },
      { name: "left", required: false },
      { name: "content", required: true },
      { name: "right", required: false },
      { name: "footer", required: false },
    ],
    containerStyle: {
      display: "grid",
      gridTemplateAreas: `
        "header header header"
        "left content right"
        "footer footer footer"
      `,
      gridTemplateColumns: "1fr 2fr 1fr",
      gridTemplateRows: "auto 1fr auto",
      minHeight: "100vh",
    },
    previewAreas: [
      { name: "header", x: 0, y: 0, width: 100, height: 12, isSlot: true },
      { name: "left", x: 0, y: 12, width: 25, height: 76, isSlot: true },
      {
        name: "content",
        x: 25,
        y: 12,
        width: 50,
        height: 76,
        isSlot: true,
        required: true,
      },
      { name: "right", x: 75, y: 12, width: 25, height: 76, isSlot: true },
      { name: "footer", x: 0, y: 88, width: 100, height: 12, isSlot: true },
    ],
  },

  // ========== Dashboard Presets ==========
  dashboard: {
    id: "dashboard",
    name: "대시보드",
    description: "Navigation + Sidebar + Main Content",
    category: "dashboard",
    slots: [
      { name: "navigation", required: false, description: "상단 네비게이션" },
      {
        name: "sidebar",
        required: false,
        description: "좌측 메뉴",
        defaultStyle: { width: "240px" },
      },
      { name: "content", required: true, description: "대시보드 콘텐츠" },
    ],
    containerStyle: {
      display: "grid",
      gridTemplateAreas: `
        "navigation navigation"
        "sidebar content"
      `,
      gridTemplateColumns: "240px 1fr",
      gridTemplateRows: "auto 1fr",
      minHeight: "100vh",
    },
    previewAreas: [
      {
        name: "navigation",
        x: 0,
        y: 0,
        width: 100,
        height: 10,
        isSlot: true,
      },
      { name: "sidebar", x: 0, y: 10, width: 24, height: 90, isSlot: true },
      {
        name: "content",
        x: 24,
        y: 10,
        width: 76,
        height: 90,
        isSlot: true,
        required: true,
      },
    ],
  },

  "dashboard-widgets": {
    id: "dashboard-widgets",
    name: "대시보드 (위젯)",
    description: "Header + Sidebar + Main + Widgets Panel",
    category: "dashboard",
    slots: [
      { name: "header", required: false },
      { name: "sidebar", required: false },
      { name: "content", required: true },
      { name: "widgets", required: false },
    ],
    containerStyle: {
      display: "grid",
      gridTemplateAreas: `
        "header header header"
        "sidebar content widgets"
      `,
      gridTemplateColumns: "200px 1fr 280px",
      gridTemplateRows: "auto 1fr",
      minHeight: "100vh",
    },
    previewAreas: [
      { name: "header", x: 0, y: 0, width: 100, height: 10, isSlot: true },
      { name: "sidebar", x: 0, y: 10, width: 20, height: 90, isSlot: true },
      {
        name: "content",
        x: 20,
        y: 10,
        width: 52,
        height: 90,
        isSlot: true,
        required: true,
      },
      { name: "widgets", x: 72, y: 10, width: 28, height: 90, isSlot: true },
    ],
  },
};

/**
 * 카테고리별 메타데이터
 */
export const PRESET_CATEGORIES: Record<string, PresetCategoryMeta> = {
  basic: { label: "기본", icon: "Layout" },
  sidebar: { label: "사이드바", icon: "Columns2" },
  complex: { label: "복합", icon: "LayoutGrid" },
  dashboard: { label: "대시보드", icon: "LayoutDashboard" },
};

/**
 * 프리셋 표시 순서
 */
export const PRESET_ORDER: string[] = [
  "fullscreen",
  "vertical-2",
  "vertical-3",
  "sidebar-left",
  "sidebar-right",
  "holy-grail",
  "complex-3col",
  "dashboard",
  "dashboard-widgets",
];
