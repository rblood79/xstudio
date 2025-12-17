/**
 * WebGL Element Selection Performance Test
 *
 * 요소 선택 성능을 측정합니다.
 *
 * 실행: npx tsx scripts/test-selection-performance.ts
 */

import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Starting Selection Performance Test...\n');
  console.log('👉 브라우저가 열리면 로그인 후 Builder 페이지로 이동하세요.');
  console.log('👉 WebGL Canvas가 있는 페이지에서 테스트가 진행됩니다.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // 동작을 느리게 해서 관찰 가능
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 콘솔 로그 수집
  const selectionTimes: number[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.startsWith('⚡ Element selection:')) {
      const match = text.match(/(\d+\.?\d*)ms/);
      if (match) {
        selectionTimes.push(parseFloat(match[1]));
        console.log('  📍', text);
      }
    }
  });

  try {
    // 페이지 로드
    console.log('📄 Loading page...');
    await page.goto('http://localhost:5173/', { timeout: 30000 });

    // WebGL Canvas가 나타날 때까지 대기 (사용자가 로그인 및 Builder 페이지 이동)
    console.log('⏳ Waiting for WebGL Canvas (로그인 후 Builder 페이지로 이동하세요)...');
    console.log('   최대 120초 대기합니다.\n');

    try {
      await page.waitForSelector('.canvas-container canvas', { timeout: 120000 });
      console.log('✅ WebGL Canvas found!');
      await page.waitForTimeout(2000); // Yoga 초기화 대기
    } catch {
      console.log('⚠️ WebGL Canvas not found after 120s. Aborting.');
      await page.screenshot({ path: 'test-screenshot.png' });
      await browser.close();
      return;
    }

    // Canvas 영역 찾기
    const canvas = page.locator('.canvas-container canvas');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas bounding box not found');
    }

    console.log(`📐 Canvas size: ${box.width}x${box.height}`);
    console.log('\n🖱️ Clicking elements...\n');

    // 여러 위치 클릭하여 요소 선택 테스트
    const clickPositions = [
      { x: box.x + 100, y: box.y + 100 },
      { x: box.x + 200, y: box.y + 150 },
      { x: box.x + 300, y: box.y + 200 },
      { x: box.x + 150, y: box.y + 250 },
      { x: box.x + 250, y: box.y + 300 },
      { x: box.x + 350, y: box.y + 150 },
      { x: box.x + 400, y: box.y + 200 },
      { x: box.x + 200, y: box.y + 350 },
      { x: box.x + 300, y: box.y + 400 },
      { x: box.x + 450, y: box.y + 300 },
    ];

    for (let i = 0; i < clickPositions.length; i++) {
      const pos = clickPositions[i];
      await page.mouse.click(pos.x, pos.y);
      await page.waitForTimeout(150); // 선택 처리 대기
    }

    // 결과 출력
    console.log('\n' + '='.repeat(50));
    console.log('📊 Selection Performance Results');
    console.log('='.repeat(50));

    if (selectionTimes.length > 0) {
      const avg = selectionTimes.reduce((a, b) => a + b, 0) / selectionTimes.length;
      const max = Math.max(...selectionTimes);
      const min = Math.min(...selectionTimes);
      const p95 = selectionTimes.sort((a, b) => a - b)[Math.floor(selectionTimes.length * 0.95)] || max;

      console.log(`\nSamples:  ${selectionTimes.length}`);
      console.log(`Min:      ${min.toFixed(2)}ms`);
      console.log(`Max:      ${max.toFixed(2)}ms`);
      console.log(`Avg:      ${avg.toFixed(2)}ms`);
      console.log(`P95:      ${p95.toFixed(2)}ms`);

      console.log('\n' + '-'.repeat(50));
      console.log('SLO Verification:');
      console.log('-'.repeat(50));

      const avgPass = avg < 16;
      const maxPass = max < 50;
      const p95Pass = p95 < 30;

      console.log(`Avg < 16ms (P50):  ${avgPass ? '✅ PASS' : '❌ FAIL'} (${avg.toFixed(2)}ms)`);
      console.log(`P95 < 30ms:        ${p95Pass ? '✅ PASS' : '❌ FAIL'} (${p95.toFixed(2)}ms)`);
      console.log(`Max < 50ms (P99):  ${maxPass ? '✅ PASS' : '❌ FAIL'} (${max.toFixed(2)}ms)`);

      if (avgPass && maxPass && p95Pass) {
        console.log('\n🎉 All SLO targets PASSED!');
      } else {
        console.log('\n⚠️ Some SLO targets FAILED');
      }
    } else {
      console.log('\n⚠️ No selection events captured.');
      console.log('This could mean:');
      console.log('  - No elements were clicked');
      console.log('  - Elements are outside the click area');
      console.log('  - Console logging is not working');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

runTest();
