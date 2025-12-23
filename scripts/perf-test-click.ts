/**
 * 🚀 Phase 19 성능 테스트: 요소 클릭 성능 측정
 *
 * 실행: npx tsx scripts/perf-test-click.ts
 */

import { chromium } from 'playwright';

const TEST_EMAIL = 'rblood79@gmail.com';
const TEST_PASSWORD = '79@dltkdxo';
const BASE_URL = 'http://localhost:5173';
// 직접 빌더 URL (이미 로그인된 상태에서 사용)
const DIRECT_BUILDER_URL = process.env.BUILDER_URL || '';

async function runPerfTest() {
  console.log('🚀 Phase 19 성능 테스트 시작...\n');

  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Long Task 수집
  const longTasks: { name: string; duration: number }[] = [];

  // Console 메시지 수집
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[Violation]')) {
      const match = text.match(/took (\d+)ms/);
      if (match) {
        const duration = parseInt(match[1]);
        const handlerMatch = text.match(/'(\w+)' handler/);
        const handler = handlerMatch ? handlerMatch[1] : 'unknown';
        longTasks.push({ name: handler, duration });
        console.log(`⚠️  ${handler} handler: ${duration}ms`);
      }
    }
  });

  try {
    // 직접 빌더 URL이 있으면 바로 이동
    if (DIRECT_BUILDER_URL) {
      console.log('📍 직접 빌더 URL로 이동:', DIRECT_BUILDER_URL);
      await page.goto(DIRECT_BUILDER_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      console.log('✅ 빌더 진입\n');
    } else {
      // 1. 로그인 페이지로 이동
      console.log('📄 로그인 페이지 로드 중...');
      await page.goto(`${BASE_URL}/signin`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // 2. 로그인
      console.log('🔐 로그인 진행 중...');

      // 이메일 입력 (React Aria TextField)
      const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await emailInput.fill(TEST_EMAIL);

      // 비밀번호 입력
      const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await passwordInput.fill(TEST_PASSWORD);

      // Sign In 버튼 클릭
      const signInButton = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
      await signInButton.click();

      // 대시보드로 이동 대기
      console.log('⏳ 대시보드 로딩 대기...');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      await page.waitForTimeout(2000);
      console.log('✅ 대시보드 도착\n');

      // 3. 프로젝트 선택 - 사용자가 직접 선택하도록 대기
      console.log('📁 프로젝트를 선택해주세요...');
      console.log('⏳ 빌더 URL 대기 중... (120초)');

      await page.waitForURL('**/builder/**', { timeout: 120000 });
      console.log('✅ 빌더 진입\n');

      await page.waitForTimeout(3000);
    }

    // 4. 빌더 로드 확인
    console.log('🔍 빌더 요소 확인 중...');
    await page.waitForTimeout(2000);

    // 현재 URL 출력
    console.log(`📍 현재 URL: ${page.url()}\n`);

    // 5. 요소 준비 대기
    console.log('🧩 요소가 있는지 확인 중...');
    console.log('📌 캔버스에 요소가 있어야 테스트가 가능합니다.');
    console.log('⏳ 10초 대기 (필요하면 요소를 추가해주세요)...\n');
    await page.waitForTimeout(10000);

    // 6. 캔버스에서 요소 선택 테스트
    console.log('🔍 캔버스 요소 확인 중...');

    // 캔버스 찾기
    const canvas = await page.$('canvas');
    const iframe = await page.$('iframe');

    if (canvas) {
      console.log('🎨 WebGL Canvas 발견\n');

      // 캔버스 클릭 테스트
      const box = await canvas.boundingBox();
      if (box) {
        console.log('🖱️  캔버스 클릭 테스트 시작 (5회)...\n');

        for (let i = 0; i < 5; i++) {
          const x = box.x + box.width * (0.3 + Math.random() * 0.4);
          const y = box.y + box.height * (0.3 + Math.random() * 0.4);

          const startTime = Date.now();
          await page.mouse.click(x, y);
          const clickDuration = Date.now() - startTime;

          console.log(`  클릭 ${i + 1}: (${Math.round(x)}, ${Math.round(y)}) - ${clickDuration}ms`);
          await page.waitForTimeout(800);
        }
      }
    } else if (iframe) {
      console.log('📱 iframe Canvas 발견\n');

      const frame = await iframe.contentFrame();
      if (frame) {
        // 요소 새로고침해서 찾기
        await page.waitForTimeout(1000);
        const elements = await frame.$$('[data-element-id]');
        console.log(`  발견된 요소: ${elements.length}개`);

        if (elements.length > 0) {
          console.log('\n🖱️  요소 클릭 테스트 시작...\n');

          for (let i = 0; i < Math.min(5, elements.length); i++) {
            const startTime = Date.now();
            await elements[i].click();
            const clickDuration = Date.now() - startTime;

            console.log(`  요소 ${i + 1} 클릭: ${clickDuration}ms`);
            await page.waitForTimeout(800);
          }
        } else {
          console.log('⚠️  iframe 내 요소 없음');
        }
      }
    } else {
      console.log('⚠️  캔버스를 찾지 못했습니다.');

      // 페이지 스크린샷 저장
      await page.screenshot({ path: 'test-screenshot.png' });
      console.log('📸 스크린샷 저장: test-screenshot.png');
    }

    // 5. 사이드바 레이어 클릭 테스트
    console.log('\n🗂️  사이드바 레이어 클릭 테스트...');

    // 다양한 선택자 시도
    const layerSelectors = [
      '.tree-item',
      '.layer-item',
      '[class*="layer"]',
      '[class*="tree"] [role="treeitem"]',
      '.sidebar_elements .elements > div'
    ];

    let layerItems: any[] = [];
    for (const selector of layerSelectors) {
      layerItems = await page.$$(selector);
      if (layerItems.length > 0) {
        console.log(`  선택자 "${selector}"로 ${layerItems.length}개 발견`);
        break;
      }
    }

    if (layerItems.length > 0) {
      console.log(`\n🖱️  레이어 클릭 테스트 시작...\n`);

      for (let i = 0; i < Math.min(3, layerItems.length); i++) {
        try {
          const startTime = Date.now();
          await layerItems[i].click({ force: true, timeout: 5000 });
          const clickDuration = Date.now() - startTime;
          console.log(`  레이어 ${i + 1} 클릭: ${clickDuration}ms`);
          await page.waitForTimeout(1000);
        } catch (e) {
          console.log(`  레이어 ${i + 1} 클릭 실패 (뷰포트 밖)`);
        }
      }
    } else {
      console.log('  레이어 아이템을 찾지 못했습니다.');
    }

    // 6. 드래그 테스트
    if (canvas) {
      const box = await canvas.boundingBox();
      if (box) {
        console.log('\n🖱️  드래그 테스트 시작 (3회)...\n');

        for (let i = 0; i < 3; i++) {
          const startX = box.x + box.width * 0.4;
          const startY = box.y + box.height * 0.4;
          const endX = startX + 100;
          const endY = startY + 100;

          const startTime = Date.now();

          // 마우스 다운
          await page.mouse.move(startX, startY);
          await page.mouse.down();

          // 드래그 (여러 단계)
          for (let step = 0; step < 10; step++) {
            const x = startX + (endX - startX) * (step / 10);
            const y = startY + (endY - startY) * (step / 10);
            await page.mouse.move(x, y);
            await page.waitForTimeout(16); // 60fps
          }

          // 마우스 업
          await page.mouse.up();

          const dragDuration = Date.now() - startTime;
          console.log(`  드래그 ${i + 1}: ${dragDuration}ms`);
          await page.waitForTimeout(500);
        }
      }
    }

    // 7. 빠른 선택 전환 테스트
    if (layerItems.length >= 2) {
      console.log('\n🔄 빠른 선택 전환 테스트 (10회)...\n');

      const switchTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const targetIdx = i % Math.min(layerItems.length, 3);
        const startTime = Date.now();
        await layerItems[targetIdx].click();
        const switchDuration = Date.now() - startTime;
        switchTimes.push(switchDuration);
        await page.waitForTimeout(150); // 디바운스 시간보다 조금 더
      }

      const avgSwitch = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
      const maxSwitch = Math.max(...switchTimes);
      console.log(`  평균: ${Math.round(avgSwitch)}ms, 최대: ${maxSwitch}ms`);
    }

    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 Long Task 요약');
    console.log('='.repeat(50));

    if (longTasks.length === 0) {
      console.log('✅ Long Task 경고 없음! (모든 핸들러 50ms 이하)');
    } else {
      const grouped = longTasks.reduce((acc, task) => {
        if (!acc[task.name]) acc[task.name] = [];
        acc[task.name].push(task.duration);
        return acc;
      }, {} as Record<string, number[]>);

      for (const [name, durations] of Object.entries(grouped)) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const max = Math.max(...durations);
        console.log(`${name} handler: 평균 ${Math.round(avg)}ms, 최대 ${max}ms (${durations.length}회)`);
      }

      console.log(`\n총 Long Task: ${longTasks.length}회`);
    }

    console.log('\n⏳ 15초 대기 (수동 테스트 가능)...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 에러 스크린샷 저장: error-screenshot.png');
  } finally {
    await browser.close();
    console.log('\n🏁 테스트 종료');
  }
}

runPerfTest();
