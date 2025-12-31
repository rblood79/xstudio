/**
 * Performance Test Script
 *
 * 🚀 Phase 9 성능 측정 자동화
 *
 * 실행: node scripts/perf-test.mjs
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

// Supabase 테스트 계정 (환경변수 또는 기본값)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

async function runPerformanceTest() {
  console.log('🚀 Performance Test 시작\n');

  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Performance API 활성화
  await page.addInitScript(() => {
    window.__perfMetrics = {
      longTasks: [],
      navigationStart: performance.now()
    };

    // Long Task Observer
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__perfMetrics.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.log('Long Task observer not supported');
      }
    }
  });

  try {
    // 1. 페이지 로드 테스트
    console.log('📊 1. 페이지 로드 테스트');
    const loadStart = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - loadStart;
    console.log(`   ✅ 페이지 로드: ${loadTime}ms`);

    // 잠시 대기
    await page.waitForTimeout(2000);

    // Long Task 체크
    const initialLongTasks = await page.evaluate(() => window.__perfMetrics?.longTasks?.length || 0);
    console.log(`   📈 초기 Long Task: ${initialLongTasks}개\n`);

    // 2. Performance Monitor 확인
    console.log('📊 2. Performance Monitor 상태');
    const monitorStatus = await page.evaluate(() => {
      return {
        longTaskMonitor: typeof window.longTaskMonitor !== 'undefined',
        postMessageMonitor: typeof window.postMessageMonitor !== 'undefined'
      };
    });
    console.log(`   longTaskMonitor: ${monitorStatus.longTaskMonitor ? '✅ 로드됨' : '❌ 없음'}`);
    console.log(`   postMessageMonitor: ${monitorStatus.postMessageMonitor ? '✅ 로드됨' : '❌ 없음'}\n`);

    // 3. 로그인 프로세스
    console.log('📊 3. 로그인 테스트');

    // 현재 URL 확인
    const currentUrl = page.url();
    console.log(`   현재 URL: ${currentUrl}`);

    // 이미 Dashboard나 Builder에 있는지 확인
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/builder')) {
      console.log('   ✅ 이미 로그인됨!\n');
    } else {
      // Google OAuth 버튼 확인
      const hasGoogleSignin = await page.locator('text=Continue with Google').count() > 0;
      const hasSignin = await page.locator('text=Sign in').count() > 0;

      if (hasGoogleSignin || hasSignin) {
        console.log('   ℹ️ 로그인 페이지 감지됨');
        console.log('   ⏳ 수동 로그인을 진행해주세요...');
        console.log('   (Google OAuth 로그인 후 Dashboard로 이동하면 테스트가 계속됩니다)\n');

        // Dashboard로 이동할 때까지 대기 (최대 120초)
        try {
          await page.waitForURL('**/dashboard**', { timeout: 120000 });
          console.log('   ✅ Dashboard 도착!\n');
        } catch (e) {
          console.log('   ⚠️ Dashboard 대기 시간 초과.\n');
        }
      } else {
        // 메인 페이지에서 Sign in 버튼 클릭 시도
        console.log('   메인 페이지에서 Sign in 찾는 중...');
        const signinLink = page.locator('a:has-text("Sign in"), button:has-text("Sign in")');
        if (await signinLink.count() > 0) {
          await signinLink.first().click();
          await page.waitForTimeout(2000);
          console.log('   ⏳ 로그인 페이지로 이동. 수동 로그인 진행해주세요...\n');

          try {
            await page.waitForURL('**/dashboard**', { timeout: 120000 });
            console.log('   ✅ Dashboard 도착!\n');
          } catch (e) {
            console.log('   ⚠️ Dashboard 대기 시간 초과.\n');
          }
        }
      }
    }

    // Dashboard 이동 확인
    const afterLoginUrl = page.url();
    console.log(`   로그인 후 URL: ${afterLoginUrl}`);

    // Dashboard가 아니면 수동 이동 대기
    if (!afterLoginUrl.includes('/dashboard')) {
      console.log('   ⏳ Dashboard로 이동해주세요... (60초 대기)');
      try {
        await page.waitForURL('**/dashboard**', { timeout: 60000 });
        console.log('   ✅ Dashboard 도착!\n');
      } catch (e) {
        console.log('   ⚠️ Dashboard 이동 실패. 현재 페이지에서 테스트 진행.\n');
      }
    }

    // 4. Dashboard에서 프로젝트 선택 또는 생성
    console.log('📊 4. 프로젝트 선택/생성 테스트');

    // 프로젝트 카드가 있는지 확인
    await page.waitForTimeout(1000);
    let projectCards = await page.locator('.project-card').count();
    console.log(`   프로젝트 카드 수: ${projectCards}개`);

    // 프로젝트가 없으면 수동 생성 요청
    if (projectCards === 0) {
      console.log('   ⚠️ 프로젝트가 없습니다.');
      console.log('   📝 프로젝트를 수동으로 생성해주세요...');
      console.log('   (프로젝트 생성 후 프로젝트를 클릭하면 테스트가 계속됩니다)\n');

      // Builder URL로 이동할 때까지 대기 (최대 120초)
      try {
        await page.waitForURL('**/builder/**', { timeout: 120000 });
        console.log('   ✅ Builder 페이지 감지!\n');
        projectCards = 1; // Builder에 도착했으므로 프로젝트가 있는 것으로 간주
      } catch (e) {
        console.log('   ⚠️ Builder 대기 시간 초과.\n');
      }
    }

    if (projectCards > 0) {
      const currentBuilderUrl = page.url();

      // 이미 Builder에 있으면 클릭 스킵
      if (!currentBuilderUrl.includes('/builder/')) {
        // 첫 번째 프로젝트 클릭
        console.log('   첫 번째 프로젝트 클릭...');
        const projectStart = Date.now();

        await page.locator('.project-card').first().click();

      // Builder 페이지로 이동 대기
      try {
        await page.waitForURL('**/builder/**', { timeout: 30000 });
        const projectTime = Date.now() - projectStart;
        console.log(`   ✅ Builder 페이지 로드: ${projectTime}ms\n`);

        // Builder 로드 완료 대기
        await page.waitForTimeout(3000);

        // 5. Builder 인터랙션 테스트
        console.log('📊 5. Builder 인터랙션 테스트');

        // iframe 확인
        const iframe = page.frameLocator('iframe').first();
        const hasIframe = await page.locator('iframe').count() > 0;
        console.log(`   Preview iframe: ${hasIframe ? '✅ 존재' : '❌ 없음'}`);

        // 요소 선택 시뮬레이션 (canvas 클릭)
        const canvasArea = page.locator('[class*="canvas"], [class*="preview"], [class*="workspace"]').first();
        if (await canvasArea.count() > 0) {
          console.log('   Canvas 영역 클릭 테스트...');
          const clickStart = Date.now();
          await canvasArea.click({ position: { x: 200, y: 200 } });
          await page.waitForTimeout(500);
          const clickTime = Date.now() - clickStart;
          console.log(`   ✅ 클릭 응답 시간: ${clickTime}ms`);
        }

        // 여러 번 클릭 테스트
        console.log('   다중 클릭 테스트 (5회)...');
        for (let i = 0; i < 5; i++) {
          await page.mouse.click(300 + i * 50, 300);
          await page.waitForTimeout(200);
        }
        console.log('   ✅ 다중 클릭 완료\n');

      } catch (e) {
        console.log(`   ⚠️ Builder 이동 실패: ${e.message}\n`);
      }
    } else {
      console.log('   ⚠️ 프로젝트가 없습니다. 빈 Dashboard.\n');
    }

    // 6. Long Task 리포트
    console.log('📊 6. Long Task 분석');
    const longTaskReport = await page.evaluate(() => {
      if (typeof window.longTaskMonitor !== 'undefined') {
        return window.longTaskMonitor.getLongTaskStats();
      }
      return window.__perfMetrics?.longTasks || [];
    });

    if (longTaskReport.count !== undefined) {
      console.log(`   감지된 Long Task: ${longTaskReport.count}개`);
      console.log(`   총 지속시간: ${longTaskReport.totalDuration?.toFixed(1) || 0}ms`);
      console.log(`   평균 지속시간: ${longTaskReport.avgDuration?.toFixed(1) || 0}ms`);
    } else if (Array.isArray(longTaskReport)) {
      console.log(`   감지된 Long Task: ${longTaskReport.length}개`);
      if (longTaskReport.length > 0) {
        const total = longTaskReport.reduce((sum, t) => sum + t.duration, 0);
        console.log(`   총 지속시간: ${total.toFixed(1)}ms`);
        console.log(`   평균 지속시간: ${(total / longTaskReport.length).toFixed(1)}ms`);
      }
    }

    // 7. 메모리 사용량
    console.log('\n📊 7. 메모리 사용량');
    const memoryInfo = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1),
          totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(1)
        };
      }
      return null;
    });

    if (memoryInfo) {
      console.log(`   사용 중: ${memoryInfo.usedJSHeapSize}MB`);
      console.log(`   총 힙: ${memoryInfo.totalJSHeapSize}MB`);
    } else {
      console.log('   ℹ️ 메모리 API 사용 불가 (--enable-precise-memory-info 필요)');
    }

    // 8. 최종 리포트
    console.log('\n📊 8. 최종 Performance 리포트');
    const finalReport = await page.evaluate(() => {
      if (typeof window.longTaskMonitor !== 'undefined') {
        return window.longTaskMonitor.report();
      }
      return null;
    });

    if (finalReport) {
      console.log(`   모니터링 시간: ${finalReport.durationSeconds?.toFixed(1)}초`);
      console.log(`   Long Task: ${finalReport.longTaskCount}개 (총 ${finalReport.longTaskTotalDuration?.toFixed(0)}ms)`);
      console.log(`   postMessage: ${finalReport.postMessageStats?.count || 0}회`);

      if (Object.keys(finalReport.metrics || {}).length > 0) {
        console.log('\n   측정된 메트릭:');
        for (const [name, stats] of Object.entries(finalReport.metrics)) {
          console.log(`   - ${name}: avg=${stats.avg?.toFixed(1)}ms, max=${stats.max?.toFixed(1)}ms`);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Performance Test 완료');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 10초 대기 후 종료 (수동 확인 시간)
    console.log('ℹ️ 10초 후 브라우저 종료... (DevTools에서 추가 확인 가능)');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 테스트 오류:', error.message);
  } finally {
    await browser.close();
  }
}

runPerformanceTest().catch(console.error);
