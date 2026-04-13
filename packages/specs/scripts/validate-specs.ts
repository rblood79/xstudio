/**
 * Spec Validation Script
 *
 * Component Spec의 유효성 검증
 *
 * Usage: pnpm validate
 */

import type { ComponentSpec, TokenRef } from '../src/types';
import { isValidTokenRef } from '../src/types/token.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

async function main(): Promise<void> {
  console.log('🔍 Validating Component Specs...\n');

  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
  };

  try {
    // components 디렉토리에서 모든 .spec.ts 파일 찾기
    const files = await fs.readdir(COMPONENTS_DIR).catch(() => []);
    const specFiles = files.filter(f => f.endsWith('.spec.ts'));

    if (specFiles.length === 0) {
      console.log('⚠️  No spec files found in', COMPONENTS_DIR);
      console.log('   Spec files will be added in Phase 1');
      return;
    }

    for (const file of specFiles) {
      console.log(`  Validating: ${file}`);

      const filePath = path.join(COMPONENTS_DIR, file);
      const module = await import(filePath);

      const specName = file.replace('.spec.ts', '') + 'Spec';
      const spec = module.default || module[specName];

      if (!spec) {
        result.errors.push(`${file}: No valid spec export found`);
        continue;
      }

      // Spec 검증
      const specResult = validateSpec(spec, file);
      result.errors.push(...specResult.errors);
      result.warnings.push(...specResult.warnings);

      if (specResult.errors.length === 0) {
        console.log(`    ✓ Valid`);
      } else {
        console.log(`    ✗ ${specResult.errors.length} errors`);
      }
    }

    // 결과 출력
    console.log('\n' + '─'.repeat(50));

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(e => console.log(`   • ${e}`));
      result.passed = false;
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`   • ${w}`));
    }

    if (result.passed) {
      console.log('\n✅ All specs are valid!');
    } else {
      console.log('\n❌ Validation failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

function validateSpec(spec: ComponentSpec<unknown>, fileName: string): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
  };

  const prefix = `${fileName}:`;

  // 필수 필드 검증
  if (!spec.name) {
    result.errors.push(`${prefix} Missing 'name' field`);
  }

  if (!spec.element) {
    result.errors.push(`${prefix} Missing 'element' field`);
  }

  // variants는 optional (ADR-062: RSP 미규정 Field 계열은 variants 없음)
  if (spec.variants != null && Object.keys(spec.variants).length === 0) {
    result.warnings.push(`${prefix} 'variants' is empty object — consider removing it`);
  }

  if (!spec.sizes || Object.keys(spec.sizes).length === 0) {
    result.errors.push(`${prefix} Missing 'sizes' field`);
  }

  // defaultVariant도 variants와 함께 optional
  if (spec.variants != null && !spec.defaultVariant) {
    result.errors.push(`${prefix} 'variants' defined but 'defaultVariant' missing`);
  } else if (spec.defaultVariant && spec.variants && !spec.variants[spec.defaultVariant]) {
    result.errors.push(`${prefix} defaultVariant '${spec.defaultVariant}' not found in variants`);
  }

  if (!spec.defaultSize) {
    result.errors.push(`${prefix} Missing 'defaultSize' field`);
  } else if (spec.sizes && !spec.sizes[spec.defaultSize]) {
    result.errors.push(`${prefix} defaultSize '${spec.defaultSize}' not found in sizes`);
  }

  if (!spec.render || typeof spec.render.shapes !== 'function') {
    result.errors.push(`${prefix} Missing 'render.shapes' function`);
  }

  // Variant 토큰 검증
  if (spec.variants) {
    Object.entries(spec.variants).forEach(([variantName, variant]) => {
      validateTokenRef(variant.background, `${prefix} variants.${variantName}.background`, result);
      validateTokenRef(variant.backgroundHover, `${prefix} variants.${variantName}.backgroundHover`, result);
      validateTokenRef(variant.backgroundPressed, `${prefix} variants.${variantName}.backgroundPressed`, result);
      validateTokenRef(variant.text, `${prefix} variants.${variantName}.text`, result);

      if (variant.border) {
        validateTokenRef(variant.border, `${prefix} variants.${variantName}.border`, result);
      }
    });
  }

  // Size 토큰 검증
  if (spec.sizes) {
    Object.entries(spec.sizes).forEach(([sizeName, size]) => {
      validateTokenRef(size.fontSize, `${prefix} sizes.${sizeName}.fontSize`, result);
      validateTokenRef(size.borderRadius, `${prefix} sizes.${sizeName}.borderRadius`, result);

      if (size.height < 0) {
        result.errors.push(`${prefix} sizes.${sizeName}.height must be non-negative (0 = auto)`);
      }
    });
  }

  result.passed = result.errors.length === 0;
  return result;
}

function validateTokenRef(ref: TokenRef, path: string, result: ValidationResult): void {
  if (!ref) {
    result.errors.push(`${path} is required`);
    return;
  }

  if (!isValidTokenRef(ref)) {
    result.errors.push(`${path} has invalid token reference: ${ref}`);
  }
}

main();
