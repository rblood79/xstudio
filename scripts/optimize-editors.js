#!/usr/bin/env node

/**
 * 에디터 최적화 자동화 스크립트
 * 
 * 변환 규칙:
 * 1. import에 memo, useCallback, useMemo 추가
 * 2. export function → export const memo(function
 * 3. customId를 useMemo로 변환
 * 4. updateProp을 개별 useCallback handlers로 변환
 */

const fs = require('fs');
const path = require('path');

const EDITORS_DIR = path.join(__dirname, '../src/builder/panels/properties/editors');
const EXCLUDED_FILES = ['index.ts', 'ButtonEditor.tsx']; // ButtonEditor는 이미 최적화됨

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelToPascal(str) {
  return str.split(/[-_]/).map(capitalize).join('');
}

function getHandlerName(propName) {
  // 'aria-label' → 'AriaLabel'
  // 'is-disabled' → 'IsDisabled'
  // 'children' → 'Children'
  const pascal = camelToPascal(propName.replace(/-/g, '-'));
  return `handle${pascal}Change`;
}

function optimizeEditor(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let optimized = content;

  // 1. 이미 최적화된 파일인지 확인
  if (content.includes('export const') && content.includes('memo(function')) {
    console.log(`⏭️  ${path.basename(filePath)} - 이미 최적화됨, 스킵`);
    return false;
  }

  // 2. import에 memo, useCallback, useMemo 추가
  const reactImportMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]react['"]/);
  if (reactImportMatch) {
    const imports = reactImportMatch[1];
    const hasMemo = imports.includes('memo');
    const hasUseCallback = imports.includes('useCallback');
    const hasUseMemo = imports.includes('useMemo');

    if (!hasMemo || !hasUseCallback || !hasUseMemo) {
      let newImports = imports.trim();
      if (!hasMemo) newImports += ', memo';
      if (!hasUseCallback) newImports += ', useCallback';
      if (!hasUseMemo) newImports += ', useMemo';
      
      optimized = optimized.replace(
        /import\s+{([^}]+)}\s+from\s+['"]react['"]/,
        `import { ${newImports} } from "react"`
      );
    }
  } else {
    // React import가 없으면 추가
    const firstImportMatch = content.match(/^import\s+/m);
    if (firstImportMatch) {
      optimized = `import { memo, useCallback, useMemo } from "react";\n${optimized}`;
    }
  }

  // 3. export function → export const memo(function
  const functionMatch = content.match(/export\s+function\s+(\w+Editor)\s*\(/);
  if (functionMatch) {
    const editorName = functionMatch[1];
    optimized = optimized.replace(
      /export\s+function\s+(\w+Editor)\s*\(/,
      `export const ${editorName} = memo(function ${editorName}(`
    );
  }

  // 4. customId를 useMemo로 변환
  const customIdPattern = /const\s+element\s*=\s*useStore\([^)]+\);\s*const\s+customId\s*=\s*element\?\.\s*customId\s*\|\|\s*['"]\s*['"];?/s;
  if (customIdPattern.test(optimized)) {
    optimized = optimized.replace(
      /const\s+element\s*=\s*useStore\([^)]+\);\s*const\s+customId\s*=\s*element\?\.\s*customId\s*\|\|\s*['"]\s*['"];?/s,
      `  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);`
    );
  }

  // 5. updateProp 사용 패턴 찾기 및 handlers 생성
  const updatePropMatches = optimized.matchAll(/updateProp\(['"]([^'"]+)['"],\s*([^)]+)\)/g);
  const propHandlers = new Map();
  
  for (const match of updatePropMatches) {
    const propName = match[1];
    const valueExpr = match[2];
    
    if (!propHandlers.has(propName)) {
      const handlerName = getHandlerName(propName);
      
      // value 타입 추론 (간단한 휴리스틱)
      const isBoolean = valueExpr.includes('checked') || propName.startsWith('is') || propName.startsWith('has');
      const valueType = isBoolean ? 'boolean' : 'string';
      const valueParam = isBoolean ? 'checked' : 'value';
      
      // undefined 처리 확인
      const hasUndefined = valueExpr.includes('|| undefined') || valueExpr.includes('|| undefined');
      const valueTransform = hasUndefined ? `${valueParam} || undefined` : valueParam;
      
      propHandlers.set(propName, {
        handlerName,
        valueType,
        valueParam,
        valueTransform
      });
    }
  }

  // 6. updateProp 함수를 handlers로 교체
  if (propHandlers.size > 0) {
    // updateProp 함수 제거
    optimized = optimized.replace(
      /const\s+updateProp\s*=\s*\([^)]+\)\s*=>\s*\{[^}]+\};?\s*/s,
      ''
    );

    // handlers 생성
    const handlersCode = Array.from(propHandlers.values())
      .map(({ handlerName, valueType, valueParam, valueTransform }) => {
        return `  const ${handlerName} = useCallback((${valueParam}: ${valueType}) => {
    onUpdate({ ...currentProps, ${propHandlers.get(propHandlers.keys().next().value)?.handlerName === handlerName ? propHandlers.keys().next().value : ''}: ${valueTransform} });
  }, [currentProps, onUpdate]);`;
      })
      .join('\n\n');

    // updateProp 사용을 handlers로 교체
    for (const [propName, { handlerName }] of propHandlers) {
      const regex = new RegExp(`updateProp\\(['"]${propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"],\\s*([^)]+)\\)`, 'g');
      optimized = optimized.replace(regex, (match, valueExpr) => {
        const isBoolean = valueExpr.includes('checked');
        return isBoolean ? `${handlerName}($1)` : `${handlerName}($1)`;
      });
    }

    // handlers를 customId 다음에 삽입
    const customIdEndMatch = optimized.match(/(const customId = useMemo\([^}]+\}, \[elementId\]\);)/);
    if (customIdEndMatch) {
      optimized = optimized.replace(
        /(const customId = useMemo\([^}]+\}, \[elementId\]\);)/,
        `$1\n\n  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션\n${handlersCode}`
      );
    } else {
      // customId가 없으면 함수 시작 부분에 삽입
      const functionStartMatch = optimized.match(/(export const \w+Editor = memo\(function \w+Editor\(\{[^}]+\}\) => \{)/);
      if (functionStartMatch) {
        optimized = optimized.replace(
          /(export const \w+Editor = memo\(function \w+Editor\(\{[^}]+\}\) => \{)/,
          `$1\n  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션\n${handlersCode}`
        );
      }
    }
  }

  // 7. 함수 끝에 memo 비교 함수 추가
  if (optimized.includes('export const') && optimized.includes('memo(function')) {
    // 마지막 }); 패턴 찾기
    const lastBraceMatch = optimized.match(/\}\);?\s*$/m);
    if (lastBraceMatch && !optimized.includes('}, (prevProps, nextProps)')) {
      optimized = optimized.replace(
        /\}\);?\s*$/,
        `}, (prevProps, nextProps) => {
  // ⭐ 기본 비교: id와 properties만 비교
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});`
      );
    }
  }

  // 변경사항이 있으면 파일 저장
  if (optimized !== content) {
    fs.writeFileSync(filePath, optimized, 'utf8');
    return true;
  }

  return false;
}

function main() {
  console.log('🚀 에디터 최적화 시작...\n');

  const files = fs.readdirSync(EDITORS_DIR)
    .filter(file => file.endsWith('.tsx') && !EXCLUDED_FILES.includes(file))
    .map(file => path.join(EDITORS_DIR, file));

  let optimizedCount = 0;
  let skippedCount = 0;

  files.forEach(filePath => {
    try {
      const wasOptimized = optimizeEditor(filePath);
      if (wasOptimized) {
        console.log(`✅ ${path.basename(filePath)} - 최적화 완료`);
        optimizedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ ${path.basename(filePath)} - 오류:`, error.message);
    }
  });

  console.log(`\n📊 결과:`);
  console.log(`   ✅ 최적화: ${optimizedCount}개`);
  console.log(`   ⏭️  스킵: ${skippedCount}개`);
  console.log(`\n⚠️  참고: 섹션 useMemo 래핑은 수동으로 진행해야 합니다.`);
}

main();
