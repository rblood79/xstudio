/**
 * Token Parser Utilities
 * 클라이언트 사이드에서 토큰 name을 파싱하여 계층 구조 생성
 */

import type {
  DesignToken,
  ParsedTokenName,
  ParsedToken,
  TokenGroup,
} from '../../types/theme/token.types';

/**
 * 토큰 이름 파싱
 * "color.brand.primary" → { category: "color", group: "brand", tokenName: "primary" }
 */
export function parseTokenName(name: string): ParsedTokenName {
  const parts = name.split('.');

  return {
    category: parts[0] || 'other',
    group: parts[1],
    tokenName: parts[2] || parts[parts.length - 1],
    fullName: name,
  };
}

/**
 * 토큰에 파싱 정보 추가
 */
export function parseToken(token: DesignToken): ParsedToken {
  return {
    ...token,
    parsed: parseTokenName(token.name),
  };
}

/**
 * 토큰 배열을 파싱
 */
export function parseTokens(tokens: DesignToken[]): ParsedToken[] {
  return tokens.map(parseToken);
}

/**
 * 토큰을 카테고리별로 그룹화
 */
export function groupTokensByCategory(tokens: DesignToken[]): Record<string, Record<string, DesignToken[]>> {
  return tokens.reduce((acc, token) => {
    const { category, group } = parseTokenName(token.name);

    if (!acc[category]) {
      acc[category] = {};
    }

    const groupKey = group || '_ungrouped';

    if (!acc[category][groupKey]) {
      acc[category][groupKey] = [];
    }

    acc[category][groupKey].push(token);

    return acc;
  }, {} as Record<string, Record<string, DesignToken[]>>);
}

/**
 * 토큰을 TokenGroup 형식으로 변환
 */
export function createTokenGroups(tokens: DesignToken[]): TokenGroup[] {
  const grouped = groupTokensByCategory(tokens);

  return Object.entries(grouped).map(([category, groups]) => ({
    category,
    groups: Object.entries(groups).reduce((acc, [groupName, groupTokens]) => {
      acc[groupName] = groupTokens.map(parseToken);
      return acc;
    }, {} as Record<string, ParsedToken[]>),
  }));
}

/**
 * 토큰 이름 생성
 */
export function buildTokenName(category: string, group?: string, tokenName?: string): string {
  return [category, group, tokenName].filter(Boolean).join('.');
}

/**
 * 카테고리별로 토큰 필터링
 */
export function filterTokensByCategory(tokens: DesignToken[], category: string): DesignToken[] {
  return tokens.filter((token) => {
    const parsed = parseTokenName(token.name);
    return parsed.category === category;
  });
}

/**
 * 그룹별로 토큰 필터링
 */
export function filterTokensByGroup(tokens: DesignToken[], category: string, group: string): DesignToken[] {
  return tokens.filter((token) => {
    const parsed = parseTokenName(token.name);
    return parsed.category === category && parsed.group === group;
  });
}

/**
 * 토큰 이름으로 검색
 */
export function searchTokens(tokens: DesignToken[], query: string): DesignToken[] {
  const lowerQuery = query.toLowerCase();

  return tokens.filter((token) => {
    const parsed = parseTokenName(token.name);
    return (
      token.name.toLowerCase().includes(lowerQuery) ||
      parsed.category.toLowerCase().includes(lowerQuery) ||
      parsed.group?.toLowerCase().includes(lowerQuery) ||
      parsed.tokenName?.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * 토큰 정렬
 */
export function sortTokens(
  tokens: DesignToken[],
  sortBy: 'name' | 'type' | 'updated_at' = 'name',
  order: 'asc' | 'desc' = 'asc'
): DesignToken[] {
  const sorted = [...tokens].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'updated_at':
        aValue = new Date(a.updated_at).getTime();
        bValue = new Date(b.updated_at).getTime();
        break;
      default:
        aValue = a.name;
        bValue = b.name;
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * 카테고리별 토큰 개수
 */
export function countTokensByCategory(tokens: DesignToken[]): Record<string, number> {
  return tokens.reduce((acc, token) => {
    const { category } = parseTokenName(token.name);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Scope별 토큰 분리
 */
export function separateTokensByScope(tokens: DesignToken[]): {
  raw: DesignToken[];
  semantic: DesignToken[];
} {
  return tokens.reduce(
    (acc, token) => {
      if (token.scope === 'raw') {
        acc.raw.push(token);
      } else {
        acc.semantic.push(token);
      }
      return acc;
    },
    { raw: [] as DesignToken[], semantic: [] as DesignToken[] }
  );
}

/**
 * 상속된 토큰만 필터링
 */
export function filterInheritedTokens(tokens: Array<{ is_inherited?: boolean }>): Array<{ is_inherited?: boolean }> {
  return tokens.filter((token) => token.is_inherited === true);
}

/**
 * 현재 테마의 토큰만 필터링
 */
export function filterCurrentThemeTokens(tokens: Array<{ is_inherited?: boolean }>): Array<{ is_inherited?: boolean }> {
  return tokens.filter((token) => token.is_inherited === false);
}

/**
 * 토큰 이름 유효성 검증
 */
export function validateTokenName(name: string): { valid: boolean; error?: string } {
  // 최소 1개의 점(.)으로 구분된 구조
  if (!name.includes('.')) {
    return {
      valid: false,
      error: '토큰 이름은 점(.)으로 구분된 계층 구조여야 합니다 (예: color.brand.primary)',
    };
  }

  // 영문, 숫자, 점, 하이픈, 언더스코어만 허용
  const validPattern = /^[a-z0-9._-]+(\.[a-z0-9._-]+)*$/;
  if (!validPattern.test(name)) {
    return {
      valid: false,
      error: '토큰 이름은 소문자 영문, 숫자, 점(.), 하이픈(-), 언더스코어(_)만 사용할 수 있습니다',
    };
  }

  // 빈 부분 체크
  const parts = name.split('.');
  if (parts.some((part) => part === '')) {
    return {
      valid: false,
      error: '토큰 이름에 빈 부분이 있습니다',
    };
  }

  return { valid: true };
}

/**
 * 토큰 카테고리 추출 (중복 제거)
 */
export function extractCategories(tokens: DesignToken[]): string[] {
  const categories = tokens.map((token) => parseTokenName(token.name).category);
  return Array.from(new Set(categories)).sort();
}

/**
 * 특정 카테고리의 그룹 추출 (중복 제거)
 */
export function extractGroups(tokens: DesignToken[], category: string): string[] {
  const groups = tokens
    .filter((token) => parseTokenName(token.name).category === category)
    .map((token) => parseTokenName(token.name).group)
    .filter(Boolean) as string[];

  return Array.from(new Set(groups)).sort();
}
