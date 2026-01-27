/**
 * CSS Generation Script
 *
 * 모든 Component Spec에서 CSS 파일 생성
 *
 * Usage: pnpm generate:css
 */

import { generateAllCSS } from '../src/renderers/CSSGenerator';
import type { ComponentSpec } from '../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const OUTPUT_DIR = path.join(__dirname, '../../shared/src/components/styles/generated');

async function main(): Promise<void> {
  console.log('🔄 Starting CSS generation...\n');

  try {
    // 출력 디렉토리 생성
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // components 디렉토리에서 모든 .spec.ts 파일 찾기
    const files = await fs.readdir(COMPONENTS_DIR).catch(() => []);
    const specFiles = files.filter(f => f.endsWith('.spec.ts'));

    if (specFiles.length === 0) {
      console.log('⚠️  No spec files found in', COMPONENTS_DIR);
      console.log('   Spec files will be added in Phase 1');
      return;
    }

    // 각 spec 파일 로드
    const specs: ComponentSpec<unknown>[] = [];

    for (const file of specFiles) {
      const filePath = path.join(COMPONENTS_DIR, file);
      const module = await import(filePath);

      // default export 또는 *Spec export 찾기
      const specName = file.replace('.spec.ts', '') + 'Spec';
      const spec = module.default || module[specName];

      if (spec && typeof spec === 'object' && 'name' in spec) {
        specs.push(spec as ComponentSpec<unknown>);
        console.log(`  ✓ Loaded: ${file}`);
      } else {
        console.warn(`  ⚠ Skipped: ${file} (no valid spec export)`);
      }
    }

    if (specs.length === 0) {
      console.log('\n⚠️  No valid specs found');
      return;
    }

    // CSS 생성
    console.log('\n📝 Generating CSS files...\n');
    await generateAllCSS(specs, OUTPUT_DIR);

    console.log(`\n✅ Generated ${specs.length} CSS files in ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('❌ CSS generation failed:', error);
    process.exit(1);
  }
}

main();
