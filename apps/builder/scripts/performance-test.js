/**
 * Performance Test Script
 *
 * 🚀 Phase 9 성능 테스트
 *
 * Chrome DevTools Console에서 실행:
 * 1. F12 또는 Cmd+Option+I로 DevTools 열기
 * 2. Console 탭에서 이 스크립트 실행
 *
 * 또는 브라우저에서 http://localhost:5173 접속 후
 * Console에 아래 명령어 입력
 */

// ============================================
// 1. Long Task Monitor 테스트
// ============================================

console.group('🔍 Performance Monitor 테스트');

// longTaskMonitor 존재 확인
if (typeof window.longTaskMonitor !== 'undefined') {
  console.log('✅ longTaskMonitor 로드됨');

  // Long Task 통계
  const ltStats = window.longTaskMonitor.getLongTaskStats();
  console.log(`📊 Long Task 통계:`);
  console.log(`   - 감지된 Long Task: ${ltStats.count}개`);
  console.log(`   - 총 지속시간: ${ltStats.totalDuration.toFixed(1)}ms`);
  console.log(`   - 평균 지속시간: ${ltStats.avgDuration.toFixed(1)}ms`);

  // 전체 리포트
  console.log('\n📋 전체 리포트:');
  window.longTaskMonitor.printReport();
} else {
  console.warn('⚠️ longTaskMonitor가 로드되지 않음 (개발 모드 확인)');
}

console.groupEnd();

// ============================================
// 2. postMessage Monitor 테스트
// ============================================

console.group('📡 postMessage Monitor 테스트');

if (typeof window.postMessageMonitor !== 'undefined') {
  console.log('✅ postMessageMonitor 로드됨');

  // 리포트
  window.postMessageMonitor.printReport();
} else {
  console.warn('⚠️ postMessageMonitor가 로드되지 않음');
}

console.groupEnd();

// ============================================
// 3. 수동 성능 테스트
// ============================================

console.group('🧪 수동 성능 테스트');

// 클릭 선택 시뮬레이션 테스트
console.log('테스트 1: 동기 함수 측정');
if (window.longTaskMonitor) {
  const result = window.longTaskMonitor.measure('test-sync', () => {
    let sum = 0;
    for (let i = 0; i < 1000000; i++) sum += i;
    return sum;
  });
  console.log(`   결과: ${result}, 측정 완료`);
}

// 비동기 함수 테스트
console.log('테스트 2: 비동기 함수 측정');
if (window.longTaskMonitor) {
  window.longTaskMonitor.measureAsync('test-async', async () => {
    return new Promise(resolve => setTimeout(resolve, 50));
  }).then(() => {
    console.log('   비동기 테스트 완료');

    // 최종 리포트
    console.log('\n📊 테스트 후 최종 리포트:');
    window.longTaskMonitor.printReport();
  });
}

console.groupEnd();

// ============================================
// 4. Chrome Performance 탭 사용법
// ============================================

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Chrome DevTools Performance 탭 사용법
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DevTools 열기: F12 또는 Cmd+Option+I
2. Performance 탭 선택
3. 녹화 시작: ⏺ 버튼 클릭
4. 앱에서 작업 수행:
   - 요소 선택/해제
   - 속성 편집
   - 페이지 전환
   - 다중 선택
5. 녹화 중지: ⏹ 버튼 클릭
6. 결과 분석:
   - Main 스레드 타임라인 확인
   - Long Task (빨간 막대) 확인
   - 50ms 이상 작업 식별

추가 명령어:
- longTaskMonitor.printReport()  : Long Task 리포트
- postMessageMonitor.printReport() : postMessage 리포트
- longTaskMonitor.reset()        : 통계 초기화

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
