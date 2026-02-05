/**
 * Phase 0 Validation Gate
 *
 * Phase 1 시작 전 반드시 통과해야 하는 검증 항목을 자동화
 *
 * Usage: pnpm validate:phase0
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Phase0ValidationResult {
  passed: boolean;
  blockers: string[];
  warnings: string[];
}

function runCommand(cmd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      cwd: __dirname + '/..',
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return { success: false, output: (err.stdout || '') + (err.stderr || '') };
  }
}

async function validatePhase0(): Promise<Phase0ValidationResult> {
  const result: Phase0ValidationResult = {
    passed: true,
    blockers: [],
    warnings: [],
  };

  console.log('🔍 Phase 0 Validation Gate\n');
  console.log('─'.repeat(50));

  // 1. TypeScript 컴파일 검사
  console.log('\n📋 [1/5] TypeScript 컴파일 검사...');
  const tscResult = runCommand('npx tsc --noEmit');
  if (tscResult.success) {
    console.log('   ✅ TypeScript 컴파일 성공');
  } else {
    console.log('   ❌ TypeScript 컴파일 실패');
    result.blockers.push('TypeScript 컴파일 실패');
    result.passed = false;
  }

  // 2. 토큰 검증
  console.log('\n📋 [2/5] 토큰 매핑 검증...');
  const tokenResult = runCommand('npx tsx scripts/validate-tokens.ts');
  if (tokenResult.success) {
    console.log('   ✅ 토큰 매핑 검증 성공');
  } else {
    console.log('   ❌ 토큰 매핑 검증 실패');
    result.blockers.push('토큰 매핑 검증 실패');
    result.passed = false;
  }

  // 3. 단위 테스트 + 커버리지
  console.log('\n📋 [3/5] 단위 테스트 + 커버리지...');
  const testResult = runCommand('npx vitest run --coverage 2>&1');
  if (testResult.success) {
    // 커버리지 확인
    const coverageMatch = testResult.output.match(/All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
    if (coverageMatch) {
      const [, stmts, branches, funcs, lines] = coverageMatch.map(Number);
      console.log(`   Statements: ${stmts}%, Branches: ${branches}%, Functions: ${funcs}%, Lines: ${lines}%`);

      if (branches < 80) {
        result.blockers.push(`Branch 커버리지 부족: ${branches}% (최소 80%)`);
        result.passed = false;
      }
      if (stmts < 80) {
        result.blockers.push(`Statement 커버리지 부족: ${stmts}% (최소 80%)`);
        result.passed = false;
      }
    }

    // 테스트 실패 확인
    if (testResult.output.includes('failed')) {
      const failMatch = testResult.output.match(/(\d+) failed/);
      if (failMatch) {
        result.blockers.push(`${failMatch[1]}개 테스트 실패`);
        result.passed = false;
      }
    }

    if (!result.blockers.some(b => b.includes('커버리지') || b.includes('테스트 실패'))) {
      console.log('   ✅ 테스트 통과, 커버리지 충족');
    } else {
      console.log('   ❌ 테스트/커버리지 문제 발견');
    }
  } else {
    console.log('   ❌ 테스트 실행 실패');
    result.blockers.push('테스트 실행 실패');
    result.passed = false;
  }

  // 4. 스펙 검증
  console.log('\n📋 [4/5] 스펙 구조 검증...');
  const specResult = runCommand('npx tsx scripts/validate-specs.ts');
  if (specResult.success) {
    console.log('   ✅ 스펙 검증 성공');
  } else {
    console.log('   ❌ 스펙 검증 실패');
    result.blockers.push('스펙 구조 검증 실패');
    result.passed = false;
  }

  // 5. 빌드 검증
  console.log('\n📋 [5/5] 빌드 검증...');
  const buildResult = runCommand('npx tsup src/index.ts --format esm,cjs --dts 2>&1');
  if (buildResult.success) {
    console.log('   ✅ 빌드 성공');
  } else {
    console.log('   ❌ 빌드 실패');
    result.blockers.push('빌드 실패');
    result.passed = false;
  }

  // 결과 리포트
  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 Phase 0 Validation Report\n');

  if (result.blockers.length > 0) {
    console.log('❌ Blockers:');
    result.blockers.forEach(b => console.log(`   • ${b}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(w => console.log(`   • ${w}`));
  }

  if (result.passed) {
    console.log('✅ Phase 0 검증 게이트 통과! Phase 1 진행 가능합니다.');
  } else {
    console.log('\n❌ Phase 0 검증 게이트 실패. 위의 blocker를 해결하세요.');
    process.exit(1);
  }

  return result;
}

validatePhase0();
