#!/usr/bin/env node

/**
 * 에디터 기본 최적화 자동화 스크립트
 * 
 * 변환 규칙 (안전한 기본 변환만):
 * 1. import에 memo, useCallback, useMemo 추가
 * 2. export function → export const memo(function
 * 3. customId를 useMemo로 변환
 * 4. memo 비교 함수 추가
 * 
 * ⚠️ updateProp → useCallback 변환은 수동으로 진행해야 합니다.
 * ⚠️ 섹션 useMemo 래핑도 수동으로 진행해야 합니다.
 */

const fs = require('fs');
const path = require('path');

const EDITORS_DIR = path.join(__dirname, '../src/builder/panels/properties/editors');
const EXCLUDED_FILES = ['index.ts', 'ButtonEditor.tsx']; // ButtonEditor는 이미 최적화됨

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
  // 패턴: const element = useStore((state) => state.elements.find((el) => el.id === elementId));
  //      const customId = element?.customId || '';
  const customIdPattern1 = /const\s+element\s*=\s*useStore\(\(state\)\s*=>\s*state\.elements\.find\(\(el\)\s*=>\s*el\.id\s*===\s*elementId\)\);\s*const\s+customId\s*=\s*element\?\.\s*customId\s*\|\|\s*['"]\s*['"];?/s;
  const customIdPattern2 = /const\s+element\s*=\s*useStore\(\(state\)\s*=>\s*state\.elementsMap\.get\(elementId\)\);\s*const\s+customId\s*=\s*element\?\.\s*customId\s*\|\|\s*['"]\s*['"];?/s;
  
  if (customIdPattern1.test(optimized)) {
    optimized = optimized.replace(
      /const\s+element\s*=\s*useStore\(\(state\)\s*=>\s*state\.elements\.find\(\(el\)\s*=>\s*el\.id\s*===\s*elementId\)\);\s*const\s+customId\s*=\s*element\?\.\s*customId\s*\|\|\s*['"]\s*['"];?/s,
      `  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);`
    );
  } else if (customIdPattern2.test(optimized)) {
    optimized = optimized.replace(
      /const\s+element\s*=\s*useStore\(\(state\)\s*=>\s*state\.elementsMap\.get\(elementId\)\);\s*const\s+customId\s*=\s*element\?\.\s*customId\s*\|\|\s*['"]\s*['"];?/s,
      `  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);`
    );
  }

  // 5. 함수 끝에 memo 비교 함수 추가
  if (optimized.includes('export const') && optimized.includes('memo(function')) {
    // 마지막 }); 패턴 찾기 (함수 끝)
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
  console.log('🚀 에디터 기본 최적화 시작...\n');
  console.log('⚠️  참고: updateProp → useCallback 변환은 수동으로 진행해야 합니다.\n');

  const files = fs.readdirSync(EDITORS_DIR)
    .filter(file => file.endsWith('.tsx') && !EXCLUDED_FILES.includes(file))
    .map(file => path.join(EDITORS_DIR, file));

  let optimizedCount = 0;
  let skippedCount = 0;

  files.forEach(filePath => {
    try {
      const wasOptimized = optimizeEditor(filePath);
      if (wasOptimized) {
        console.log(`✅ ${path.basename(filePath)} - 기본 최적화 완료`);
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
  console.log(`\n📝 다음 단계:`);
  console.log(`   1. 각 에디터의 updateProp을 개별 useCallback handlers로 변환`);
  console.log(`   2. 섹션들을 useMemo로 래핑 (ButtonEditor 참고)`);
}

main();
