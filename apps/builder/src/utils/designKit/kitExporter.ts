/**
 * G.4 Design Kit Exporter
 *
 * 현재 프로젝트의 변수/토큰/Master 컴포넌트를 DesignKit JSON으로 내보내기.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.4
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DesignKit,
  DesignKitMeta,
  KitVariable,
  KitThemeSnapshot,
  KitToken,
  KitComponent,
  KitElement,
} from '../../types/builder/designKit.types';
import type { DesignVariable, DesignToken, DesignTheme } from '../../types/theme';
import type { Element } from '../../types/builder/unified.types';

interface ExportContext {
  designVariables: DesignVariable[];
  themes: DesignTheme[];
  tokens: DesignToken[];
  elements: Element[];
  childrenMap: Map<string, Element[]>;
}

/**
 * 현재 프로젝트를 Design Kit JSON으로 내보낸다.
 */
export function exportProjectAsKit(
  meta: Partial<DesignKitMeta>,
  context: ExportContext,
): DesignKit {
  const now = new Date().toISOString();

  const kitMeta: DesignKitMeta = {
    id: meta.id ?? uuidv4(),
    name: meta.name ?? 'Untitled Kit',
    version: meta.version ?? '1.0.0',
    description: meta.description,
    author: meta.author,
    thumbnailUrl: meta.thumbnailUrl,
    tags: meta.tags,
    createdAt: meta.createdAt ?? now,
    updatedAt: now,
  };

  // 테마 이름 → ID 역매핑
  const themeIdToName = new Map<string, string>();
  for (const theme of context.themes) {
    themeIdToName.set(theme.id, theme.name);
  }

  return {
    formatVersion: '1.0',
    meta: kitMeta,
    variables: exportVariables(context.designVariables, themeIdToName),
    themes: exportThemes(context.themes, context.tokens),
    components: exportComponents(context.elements, context.childrenMap),
  };
}

// ============================================
// Variables
// ============================================

function exportVariables(
  variables: DesignVariable[],
  themeIdToName: Map<string, string>,
): KitVariable[] {
  return variables.map((v) => {
    const defaultVal = v.values.find((val) => val.themeId === null);

    const themeOverrides: Record<string, string | number> = {};
    for (const val of v.values) {
      if (val.themeId) {
        const themeName = themeIdToName.get(val.themeId);
        if (themeName) {
          themeOverrides[themeName] = val.value;
        }
      }
    }

    return {
      name: v.name,
      type: v.type,
      defaultValue: defaultVal?.value ?? '',
      ...(Object.keys(themeOverrides).length > 0 && { themeOverrides }),
      ...(v.description && { description: v.description }),
      ...(v.group && { group: v.group }),
      ...(v.tokenRef && { tokenRef: v.tokenRef }),
    };
  });
}

// ============================================
// Themes / Tokens
// ============================================

function exportThemes(
  themes: DesignTheme[],
  tokens: DesignToken[],
): KitThemeSnapshot[] {
  // 테마별 토큰 그룹핑
  const tokensByTheme = new Map<string, DesignToken[]>();
  for (const token of tokens) {
    const list = tokensByTheme.get(token.theme_id) ?? [];
    list.push(token);
    tokensByTheme.set(token.theme_id, list);
  }

  return themes
    .filter((t) => t.status !== 'archived')
    .map((theme) => ({
      name: theme.name,
      status: theme.status === 'active' ? 'active' as const : 'draft' as const,
      ...(theme.supports_dark_mode != null && { supportsDarkMode: theme.supports_dark_mode }),
      tokens: (tokensByTheme.get(theme.id) ?? []).map(exportToken),
    }));
}

function exportToken(token: DesignToken): KitToken {
  return {
    name: token.name,
    type: token.type,
    value: token.value,
    scope: token.scope,
    ...(token.alias_of && { aliasOf: token.alias_of }),
    ...(token.css_variable && { cssVariable: token.css_variable }),
  };
}

// ============================================
// Components (Masters + Descendants)
// ============================================

function exportComponents(
  elements: Element[],
  childrenMap: Map<string, Element[]>,
): KitComponent[] {
  const masters = elements.filter((el) => el.componentRole === 'master');

  return masters.map((master) => {
    const descendants: KitElement[] = [];

    // 재귀적으로 자식 수집
    function collectDescendants(parentId: string): void {
      const children = childrenMap.get(parentId) ?? [];
      for (const child of children) {
        descendants.push(elementToKitElement(child));
        collectDescendants(child.id);
      }
    }

    collectDescendants(master.id);

    return {
      master: elementToKitElement(master),
      descendants,
      ...(master.componentName && { category: 'general' }),
    };
  });
}

function elementToKitElement(el: Element): KitElement {
  return {
    localId: el.id, // 내보내기 시에는 원본 ID를 localId로 사용
    tag: el.tag,
    props: el.props as Record<string, unknown>,
    parentLocalId: el.parent_id ?? null,
    orderNum: el.order_num ?? 0,
    ...(el.componentRole && { componentRole: el.componentRole }),
    ...(el.componentName && { componentName: el.componentName }),
    ...(el.variableBindings?.length && { variableBindings: el.variableBindings }),
  };
}
