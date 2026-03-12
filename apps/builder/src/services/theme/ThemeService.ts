/**
 * Theme Service (Slimmed — ADR-021 Phase D)
 *
 * 보존: getActiveTheme, createTheme (themeStore에서 사용)
 * 제거: updateTheme, deleteTheme, duplicateTheme, activateTheme,
 *       createSnapshot, getThemeHierarchy, subscribeToTheme,
 *       subscribeToProjectThemes, getThemesByProject, getThemeById
 */

import type { DesignTheme } from "../../types/theme";
import { getDB } from "../../lib/db";
import { ElementUtils } from "../../utils/element/elementUtils";

export interface CreateThemeInput {
  project_id: string;
  name: string;
  parent_theme_id?: string;
  status?: "active" | "draft" | "archived";
  supports_dark_mode?: boolean;
}

export class ThemeService {
  /**
   * 활성 테마 조회 (IndexedDB)
   */
  static async getActiveTheme(projectId: string): Promise<DesignTheme | null> {
    try {
      const db = await getDB();
      const activeTheme = await db.themes.getActiveTheme(projectId);
      return activeTheme;
    } catch (error) {
      console.error("[ThemeService] getActiveTheme failed:", error);
      return null;
    }
  }

  /**
   * 테마 생성 (IndexedDB 전용)
   */
  static async createTheme(input: CreateThemeInput): Promise<DesignTheme> {
    const db = await getDB();

    // 1. Project 존재 확인 (없으면 자동 생성)
    const project = await db.projects.getById(input.project_id);
    if (!project) {
      console.warn(
        "[ThemeService] Project not found, creating temp project:",
        input.project_id,
      );
      const tempProject = {
        id: input.project_id,
        name: "Temp Project",
        domain: "localhost",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.projects.insert(tempProject);
    }

    // 2. IndexedDB에 테마 생성
    const newTheme: DesignTheme = {
      id: ElementUtils.generateId(),
      project_id: input.project_id,
      name: input.name,
      parent_theme_id: input.parent_theme_id || null,
      status: input.status || "draft",
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.themes.insert(newTheme);
    return newTheme;
  }
}
