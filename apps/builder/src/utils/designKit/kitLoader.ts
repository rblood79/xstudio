/**
 * G.4 Design Kit Loader
 *
 * Kit JSON을 파싱하여 프로젝트에 적용하는 6단계 파이프라인.
 *
 * Step 1: Parse & Validate
 * Step 2: Conflict Detection
 * Step 3: Apply Themes/Tokens
 * Step 4: Apply Variables
 * Step 5: Register Master Components
 * Step 6: Return Result
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.4
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DesignKit,
  KitApplyOptions,
  KitLoadResult,
  KitConflict,
} from '../../types/builder/designKit.types';
import { DEFAULT_KIT_APPLY_OPTIONS } from '../../types/builder/designKit.types';
import type { DesignVariable, DesignVariableValue, DesignToken, DesignTheme } from '../../types/theme';
import type { Element } from '../../types/builder/unified.types';

// ============================================
// Types
// ============================================

/** 로더에 주입되는 스토어 인터페이스 (테스트 가능성을 위해 인터페이스로 분리) */
export interface KitLoaderThemeAccess {
  designVariables: DesignVariable[];
  tokens: DesignToken[];
  themes: DesignTheme[];
  /** createTheme(name, parentThemeId?, status?, projectId?) */
  createTheme: (
    name: string,
    parentThemeId?: string,
    status?: 'active' | 'draft' | 'archived',
    projectId?: string,
  ) => Promise<DesignTheme | null>;
  bulkUpsertTokens: (tokens: DesignToken[]) => Promise<void>;
  setDesignVariables: (variables: DesignVariable[]) => void;
}

export interface KitLoaderElementAccess {
  elements: Element[];
  addElement: (element: Element) => Promise<void>;
}

// ============================================
// Conflict Detection
// ============================================

function detectConflicts(
  kit: DesignKit,
  themeAccess: KitLoaderThemeAccess,
  elementAccess: KitLoaderElementAccess,
): KitConflict[] {
  const conflicts: KitConflict[] = [];

  // Variable 이름 충돌
  const existingVarNames = new Set(
    themeAccess.designVariables.map((v) => v.name),
  );
  for (const kitVar of kit.variables) {
    if (existingVarNames.has(kitVar.name)) {
      conflicts.push({ type: 'variable', name: kitVar.name, resolution: 'overwrite' });
    }
  }

  // Token 이름 충돌
  const existingTokenNames = new Set(
    themeAccess.tokens.map((t) => t.name),
  );
  for (const theme of kit.themes) {
    for (const token of theme.tokens) {
      if (existingTokenNames.has(token.name)) {
        conflicts.push({ type: 'token', name: token.name, resolution: 'overwrite' });
      }
    }
  }

  // Component 이름 충돌
  const existingMasterNames = new Set(
    elementAccess.elements
      .filter((el) => el.componentRole === 'master' && el.componentName)
      .map((el) => el.componentName!),
  );
  for (const comp of kit.components) {
    if (comp.master.componentName && existingMasterNames.has(comp.master.componentName)) {
      conflicts.push({ type: 'component', name: comp.master.componentName, resolution: 'overwrite' });
    }
  }

  return conflicts;
}

// ============================================
// Apply Themes/Tokens (Step 3)
// ============================================

async function applyThemes(
  kit: DesignKit,
  projectId: string,
  options: KitApplyOptions,
  themeAccess: KitLoaderThemeAccess,
  conflicts: KitConflict[],
): Promise<{ tokensApplied: number; themeNameToIdMap: Map<string, string> }> {
  if (!options.applyThemes) {
    return { tokensApplied: 0, themeNameToIdMap: new Map() };
  }

  const themeNameToIdMap = new Map<string, string>();
  let tokensApplied = 0;

  for (const kitTheme of kit.themes) {
    // 기존 테마에서 이름으로 검색
    const existingTheme = themeAccess.themes.find((t) => t.name === kitTheme.name);

    let themeId: string;
    if (existingTheme) {
      if (options.conflictResolution === 'skip') continue;
      themeId = existingTheme.id;
    } else {
      const status = kitTheme.status === 'active' ? 'active' : 'draft';
      const newTheme = await themeAccess.createTheme(
        kitTheme.name, undefined, status, projectId,
      );
      if (!newTheme) continue;
      themeId = newTheme.id;
    }

    themeNameToIdMap.set(kitTheme.name, themeId);

    // 토큰 변환 및 적용
    const convertedTokens: DesignToken[] = kitTheme.tokens
      .filter((kitToken) => {
        if (options.conflictResolution === 'skip') {
          return !conflicts.some(
            (c) => c.type === 'token' && c.name === kitToken.name,
          );
        }
        return true;
      })
      .map((kitToken) => ({
        id: uuidv4(),
        project_id: projectId,
        theme_id: themeId,
        name: kitToken.name,
        type: kitToken.type,
        value: kitToken.value as DesignToken['value'],
        scope: kitToken.scope,
        alias_of: kitToken.aliasOf ?? undefined,
        css_variable: kitToken.cssVariable,
      }));

    if (convertedTokens.length > 0) {
      await themeAccess.bulkUpsertTokens(convertedTokens);
      tokensApplied += convertedTokens.length;
    }
  }

  return { tokensApplied, themeNameToIdMap };
}

// ============================================
// Apply Variables (Step 4)
// ============================================

function applyVariables(
  kit: DesignKit,
  projectId: string,
  options: KitApplyOptions,
  themeAccess: KitLoaderThemeAccess,
  conflicts: KitConflict[],
  themeNameToIdMap: Map<string, string>,
): number {
  if (!options.applyVariables) return 0;

  const existingVars = [...themeAccess.designVariables];
  const existingVarMap = new Map(existingVars.map((v) => [v.name, v]));
  let variablesApplied = 0;

  for (const kitVar of kit.variables) {
    const isConflict = existingVarMap.has(kitVar.name);

    if (isConflict && options.conflictResolution === 'skip') {
      continue;
    }

    // DesignVariableValue 배열 생성
    const values: DesignVariableValue[] = [
      { themeId: null, value: kitVar.defaultValue },
    ];

    // 테마별 오버라이드 변환
    if (kitVar.themeOverrides) {
      for (const [themeName, value] of Object.entries(kitVar.themeOverrides)) {
        const themeId = themeNameToIdMap.get(themeName);
        if (themeId) {
          values.push({ themeId, value });
        }
      }
    }

    const newVar: DesignVariable = {
      id: isConflict ? existingVarMap.get(kitVar.name)!.id : uuidv4(),
      project_id: projectId,
      name: kitVar.name,
      type: kitVar.type,
      values,
      description: kitVar.description,
      group: kitVar.group,
      tokenRef: kitVar.tokenRef,
    };

    if (isConflict) {
      // 기존 변수 교체
      const idx = existingVars.findIndex((v) => v.name === kitVar.name);
      if (idx !== -1) existingVars[idx] = newVar;
    } else {
      existingVars.push(newVar);
    }

    variablesApplied++;
  }

  themeAccess.setDesignVariables(existingVars);
  return variablesApplied;
}

// ============================================
// Register Master Components (Step 5)
// ============================================

async function registerMasters(
  kit: DesignKit,
  projectId: string,
  options: KitApplyOptions,
  elementAccess: KitLoaderElementAccess,
  conflicts: KitConflict[],
): Promise<number> {
  if (!options.registerComponents) return 0;

  let mastersRegistered = 0;

  for (const kitComp of kit.components) {
    const compName = kitComp.master.componentName;
    if (
      compName &&
      options.conflictResolution === 'skip' &&
      conflicts.some((c) => c.type === 'component' && c.name === compName)
    ) {
      continue;
    }

    // ID 매핑 테이블: localId -> new UUID
    const idMap = new Map<string, string>();
    idMap.set(kitComp.master.localId, uuidv4());
    for (const desc of kitComp.descendants) {
      idMap.set(desc.localId, uuidv4());
    }

    // Master element 생성
    const masterElement: Element = {
      id: idMap.get(kitComp.master.localId)!,
      tag: kitComp.master.tag,
      props: kitComp.master.props,
      parent_id: null, // Master는 최상위
      page_id: null,   // 전역 컴포넌트
      order_num: kitComp.master.orderNum,
      componentRole: 'master',
      componentName: kitComp.master.componentName,
      variableBindings: kitComp.master.variableBindings,
    };

    await elementAccess.addElement(masterElement);

    // Descendant elements 생성
    for (const desc of kitComp.descendants) {
      const descElement: Element = {
        id: idMap.get(desc.localId)!,
        tag: desc.tag,
        props: desc.props,
        parent_id: desc.parentLocalId ? idMap.get(desc.parentLocalId) ?? null : null,
        page_id: null,
        order_num: desc.orderNum,
        componentRole: desc.componentRole,
        componentName: desc.componentName,
        variableBindings: desc.variableBindings,
      };

      await elementAccess.addElement(descElement);
    }

    mastersRegistered++;
  }

  return mastersRegistered;
}

// ============================================
// Main Pipeline
// ============================================

/**
 * Design Kit을 프로젝트에 적용하는 메인 파이프라인.
 *
 * 순수 함수 — 스토어 접근을 인터페이스로 주입받는다.
 */
export async function applyDesignKit(
  kit: DesignKit,
  projectId: string,
  themeAccess: KitLoaderThemeAccess,
  elementAccess: KitLoaderElementAccess,
  options: Partial<KitApplyOptions> = {},
): Promise<KitLoadResult> {
  const opts: KitApplyOptions = { ...DEFAULT_KIT_APPLY_OPTIONS, ...options };

  try {
    // Step 2: Conflict Detection
    const conflicts = detectConflicts(kit, themeAccess, elementAccess);

    // 충돌 해결 전략 적용
    for (const conflict of conflicts) {
      conflict.resolution = opts.conflictResolution;
    }

    // Step 3: Apply Themes/Tokens (테마 먼저 — 변수의 themeId 매핑 필요)
    const { tokensApplied, themeNameToIdMap } = await applyThemes(
      kit, projectId, opts, themeAccess, conflicts,
    );

    // Step 4: Apply Variables
    const variablesApplied = applyVariables(
      kit, projectId, opts, themeAccess, conflicts, themeNameToIdMap,
    );

    // Step 5: Register Masters
    const mastersRegistered = await registerMasters(
      kit, projectId, opts, elementAccess, conflicts,
    );

    // Step 6: Return Result
    return {
      success: true,
      variablesApplied,
      tokensApplied,
      mastersRegistered,
      conflicts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      variablesApplied: 0,
      tokensApplied: 0,
      mastersRegistered: 0,
      conflicts: [],
    };
  }
}
