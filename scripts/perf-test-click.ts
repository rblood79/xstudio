/**
 * 🚀 Phase 19 성능 테스트: 요소 클릭 성능 측정
 *
 * 실행: npx tsx scripts/perf-test-click.ts
 */

import { chromium } from 'playwright';

const TEST_EMAIL = 'rblood79@gmail.com';
const TEST_PASSWORD = '79@dltkdxo';
const BASE_URL = 'http://localhost:5174';

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

    // 3. 프로젝트 선택 또는 생성
    console.log('📁 프로젝트 확인 중...');
    await page.waitForTimeout(2000);

    // 기존 프로젝트 카드의 Open 버튼 찾기
    const projectOpenButton = await page.$('.project-card .react-aria-Button.primary');

    if (projectOpenButton) {
      console.log('📁 기존 프로젝트 Open 클릭...');
      await projectOpenButton.click();
      await page.waitForURL('**/builder/**', { timeout: 10000 });
      await page.waitForTimeout(3000);
      console.log('✅ 프로젝트 진입\n');
    } else {
      // 프로젝트가 없으면 새로 생성
      console.log('📁 프로젝트 없음, 새 프로젝트 생성...');

      const projectNameInput = await page.$('input[placeholder="New Project"]');
      if (projectNameInput) {
        await projectNameInput.fill('PerfTest_' + Date.now());

        const createButton = await page.$('.add-project-button');
        if (createButton) {
          await createButton.click();
          await page.waitForURL('**/builder/**', { timeout: 15000 });
          await page.waitForTimeout(3000);
          console.log('✅ 새 프로젝트 생성 및 진입\n');
        }
      }
    }

    // 4. 빌더 로드 확인
    console.log('🔍 빌더 요소 확인 중...');
    await page.waitForTimeout(2000);

    // 현재 URL 출력
    console.log(`📍 현재 URL: ${page.url()}\n`);

    // 5. 컴포넌트 추가 - 사이드바에서 Button 등 컴포넌트 찾아서 클릭
    console.log('🧩 컴포넌트 추가 시도...');

    // 사이드바의 컴포넌트 아이템 찾기 (다양한 선택자 시도)
    const componentSelectors = [
      '[data-component-type="Button"]',
      '[draggable="true"]',
      '.component-item',
      '.sidebar_elements button',
      '[class*="component"]',
      '.palette-item'
    ];

    let componentItem = null;
    for (const selector of componentSelectors) {
      componentItem = await page.$(selector);
      if (componentItem) {
        console.log(`  선택자 "${selector}"로 컴포넌트 발견`);
        break;
      }
    }

    if (componentItem) {
      // 컴포넌트 더블클릭으로 캔버스에 추가
      await componentItem.dblclick();
      await page.waitForTimeout(1000);
      console.log('✅ 컴포넌트 추가됨\n');
    } else {
      console.log('⚠️  컴포넌트 아이템을 찾지 못함, 수동 추가 대기...');
      console.log('🖐️  10초 내에 컴포넌트를 수동으로 추가해주세요...\n');
      await page.waitForTimeout(10000);
    }

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
        const startTime = Date.now();
        await layerItems[i].click();
        const clickDuration = Date.now() - startTime;

        console.log(`  레이어 ${i + 1} 클릭: ${clickDuration}ms`);
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('  레이어 아이템을 찾지 못했습니다.');
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
